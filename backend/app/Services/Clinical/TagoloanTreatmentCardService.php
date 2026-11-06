<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\TagoloanTreatmentCard;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class TagoloanTreatmentCardService
{
    /**
     * Get paginated treatment cards with optional search.
     */
    public function getPaginatedCards(int $clinicId, ?string $search, int $perPage = 20): LengthAwarePaginator
    {
        $query = TagoloanTreatmentCard::with(['patient', 'biteIncident', 'createdBy'])
            ->where('clinic_id', $clinicId)
            ->orderBy('created_at', 'desc');

        if ($search !== null && $search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('registry_no', 'like', "%{$search}%")
                  ->orWhere('hospital_no', 'like', "%{$search}%")
                  ->orWhereHas('patient', function ($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('patient_number', 'like', "%{$search}%");
                  });
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Smart pre-fill dataset for Tagoloan Treatment Card.
     */
    public function getPatientCardData(int $clinicId, int $patientId, ?int $requestedBiteId = null, ?int $requestedTreatmentId = null): array
    {
        $clinic = Clinic::find($clinicId);
        $patient = Patient::with(['details'])->where('clinic_id', $clinicId)->findOrFail($patientId);

        $latestBite = null;
        if ($requestedBiteId) {
            $latestBite = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $requestedBiteId)
                ->firstOrFail();
        } else {
            $latestBite = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereIn('severity', ['minor', 'moderate', 'severe'])
                ->orderBy('bite_date', 'desc')
                ->latest('bite_id')
                ->first()
                ?? BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->orderBy('bite_date', 'desc')
                    ->latest('bite_id')
                    ->first();
        }
        $latestBite?->loadMissing(['intake', 'treatmentPlan']);

        $appointments = Appointment::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->orderBy('appointment_date', 'asc')
            ->orderBy('dose_number', 'asc')
            ->get();

        $latestIntake = $latestBite?->intake;
        $treatmentRecords = TreatmentRecord::with('administeredBy')
            ->where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->orderBy('dose_number', 'asc')
            ->get();

        $prophylaxisRecords = $latestBite
            ? TreatmentRecord::with(['administeredBy', 'inventory'])
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $latestBite->bite_id)
                ->where(fn ($q) => $q->whereNotNull('medication_given')->orWhereIn('dose_number', [200, 201, 300, 400, 401]))
                ->whereIn('status', ['completed', 'cancelled'])
                ->live()
                ->orderBy('treatment_id', 'asc')
                ->get()
                ->map(function ($r) {
                    $r->medication_given ??= [200 => 'ERIG', 201 => 'HRIG', 300 => 'TT', 400 => 'ATS', 401 => 'TIG'][$r->dose_number] ?? null;
                    return $r;
                })
                ->values()
            : collect();

        $existingCard = TagoloanTreatmentCard::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->latest()
            ->first();

        $latestConsultation = null;
        $consultations = collect();
        if ($existingCard && $latestBite) {
            $existingCard->setRelation('biteIncident', $latestBite);
        }
        if ($latestBite) {
            $consultations = TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $latestBite->bite_id)
                ->whereNull('dose_number')
                ->whereNull('medication_given')
                ->where('status', 'completed')
                ->where(function ($q) {
                    $q->whereNotNull('nature_of_visit')
                      ->orWhereNotNull('diagnosis')
                      ->orWhereNotNull('chief_complaints');
                })
                ->orderBy('consultation_date', 'asc')
                ->orderBy('treatment_id', 'asc')
                ->get();

            $targetConsult = $requestedTreatmentId ? $consultations->firstWhere('treatment_id', $requestedTreatmentId) : null;
            $latestConsultation = $targetConsult ?? ($consultations->last() ?? TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $latestBite->bite_id)
                ->whereNull('dose_number')
                ->whereNull('medication_given')
                ->whereNotNull('nature_of_visit')
                ->orderBy('consultation_date', 'desc')
                ->orderBy('consultation_time', 'desc')
                ->latest('treatment_id')
                ->first());
        }
        $pOrders = $latestConsultation?->prophylaxis_orders ?? [];
        $tetCat = $pOrders['tetanus_category'] ?? null;
        $hasTetanusOrder = in_array($tetCat, ['ats', 'tt', 'ats_tt'], true)
            && (
                (!empty($pOrders['tetanus_passive']) && $pOrders['tetanus_passive'] !== 'none') ||
                (!empty($pOrders['tetanus_vaccine']) && $pOrders['tetanus_vaccine'] !== 'none')
            );

        $isCategory1 = $latestBite && ($latestBite->exposure_category === 'I' || $latestBite->severity === 'minor');

        $planAllowsTreatment = $latestBite
            && $latestBite->treatmentPlan
            && $latestBite->treatmentPlan->status === 'approved'
            && in_array($latestBite->treatmentPlan->plan_type, ['full_pep', 'single_booster', 'two_dose_booster'], true);

        if ($isCategory1) {
            $form3Ready = (bool) ($latestBite && $latestBite->confirmed_at && $latestConsultation && $hasTetanusOrder);
            $form3BlockReason = $form3Ready
                ? null
                : 'Form 3 is unavailable because Doctor assessment confirmed Category I with no nurse-administered treatment required.';
        } else {
            $form3Ready = (bool) ($latestBite
                && $latestBite->confirmed_at
                && $latestConsultation
                && ($planAllowsTreatment || $hasTetanusOrder));
            $form3BlockReason = $form3Ready
                ? null
                : 'Form 3 is available after a Doctor confirms Form 2 and approves a treatment plan.';
        }

        $biteData = null;
        if ($latestBite) {
            $intakeModes = is_array($latestIntake?->exposure_modes) ? ($latestIntake->exposure_modes[0] ?? null) : null;
            $intakeSites = is_array($latestIntake?->exposure_sites) ? implode(', ', $latestIntake->exposure_sites) : null;
            $biteData = [
                'bite_id' => $latestBite->bite_id,
                'case_number' => $latestBite->case_number,
                'bite_date' => $latestBite->bite_date
                    ? Carbon::parse($latestBite->bite_date)->format('Y-m-d')
                    : ($latestIntake?->exposure_date ? Carbon::parse($latestIntake->exposure_date)->format('Y-m-d') : null),
                'bite_place' => $latestBite->bite_place ?? $latestIntake?->exposure_place,
                'animal_type' => $latestBite->animal_type ?? $existingCard?->animal_type ?? $latestIntake?->animal_species,
                'animal_status' => $latestBite->animal_status ?? $latestIntake?->animal_ownership,
                'animal_type_others' => $latestBite->animal_type_others ?? $existingCard?->animal_type_others ?? $latestIntake?->animal_species_other,
                'animal_available' => $latestBite->animal_available,
                'animal_observation_status' => $latestBite->animal_observation_status ?? $latestIntake?->animal_condition,
                'animal_condition_reported' => $latestBite->animal_condition_reported ?? $latestIntake?->animal_condition,
                'referred_from' => $latestBite->referred_from ?? $existingCard?->referred_by ?? $latestConsultation?->referred_from,
                'mode_of_exposure' => $latestBite->exposure_mode ?? $existingCard?->mode_of_exposure ?? $intakeModes,
                'exposure_type' => $latestBite->exposure_type,
                'exposure_category' => $latestBite->exposure_category ?? $existingCard?->exposure_category,
                'severity' => $latestBite->severity,
                'site_washed' => $latestBite->site_washed,
                'body_part_exposed' => $latestBite->body_part_exposed ?? $latestBite->site_number ?? $existingCard?->body_part_exposed ?? $intakeSites,
                'body_part_detail' => $latestBite->site_number ?? $intakeSites,
                'wound_description' => $latestBite->wound_description,
                'episode_number' => $latestBite->episode_number,
                'episode_type' => $latestBite->episode_type,
                'status' => $latestBite->status,
                'plan_type' => $latestBite->treatmentPlan?->plan_type,
                'plan_status' => $latestBite->treatmentPlan?->status,
            ];
        }

        $consultationHistory = $consultations->values()->map(function (TreatmentRecord $c, int $idx) use ($consultations, $latestBite, $treatmentRecords, $prophylaxisRecords) {
            $isLatest = $idx === ($consultations->count() - 1);
            $isReturningReassessment = $idx > 0;
            $cOrders = is_array($c->prophylaxis_orders) ? $c->prophylaxis_orders : [];
            $cCat = $cOrders['consultation_exposure_category'] ?? $latestBite?->exposure_category ?? $latestBite?->bite_category ?? 'II';
            $cDecision = $cOrders['reassessment_decision'] ?? null;
            $cNotes = $cOrders['reassessment_notes'] ?? null;
            $noInj = in_array($cDecision, ['discontinue', 'no_injection_required'], true) || $c->outcome === 'completed_without_injection';

            $tetCat = strtolower(trim((string) ($cOrders['tetanus_category'] ?? '')));
            $prescribedTt = (!$noInj && in_array($tetCat, ['tt', 'ats_tt'], true) && !empty($cOrders['tetanus_vaccine']) && $cOrders['tetanus_vaccine'] !== 'none')
                ? $cOrders['tetanus_vaccine']
                : null;
            $prescribedAts = (!$noInj && in_array($tetCat, ['ats', 'ats_tt'], true) && !empty($cOrders['tetanus_passive']) && $cOrders['tetanus_passive'] !== 'none')
                ? $cOrders['tetanus_passive']
                : null;
            $prescribedRig = (!$noInj && !empty($cOrders['rig']) && $cOrders['rig'] !== 'none')
                ? $cOrders['rig']
                : null;
            $prescribedPep = (!$noInj && $cCat !== 'I' && !empty($c->prescribed_vaccine_type) && $c->prescribed_vaccine_type !== 'none')
                ? $c->prescribed_vaccine_type
                : null;

            $cDate = $c->consultation_date ? Carbon::parse($c->consultation_date)->format('Y-m-d') : null;
            $nextConsultation = $consultations->values()->get($idx + 1);
            $nextDate = $nextConsultation?->consultation_date ? Carbon::parse($nextConsultation->consultation_date)->format('Y-m-d') : null;

            // Determine what was actually administered during this consultation's window (on or after cDate, and before nextDate if there is a later reassessment)
            $windowDoses = $treatmentRecords->filter(function ($r) use ($cDate, $nextDate, $isLatest) {
                if ($r->dose_number === null || (int) $r->dose_number >= 200 || $r->status !== 'completed' || empty($r->treatment_date)) {
                    return false;
                }
                $tDate = Carbon::parse($r->treatment_date)->format('Y-m-d');
                if ($cDate && $tDate < $cDate) return false;
                if (!$isLatest && $nextDate && $tDate >= $nextDate) return false;
                return true;
            })->values();

            $windowProphylaxis = $prophylaxisRecords->filter(function ($r) use ($cDate, $nextDate, $isLatest) {
                if ($r->status !== 'completed' || empty($r->treatment_date)) {
                    return false;
                }
                $tDate = Carbon::parse($r->treatment_date)->format('Y-m-d');
                if ($cDate && $tDate < $cDate) return false;
                if (!$isLatest && $nextDate && $tDate >= $nextDate) return false;
                return true;
            })->values();

            $windowNotAdministered = $prophylaxisRecords->filter(function ($r) use ($cDate, $nextDate, $isLatest) {
                if ($r->status !== 'cancelled') return false;
                $sDate = $r->scheduled_date ? Carbon::parse($r->scheduled_date)->format('Y-m-d') : null;
                if ($cDate && $sDate && $sDate < $cDate) return false;
                if (!$isLatest && $nextDate && $sDate && $sDate >= $nextDate) return false;
                return true;
            })->values();

            $hasAdministeredInWindow = $windowDoses->isNotEmpty() || $windowProphylaxis->isNotEmpty();
            $hasPrescription = (bool) ($prescribedPep || $prescribedTt || $prescribedAts || $prescribedRig);

            $isReferralConsultation = $c->outcome === 'Transferred/Referred'
                || (!empty($c->referred_to) && TreatmentRecord::isExternalReferralDestination($c->referred_to))
                || (!empty($c->actions_taken) && str_contains(strtolower($c->actions_taken), 'transferred/referred'))
                || ($c->mode_of_transaction === 'referral' && !empty($c->referred_to));

            if ($isReferralConsultation) {
                $adminStatus = 'Transferred/Referred';
            } elseif (!$hasPrescription && ($cCat === 'I' || $noInj)) {
                $adminStatus = 'Completed Without Injection';
            } elseif ($hasAdministeredInWindow) {
                $adminStatus = 'Administered';
            } elseif (!$isLatest || $windowNotAdministered->isNotEmpty()) {
                $adminStatus = 'Not Administered';
            } else {
                $adminStatus = 'Pending Administration';
            }

            $notAdminReason = $windowNotAdministered->pluck('remarks')->filter()->implode('; ') ?: null;
            if (!$notAdminReason && !$isLatest && !$hasAdministeredInWindow && $hasPrescription) {
                $notAdminReason = 'Patient left clinic before receiving prescribed injection; returned for reassessment.';
            }

            $administeredItems = [];
            foreach ($windowDoses as $d) {
                $administeredItems[] = [
                    'type' => 'Anti-Rabies PEP (Day ' . $d->dose_number . ')',
                    'product' => $d->vaccine_brand ?: ($d->vaccine_generic ?: $prescribedPep ?: 'PEP Vaccine'),
                    'date_administered' => $d->treatment_date ? Carbon::parse($d->treatment_date)->format('Y-m-d') : null,
                    'route' => $d->route,
                    'administered_by' => $d->administeredBy?->name,
                ];
            }
            foreach ($windowProphylaxis as $p) {
                $administeredItems[] = [
                    'type' => $p->medication_given ?: 'Prophylaxis',
                    'product' => $p->vaccine_brand ?: ($p->medication_given ?: 'Prophylaxis'),
                    'date_administered' => $p->treatment_date ? Carbon::parse($p->treatment_date)->format('Y-m-d') : null,
                    'route' => $p->route,
                    'dosage_ml' => $p->dosage_ml,
                    'dose_iu' => $p->dose_iu,
                    'administered_by' => $p->administeredBy?->name,
                ];
            }

            return [
                'treatment_id' => $c->treatment_id,
                'is_returning_reassessment' => $isReturningReassessment,
                'consultation_date' => $cDate,
                'consultation_time' => $c->consultation_time,
                'exposure_category' => $cCat,
                'blood_pressure' => $c->blood_pressure,
                'temperature' => $c->temperature,
                'height' => $c->height,
                'weight' => $c->weight,
                'chief_complaints' => $c->chief_complaints,
                'diagnosis' => $c->diagnosis,
                'provider_name' => $c->provider_name ?: $c->administeredBy?->name,
                'reassessment_decision' => $cDecision,
                'reassessment_notes' => $cNotes,
                'prescribed_vaccine_type' => $prescribedPep,
                'prescribed_tt' => $prescribedTt,
                'prescribed_ats' => $prescribedAts,
                'prescribed_rig' => $prescribedRig,
                'administration_status' => $adminStatus,
                'not_administered_reason' => $notAdminReason,
                'referred_to' => $c->referred_to,
                'reason_for_referral' => $c->reason_for_referral,
                'outcome' => $isReferralConsultation ? 'Transferred/Referred' : $c->outcome,
                'administered_items' => $administeredItems,
            ];
        })->values();

        return [
            'clinic' => [
                'name' => $clinic->name ?? 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
                'hospital_no' => $clinic->hospital_no ?? null,
                'doh_accreditation_no' => $clinic->doh_accreditation_no ?? '2022-10-037',
                'philhealth_accreditation_no' => $clinic->philhealth_accreditation_no ?? 'B10034377',
                'province' => $clinic->province ?? null,
                'municipality' => $clinic->municipality ?? null,
                'address' => $clinic->address ?? null,
                'contact_number' => $clinic->contact_number ?? $clinic->phone ?? null,
                'left_print_logo_url' => $clinic->left_print_logo_url ?? null,
                'right_print_logo_url' => $clinic->right_print_logo_url ?? null,
                'left_print_logo_path' => $clinic->left_print_logo_path ?? null,
                'right_print_logo_path' => $clinic->right_print_logo_path ?? null,
            ],
            'patient' => [
                'patient_id' => $patient->patient_id,
                'patient_number' => $patient->patient_number,
                'full_name' => "{$patient->last_name}, {$patient->first_name} {$patient->middle_name}",
                'first_name' => $patient->first_name,
                'last_name' => $patient->last_name,
                'age' => $patient->age,
                'date_of_birth' => $patient->date_of_birth ? Carbon::parse($patient->date_of_birth)->format('Y-m-d') : null,
                'gender' => $patient->gender,
                'address' => $patient->address,
                'philhealth_no' => $patient->details->philhealth_no ?? null,
                'philhealth_status' => $patient->details->philhealth_status ?? 'member',
                'hospital_no' => $patient->details->hospital_no ?? null,
            ],
            'bite_incident' => $biteData,
            'patient_reported_intake' => $latestIntake,
            'form3_ready' => $form3Ready,
            'form3_block_reason' => $form3BlockReason,
            'targeted_treatment_id' => $requestedTreatmentId,
            'existing_card' => $existingCard,
            'latest_consultation' => $latestConsultation,
            'consultation_history' => $consultationHistory,
            'previous_consultations' => $consultationHistory->count() > 1 ? $consultationHistory->slice(0, -1)->values() : collect(),
            'treatment_records' => $treatmentRecords,
            'prophylaxis_records' => $prophylaxisRecords,
            'appointments' => $appointments,
        ];
    }

    /**
     * Store or update a treatment card.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function storeCard(int $clinicId, array $validated, User $user, array $rawInput): array
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $validated['bite_id'])
            ->first();
        $plan = TreatmentPlan::where('clinic_id', $clinicId)
            ->where('bite_id', $validated['bite_id'])
            ->first();
        $latestConsultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $validated['bite_id'])
            ->whereNull('dose_number')
            ->where('status', 'completed')
            ->latest('treatment_id')
            ->first();
        $hasConsultation = (bool) $latestConsultation;

        $pOrders = $latestConsultation?->prophylaxis_orders ?? [];
        $tetCat = $pOrders['tetanus_category'] ?? null;
        $hasTetanusOrder = in_array($tetCat, ['ats', 'tt', 'ats_tt'], true)
            && (
                (!empty($pOrders['tetanus_passive']) && $pOrders['tetanus_passive'] !== 'none') ||
                (!empty($pOrders['tetanus_vaccine']) && $pOrders['tetanus_vaccine'] !== 'none')
            );
        $planAllowsTreatment = $plan && $plan->status === 'approved'
            && in_array($plan->plan_type, ['full_pep', 'single_booster', 'two_dose_booster'], true);
        $isCategory1 = $incident && ($incident->exposure_category === 'I' || $incident->severity === 'minor');

        if (!$incident || !$incident->confirmed_at || !$hasConsultation) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Form 3 cannot be saved until a Doctor confirms Form 2 for this episode.',
                ],
            ];
        }

        if ($isCategory1 && !$hasTetanusOrder) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Form 3 is unavailable because Doctor assessment confirmed Category I with no nurse-administered treatment required.',
                    'errors' => [
                        'category' => ['Form 3 is unavailable because Doctor assessment confirmed Category I with no nurse-administered treatment required.'],
                    ],
                ],
            ];
        }

        if ($isCategory1 && !empty($rawInput['doses'])) {
            $hasRabiesDose = collect($rawInput['doses'])->contains(fn($d) => !empty($d['date']) && !empty($d['vaccine_type']));
            if ($hasRabiesDose) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Rabies vaccine doses cannot be administered for Category I exposures.',
                        'errors' => [
                            'doses' => ['Rabies vaccine doses cannot be administered for Category I exposures.'],
                        ],
                    ],
                ];
            }
        }

        if (!$planAllowsTreatment && !$hasTetanusOrder) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Form 3 cannot be saved until a Doctor approves a treatment order for this episode.',
                ],
            ];
        }

        $exposureType = match ($validated['mode_of_exposure'] ?? null) {
            'nibbling_uncovered_skin', 'nibbling_broken_skin' => 'lick',
            'scratch_abrasion' => 'scratch',
            'transdermal_bite' => 'bite',
            'handling_ingestion_raw_meat' => 'other',
            default => null,
        };
        $animalType = strtolower(trim((string) ($validated['animal_type'] ?? '')));
        $animalTypeOther = trim((string) ($validated['animal_type_others'] ?? ''));
        if ($animalType !== '' && !in_array($animalType, ['dog', 'cat', 'other'], true)) {
            $animalTypeOther = $animalTypeOther ?: $animalType;
            $animalType = 'other';
        }

        $animalStatus = $validated['animal_status'] ?? ($rawInput['animal_status'] ?? null);
        $animalAvailable = $validated['animal_available'] ?? ($rawInput['animal_available'] ?? null);
        $animalAvailableBool = match ($animalAvailable) {
            'yes', 'true', true, 1, '1' => true,
            'no', 'false', false, 0, '0' => false,
            default => null,
        };

        $animalCondition = $validated['animal_condition'] ?? ($rawInput['animal_condition'] ?? null);
        $observationStatus = match ($animalCondition) {
            'apparently_healthy', 'healthy' => 'healthy',
            'sick' => 'sick',
            'dead', 'died' => 'died',
            'unknown' => 'unknown',
            default => null,
        };

        $incident->update(array_filter([
            'bite_date' => $validated['date_of_exposure'] ?? null,
            'bite_place' => $validated['place_of_exposure'] ?? null,
            'exposure_mode' => $validated['mode_of_exposure'] ?? null,
            'exposure_type' => $exposureType,
            'body_part_exposed' => $validated['body_part_exposed'] ?? null,
            'site_number' => $validated['body_part_detail'] ?? null,
            'animal_type' => $animalType ?: null,
            'animal_type_others' => $animalType === 'other' ? ($animalTypeOther ?: null) : null,
            'animal_status' => $animalStatus ?: null,
            'animal_available' => $animalAvailableBool,
            'animal_captured' => $animalAvailableBool ?? false,
            'animal_observation_status' => $observationStatus,
            'animal_condition_reported' => $animalCondition ?: null,
        ], fn ($value) => $value !== null && $value !== ''));

        $incident->loadMissing('intake');
        $incident->intake?->update([
            'clinically_reviewed_by' => $user->id,
            'clinically_reviewed_at' => now(),
        ]);
        $incident->refresh();

        $card = TagoloanTreatmentCard::updateOrCreate(
            [
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'bite_id' => $validated['bite_id'],
            ],
            array_merge($validated, [
                'clinic_id' => $clinicId,
                ...($incident->exposure_category !== null ? ['exposure_category' => $incident->exposure_category] : []),
                'mode_of_exposure' => $incident->exposure_mode,
                'body_part_exposed' => $incident->body_part_exposed ?: $incident->site_number,
                'animal_type' => $incident->animal_type,
                'animal_type_others' => $incident->animal_type_others,
                'created_by' => $user->id,
            ])
        );

        $patient = Patient::with('details')->find($validated['patient_id']);
        if (!empty($validated['hospital_no']) && $patient && $patient->details) {
            $patient->details->update(['hospital_no' => $validated['hospital_no']]);
        }

        Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");

        return [
            'status' => 200,
            'data' => [
                'message' => 'Tagoloan Treatment Card saved successfully',
                'card' => $card->load(['patient', 'biteIncident', 'createdBy']),
            ],
        ];
    }

    /**
     * Get a single card by ID scoped to clinic.
     */
    public function getCard(int $clinicId, int $id): TagoloanTreatmentCard
    {
        return TagoloanTreatmentCard::with(['patient.details', 'biteIncident', 'createdBy'])
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);
    }
}
