<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\TagoloanTreatmentCard;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Domain service for Form 3 (Vaccination Record) save operations.
 * Extracted from VaccinationRecordController::store() — every DB transaction
 * boundary, side-effect, lock, and business rule is preserved exactly.
 */
class VaccinationRecordService
{
    public function __construct(
        private readonly VaccineInventoryUsageService $inventoryUsageService,
        private readonly ClinicScheduleService        $scheduleService,
    ) {}

    // ── Period → dose_number mapping (mirrors original controller exactly) ──
    const PERIOD_MAPPING = [
        'Day 0'    => 0,  'Day 3'    => 3,  'Day 7'    => 7,
        'Day 28'   => 28, 'Booster 1' => 90, 'Booster 2' => 365,
        'day_0'    => 0,  'day_3'    => 3,  'day_7'    => 7,
        'day_28'   => 28, 'booster_1' => 90, 'booster_2' => 365,
    ];

    const DOSE_NUMBER_TO_LABEL = [
        0 => 'Day 0', 3 => 'Day 3', 7 => 'Day 7',
        28 => 'Day 28', 90 => 'Booster 1', 365 => 'Booster 2',
    ];

    const PREREQUISITE_MAP = [
        3   => 0,   // Day 3  requires Day 0
        7   => 3,   // Day 7  requires Day 3
        28  => 7,   // Day 28 requires Day 7
        365 => 90,  // Booster 2 requires Booster 1
    ];

    /**
     * Execute the full Form 3 save transaction.
     *
     * This method contains the complete business logic from VaccinationRecordController::store()
     * starting from the DB::beginTransaction() call. Callers wrap it in try/catch for
     * ValidationException (→ 422) and generic Exception (→ 500).
     *
     * @return JsonResponse
     */
    public function saveVaccinationRecords(
        Authenticatable $actingUser,
        int             $clinicId,
        int             $patientId,
        int             $biteId,
        array           $validated,
        array           $doses,
        ?string         $signaturePath,
    ): JsonResponse {
        DB::beginTransaction();
        try {
            $userId = $actingUser->id;

            $treatmentIncident = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->lockForUpdate()
                ->find($biteId);

            if (!$treatmentIncident || $treatmentIncident->isAwaitingAssessment()) {
                throw ValidationException::withMessages([
                    'bite_id' => 'This exposure is awaiting Doctor assessment and cannot be treated yet.',
                ]);
            }

            $planType = TreatmentPlan::where('clinic_id', $clinicId)->where('bite_id', $biteId)->value('plan_type');

            $isCategory1 = ($treatmentIncident->exposure_category === 'I' || $treatmentIncident->severity === 'minor');

            if ($isCategory1) {
                $hasRabiesDose = collect($doses)->contains(fn($d) => !empty($d['date']) && !empty($d['vaccine_type']));
                if ($hasRabiesDose) {
                    throw ValidationException::withMessages([
                        'doses' => 'Rabies vaccine doses cannot be administered for Category I exposures.',
                    ]);
                }

                $latestConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->whereNull('dose_number')
                    ->where('status', 'completed')
                    ->latest('treatment_id')
                    ->first();
                $pOrders = $latestConsultation?->prophylaxis_orders ?? [];
                $tetCat = $pOrders['tetanus_category'] ?? null;
                $hasTetanusOrder = in_array($tetCat, ['ats', 'tt', 'ats_tt'], true)
                    && (
                        (!empty($pOrders['tetanus_passive']) && $pOrders['tetanus_passive'] !== 'none') ||
                        (!empty($pOrders['tetanus_vaccine']) && $pOrders['tetanus_vaccine'] !== 'none')
                    );

                $isNotAdministeredVisit = ($validated['visit_outcome'] ?? null) === 'not_administered';

                if (!$hasTetanusOrder || (empty($validated['prophylaxis_administrations']) && !$isNotAdministeredVisit)) {
                    throw ValidationException::withMessages([
                        'bite_id' => 'Form 3 administration is not permitted because no treatment was prescribed by the doctor.',
                    ]);
                }

                $doses = []; // Category I never has rabies vaccine doses
                $planType = 'no_vaccine';
            } else {
                // Auto-heal: if plan_type is missing but episode is active + has Doctor consultation
                if (!$planType && $treatmentIncident->status === 'active' && $treatmentIncident->isPrimary()) {
                    $hasConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                        ->where('bite_id', $biteId)->whereNull('dose_number')->exists();
                    if ($hasConsultation) {
                        TreatmentPlan::updateOrCreate(
                            ['bite_id' => $biteId],
                            [
                                'clinic_id' => $clinicId, 'patient_id' => $patientId,
                                'plan_type' => 'full_pep', 'status' => 'approved',
                                'ordered_dose_days' => [0, 3, 7],
                                'doctor_decision_notes' => 'Primary series - approved from Doctor consultation.',
                                'decided_by' => $treatmentIncident->created_by ?? $userId,
                                'decided_at' => now(),
                            ]
                        );
                        $planType = 'full_pep';
                    }
                }

                if (!in_array($planType, ['full_pep', 'single_booster', 'two_dose_booster'], true)) {
                    throw ValidationException::withMessages([
                        'bite_id' => 'This episode has no Doctor-approved vaccine treatment order.',
                    ]);
                }
            }

            // ── Promote nurse-verified exposure details to BiteIncident ──────────
            $modeMap = [
                'nibbling_uncovered' => 'nibbling_uncovered_skin',
                'nibbling_wounded'   => 'nibbling_broken_skin',
                'scratch_abrasion'   => 'scratch_abrasion',
                'transdermal_bite'   => 'transdermal_bite',
                'handling_ingestion' => 'handling_ingestion_raw_meat',
            ];
            $exposureTypeMap = [
                'nibbling_uncovered_skin' => 'lick',
                'nibbling_broken_skin'    => 'lick',
                'scratch_abrasion'        => 'scratch',
                'transdermal_bite'        => 'bite',
                'handling_ingestion_raw_meat' => 'other',
            ];

            $selectedModes = collect($validated['mode_of_exposure'] ?? [])
                ->filter(fn($v) => is_string($v) && isset($modeMap[$v]))->values();
            $verifiedMode = $selectedModes->isNotEmpty() ? $modeMap[$selectedModes->first()] : null;

            $selectedBodyParts = collect($validated['body_part_affected'] ?? [])
                ->filter(fn($v) => is_string($v) && in_array($v, [
                    'head_neck','upper_extremities','lower_extremities',
                    'trunk_torso','multiple_sites','other_parts','na_ingestion',
                ], true))->unique()->values();
            $verifiedBodyPart = $selectedBodyParts->count() > 1 ? 'multiple_sites' : $selectedBodyParts->first();

            $animalType      = strtolower(trim((string) ($validated['animal_type'] ?? '')));
            $animalTypeOther = trim((string) ($validated['animal_type_other'] ?? ''));
            if ($animalType !== '' && !in_array($animalType, ['dog', 'cat', 'other'], true)) {
                $animalTypeOther = $animalTypeOther ?: $animalType;
                $animalType      = 'other';
            }

            $animalAvailable = $validated['animal_available'] ?? null;
            $animalAvailableBool = match ($animalAvailable) {
                'yes', 'true', true, 1, '1' => true,
                'no', 'false', false, 0, '0' => false,
                default => null,
            };
            $animalCondition   = $validated['animal_condition'] ?? null;
            $observationStatus = match ($animalCondition) {
                'apparently_healthy','healthy' => 'healthy',
                'sick'                        => 'sick',
                'dead','died'                 => 'died',
                'unknown'                     => 'unknown',
                default                       => null,
            };

            $assessmentUpdates = array_filter([
                'bite_date'                 => $validated['date_of_exposure'] ?? null,
                'bite_place'                => $validated['place_of_exposure'] ?? null,
                'exposure_mode'             => $verifiedMode,
                'exposure_type'             => $verifiedMode ? $exposureTypeMap[$verifiedMode] : null,
                'body_part_exposed'         => $verifiedBodyPart,
                'site_number'               => $validated['body_part_detail'] ?? null,
                'animal_type'               => $animalType ?: null,
                'animal_type_others'        => $animalType === 'other' ? ($animalTypeOther ?: null) : null,
                'animal_status'             => $validated['animal_status'] ?? null,
                'animal_available'          => $animalAvailableBool,
                'animal_captured'           => $animalAvailableBool ?? false,
                'animal_observation_status' => $observationStatus,
                'animal_condition_reported' => $animalCondition ?: null,
            ], fn($v) => $v !== null && $v !== '');

            if ($assessmentUpdates) {
                $treatmentIncident->update($assessmentUpdates);
                $treatmentIncident->loadMissing('intake');
                $treatmentIncident->intake?->update([
                    'clinically_reviewed_by' => $userId,
                    'clinically_reviewed_at' => now(),
                ]);
                $treatmentIncident->refresh();
            }

            // ── Plan-type booster guards ─────────────────────────────────────────
            $hasNonDayZeroDose = collect($doses)->contains(fn($d) =>
                !empty($d['date']) && !empty($d['vaccine_type']) && ($d['period'] ?? '') !== 'Day 0'
            );
            if ($planType === 'single_booster' && $hasNonDayZeroDose) {
                throw ValidationException::withMessages([
                    'doses' => 'The Doctor ordered one booster only. No follow-up dose may be recorded for this incident.',
                ]);
            }
            if ($planType === 'two_dose_booster') {
                $hasInvalidBoosterDose = collect($doses)->contains(fn($d) =>
                    !empty($d['date']) && !empty($d['vaccine_type']) &&
                    !in_array($d['period'] ?? '', ['Day 0', 'Day 3'], true)
                );
                if ($hasInvalidBoosterDose) {
                    throw ValidationException::withMessages([
                        'doses' => 'The Doctor ordered a 2-dose booster regimen (Day 0 and Day 3). Day 7 is not indicated.',
                    ]);
                }
            }

            $isNotAdministeredVisit = ($validated['visit_outcome'] ?? null) === 'not_administered';
            if ($isNotAdministeredVisit) {
                $doses = [];
                $notAdminReason = trim((string) ($validated['not_administered_reason'] ?? 'Patient did not receive prescribed injection on this visit.'));
                $latestConsultationForVisit = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $biteId)
                    ->whereNull('dose_number')
                    ->where('status', 'completed')
                    ->latest('treatment_id')
                    ->first();

                $visitDate = $validated['date_treatment_started'] ?? Carbon::today()->toDateString();
                $medLabel = $latestConsultationForVisit?->prescribed_vaccine_type ?: 'PRESCRIBED_TREATMENT';

                if (empty($validated['prophylaxis_administrations'])) {
                    TreatmentRecord::updateOrCreate(
                        [
                            'clinic_id' => $clinicId,
                            'patient_id' => $patientId,
                            'bite_id' => $biteId,
                            'medication_given' => $medLabel,
                            'status' => 'cancelled',
                            'scheduled_date' => $visitDate,
                        ],
                        [
                            'vaccine_brand' => $latestConsultationForVisit?->prescribed_vaccine_type,
                            'treatment_date' => null,
                            'administered_by' => $userId,
                            'administered_at' => null,
                            'outcome' => 'not_administered',
                            'remarks' => $notAdminReason,
                        ]
                    );
                }
            }

            // ── Per-dose processing loop ─────────────────────────────────────────
            $savedDoseNumbers = [];

            foreach ($doses as $doseData) {
                if (empty($doseData['vaccine_type']) && empty($doseData['date'])) {
                    continue;
                }

                $doseNumber          = self::PERIOD_MAPPING[$doseData['period']] ?? 0;
                $selectedVaccineType = trim((string) ($doseData['vaccine_type'] ?? ''));
                $inventoryUnitsUsed  = (int) ($doseData['inventory_units_used'] ?? 0);

                if ($selectedVaccineType === '') {
                    throw ValidationException::withMessages([
                        'doses' => "Select a vaccine type for {$doseData['period']} before saving.",
                    ]);
                }

                // Prerequisite sequence validation
                if (isset(self::PREREQUISITE_MAP[$doseNumber])) {
                    $prereqDoseNumber = self::PREREQUISITE_MAP[$doseNumber];
                    $prereqLabel      = self::DOSE_NUMBER_TO_LABEL[$prereqDoseNumber] ?? "Dose {$prereqDoseNumber}";
                    $currentLabel     = self::DOSE_NUMBER_TO_LABEL[$doseNumber] ?? "Dose {$doseNumber}";

                    $prereqCompleted = TreatmentRecord::where('clinic_id', $clinicId)
                        ->where('patient_id', $patientId)->where('bite_id', $biteId)
                        ->where('dose_number', $prereqDoseNumber)->where('status', 'completed')
                        ->whereNotNull('treatment_date')->exists();

                    if (!$prereqCompleted) {
                        $prereqCompleted = collect($doses)->contains(fn($d) =>
                            isset(self::PERIOD_MAPPING[$d['period']]) &&
                            self::PERIOD_MAPPING[$d['period']] === $prereqDoseNumber &&
                            !empty($d['vaccine_type']) && !empty($d['date'])
                        );
                    }

                    if (!$prereqCompleted) {
                        throw ValidationException::withMessages([
                            'doses' => "Prerequisite dose [{$prereqLabel}] missing. {$currentLabel} cannot be recorded until {$prereqLabel} has been administered.",
                        ]);
                    }
                }

                if ($inventoryUnitsUsed < 0) {
                    throw ValidationException::withMessages([
                        'doses' => "Enter valid stock units (0 for shared open vial, or 1+ for new vial) for {$doseData['period']}.",
                    ]);
                }

                $existing = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)->where('bite_id', $biteId)
                    ->where('dose_number', $doseNumber)
                    ->where(fn($q) => $q->whereNotNull('treatment_date')
                        ->orWhereNotNull('administered_at')
                        ->orWhereNull('scheduled_by'))
                    ->whereNull('voided_at')
                    ->latest('treatment_id')->lockForUpdate()->first();

                $isExternal       = !empty($doseData['is_external']);
                $externalFacility = trim((string) ($doseData['external_facility_name'] ?? ''));
                $remarks          = $isExternal
                    ? trim($externalFacility ? "External facility: {$externalFacility}" : 'External facility')
                    : ($inventoryUnitsUsed === 0 ? 'Shared Open Vial' : null);

                $treatmentData = [
                    'clinic_id'              => $clinicId,
                    'patient_id'             => $patientId,
                    'bite_id'                => $biteId,
                    'dose_number'            => $doseNumber,
                    'treatment_date'         => $doseData['date'],
                    'scheduled_date'         => $doseData['date'],
                    'route'                  => $doseData['route'] ?? null,
                    'signature'              => $isExternal ? null : $signaturePath,
                    'signed_at'              => (!$isExternal && $signaturePath) ? now() : null,
                    'administered_by'        => $userId,
                    'administered_at'        => now(),
                    'status'                 => 'completed',
                    'is_external'            => $isExternal,
                    'external_facility_name' => $isExternal ? $externalFacility : null,
                    'vaccine_brand'          => $selectedVaccineType,
                    'vaccine_generic'        => $selectedVaccineType,
                    'inventory_units_used'   => $isExternal ? 0 : $inventoryUnitsUsed,
                    'remarks'                => $remarks,
                ];

                // Idempotency: already completed administrations must not be overwritten
                if ($existing && ($existing->status === 'completed' || !empty($existing->treatment_date))) {
                    $savedDoseNumbers[] = $doseNumber;
                    continue;
                } elseif ($existing && $existing->inventory_id) {
                    $selectedVaccineType = $existing->vaccine_brand ?: $existing->vaccine_generic ?: $selectedVaccineType;
                    $inventoryUnitsUsed  = (int) ($existing->inventory_units_used ?? $inventoryUnitsUsed);
                }

                $record = $existing ? tap($existing, fn($r) => $r->update($treatmentData)) : TreatmentRecord::create($treatmentData);

                if ($record->signed_at) {
                    \App\Models\AuditLog::log('signature.applied', 'TreatmentRecord', $record->treatment_id, [
                        'metadata'    => ['signature_path' => $record->signature, 'signed_at' => $record->signed_at->toIso8601String()],
                        'description' => 'Staff confirmed ownership and applied their electronic signature.',
                    ]);
                }
                $savedDoseNumbers[] = $doseNumber;

                if (!$record->inventory_id && !$isExternal) {
                    $usage = $this->inventoryUsageService->administerDoseAutomated(
                        $clinicId, $userId, (int) $record->treatment_id, $selectedVaccineType
                    );
                    $batch = $usage['batch'];
                    $record->update([
                        'inventory_id'         => $batch->inventory_id,
                        'batch_no'             => $batch->batch_number,
                        'expiration_date'      => $batch->expiration_date,
                        'inventory_units_used' => $usage['units_deducted'],
                        'administration_notes' => $usage['is_shared']
                            ? "Shared open vial (Dose {$usage['dose_index']} of {$usage['total_doses']}) from batch {$batch->batch_number}"
                            : "New vial opened (Dose 1 of {$usage['total_doses']}) from FIFO batch {$batch->batch_number}",
                        'remarks' => trim(($remarks ?: '') . " | Dose {$usage['dose_index']} of {$usage['total_doses']}" . ($usage['is_shared'] ? ' (Shared Open Vial)' : ' (New Vial)')),
                    ]);
                }
            }

            // ── Tagoloan Treatment Card upsert ───────────────────────────────────
            $modeOfExposure  = $treatmentIncident->exposure_mode;
            $bodyPartExposed = $treatmentIncident->body_part_exposed ?: $treatmentIncident->site_number;
            $exposureCategory = $treatmentIncident->exposure_category;

            $card     = TagoloanTreatmentCard::where('clinic_id', $clinicId)->where('patient_id', $patientId)
                ->when($biteId, fn($q) => $q->where('bite_id', $biteId))->latest()->first();
            $cardData = [
                'clinic_id'          => $clinicId,
                'patient_id'         => $patientId,
                'bite_id'            => $biteId,
                'card_date'          => $validated['date_treatment_started'] ?? $validated['date_of_exposure'] ?? now()->toDateString(),
                'registry_no'        => $validated['registry_no'] ?? null,
                'hospital_no'        => $validated['hospital_no'] ?? null,
                'referred_by'        => $validated['referred_by'] ?? null,
                ...($exposureCategory !== null ? ['exposure_category' => $exposureCategory] : []),
                'mode_of_exposure'   => $modeOfExposure,
                'body_part_exposed'  => $bodyPartExposed,
                'animal_type'        => $treatmentIncident->animal_type,
                'animal_type_others' => $treatmentIncident->animal_type_others,
                'past_bite_history'  => ($validated['past_history_bite'] ?? null) === 'yes',
                'past_bite_dates'    => $validated['past_bite_dates'] ?? null,
                'past_pep_completed' => in_array($validated['pep_completed'] ?? null, ['yes', 'completed', true, '1', 1], true),
                'icd10_code'         => $validated['icd_code'] ?? null,
                'created_by'         => $userId,
            ];

            $card ? $card->update(array_filter($cardData, fn($v) => !is_null($v)))
                  : ($card = TagoloanTreatmentCard::create($cardData));

            if ($treatmentIncident->intake && isset($validated['pep_completed'])) {
                $normalizedPriorPep = match ($validated['pep_completed']) {
                    'yes', 'completed' => 'completed',
                    'incomplete'       => 'incomplete',
                    'no', 'none'       => 'none',
                    'unsure'           => 'unsure',
                    default            => null,
                };
                if ($normalizedPriorPep) {
                    $treatmentIncident->intake->update(['prior_pep_status' => $normalizedPriorPep]);
                }
            }

            app(\App\Services\ProphylaxisService::class)->administer(
                $treatmentIncident->fresh(), $planType,
                $validated['prophylaxis_administrations'] ?? [], $userId
            );

            // ── Follow-up appointments ───────────────────────────────────────────
            $this->createFollowUpAppointments(
                $clinicId, $patientId, $biteId, $userId, $doses, $validated
            );

            // ── BiteIncident card sync ───────────────────────────────────────────
            if ($card) {
                $card->update(['bite_id' => $treatmentIncident->bite_id]);
            }

            // ── Auto-complete today's queue ──────────────────────────────────────
            $todayQueue = null;
            $prophylaxisItems = collect($validated['prophylaxis_administrations'] ?? []);
            $hasConfirmedProphylaxis = $prophylaxisItems->contains(fn ($item) => ($item['status'] ?? 'administered') === 'administered');
            $hasNotAdministeredProphylaxis = $prophylaxisItems->contains(fn ($item) => ($item['status'] ?? 'administered') === 'not_administered');
            $hasProphylaxisAdministered = $hasConfirmedProphylaxis;
            $hasAnyVisitActivity = !empty($savedDoseNumbers) || $hasConfirmedProphylaxis || $hasNotAdministeredProphylaxis || $isNotAdministeredVisit;

            if ($hasAnyVisitActivity) {
                if (!empty($validated['queue_id'] ?? null)) {
                    $todayQueue = Queue::where('clinic_id', $clinicId)
                        ->where('queue_id', $validated['queue_id'])
                        ->whereNull('deleted_at')->first();
                }
                if (!$todayQueue) {
                    $todayQueue = Queue::where('clinic_id', $clinicId)
                        ->where('patient_id', $patientId)->where('bite_id', $biteId)
                        ->where('queue_date', Carbon::today()->toDateString())
                        ->whereIn('status', ['waiting','called','in_consultation','serving','second_chance','final_recall'])
                        ->whereNull('deleted_at')->latest('queue_id')->first();
                }

                if ($todayQueue) {
                    $completionNotes = !empty($savedDoseNumbers)
                        ? 'Vaccination administered (Form 3 completed by Nurse) — Visit Completed.'
                        : ($hasConfirmedProphylaxis
                            ? 'Prescribed prophylaxis administered (Form 3 completed by Nurse) — Visit Completed.'
                            : 'Visit recorded as Not Administered (no injection given) — Pending Reassessment.');
                    QueueHistory::create([
                        'queue_id'     => $todayQueue->queue_id,
                        'clinic_id'    => $todayQueue->clinic_id,
                        'patient_id'   => $todayQueue->patient_id,
                        'action'       => 'completed',
                        'from_status'  => $todayQueue->status,
                        'to_status'    => 'completed',
                        'call_count'   => $todayQueue->call_count ?? 0,
                        'performed_by' => $userId,
                        'notes'        => $completionNotes,
                        'occurred_at'  => now(),
                    ]);
                    $todayQueue->update([
                        'status'             => 'completed',
                        'completed_at'       => now(),
                        'consultation_notes' => $todayQueue->consultation_notes
                            ? $todayQueue->consultation_notes . ' | ' . $completionNotes
                            : $completionNotes,
                        'recall_stage' => null,
                    ]);
                    Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
                }
            }

            if (!empty($savedDoseNumbers) || $hasConfirmedProphylaxis || $hasNotAdministeredProphylaxis) {
                // Mark related appointments completed
                if (!empty($savedDoseNumbers) || $hasConfirmedProphylaxis) {
                    Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('bite_id', $biteId)
                        ->whereIn('status', ['scheduled', 'confirmed', 'missed'])
                        ->where(function ($q) use ($savedDoseNumbers) {
                            $q->whereIn('dose_number', $savedDoseNumbers)
                              ->orWhere(function ($sub) use ($savedDoseNumbers) {
                                  $hasBoosterDose = !empty(array_intersect([90, 365, 100, 101], $savedDoseNumbers));
                                  if ($hasBoosterDose) {
                                      $sub->whereDate('scheduled_date', '<=', Carbon::today())
                                          ->where(fn($t) => $t->where('appointment_type', 'booster')->orWhere('notes', 'like', '%booster%'));
                                  } else {
                                      $sub->whereRaw('0 = 1');
                                  }
                              })
                              ->orWhereNull('dose_number');
                        })->update(['status' => 'completed']);
                }

                // Reset incorrectly completed future dose rows
                TreatmentRecord::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('bite_id', $biteId)
                    ->where('status', 'completed')->whereNotNull('dose_number')
                    ->whereNull('administered_at')->whereNull('treatment_date')
                    ->update(['status' => 'scheduled']);

                TreatmentRecord::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('bite_id', $biteId)
                    ->where('status', 'completed')->whereNotNull('dose_number')
                    ->whereNotIn('dose_number', $savedDoseNumbers)
                    ->where('scheduled_date', '>', Carbon::today()->toDateString())
                    ->update(['status' => 'scheduled', 'treatment_date' => null, 'administered_at' => null]);

                // Auto-complete appointments for administered doses
                if (!empty($savedDoseNumbers)) {
                    Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('bite_id', $biteId)
                        ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
                        ->where(function ($q) use ($savedDoseNumbers) {
                            $q->whereIn('dose_number', $savedDoseNumbers);
                            if (in_array(0, $savedDoseNumbers)) {
                                $q->orWhereNull('dose_number')->orWhere('appointment_type', 'consultation');
                            }
                        })->update(['status' => 'completed']);
                }

                // BiteIncident completion
                $incident = BiteIncident::find($biteId);
                if ($incident && $incident->status !== 'completed') {
                    $finalPlanType = TreatmentPlan::where('clinic_id', $clinicId)->where('bite_id', $incident->bite_id)->value('plan_type');
                    $isBooster     = $incident->isReExposure();
                    if ($finalPlanType === 'no_vaccine' && ($hasConfirmedProphylaxis || $hasNotAdministeredProphylaxis)) {
                        $incident->update(['status' => 'completed']);
                        TreatmentPlan::where('clinic_id', $clinicId)->where('bite_id', $incident->bite_id)->update(['status' => 'completed']);
                    } elseif ($finalPlanType === 'single_booster' && in_array(0, $savedDoseNumbers)) {
                        $incident->update(['status' => 'completed']);
                    } elseif ($isBooster && in_array(3, $savedDoseNumbers)) {
                        $incident->update(['status' => 'completed']);
                    } elseif (!$isBooster && in_array(7, $savedDoseNumbers)) {
                        $incident->update(['status' => 'completed']);
                    }
                }
            }

            Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");

            DB::commit();

            return response()->json([
                'message'       => 'Vaccination records saved successfully',
                'records_count' => count($doses),
                'queue'         => $todayQueue?->fresh(),
            ], 201);

        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'message' => $e->validator->errors()->first(),
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Store vaccination records error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to save vaccination records',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ── Follow-up appointment creation (extracted private helper) ────────────

    /**
     * Auto-create follow-up appointments (Day 3, 7) after Day 0 is recorded.
     * Exact logic from VaccinationRecordController::createFollowUpAppointments().
     */
    public function createFollowUpAppointments(
        int   $clinicId,
        int   $patientId,
        int   $biteId,
        int   $userId,
        array $doses,
        array $validated,
    ): void {
        $hasDay0 = false;
        $day0Date = null;
        $isAdministeringDay0Now = false;

        foreach ($doses as $dose) {
            if (!empty($dose['date']) && !empty($dose['vaccine_type']) && in_array($dose['period'], ['Day 0', 'day_0'], true)) {
                $hasDay0  = true;
                $day0Date = Carbon::parse($dose['date']);
                $isAdministeringDay0Now = true;
                break;
            }
        }

        if (!$hasDay0) {
            $pastDay0 = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)->where('bite_id', $biteId)
                ->where('dose_number', 0)->where('status', 'completed')->whereNotNull('treatment_date')
                ->latest('treatment_date')->first();
            if ($pastDay0) {
                $day0Date = Carbon::parse($pastDay0->treatment_date);
                $hasDay0  = true;
            } else {
                return;
            }
        }

        $clinic         = Clinic::find($clinicId);
        $treatmentPlan  = TreatmentPlan::where('clinic_id', $clinicId)->where('bite_id', $biteId)->first();

        // Single booster → cancel any existing follow-up appointments for the episode
        if ($treatmentPlan?->plan_type === 'single_booster') {
            Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('bite_id', $biteId)
                ->where('dose_number', '>', 0)->whereIn('status', ['scheduled', 'confirmed', 'missed'])
                ->update(['status' => 'cancelled', 'notes' => 'Cancelled: Doctor ordered a single-booster plan.']);
            return;
        }

        $isReExposure = false;
        if (!empty($biteId)) {
            $incident     = BiteIncident::find($biteId);
            $isReExposure = $incident && $incident->isReExposure();
        }
        if ($treatmentPlan?->plan_type === 'full_pep') {
            $isReExposure = false;
        }

        if ($isReExposure) {
            $schedule      = [['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3]];
            $doseIntervals = [3 => 3];
            Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)->where('bite_id', $biteId)
                ->whereIn('dose_number', [7, 28, 90, 365])->where('status', 'scheduled')
                ->update(['status' => 'cancelled', 'notes' => 'Cancelled: Re-exposure 2-Dose Booster protocol completed']);
        } else {
            $schedule      = [
                ['period' => 'Day 3', 'days_after' => 3, 'dose_number' => 3],
                ['period' => 'Day 7', 'days_after' => 7, 'dose_number' => 7],
            ];
            $doseIntervals = [3 => 3, 7 => 4];
        }

        $previousResolvedDate = $day0Date->copy();

        foreach ($schedule as $followUp) {
            $doseNum          = $followUp['dose_number'];
            $daysAfterDay0    = $followUp['days_after'];
            $intervalFromPrev = $doseIntervals[$doseNum] ?? 3;

            $alreadyGiven      = false;
            $formSpecifiedDate = null;

            foreach ($doses as $dose) {
                if ($dose['period'] === $followUp['period']) {
                    if (!empty($dose['date']) && !empty($dose['vaccine_type'])) {
                        $alreadyGiven         = true;
                        $previousResolvedDate = Carbon::parse($dose['date']);
                    } elseif (!empty($dose['date'])) {
                        $formSpecifiedDate = Carbon::parse($dose['date']);
                    }
                    break;
                }
            }

            if (!$alreadyGiven) {
                $completedDose = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)->where('bite_id', $biteId)
                    ->where('dose_number', $doseNum)->where('status', 'completed')->whereNotNull('treatment_date')->first();
                if ($completedDose) {
                    $alreadyGiven         = true;
                    $previousResolvedDate = Carbon::parse($completedDose->treatment_date);
                }
            }
            if ($alreadyGiven) continue;

            $standardDay0Ideal  = $day0Date->copy()->addDays($daysAfterDay0);
            $minIntervalIdeal   = $previousResolvedDate->copy()->addDays($intervalFromPrev);
            $calculatedIdeal    = $minIntervalIdeal->greaterThan($standardDay0Ideal) ? $minIntervalIdeal : $standardDay0Ideal;
            $idealDate          = ($formSpecifiedDate && !$isAdministeringDay0Now && $formSpecifiedDate->gte($standardDay0Ideal))
                ? $formSpecifiedDate
                : $calculatedIdeal;
            $resolution         = $this->scheduleService->resolveScheduleDate($clinicId, $idealDate, $doseNum);
            $resolvedDate       = $resolution['scheduled_date'];
            $previousResolvedDate = $resolvedDate->copy();

            $noteText = $resolution['drift_days'] !== 0
                ? "Auto-scheduled: {$followUp['period']} dose ({$resolution['adjustment_reason']})"
                : "Auto-scheduled: {$followUp['period']} dose";

            $existing = Appointment::where('clinic_id', $clinicId)->where('patient_id', $patientId)
                ->where('bite_id', $biteId)->where('dose_number', $doseNum)
                ->where('status', '!=', 'cancelled')->latest('appointment_id')->first();

            if ($existing) {
                $existing->update([
                    'appointment_date'           => $resolvedDate->toDateString(),
                    'scheduled_date'             => $resolvedDate->toDateString(),
                    'ideal_date'                 => $idealDate->toDateString(),
                    'schedule_drift_days'        => $resolution['drift_days'],
                    'schedule_adjustment_reason' => $resolution['adjustment_reason'],
                    'notes'                      => $noteText,
                ]);
                continue;
            }

            $appt = Appointment::create([
                'clinic_id'                  => $clinicId,
                'patient_id'                 => $patientId,
                'bite_id'                    => $biteId,
                'appointment_date'           => $resolvedDate->toDateString(),
                'scheduled_date'             => $resolvedDate->toDateString(),
                'ideal_date'                 => $idealDate->toDateString(),
                'schedule_drift_days'        => $resolution['drift_days'],
                'schedule_adjustment_reason' => $resolution['adjustment_reason'],
                'appointment_time'           => $clinic->opening_time ?? '08:00:00',
                'appointment_type'           => 'follow_up_vaccination',
                'dose_number'                => $followUp['dose_number'],
                'status'                     => 'scheduled',
                'notes'                      => $noteText,
                'created_by'                 => $userId,
            ]);

            app(\App\Services\NotificationService::class)->notifyAppointmentEvent($appt, 'scheduled', request()->user());

            $patient = Patient::with('accounts')->find($patientId);
            if ($patient && $patient->accounts->isNotEmpty()) {
                foreach ($patient->accounts as $account) {
                    $accId = $account->patient_account_id ?? $account->id;
                    $msg   = $resolution['drift_days'] !== 0
                        ? "{$followUp['period']} vaccination scheduled for {$patient->name} on " . $resolvedDate->format('M d, Y') . " ({$resolution['adjustment_reason']})."
                        : "{$followUp['period']} vaccination scheduled for {$patient->name} on " . $resolvedDate->format('M d, Y') . ".";

                    Notification::create([
                        'patient_id'         => $patientId,
                        'patient_account_id' => $accId,
                        'appointment_id'     => $appt->appointment_id,
                        'type'               => 'vaccination_reminder',
                        'message'            => $msg,
                        'status'             => 'pending',
                        'send_time'          => now(),
                    ]);
                    Cache::forget("mobile:notifications:account:{$accId}:page:1");
                }
            }

            Log::info("Created follow-up appointment for Patient #{$patientId}: {$followUp['period']} on {$resolvedDate->toDateString()} (Ideal: {$idealDate->toDateString()}, Drift: {$resolution['drift_days']})");
        }
    }
}
