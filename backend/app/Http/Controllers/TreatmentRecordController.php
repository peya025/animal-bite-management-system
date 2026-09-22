<?php

namespace App\Http\Controllers;

use App\Models\TreatmentRecord;
use App\Models\Patient;
use App\Models\BiteIncident;
use App\Models\Queue;
use App\Models\TreatmentPlan;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TreatmentRecordController extends Controller
{
    /**
     * Get treatment record for a patient (for editing)
     */
    public function getByPatient(Request $request, int $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        $patient = Patient::with('details')
            ->where('clinic_id', $clinicId)
            ->findOrFail($patientId);

        $requestedBiteId = $request->get('bite_id');

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

        // Get consultation record scoped to active episode if exists
        $latestTreatment = null;
        if ($activeIncident) {
            $latestTreatment = TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $activeIncident->bite_id)
                ->whereNull('dose_number')
                ->latest('consultation_date')
                ->latest('treatment_id')
                ->first();
        }
        if (!$latestTreatment) {
            $latestTreatment = TreatmentRecord::with('administeredBy')
                ->where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->whereNull('dose_number')
                ->latest('consultation_date')
                ->latest('treatment_id')
                ->first();
        }

        // If latest treatment was completed by a Doctor, dynamically reflect the Doctor's updated name
        if ($latestTreatment) {
            $adminUser = $latestTreatment->administeredBy;
            if ($adminUser && in_array(strtolower($adminUser->role ?? ''), ['doctor', 'triage', 'physician', 'triage_doctor'])) {
                if (!empty($adminUser->name)) {
                    $latestTreatment->attending_provider = $adminUser->name;
                    $latestTreatment->provider_name = $adminUser->name;
                }
            }
        }
        // Get all treatment records for history
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

        // Medical-legal lock: only applies if this selected episode already has
        // administered vaccines.  Do not let a prior episode lock a new Form 2.
        $hasAdministeredVaccine = false;
        if ($activeIncident) {
            $hasAdministeredVaccine = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('bite_id', $activeIncident->bite_id)
                ->whereNotNull('dose_number')
                ->where(function($q) {
                    $q->where('status', 'completed')
                      ->orWhere(function($sub) {
                          $sub->whereNotNull('treatment_date')->where('status', '!=', 'scheduled');
                      });
                })
                ->exists();
        }

        // A subsequent incident is only a re-exposure/booster assessment when
        // the patient completed the primary Day 0, Day 3, and Day 7 doses.
        // A pending primary or incomplete primary series continues through the
        // standard Form 2 and must not show booster-only controls.
        $requiresReExposureDecision = $activeIncident
            && $activeIncident->isAwaitingAssessment()
            && $this->hasCompletedPrimaryDayZeroToSeven($clinicId, $patientId, $activeIncident);

        return response()->json([
            'patient' => $patient,
            'latest_treatment' => $latestTreatment,
            'treatments' => $treatments,
            'has_administered_vaccine' => $hasAdministeredVaccine,
            // A re-exposure is determined by the Doctor's assessment, never by
            // elapsed time since a previous dose.
            'is_returning_new_bite' => (bool) ($activeIncident?->isReExposure()),
            'requires_re_exposure_decision' => $requiresReExposureDecision,
            'active_bite_incident' => $activeIncident,
            'episode_history' => $episodeHistory,
        ]);
    }

    /**
     * Store Form 2 data (General Consultation / Individual Treatment Record)
     */
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'queue_id' => 'nullable|exists:queues,queue_id',
            'bite_id' => 'nullable|exists:bite_incidents,bite_id',
            'treatment_plan' => 'nullable|in:full_pep,single_booster,two_dose_booster,continue_existing_schedule,no_vaccine',

            // Optional New Bite Incident updates from Doctor Form 2
            'new_bite_date' => 'nullable|date',
            'new_bite_place' => 'nullable|string|max:255',
            'new_exposure_type' => 'nullable|in:bite,scratch,lick,other',
            'new_severity' => 'nullable|in:minor,moderate,severe',
            'new_animal_type' => 'nullable|string|max:100',
            'new_animal_status' => 'nullable|in:owned,stray,unknown',
            'new_site_washed' => 'nullable|boolean',
            'new_body_part' => 'nullable|string|max:255',
            'new_wound_description' => 'nullable|string',
            
            // General Consultation Fields (NEW Form 2)
            'consultation_date' => 'nullable|date',
            'consultation_time' => 'nullable|string|max:10',
            'mode_of_transaction' => 'nullable|in:walk-in,visited,referral',
            'referred_from' => 'nullable|string|max:255',
            'referred_to' => 'nullable|string|max:255',
            'referred_by' => 'nullable|string|max:255',
            'pertinent_history' => 'nullable|string',
            'reason_for_referral' => 'nullable|string',
            'actions_taken' => 'nullable|string',
            
            // Vital Signs
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => 'nullable|string|max:10',
            'height' => 'nullable|string|max:10',
            'weight' => 'nullable|string|max:10',
            
            // Visit and Consultation Details
            'nature_of_visit' => 'required|in:new_consultation,new_admission,follow_up',
            'consultation_types' => 'required|array|min:1',
            'consultation_types.*' => 'string',
            
            // Clinical Notes
            'chief_complaints' => 'required|string',
            'diagnosis' => 'nullable|string',
            'medication_treatment' => 'nullable|string',
            'prescribed_vaccine_type' => 'nullable|string|max:100',
            'laboratory_findings' => 'nullable|string',
            'performed_lab_test' => 'nullable|string',
            
            // Provider Details
            'provider_name' => 'nullable|string|max:255',
            'attending_provider' => 'nullable|string|max:255',
        ]);

        // Resolve active BiteIncident
        $activeBiteId = $request->get('bite_id');
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
        }

        if (!$activeIncident && $queueForEpisode && $queueForEpisode->visit_type === 'new_case') {
            // Older registration records were placed in the Doctor queue before
            // an incident was created. Preserve that workflow by creating the
            // primary episode at the first Form 2 save and linking this ticket.
            $episodeNumber = (BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->max('episode_number') ?? 0) + 1;

            $activeIncident = BiteIncident::create([
                'clinic_id' => $clinicId,
                'patient_id' => $validated['patient_id'],
                'episode_number' => $episodeNumber,
                'episode_type' => 'pending_assessment',
                'is_previously_vaccinated' => false,
                'bite_date' => $validated['new_bite_date'] ?? $validated['consultation_date'] ?? Carbon::today()->toDateString(),
                'bite_place' => $validated['new_bite_place'] ?? null,
                'site_washed' => $validated['new_site_washed'] ?? false,
                'exposure_type' => $validated['new_exposure_type'] ?? 'bite',
                'severity' => $validated['new_severity'] ?? 'moderate',
                'animal_type' => $validated['new_animal_type'] ?? null,
                'animal_status' => $validated['new_animal_status'] ?? 'unknown',
                'site_number' => $validated['new_body_part'] ?? null,
                'wound_description' => $validated['new_wound_description'] ?? null,
                'status' => 'awaiting_assessment',
                'remarks' => 'Primary episode created from Form 2 for a registration queue without a linked intake.',
                'created_by' => $request->user()->id,
            ]);

            $queueForEpisode->update(['bite_id' => $activeIncident->bite_id]);
        }

        if (!$activeIncident) {
            return response()->json([
                'message' => 'This queue ticket is not linked to a bite episode. Return to registration and record the exposure first.',
            ], 422);
        }

        $requiresReExposureDecision = $activeIncident->isAwaitingAssessment()
            && $this->hasCompletedPrimaryDayZeroToSeven($clinicId, (int) $validated['patient_id'], $activeIncident);

        if ($requiresReExposureDecision && empty($validated['treatment_plan'])) {
            return response()->json([
                'message' => 'Record the Doctor treatment decision for this re-exposure episode before referring it to Treatment.',
            ], 422);
        }

        // Medical-Legal Protection: Check if vaccination has already been administered for THIS episode
        if ($activeIncident) {
            $hasAdministeredVaccine = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $validated['patient_id'])
                ->where('bite_id', $activeIncident->bite_id)
                ->whereNotNull('dose_number')
                ->where(function($q) {
                    $q->where('status', 'completed')
                      ->orWhere(function($sub) {
                          $sub->whereNotNull('treatment_date')->where('status', '!=', 'scheduled');
                      });
                })
                ->exists();

            if ($hasAdministeredVaccine) {
                $existingConsultation = TreatmentRecord::where('clinic_id', $clinicId)
                    ->where('patient_id', $validated['patient_id'])
                    ->where('bite_id', $activeIncident->bite_id)
                    ->whereNull('dose_number')
                    ->first();

                if ($existingConsultation) {
                    return response()->json([
                        'message' => 'Clinical assessment is locked because vaccination has already been administered for this episode. Please use the Addendum section to record additional clinical notes.',
                        'locked' => true,
                    ], 422);
                }
            }
        }

        // Create general consultation treatment record
        $treatmentRecord = TreatmentRecord::create([
            'clinic_id' => $clinicId,
            'patient_id' => $validated['patient_id'],
            'bite_id' => $activeIncident?->bite_id,
            'treatment_date' => $validated['consultation_date'] 
                ? Carbon::parse($validated['consultation_date']) 
                : Carbon::now(),
            
            // General consultation fields
            'consultation_date' => $validated['consultation_date'] ?? Carbon::now()->toDateString(),
            'consultation_time' => $validated['consultation_time'] ?? Carbon::now()->format('H:i'),
            'mode_of_transaction' => in_array($validated['mode_of_transaction'] ?? '', ['walk-in', 'visited', 'referral'])
                ? $validated['mode_of_transaction']
                : 'walk-in',
            'referred_from' => $validated['referred_from'] ?? null,
            'referred_to' => $validated['referred_to'] ?? null,
            'referred_by' => $validated['referred_by'] ?? null,
            'pertinent_history' => $validated['pertinent_history'] ?? null,
            'reason_for_referral' => $validated['reason_for_referral'] ?? null,
            'actions_taken' => $validated['actions_taken'] ?? null,
            
            // Vital signs
            'blood_pressure' => $validated['blood_pressure'] ?? null,
            'temperature' => $validated['temperature'] ?? null,
            'height' => $validated['height'] ?? null,
            'weight' => $validated['weight'] ?? null,
            
            // Visit details
            'nature_of_visit' => $validated['nature_of_visit'],
            'consultation_types' => $validated['consultation_types'], // Will be cast to JSON by model
            
            // Clinical notes
            'chief_complaints' => $validated['chief_complaints'],
            'diagnosis' => $validated['diagnosis'] ?? null,
            'medication_treatment' => $validated['medication_treatment'] ?? null,
            'prescribed_vaccine_type' => $validated['prescribed_vaccine_type'] ?? null,
            'laboratory_findings' => $validated['laboratory_findings'] ?? null,
            'performed_lab_test' => $validated['performed_lab_test'] ?? null,
            
            // Provider details
            'provider_name' => $validated['provider_name'] ?? $request->user()->name,
            'attending_provider' => $validated['attending_provider'] ?? $request->user()->name,
            
            'status' => 'completed', // General consultation is completed when Form 2 is saved
            'administered_by' => $request->user()->id,
        ]);

        // ── Auto-advance queue: move patient from Triage/Doctor → Treatment/Vaccination station ──
        $isReferralOut = ($validated['mode_of_transaction'] ?? '') === 'referral';
        $planType = $validated['treatment_plan'] ?? null;
        if (!$planType && !$isReferralOut) {
            // A completed Form 2 consultation that is not referred out approves standard Full PEP.
            $planType = 'full_pep';
        }

        if ($activeIncident && $planType) {
            $orderedDoseDays = match ($planType) {
                'full_pep' => [0, 3, 7],
                'single_booster' => [0],
                'two_dose_booster' => [0, 3],
                default => [],
            };

            TreatmentPlan::updateOrCreate(
                ['bite_id' => $activeIncident->bite_id],
                [
                    'clinic_id' => $clinicId,
                    'patient_id' => $validated['patient_id'],
                    'plan_type' => $planType,
                    'status' => $planType === 'no_vaccine' ? 'completed' : 'approved',
                    'ordered_dose_days' => $orderedDoseDays,
                    'doctor_decision_notes' => $validated['diagnosis'] ?? $validated['chief_complaints'],
                    'decided_by' => $request->user()->id,
                    'decided_at' => now(),
                ]
            );

            $incidentUpdates = [
                'episode_type' => in_array($planType, ['single_booster', 'two_dose_booster'], true) ? 're_exposure' : 'primary',
                'status' => $planType === 'no_vaccine' ? 'completed' : 'active',
            ];

            if (!empty($validated['new_bite_date'])) $incidentUpdates['bite_date'] = $validated['new_bite_date'];
            if (!empty($validated['new_bite_place'])) $incidentUpdates['bite_place'] = $validated['new_bite_place'];
            if (!empty($validated['new_exposure_type'])) $incidentUpdates['exposure_type'] = $validated['new_exposure_type'];
            if (!empty($validated['new_severity'])) $incidentUpdates['severity'] = $validated['new_severity'];
            if (!empty($validated['new_animal_type'])) $incidentUpdates['animal_type'] = $validated['new_animal_type'];
            if (!empty($validated['new_animal_status'])) $incidentUpdates['animal_status'] = $validated['new_animal_status'];
            if (isset($validated['new_site_washed'])) $incidentUpdates['site_washed'] = (bool) $validated['new_site_washed'];
            if (!empty($validated['new_body_part'])) $incidentUpdates['site_number'] = $validated['new_body_part'];
            if (!empty($validated['new_wound_description'])) $incidentUpdates['wound_description'] = $validated['new_wound_description'];

            $activeIncident->update($incidentUpdates);
        } elseif ($activeIncident && $activeIncident->isAwaitingAssessment()) {
            // Standard primary-case Form 2: no booster decision is needed.
            // Mark the episode active so its normal vaccination schedule can continue.
            $activeIncident->update([
                'episode_type' => 'primary',
                'status' => 'active',
            ]);
        }

        $todayQueue = null;
        $planStopsImmediateTreatment = in_array($planType, ['continue_existing_schedule', 'no_vaccine'], true);
        $referredToFacility = $validated['referred_to'] ?? 'External Medical Facility';

        if (!empty($validated['queue_id'])) {
            $todayQueue = \App\Models\Queue::where('clinic_id', $clinicId)
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
            $todayQueue = \App\Models\Queue::where('clinic_id', $clinicId)
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

        if ($isReferralOut || $planStopsImmediateTreatment) {
            // Case A: Patient referred to external hospital/facility — do not send to Treatment Queue
            if ($todayQueue) {
                $referralNotes = "Referred to external facility: {$referredToFacility} — Visit Completed.";

                if (!$isReferralOut) {
                    $referralNotes = $planType === 'no_vaccine'
                        ? 'Doctor decision: no additional rabies vaccine indicated.'
                        : 'Doctor decision: continue the existing prescribed schedule; no immediate treatment ordered.';
                }

                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'completed',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'completed',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $request->user()->id,
                    'notes'        => $referralNotes,
                    'occurred_at'  => now(),
                ]);

                $todayQueue->update([
                    'status'             => 'completed',
                    'completed_at'       => now(),
                    'consultation_notes' => $referralNotes,
                    'recall_stage'       => null,
                ]);

                \Illuminate\Support\Facades\Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
            }
        } else {
            // Case B: Standard Triage → Treatment handoff
            $transferNotes = 'Doctor completed Form 2 — referred to Treatment.';

            if ($todayQueue) {
                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'transferred_to_treatment',
                    'from_status'  => $todayQueue->status,
                    'to_status'    => 'waiting',
                    'call_count'   => $todayQueue->call_count ?? 0,
                    'performed_by' => $request->user()->id,
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

                \Illuminate\Support\Facades\Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayQueue->queue_date->toDateString()}");
            } else {
                // Patient had no prior queue ticket today — auto-generate one for Treatment Desk
                $todayDate = Carbon::today()->toDateString();
                // Must scan ALL rows (including soft-deleted) because the
                // unique_daily_queue index covers deleted rows too.
                $lastQueueNumber = \App\Models\Queue::withoutGlobalScopes()
                    ->where('clinic_id', $clinicId)
                    ->where('queue_date', $todayDate)
                    ->max('queue_number') ?? 0;

                $todayQueue = \App\Models\Queue::create([
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
                    'checked_in_by'      => $request->user()->id,
                    'consultation_notes' => $transferNotes,
                    'call_count'         => 0,
                ]);

                \App\Models\QueueHistory::create([
                    'queue_id'     => $todayQueue->queue_id,
                    'clinic_id'    => $todayQueue->clinic_id,
                    'patient_id'   => $todayQueue->patient_id,
                    'action'       => 'checked_in',
                    'from_status'  => 'new',
                    'to_status'    => 'waiting',
                    'call_count'   => 0,
                    'performed_by' => $request->user()->id,
                    'notes'        => $transferNotes,
                    'occurred_at'  => now(),
                ]);

                \Illuminate\Support\Facades\Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
            }
        }

        return response()->json([
            'message' => 'Treatment record saved successfully',
            'treatment_record' => $treatmentRecord->load('patient'),
            'queue' => $todayQueue?->fresh(),
        ], 201);
    }

    /**
     * A patient qualifies for a re-exposure decision only after completing
     * Day 0, Day 3, and Day 7 in an earlier primary episode.
     */
    private function hasCompletedPrimaryDayZeroToSeven(int $clinicId, int $patientId, BiteIncident $activeIncident): bool
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
     * Get all treatment records
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $query = TreatmentRecord::with(['patient', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->orderBy('consultation_date', 'desc')
            ->orderBy('consultation_time', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('patient', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%");
            });
        }

        $records = $query->paginate($request->get('per_page', 15));

        return response()->json($records);
    }

    /**
     * Show single treatment record
     */
    public function show(Request $request, int $id)
    {
        $clinicId = $request->user()->clinic_id;

        $record = TreatmentRecord::with(['patient', 'administeredBy'])
            ->where('clinic_id', $clinicId)
            ->findOrFail($id);

        return response()->json($record);
    }

    /**
     * Save an addendum note for a patient's clinical assessment
     * POST /api/treatment-records/patient/{patientId}/addendum
     */
    public function saveAddendum(Request $request, int $patientId)
    {
        $clinicId = $request->user()->clinic_id;

        $validated = $request->validate([
            'addendum_notes' => 'required|string|min:3',
            'bite_id' => 'required|exists:bite_incidents,bite_id',
        ]);

        $patient = Patient::where('clinic_id', $clinicId)->findOrFail($patientId);

        // Find existing general consultation record
        $consultation = TreatmentRecord::where('clinic_id', $clinicId)
            ->where('patient_id', $patientId)
            ->where('bite_id', $validated['bite_id'])
            ->whereNull('dose_number')
            ->latest('treatment_id')
            ->first();

        $userName = $request->user()->name ?? 'Physician';
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
                'treatment_date' => now(),
                'consultation_date' => now()->toDateString(),
                'consultation_time' => now()->format('H:i'),
                'nature_of_visit' => 'follow_up',
                'consultation_types' => ['general'],
                'chief_complaints' => 'Clinical Addendum Note',
                'administration_notes' => $formattedNote,
                'status' => 'completed',
                'administered_by' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => 'Addendum saved successfully',
            'treatment_record' => $record,
            'addendum' => $formattedNote,
        ]);
    }
}
