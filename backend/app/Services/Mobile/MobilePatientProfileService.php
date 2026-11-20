<?php

namespace App\Services\Mobile;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Services\PatientMembershipService;
use App\Services\Clinic\MobileFormPolicy;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MobilePatientProfileService
{
    private const PATIENT_FIELDS = [
        'clinic_id',
        'relationship',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'gender',
        'date_of_birth',
        'address',
        'contact_number',
        'email',
        'emergency_contact_name',
        'emergency_contact_number',
    ];

    public function __construct(
        protected PatientMembershipService $membershipService
    ) {}

    /**
     * Retrieve all patient profiles linked to the mobile account (cached 10m).
     */
    public function listPatients(PatientAccount $account): Collection
    {
        $cacheKey = "mobile:patients:account:{$account->id}";

        return Cache::remember($cacheKey, 600, function () use ($account) {
            return $account->patients()
                ->with(['details', 'memberships'])
                ->orderByPivot('is_primary', 'desc')
                ->get();
        });
    }

    /**
     * Search for existing clinic medical record matching criteria
     *
     * @param array<string, mixed> $criteria
     * @return array<string, mixed>
     */
    public function findExistingPatient(array $criteria): array
    {
        $query = Patient::query();

        if (!empty($criteria['patient_number'])) {
            $patient = $query->where('patient_number', trim($criteria['patient_number']))->first();
        } elseif (!empty($criteria['first_name']) && !empty($criteria['last_name']) && !empty($criteria['date_of_birth'])) {
            $firstName = mb_strtolower(trim($criteria['first_name']));
            $lastName = mb_strtolower(trim($criteria['last_name']));
            $dob = Carbon::parse($criteria['date_of_birth'])->toDateString();

            $patient = $query->whereRaw('LOWER(TRIM(first_name)) = ?', [$firstName])
                ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastName])
                ->whereDate('date_of_birth', $dob)
                ->first();
        } else {
            return [
                'found'   => false,
                'message' => 'Please provide a Patient Number or First Name, Last Name, and Date of Birth to search.',
            ];
        }

        if (!$patient) {
            return [
                'found'   => false,
                'message' => 'No matching clinic chart found.',
            ];
        }

        $hasVerifiedAccount = $patient->accounts()->wherePivot('status', 'verified')->exists();

        return [
            'found'   => true,
            'patient' => [
                'patient_id'            => $patient->patient_id,
                'patient_number'        => $patient->patient_number,
                'first_name'            => $patient->first_name,
                'last_name'             => $patient->last_name,
                'date_of_birth'         => $patient->date_of_birth?->format('Y-m-d'),
                'gender'                => $patient->gender,
                'has_completed_primary' => (bool) $patient->has_completed_primary,
                'has_verified_account'  => $hasVerifiedAccount,
            ],
            'message' => "Found clinic chart for {$patient->name} (#{$patient->patient_number}).",
        ];
    }

    /**
     * Create a new patient profile and attach to the mobile account.
     */
    public function createPatient(PatientAccount $account, array $validated, array $rawInput): Patient
    {
        if ($validated['relationship'] === 'self'
            && $account->patients()->wherePivot('relationship', 'self')->exists()) {
            throw ValidationException::withMessages([
                'relationship' => ['This account already has a self profile.'],
            ]);
        }

        // Layer 1 Proactive Matching: Check for existing walk-in or clinic chart
        $matchedPatient = null;
        if (!empty($validated['patient_number'])) {
            $matchedPatient = Patient::where('patient_number', trim($validated['patient_number']))->first();
        } elseif (!empty($validated['first_name']) && !empty($validated['last_name']) && !empty($validated['date_of_birth'])) {
            $firstName = mb_strtolower(trim($validated['first_name']));
            $lastName = mb_strtolower(trim($validated['last_name']));
            $dob = Carbon::parse($validated['date_of_birth'])->toDateString();

            $matchedPatient = Patient::whereRaw('LOWER(TRIM(first_name)) = ?', [$firstName])
                ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastName])
                ->whereDate('date_of_birth', $dob)
                ->first();
        }

        if ($matchedPatient) {
            if ((int) $matchedPatient->clinic_id !== (int) $validated['clinic_id']) {
                throw ValidationException::withMessages([
                    'patient_number' => ['This clinic cannot link a chart from a different clinic.'],
                ]);
            }
            // Check if already linked to this account
            if ($account->patients()->where('patients.patient_id', $matchedPatient->patient_id)->exists()) {
                throw ValidationException::withMessages([
                    'first_name' => ['This patient profile is already linked to your account.'],
                ]);
            }

            // Check if already verified under another account
            $alreadyVerifiedByOther = $matchedPatient->accounts()
                ->where('patient_accounts.id', '!=', $account->id)
                ->wherePivot('status', 'verified')
                ->exists();

            if ($alreadyVerifiedByOther) {
                throw ValidationException::withMessages([
                    'first_name' => ["A verified mobile account is already linked to this medical record (#{$matchedPatient->patient_number}). Please contact the clinic if you need assistance."],
                ]);
            }

            // Link existing chart to this account instead of creating duplicate patient row
            DB::transaction(function () use ($account, $matchedPatient, $validated, $rawInput) {
                $account->patients()->syncWithoutDetaching([
                    $matchedPatient->patient_id => [
                        'relationship' => $validated['relationship'],
                        'is_primary'   => !$account->patients()->exists(),
                        'status'       => 'verified',
                        'verified_at'  => now(),
                    ],
                ]);

                // Update missing contact info or details if needed
                $patientFields = array_filter(
                    array_intersect_key($validated, array_flip(self::PATIENT_FIELDS)),
                    fn($val) => $val !== null && $val !== ''
                );
                unset($patientFields['relationship']);
                $matchedPatient->fill(array_diff_key($patientFields, array_filter($matchedPatient->toArray())));
                $matchedPatient->save();

                $detailsData = array_diff_key($validated, array_flip(self::PATIENT_FIELDS));
                $detailsPayload = array_filter(array_map(fn($value) => ($value === '' ? null : $value), $detailsData));

                $this->mergeMobileMemberships($matchedPatient, $rawInput, $detailsPayload);
                if ($matchedPatient->details && $detailsPayload) {
                    $matchedPatient->details->update($detailsPayload);
                } elseif (! $matchedPatient->details && $detailsPayload) {
                    $matchedPatient->details()->create($detailsPayload);
                }
            });

            Cache::forget("mobile:patients:account:{$account->id}");

            return $account->patients()
                ->with(['details', 'memberships'])
                ->whereKey($matchedPatient->patient_id)
                ->firstOrFail();
        }

        $patientData = array_intersect_key($validated, array_flip(self::PATIENT_FIELDS));
        $detailsData = array_diff_key($validated, array_flip(self::PATIENT_FIELDS));

        $patient = DB::transaction(function () use ($account, $patientData, $detailsData, $rawInput) {
            $relationship = $patientData['relationship'];
            unset($patientData['relationship']);

            $patient = Patient::create([
                ...$patientData,
                'registration_source' => 'mobile',
            ]);

            $detailsPayload = array_map(fn($value) => ($value === '' ? null : $value), $detailsData);
            $this->mergeMobileMemberships($patient, $rawInput, $detailsPayload);

            if (!empty(array_filter($detailsPayload, fn($value) => !is_null($value)))) {
                $patient->details()->create($detailsPayload);
            }

            $account->patients()->attach($patient->patient_id, [
                'relationship' => $relationship,
                'is_primary'   => !$account->patients()->exists(),
                'status'       => 'pending',
            ]);

            return $patient;
        });

        // Invalidate cache after creating patient
        Cache::forget("mobile:patients:account:{$account->id}");

        return $account->patients()
            ->with(['details', 'memberships'])
            ->whereKey($patient->patient_id)
            ->firstOrFail();
    }

    /**
     * Update an existing patient profile linked to the mobile account.
     */
    public function updatePatient(PatientAccount $account, Patient $patient, array $validated, array $rawInput): Patient
    {
        $linkedPatient = $account->patients()
            ->with(['details', 'memberships'])
            ->whereKey($patient->patient_id)
            ->wherePivotIn('status', ['pending', 'verified'])
            ->firstOrFail();

        if ($validated['relationship'] === 'self'
            && $account->patients()
                ->wherePivot('relationship', 'self')
                ->where('patients.patient_id', '!=', $linkedPatient->patient_id)
                ->exists()) {
            throw ValidationException::withMessages([
                'relationship' => ['This account already has a self profile.'],
            ]);
        }

        $patientData = array_intersect_key($validated, array_flip(self::PATIENT_FIELDS));
        $detailsData = array_diff_key($validated, array_flip(self::PATIENT_FIELDS));

        $updatedPatient = DB::transaction(function () use ($account, $linkedPatient, $patientData, $detailsData, $rawInput) {
            $relationship = $patientData['relationship'];
            unset($patientData['relationship'], $patientData['clinic_id']);

            $linkedPatient->update($patientData);

            $detailsPayload = array_map(fn($value) => ($value === '' ? null : $value), $detailsData);
            $this->mergeMobileMemberships($linkedPatient, $rawInput, $detailsPayload);

            if ($linkedPatient->details) {
                $linkedPatient->details->update($detailsPayload);
            } elseif (!empty(array_filter($detailsPayload, fn($value) => !is_null($value)))) {
                $linkedPatient->details()->create($detailsPayload);
            }

            $account->patients()->updateExistingPivot($linkedPatient->patient_id, [
                'relationship' => $relationship,
            ]);

            return $linkedPatient->fresh(['details', 'memberships']);
        });

        Cache::forget("mobile:patients:account:{$account->id}");
        Cache::forget("mobile:account:me:{$account->id}");

        return $updatedPatient;
    }

    /** Merge only membership types the current clinic allows this mobile form to edit. */
    private function mergeMobileMemberships(Patient $patient, array $input, array &$detailsPayload): void
    {
        $policy = app()->makeWith(MobileFormPolicy::class, ['clinicId' => (int) $patient->clinic_id]);
        $editable = $policy->editableMembershipTypes();
        if ($editable === [] || ! $this->membershipService->payloadHasMembershipData($input)) {
            return;
        }

        $existing = $patient->memberships()->get()->mapWithKeys(
            fn ($membership) => [$membership->membership_type => $membership->only([
                'membership_type', 'is_active', 'status_value', 'category',
                'relationship_value', 'registered_beneficiary', 'membership_id_no',
                'membership_label', 'extra_value',
            ])]
        )->all();

        $hasCollection = array_key_exists('memberships', $input);
        $touched = $hasCollection ? $editable : [];
        if (! $hasCollection) {
            foreach ([
                'philhealth' => ['philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category'],
                'fourps' => ['fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary'],
                'dswd_nhts' => ['dswd_nhts'],
                'other' => ['other_membership', 'other_membership_name', 'other_membership_no'],
            ] as $type => $keys) {
                if (array_intersect($keys, array_keys($input))) {
                    $touched[] = $type;
                }
            }
            if (($input['has_membership'] ?? null) === 'no') {
                $touched = $editable;
            }
        }

        $incoming = $this->membershipService->membershipsFromPayload($input);
        $merged = $existing;
        foreach ($touched as $type) {
            if (in_array($type, $editable, true)) {
                unset($merged[$type]);
            }
        }
        foreach ($incoming as $membership) {
            $type = $membership['membership_type'];
            if (! in_array($type, $editable, true) || (! $hasCollection && ! in_array($type, $touched, true))) {
                continue;
            }
            // A hidden detail must keep the value already stored for this membership.
            if ($type === 'philhealth') {
                foreach (['philhealth_status' => 'status_value', 'philhealth_no' => 'membership_id_no',
                    'philhealth_category' => 'category'] as $field => $attribute) {
                    if (! $policy->visible($field)) {
                        $membership[$attribute] = $existing[$type][$attribute] ?? null;
                    }
                }
            }
            $merged[$type] = $membership;
        }
        $final = array_values($merged);
        $this->membershipService->syncForPatient($patient, $final);

        $legacy = $this->membershipService->legacyFieldsFromMemberships($final);
        foreach ($legacy as $key => $value) {
            if (($policy->visible($key) && array_key_exists($key, $input)) ||
                (in_array($key, ['has_membership', 'other_membership', 'other_membership_name',
                    'other_membership_no', 'fourps_category', 'fourps_relationship',
                    'registered_fourps_beneficiary'], true) && $hasCollection)) {
                $detailsPayload[$key] = $value;
            }
        }
    }
}
