<?php

namespace App\Services\Clinical;

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
    public function getPatientCardData(int $clinicId, int $patientId, ?int $requestedBiteId = null): array
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
                ->orderBy('bite_date', 'desc')
                ->latest('bite_id')
                ->first();
        }
        $latestBite?->loadMissing(['intake', 'treatmentPlan']);

        $latestIntake = $latestBite?->intake;
        $treatmentRecords = TreatmentRecord::with('administeredBy')
            ->where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->orderBy('dose_number', 'asc')
            ->get();

        $existingCard = TagoloanTreatmentCard::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->when($latestBite, fn($q) => $q->where('bite_id', $latestBite->bite_id))
            ->latest()
            ->first();

        $latestConsultation = null;
        if ($existingCard && $latestBite) {
            $existingCard->setRelation('biteIncident', $latestBite);
        }
        if ($latestBite) {
            $latestConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $latestBite->bite_id)
                ->whereNotNull('nature_of_visit')
                ->orderBy('consultation_date', 'desc')
                ->orderBy('consultation_time', 'desc')
                ->latest('treatment_id')
                ->first();
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
            $biteData = [
                'bite_id' => $latestBite->bite_id,
                'case_number' => $latestBite->case_number,
                'bite_date' => $latestBite->bite_date ? Carbon::parse($latestBite->bite_date)->format('Y-m-d') : null,
                'bite_place' => $latestBite->bite_place,
                'animal_type' => $latestBite->animal_type,
                'animal_status' => $latestBite->animal_status,
                'animal_type_others' => $latestBite->animal_type_others,
                'animal_available' => $latestBite->animal_available,
                'animal_observation_status' => $latestBite->animal_observation_status,
                'animal_condition_reported' => $latestBite->animal_condition_reported,
                'referred_from' => $latestBite->referred_from,
                'mode_of_exposure' => $latestBite->exposure_mode,
                'exposure_type' => $latestBite->exposure_type,
                'exposure_category' => $latestBite->exposure_category ?? $existingCard?->exposure_category,
                'severity' => $latestBite->severity,
                'site_washed' => $latestBite->site_washed,
                'body_part_exposed' => $latestBite->body_part_exposed ?? $latestBite->site_number,
                'body_part_detail' => $latestBite->site_number,
                'wound_description' => $latestBite->wound_description,
                'episode_number' => $latestBite->episode_number,
                'episode_type' => $latestBite->episode_type,
            ];
        }

        return [
            'clinic' => [
                'name' => $clinic->name ?? 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
                'hospital_no' => $clinic->hospital_no ?? null,
                'doh_accreditation_no' => $clinic->doh_accreditation_no ?? '2022-10-037',
                'philhealth_accreditation_no' => $clinic->philhealth_accreditation_no ?? 'B10034377',
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
            'existing_card' => $existingCard,
            'latest_consultation' => $latestConsultation,
            'treatment_records' => $treatmentRecords,
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
