<?php

namespace App\Services\Mobile;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Services\PatientMembershipService;
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
            $memberships = $this->membershipService->membershipsFromPayload($rawInput);
            $detailsPayload = array_merge($detailsPayload, $this->membershipService->legacyFieldsFromMemberships($memberships));

            if (!empty(array_filter($detailsPayload, fn($value) => !is_null($value)))) {
                $patient->details()->create($detailsPayload);
            }

            $this->membershipService->syncForPatient($patient, $memberships);

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
            $memberships = $this->membershipService->membershipsFromPayload($rawInput);
            $detailsPayload = array_merge($detailsPayload, $this->membershipService->legacyFieldsFromMemberships($memberships));

            if ($linkedPatient->details) {
                $linkedPatient->details->update($detailsPayload);
            } elseif (!empty(array_filter($detailsPayload, fn($value) => !is_null($value)))) {
                $linkedPatient->details()->create($detailsPayload);
            }

            $this->membershipService->syncForPatient($linkedPatient, $memberships);

            $account->patients()->updateExistingPivot($linkedPatient->patient_id, [
                'relationship' => $relationship,
            ]);

            return $linkedPatient->fresh(['details', 'memberships']);
        });

        Cache::forget("mobile:patients:account:{$account->id}");
        Cache::forget("mobile:account:me:{$account->id}");

        return $updatedPatient;
    }
}
