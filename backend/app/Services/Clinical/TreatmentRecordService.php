<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\TagoloanTreatmentCard;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\ProphylaxisService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class TreatmentRecordService
{
    public function __construct(
        protected ProphylaxisService $prophylaxisService
    ) {}

    /**
     * Get patient clinical treatment details, history, and Form 2 prefill.
     */
    public function getPatientTreatmentDetails(int $clinicId, int $patientId, ?int $requestedBiteId = null): array
    {
        $patient = Patient::with('details')
            ->where('clinic_id', $clinicId)
            ->findOrFail($patientId);

        $activeIncident = null;
        if ($requestedBiteId) {
            $activeIncident = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->find($requestedBiteId);
        } else {
            $activeIncident = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['active', 'awaiting_assessment'])
                ->latest('bite_id')
                ->first();
            if (!$activeIncident) {
                $activeIncident = BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->latest('bite_id')
                    ->first();
            }
        }
        $activeIncident?->loadMissing('intake');

        $latestTreatment = null;
        $completedConsultations = collect();
        $scheduledConsultation = null;
        if ($activeIncident) {
            $completedConsultations = TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $activeIncident->bite_id)
                ->whereNull('dose_number')->whereNull('medication_given')
                ->where('status', 'completed')
                ->where(function ($q) {
                    $q->whereNotNull('nature_of_visit')
                      ->orWhereNotNull('diagnosis')
                      ->orWhereNotNull('chief_complaints');
                })
                ->orderBy('consultation_date', 'asc')
                ->orderBy('treatment_id', 'asc')
                ->get();

            $scheduledConsultation = TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $activeIncident->bite_id)
                ->whereNull('dose_number')->whereNull('medication_given')
                ->where('status', 'scheduled')
                ->latest('treatment_id')
                ->first();

            $latestCompleted = $completedConsultations->last();
            if ($scheduledConsultation && (!$latestCompleted || (int) $scheduledConsultation->treatment_id > (int) $latestCompleted->treatment_id)) {
                $latestTreatment = $scheduledConsultation;
            } else {
                $latestTreatment = $latestCompleted ?? TreatmentRecord::with('administeredBy')
                    ->where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)
                    ->where('bite_id', $activeIncident->bite_id)
                    ->whereNull('dose_number')->whereNull('medication_given')
                    ->latest('consultation_date')
                    ->latest('treatment_id')
                    ->first();
            }
        }
        if (!$activeIncident && !$latestTreatment) {
            $latestTreatment = TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereNull('dose_number')->whereNull('medication_given')
                ->latest('consultation_date')
                ->latest('treatment_id')
                ->first();
        }

        if ($latestTreatment) {
            $adminUser = $latestTreatment->administeredBy;
            if ($adminUser && in_array(strtolower($adminUser->role ?? ''), ['doctor', 'triage', 'physician', 'triage_doctor'], true)) {
                if (!empty($adminUser->name) && empty($latestTreatment->provider_name)) {
                    $latestTreatment->provider_name = $adminUser->name;
                }
            }
        }

        $treatments = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc')
            ->get();

        $episodeHistory = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->with([
                'treatmentPlan:treatment_plan_id,bite_id,plan_type,status,ordered_dose_days,decided_at',
                'treatmentRecords' => function ($records) {
                    $records->whereNotNull('dose_number')
                        ->where('status', 'completed')
                        ->orderBy('dose_number');
                },
            ])
            ->latest('bite_id')
            ->get()
            ->map(function (BiteIncident $incident) {
                return [
                    'bite_id' => $incident->bite_id,
                    'episode_number' => $incident->episode_number,
                    'bite_date' => $incident->bite_date?->toDateString(),
                    'status' => $incident->status,
                    'plan' => $incident->treatmentPlan ? [
                        'plan_type' => $incident->treatmentPlan->plan_type,
                        'status' => $incident->treatmentPlan->status,
                        'ordered_dose_days' => $incident->treatmentPlan->ordered_dose_days,
                        'decided_at' => $incident->treatmentPlan->decided_at?->toDateString(),
                    ] : null,
                    'completed_dose_days' => $incident->treatmentRecords
                        ->pluck('dose_number')
                        ->values(),
                ];
            });

        $hasAdministeredVaccine = false;
        if ($activeIncident) {
            $hasAdministeredVaccine = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $activeIncident->bite_id)
                ->where(fn ($q) => $q->whereNotNull('dose_number')->orWhereNotNull('medication_given'))
                ->where(function($q) {
                    $q->where('status', 'completed')
                      ->orWhere(function($sub) {
                          $sub->whereNotNull('treatment_date')->whereNotIn('status', ['scheduled', 'cancelled']);
                      });
                })
                ->exists();
        }

        $requiresReExposureDecision = $activeIncident
            && $activeIncident->isAwaitingAssessment()
            && $this->hasCompletedPrimaryDayZeroToSeven($clinicId, $patientId, $activeIncident);

        $statusSummary = $patient->resolveEpisodeStatusSummary();
        $pendingSummary = $statusSummary['pending_treatment_summary'] ?? null;

        $previousConsultationsSummary = $completedConsultations->map(function (TreatmentRecord $c) use ($activeIncident) {
            $pOrders = is_array($c->prophylaxis_orders) ? $c->prophylaxis_orders : [];
            $cat = $pOrders['consultation_exposure_category'] ?? $activeIncident?->exposure_category ?? $activeIncident?->bite_category ?? 'II';
            $tetCat = strtolower(trim((string) ($pOrders['tetanus_category'] ?? '')));
            $prescribedTt = in_array($tetCat, ['tt', 'ats_tt'], true) && !empty($pOrders['tetanus_vaccine']) && $pOrders['tetanus_vaccine'] !== 'none'
                ? $pOrders['tetanus_vaccine']
                : null;
            $prescribedAts = in_array($tetCat, ['ats', 'ats_tt'], true) && !empty($pOrders['tetanus_passive']) && $pOrders['tetanus_passive'] !== 'none'
                ? $pOrders['tetanus_passive']
                : null;
            $prescribedRig = !empty($pOrders['rig']) && $pOrders['rig'] !== 'none'
                ? $pOrders['rig']
                : null;

            return [
                'treatment_id' => $c->treatment_id,
                'consultation_date' => $c->consultation_date ? Carbon::parse($c->consultation_date)->toDateString() : null,
                'consultation_time' => $c->consultation_time,
                'exposure_category' => $cat,
                'blood_pressure' => $c->blood_pressure,
                'temperature' => $c->temperature,
                'height' => $c->height,
                'weight' => $c->weight,
                'nature_of_visit' => $c->nature_of_visit,
                'chief_complaints' => $c->chief_complaints,
                'diagnosis' => $c->diagnosis,
                'medication_treatment' => $c->medication_treatment,
                'prescribed_vaccine_type' => $c->prescribed_vaccine_type,
                'prophylaxis_orders' => $pOrders,
                'prescribed_tt' => $prescribedTt,
                'prescribed_ats' => $prescribedAts,
                'prescribed_rig' => $prescribedRig,
                'provider_name' => $c->provider_name ?: $c->administeredBy?->name,
                'attending_provider' => $c->attending_provider,
                'actions_taken' => $c->actions_taken,
                'pertinent_history' => $c->pertinent_history,
                'referred_to' => $c->referred_to,
                'reason_for_referral' => $c->reason_for_referral,
                'reassessment_decision' => $pOrders['reassessment_decision'] ?? null,
                'reassessment_notes' => $pOrders['reassessment_notes'] ?? null,
                'outcome' => ($c->outcome === 'Transferred/Referred'
                    || (!empty($c->referred_to) && TreatmentRecord::isExternalReferralDestination($c->referred_to))
                    || ($c->mode_of_transaction === 'referral' && !empty($c->referred_to))
                    || (!empty($c->actions_taken) && str_contains(strtolower($c->actions_taken), 'transferred/referred')))
                    ? 'Transferred/Referred'
                    : $c->outcome,
            ];
        })->values();

        $latestCompleted = $completedConsultations->last();
        $isPendingTreatmentReassessment = $completedConsultations->isNotEmpty()
            && !$hasAdministeredVaccine
            && (
                ($scheduledConsultation && $latestCompleted && (int) $scheduledConsultation->treatment_id > (int) $latestCompleted->treatment_id)
                || ($statusSummary['treatment_status'] ?? '') === 'returned_for_reassessment'
                || !empty($pendingSummary['is_returning_from_prior_visit'])
            );

        return [
            'patient' => $patient,
            'latest_treatment' => $latestTreatment,
            'treatments' => $treatments,
            'previous_consultations' => $previousConsultationsSummary,
            'is_pending_treatment_reassessment' => $isPendingTreatmentReassessment,
            'pending_treatment_summary' => $pendingSummary,
            'case_status' => $statusSummary['case_status'] ?? null,
            'visit_status' => $statusSummary['visit_status'] ?? null,
            'treatment_status' => $statusSummary['treatment_status'] ?? null,
            'has_administered_vaccine' => $hasAdministeredVaccine,
            'is_returning_new_bite' => (bool) ($activeIncident?->isReExposure()),
            'requires_re_exposure_decision' => $requiresReExposureDecision,
            'active_bite_incident' => $activeIncident,
            'exposure_category' => $activeIncident?->exposure_category
                ?? ($activeIncident ? TagoloanTreatmentCard::where('clinic_id', $clinicId)
                    ->where('patient_id', $patientId)->where('bite_id', $activeIncident->bite_id)
                    ->latest()->first()?->exposure_category : null),
            'episode_history' => $episodeHistory,
        ];
    }

    /**
     * Store Form 2 consultation and manage triage/queue transition.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function storeConsultation(int $clinicId, array $validated, User $user, ?int $requestedBiteId = null): array
    {
        if (!empty($validated['prescribed_vaccine_type'])
            && ProphylaxisService::inventoryMedication($validated['prescribed_vaccine_type'])) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Prescribe ATS, TT or ERIG in the separate prophylaxis section, not as a rabies vaccine.',
                ],
            ];
        }

        $activeBiteId = $requestedBiteId;
        $queueForEpisode = null;
        if (!$activeBiteId && !empty($validated['queue_id'])) {
            $queueForEpisode = Queue::where('clinic_id', $clinicId)
                ->where('queue_id', $validated['queue_id'])
                ->where('patient_id', $validated['patient_id'])
                ->whereNull('deleted_at')
                ->first();
            $activeBiteId = $queueForEpisode?->bite_id;
        }

        $activeIncident = null;
        if ($activeBiteId) {
            $activeIncident = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->find($activeBiteId);
        } else {
            $activeIncident = BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->whereIn('status', ['active', 'awaiting_assessment'])
                ->latest('bite_id')
                ->first();

            if (!$activeIncident && (!$queueForEpisode || $queueForEpisode->bite_id !== null)) {
                $activeIncident = BiteIncident::where('clinic_id', $clinicId)
                    ->where('patient_id', $validated['patient_id'])
                    ->where('status', 'completed')
                    ->where('severity', 'minor')
                    ->latest('bite_id')
                    ->first();
            }
        }

        if (!$activeIncident && $queueForEpisode && $queueForEpisode->visit_type === 'new_case') {
            $episodeNumber = (BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->max('episode_number') ?? 0) + 1;

            $activeIncident = BiteIncident::create([
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'episode_number' => $episodeNumber,
                'episode_type' => 'pending_assessment',
                'is_previously_vaccinated' => null,
                'bite_date' => $validated['consultation_date'] ?? Carbon::today()->toDateString(),
                'bite_place' => null,
                'site_washed' => null,
                'exposure_type' => 'unassessed',
                'exposure_mode' => null,
                'severity' => 'unassessed',
                'animal_type' => null,
                'animal_status' => 'unassessed',
                'animal_available' => null,
                'site_number' => null,
                'body_part_exposed' => null,
                'laterality' => null,
                'wound_description' => null,
                'status' => 'awaiting_assessment',
                'remarks' => 'Episode linked during Form 2; exposure details await nurse Form 3 assessment.',
                'created_by' => $user->id,
            ]);

            $queueForEpisode->update(['bite_id' => $activeIncident->bite_id]);
        }

        if (!$activeIncident) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'This queue ticket is not linked to a bite episode. Return to registration and record the exposure first.',
                ],
            ];
        }

        $activeIncident->loadMissing('intake');

        $requiresReExposureDecision = $activeIncident->isAwaitingAssessment()
            && $this->hasCompletedPrimaryDayZeroToSeven($clinicId, (int) $validated['patient_id'], $activeIncident);

        if ($requiresReExposureDecision && empty($validated['treatment_plan'])) {
            return [
                'status' => 422,
                'data' => [
                    'message' => 'Record the Doctor treatment decision for this re-exposure episode before referring it to Treatment.',
                ],
            ];
        }

        $hasAdministeredVaccine = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $activeIncident->bite_id)
            ->where(fn ($q) => $q->whereNotNull('dose_number')->orWhereNotNull('medication_given'))
            ->where(function($q) {
                $q->where('status', 'completed')
                  ->orWhere(function($sub) {
                      $sub->whereNotNull('treatment_date')->whereNotIn('status', ['scheduled', 'cancelled']);
                  });
            })
            ->exists();

        if ($hasAdministeredVaccine) {
            $existingConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->where('bite_id', $activeIncident->bite_id)
                ->whereNull('dose_number')->whereNull('medication_given')
                ->first();

            if ($existingConsultation) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Clinical assessment is locked because vaccination has already been administered for this episode. Please use the Addendum section to record additional clinical notes.',
                        'locked' => true,
                    ],
                ];
            }
        }

        $reassessmentDecision = $validated['reassessment_decision'] ?? null;
        $reassessmentNotes = !empty($validated['reassessment_notes']) ? trim((string) $validated['reassessment_notes']) : null;

        $priorCompletedConsultations = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $activeIncident->bite_id)
            ->whereNull('dose_number')->whereNull('medication_given')
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->whereNotNull('nature_of_visit')
                  ->orWhereNotNull('diagnosis')
                  ->orWhereNotNull('chief_complaints');
            })
            ->orderBy('consultation_date', 'asc')
            ->orderBy('treatment_id', 'asc')
            ->get();

        $latestPriorCompleted = $priorCompletedConsultations->last();

        $existingScheduled = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $validated['patient_id'])
            ->where('bite_id', $activeIncident->bite_id)
            ->whereNull('dose_number')->whereNull('medication_given')
            ->where('status', 'scheduled')
            ->latest('treatment_id')
            ->first();

        $submittedConsultationDate = $validated['consultation_date'] ?? Carbon::now('Asia/Manila')->toDateString();
        $isLaterDateConsultation = $latestPriorCompleted
            && $latestPriorCompleted->consultation_date
            && Carbon::parse($latestPriorCompleted->consultation_date)->toDateString() !== Carbon::parse($submittedConsultationDate)->toDateString();
        $hasScheduledReassessmentRow = $latestPriorCompleted
            && $existingScheduled
            && (int) $existingScheduled->treatment_id > (int) $latestPriorCompleted->treatment_id;

        $isReassessmentSubmission = !empty($reassessmentDecision)
            || $isLaterDateConsultation
            || $hasScheduledReassessmentRow;

        if ($reassessmentDecision === 'continue' && $latestPriorCompleted) {
            if (!isset($validated['exposure_category'])) {
                $priorOrders = is_array($latestPriorCompleted->prophylaxis_orders) ? $latestPriorCompleted->prophylaxis_orders : [];
                $validated['exposure_category'] = $priorOrders['consultation_exposure_category'] ?? $activeIncident->exposure_category;
            }
            if (empty($validated['prescribed_vaccine_type']) && !empty($latestPriorCompleted->prescribed_vaccine_type)) {
                $validated['prescribed_vaccine_type'] = $latestPriorCompleted->prescribed_vaccine_type;
                $validated['medication_treatment'] = $latestPriorCompleted->medication_treatment ?: $latestPriorCompleted->prescribed_vaccine_type;
            }
            if (empty($validated['prophylaxis_orders']) && !empty($latestPriorCompleted->prophylaxis_orders)) {
                $validated['prophylaxis_orders'] = $latestPriorCompleted->prophylaxis_orders;
            }
        } elseif (in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true)) {
            $validated['prescribed_vaccine_type'] = null;
            $validated['medication_treatment'] = $reassessmentDecision === 'discontinue'
                ? 'Previous prescription discontinued upon reassessment'
                : 'No injection required upon reassessment';
            $validated['treatment_plan'] = 'no_vaccine';
            $validated['prophylaxis_orders'] = array_merge($validated['prophylaxis_orders'] ?? [], [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ]);
        }

        $cleanOrdersForValidation = is_array($validated['prophylaxis_orders'] ?? null)
            ? collect($validated['prophylaxis_orders'])->only([
                'tetanus_category', 'tetanus_vaccine', 'tetanus_passive', 'rig',
                'tetanus_history', 'tetanus_last_dose', 'rig_weight_kg', 'rig_indication', 'notes',
            ])->toArray()
            : [];

        $this->prophylaxisService->validateOrders(
            $cleanOrdersForValidation, $validated['treatment_plan'] ?? 'full_pep'
        );

        $submittedCategory = $validated['exposure_category'] ?? null;
        $effectiveCategory = $submittedCategory ?? $activeIncident->exposure_category;
        $isCategory1 = ($effectiveCategory === 'I');

        $pOrders = $cleanOrdersForValidation;
        $tetCat = $pOrders['tetanus_category'] ?? null;
        $hasTetanusOrder = !in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true)
            && in_array($tetCat, ['ats', 'tt', 'ats_tt'], true)
            && (
                (!empty($pOrders['tetanus_passive']) && $pOrders['tetanus_passive'] !== 'none') ||
                (!empty($pOrders['tetanus_vaccine']) && $pOrders['tetanus_vaccine'] !== 'none')
            );
        $hasRigOrder = !in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true)
            && !empty($pOrders['rig']) && $pOrders['rig'] !== 'none';

        $noInjectionDecision = in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true);
        $prescribedVaccine = ($isCategory1 || $noInjectionDecision) ? null : ($validated['prescribed_vaccine_type'] ?? null);
        $medicationTreatment = $noInjectionDecision
            ? ($reassessmentDecision === 'discontinue' ? 'Previous prescription discontinued upon reassessment' : 'No injection required upon reassessment')
            : ($isCategory1 ? 'No PEP vaccine prescribed' : ($validated['medication_treatment'] ?? null));

        $isCompleteReferral = filter_var($validated['complete_referral'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $referralFacilityInput = trim((string) ($validated['transferred_to_facility'] ?? $validated['referred_to'] ?? ''));
        $referralReasonInput = trim((string) ($validated['transfer_reason'] ?? $validated['reason_for_referral'] ?? ''));
        $transferDate = !empty($validated['transfer_date']) ? Carbon::parse($validated['transfer_date']) : Carbon::now('Asia/Manila');

        $referredToFacility = $referralFacilityInput;
        $isExternalDestination = TreatmentRecord::isExternalReferralDestination($referredToFacility);

        $isReferralOut = $isCompleteReferral
            || (!empty($validated['is_referral']) && $isExternalDestination)
            || (($validated['mode_of_transaction'] ?? '') === 'referral' && $isExternalDestination)
            || (($validated['outcome'] ?? null) === 'Transferred/Referred');

        if ($isReferralOut) {
            $planType = 'no_vaccine';
        } elseif ($isCategory1 || $noInjectionDecision) {
            $planType = 'no_vaccine';
        } else {
            $planType = $validated['treatment_plan'] ?? null;
            if (!$planType && !$isReferralOut) {
                $planType = 'full_pep';
            }
        }

        $noInjectionRequired = !$isReferralOut && (
            ($planType === 'no_vaccine' && !$hasTetanusOrder && !$hasRigOrder) || $noInjectionDecision
        );

        $enrichedProphylaxisOrders = array_merge($pOrders, array_filter([
            'consultation_exposure_category' => $effectiveCategory,
            'consultation_treatment_plan' => $planType,
            'reassessment_decision' => $reassessmentDecision,
            'reassessment_notes' => $reassessmentNotes,
        ], fn ($v) => $v !== null));

        $actionsTakenText = $validated['actions_taken'] ?? null;
        if ($reassessmentNotes) {
            $decisionLabel = match ($reassessmentDecision) {
                'continue' => 'Continued Previous Prescription',
                'modify' => 'Modified Prescription',
                'discontinue' => 'Discontinued Previous Prescription',
                'no_injection_required' => 'Completed Without Injection',
                default => 'Reassessment Note',
            };
            $actionsTakenText = trim(($actionsTakenText ? $actionsTakenText . ' | ' : '') . "[Reassessment — {$decisionLabel}]: {$reassessmentNotes}");
        }

        $recordPayload = [
            'clinic_id' => $clinicId,
            'patient_id' => $validated['patient_id'],
            'bite_id' => $activeIncident->bite_id,
            'treatment_date' => !empty($validated['consultation_date'])
                ? Carbon::parse($validated['consultation_date'])
                : Carbon::now('Asia/Manila'),
            'consultation_date' => $submittedConsultationDate,
            'consultation_time' => $validated['consultation_time'] ?? Carbon::now('Asia/Manila')->format('H:i'),
            'mode_of_transaction' => in_array($validated['mode_of_transaction'] ?? '', ['walk-in', 'visited', 'referral'], true)
                ? $validated['mode_of_transaction']
                : ($isReferralOut ? 'referral' : 'walk-in'),
            'referred_from' => $validated['referred_from'] ?? null,
            'referred_to' => $referredToFacility ?: ($validated['referred_to'] ?? null),
            'referred_by' => $validated['referred_by'] ?? null,
            'pertinent_history' => $validated['pertinent_history'] ?? null,
            'reason_for_referral' => $referralReasonInput ?: ($validated['reason_for_referral'] ?? null),
            'actions_taken' => $isReferralOut
                ? trim(($actionsTakenText ? $actionsTakenText . ' | ' : '') . "Transferred/Referred to {$referredToFacility}" . ($referralReasonInput ? " ({$referralReasonInput})" : ''))
                : $actionsTakenText,
            'blood_pressure' => $validated['blood_pressure'] ?? null,
            'temperature' => $validated['temperature'] ?? null,
            'height' => $validated['height'] ?? null,
            'weight' => $validated['weight'] ?? null,
            'nature_of_visit' => $validated['nature_of_visit'],
            'consultation_types' => $validated['consultation_types'],
            'chief_complaints' => $validated['chief_complaints'],
            'diagnosis' => $validated['diagnosis'] ?? null,
            'medication_treatment' => $medicationTreatment,
            'prescribed_vaccine_type' => $prescribedVaccine,
            'prophylaxis_orders' => $enrichedProphylaxisOrders,
            'laboratory_findings' => $validated['laboratory_findings'] ?? null,
            'performed_lab_test' => $validated['performed_lab_test'] ?? null,
            'provider_name' => $validated['provider_name'] ?? $user->name,
            'attending_provider' => $validated['attending_provider'] ?? null,
            'outcome' => $isReferralOut ? 'Transferred/Referred' : ($noInjectionRequired ? 'completed_without_injection' : ($validated['outcome'] ?? null)),
            'status' => 'completed',
            'administered_by' => $user->id,
        ];

        if ($existingScheduled) {
            unset($recordPayload['administered_by']);
            $existingScheduled->update($recordPayload);
            $treatmentRecord = $existingScheduled;
        } elseif ($isReassessmentSubmission) {
            // Preserve previous completed consultation records untouched; create a new consultation record for the reassessment visit.
            $treatmentRecord = TreatmentRecord::create($recordPayload);
        } elseif ($latestPriorCompleted) {
            unset($recordPayload['administered_by']);
            $latestPriorCompleted->update($recordPayload);
            $treatmentRecord = $latestPriorCompleted;
        } else {
            $treatmentRecord = TreatmentRecord::create($recordPayload);
        }

        if ($isReassessmentSubmission && $latestPriorCompleted) {
            \App\Models\AuditLog::log('consultation.reassessed', 'TreatmentRecord', $treatmentRecord->treatment_id, [
                'metadata' => [
                    'bite_id' => $activeIncident->bite_id,
                    'previous_consultation_id' => $latestPriorCompleted->treatment_id,
                    'new_consultation_id' => $treatmentRecord->treatment_id,
                    'reassessment_decision' => $reassessmentDecision ?? 'reassessed',
                    'reassessment_notes' => $reassessmentNotes,
                    'previous_exposure_category' => $latestPriorCompleted->prophylaxis_orders['consultation_exposure_category'] ?? null,
                    'new_exposure_category' => $effectiveCategory,
                ],
                'description' => "Doctor recorded reassessment consultation for Case {$activeIncident->case_number}.",
            ]);
        }

        if (isset($validated['exposure_category'])) {
            $activeIncident->update(['severity' => match ($validated['exposure_category']) {
                'I' => 'minor', 'II' => 'moderate', 'III' => 'severe',
            }]);
            Cache::forget("web:bite-cases:map-data:clinic:{$clinicId}");
        }
        if (!$activeIncident->confirmed_at) {
            $activeIncident->update([
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);
        }

        if ($planType) {
            $orderedDoseDays = match ($planType) {
                'full_pep' => [0, 3, 7],
                'single_booster' => [0],
                'two_dose_booster' => [0, 3],
                default => [],
            };

            $planStatus = $noInjectionRequired ? 'completed' : 'approved';

            TreatmentPlan::updateOrCreate(
                ['bite_id' => $activeIncident->bite_id],
                [
                    'clinic_id' => $clinicId,
                    'patient_id' => $validated['patient_id'],
                    'plan_type' => $planType,
                    'status' => $planStatus,
                    'ordered_dose_days' => $orderedDoseDays,
                    'doctor_decision_notes' => $reassessmentNotes ?: ($validated['diagnosis'] ?? $validated['chief_complaints']),
                    'decided_by' => $user->id,
                    'decided_at' => now(),
                ]
            );

            $incidentStatus = $isReferralOut ? 'transferred_out' : ($noInjectionRequired ? 'completed' : 'active');
            $incidentUpdates = [
                'episode_type' => in_array($planType, ['single_booster', 'two_dose_booster'], true) ? 're_exposure' : 'primary',
                'is_previously_vaccinated' => in_array($planType, ['single_booster', 'two_dose_booster', 'continue_existing_schedule'], true),
                'status' => $incidentStatus,
            ];

            if ($isReferralOut) {
                $incidentUpdates['transferred_to_facility'] = $referredToFacility;
                $incidentUpdates['transferred_at'] = $transferDate;
                $incidentUpdates['transfer_reason'] = $referralReasonInput;
            }

            $activeIncident->update($incidentUpdates);

            if ($isReferralOut) {
                Appointment::where('bite_id', $activeIncident->bite_id)
                    ->where('status', 'scheduled')
                    ->where('appointment_date', '>=', $transferDate->toDateString())
                    ->update([
                        'status' => 'cancelled',
                        'cancellation_reason' => "Patient Transferred/Referred to {$referredToFacility}",
                    ]);
            }

            if ($noInjectionRequired || $isReferralOut) {
                $intake = $activeIncident->intake;
                $intakeMode = is_array($intake?->exposure_modes) ? ($intake->exposure_modes[0] ?? null) : null;
                $intakeSite = is_array($intake?->exposure_sites) ? implode(', ', $intake->exposure_sites) : null;
                TagoloanTreatmentCard::firstOrCreate(
                    [
                        'clinic_id' => $clinicId,
                        'patient_id' => $validated['patient_id'],
                        'bite_id' => $activeIncident->bite_id,
                    ],
                    [
                        'card_date' => $submittedConsultationDate,
                        'registry_no' => $activeIncident->case_number,
                        'exposure_category' => $effectiveCategory ?: 'I',
                        'mode_of_exposure' => $activeIncident->exposure_mode ?? $intakeMode,
                        'body_part_exposed' => $activeIncident->body_part_exposed ?? $activeIncident->site_number ?? $intakeSite,
                        'animal_type' => $activeIncident->animal_type ?? $intake?->animal_species ?? 'other',
                        'animal_type_others' => $activeIncident->animal_type_others ?? $intake?->animal_species_other,
                        'referred_by' => $validated['referred_by'] ?? $validated['referred_from'] ?? $activeIncident->referred_from,
                        'created_by' => $user->id,
                    ]
                );
            }
        } elseif ($activeIncident->isAwaitingAssessment()) {
            $activeIncident->update([
                'episode_type' => 'primary',
                'status' => 'active',
            ]);
        }

        $todayQueue = null;
        $planStopsImmediateTreatment = (in_array($planType, ['continue_existing_schedule', 'no_vaccine'], true) && !$hasTetanusOrder && !$hasRigOrder)
            || $noInjectionRequired;

        if (!empty($validated['queue_id'])) {
            $todayQueue = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->where(function ($q) use ($activeIncident) {
                    $q->where('bite_id', $activeIncident->bite_id)
                      ->orWhereNull('bite_id');
                })
                ->where('queue_id', $validated['queue_id'])
                ->whereNull('deleted_at')
                ->first();
        }

        if (!$todayQueue) {
            $todayQueue = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->where(function ($q) use ($activeIncident) {
                    $q->where('bite_id', $activeIncident->bite_id)
                      ->orWhereNull('bite_id');
                })
                ->where('queue_date', Carbon::today()->toDateString())
                ->whereIn('status', ['waiting', 'called', 'in_consultation', 'serving', 'second_chance', 'final_recall'])
                ->whereIn('visit_type', ['new_case', 'follow_up', 'observation', 'consultation'])
                ->whereNull('deleted_at')
                ->latest('queue_id')
                ->first();
        }

        if (!$todayQueue && !$isReferralOut && !$planStopsImmediateTreatment) {
            $todayQueue = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->where('bite_id', $activeIncident->bite_id)
                ->where('queue_date', Carbon::today()->toDateString())
                ->where('status', 'completed')
                ->whereNull('deleted_at')
                ->latest('queue_id')
                ->first();
        }

        if ($isReferralOut || $planStopsImmediateTreatment) {
            if ($todayQueue) {
                if ($isReferralOut) {
                    $referralNotes = "Doctor completed referral — Transferred/Referred to {$referredToFacility}. Visit completed.";
                } elseif ($isCategory1) {
                    $referralNotes = 'Doctor decision: Category I — No treatment required.';
                } elseif ($planType === 'no_vaccine') {
                    $referralNotes = 'Doctor decision: no additional rabies vaccine indicated.';
                } else {
                    $referralNotes = 'Doctor decision: continue the existing prescribed schedule; no immediate treatment ordered.';
                }

                QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'completed',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'completed',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $user->id,
                    'notes'        => $isReferralOut
                        ? "Transferred/Referred: {$referredToFacility}" . ($referralReasonInput ? " — {$referralReasonInput}" : '')
                        : $referralNotes,
                    'occurred_at'  => now(),
                ]);

                $todayQueue->update([
                    'status'             => 'completed',
                    'completed_at'       => now(),
                    'consultation_notes' => $referralNotes,
                    'recall_stage'       => null,
                ]);

                Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
            }
        } else {
            $transferNotes = ($isCategory1 && $hasTetanusOrder)
                ? 'Doctor completed Form 2 — Tetanus prophylaxis prescribed.'
                : 'Doctor completed Form 2 — referred to Treatment.';

            if ($todayQueue) {
                QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'transferred_to_treatment',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'waiting',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $user->id,
                    'notes'        => $transferNotes,
                    'occurred_at'  => now(),
                ]);

                $todayQueue->update([
                    'bite_id'            => $activeIncident->bite_id,
                    'visit_type'         => 'vaccination',
                    'status'             => 'waiting',
                    'called_at'          => null,
                    'serving_at'         => null,
                    'completed_at'       => null,
                    'consultation_notes' => $transferNotes,
                    'recall_stage'       => null,
                ]);

                Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
            } else {
                $todayDate = Carbon::today()->toDateString();
                $lastQueueNumber = Queue::withoutGlobalScopes()
                    ->where('clinic_id', $clinicId)
                    ->where('queue_date', $todayDate)
                    ->max('queue_number') ?? 0;

                $todayQueue = Queue::create([
                    'clinic_id'          => $clinicId,
                    'patient_id'         => $validated['patient_id'],
                    'bite_id'            => $activeIncident->bite_id,
                    'queue_number'       => $lastQueueNumber + 1,
                    'queue_date'         => $todayDate,
                    'visit_type'         => 'vaccination',
                    'priority'           => 'normal',
                    'queue_category'     => 'regular',
                    'status'             => 'waiting',
                    'checked_in_at'      => now(),
                    'checked_in_by'      => $user->id,
                    'consultation_notes' => $transferNotes,
                    'call_count'         => 0,
                ]);

                QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'checked_in',
                    'from_status'  => 'new',
                    'to_status'    => 'waiting',
                    'call_count'   => 0,
                    'performed_by' => $user->id,
                    'notes'        => $transferNotes,
                    'occurred_at'  => now(),
                ]);

                Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
            }
        }

        return [
            'status' => 201,
            'data' => [
                'message' => $isReferralOut
                    ? 'Doctor referral completed. Patient status set to Transferred/Referred.'
                    : ($noInjectionRequired
                        ? 'Consultation saved. Assessment finalized (No injection required).'
                        : 'Treatment record saved successfully'),
                'treatment_record' => $treatmentRecord->load('patient'),
                'queue' => $todayQueue?->fresh(),
                'incident' => $activeIncident?->fresh(),
                'is_referral_completed' => $isReferralOut,
            ],
        ];
    }

    /**
     * A patient qualifies for a re-exposure decision only after completing
     * Day 0, Day 3, and Day 7 in an earlier primary episode.
     */
    public function hasCompletedPrimaryDayZeroToSeven(int $clinicId, int $patientId, BiteIncident $activeIncident): bool
    {
        if ((int) $activeIncident->episode_number <= 1) {
            return false;
        }

        $priorPrimaryIds = BiteIncident::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->where('episode_number', '<', $activeIncident->episode_number)
            ->where('episode_type', 'primary')
            ->pluck('bite_id');

        if ($priorPrimaryIds->isEmpty()) {
            return false;
        }

        $completedDays = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->whereIn('bite_id', $priorPrimaryIds)
            ->whereIn('dose_number', [0, 3, 7])
            ->where('status', 'completed')
            ->distinct()
            ->pluck('dose_number')
            ->map(fn ($day) => (int) $day)
            ->all();

        return count(array_intersect([0, 3, 7], $completedDays)) === 3;
    }

    /**
     * Get paginated treatment records.
     */
    public function getPaginatedRecords(int $clinicId, ?string $search, int $perPage = 15): LengthAwarePaginator
    {
        $query = TreatmentRecord::with(['patient', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc');

        if ($search !== null && $search !== '') {
            $query->whereHas('patient', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Get a single treatment record.
     */
    public function getRecord(int $clinicId, int $id): TreatmentRecord
    {
        return TreatmentRecord::with(['patient', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);
    }

    /**
     * Save an addendum note.
     */
    public function saveAddendum(int $clinicId, int $patientId, array $validated, User $user): array
    {
        Patient::where('clinic_id', $clinicId)->findOrFail($patientId);

        $consultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->where('bite_id', $validated['bite_id'])
            ->whereNull('dose_number')->whereNull('medication_given')
            ->latest('treatment_id')
            ->first();

        $userName = $user->name ?? 'Physician';
        $timestamp = now()->format('M d, Y h:i A');
        $formattedNote = "[{$timestamp} by {$userName}]: " . trim($validated['addendum_notes']);

        if ($consultation) {
            $existingNotes = $consultation->administration_notes ? trim($consultation->administration_notes) . "\n\n" : '';
            $consultation->update([
                'administration_notes' => $existingNotes . $formattedNote,
            ]);
            $record = $consultation;
        } else {
            $record = TreatmentRecord::create([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'bite_id' => $validated['bite_id'],
                'treatment_date' => now('Asia/Manila'),
                'consultation_date' => now('Asia/Manila')->toDateString(),
                'consultation_time' => now('Asia/Manila')->format('H:i'),
                'nature_of_visit' => 'follow_up',
                'consultation_types' => ['general'],
                'chief_complaints' => 'Clinical Addendum Note',
                'administration_notes' => $formattedNote,
                'status' => 'completed',
                'administered_by' => $user->id,
            ]);
        }

        return [
            'message' => 'Addendum saved successfully',
            'treatment_record' => $record,
            'addendum' => $formattedNote,
        ];
    }
}
