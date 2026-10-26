<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;

use App\Http\Requests\Queue\CancelQueueRequest;
use App\Http\Requests\Queue\CompleteQueueRequest;
use App\Http\Requests\Queue\StoreQueueRequest;
use App\Http\Requests\Queue\UpdatePriorityRequest;
use App\Models\Appointment;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\Station;
use App\Models\TreatmentPlan;
use App\Services\QueueService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class QueueController extends Controller
{
    // ── Status groups ────────────────────────────────────────────────────────
    const MAIN_STATUSES   = ['waiting', 'called', 'in_consultation', 'serving'];
    const SECOND_STATUSES = ['second_chance', 'final_recall'];
    const DONE_STATUSES   = ['completed', 'cancelled', 'absent', 'no_response', 'requires_checkin'];

    const CATEGORY_ORDER = [
        'priority'       => 1,
        'senior_citizen' => 2,
        'pwd'            => 2,
        'pregnant'       => 2,
        'appointment'    => 3,
        'regular'        => 4,
    ];

    public function __construct(private readonly QueueService $queueService) {}

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue
    // ────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $clinicId     = $request->user()->clinic_id;
        $date         = $request->get('date', Carbon::today()->toDateString());
        $cacheKey     = "web:queue:clinic:{$clinicId}:date:{$date}";

        $stationParam = $request->get('station');
        if (!$stationParam) {
            $role = $request->user()?->role;
            if ($role === 'triage')    $stationParam = 'triage';
            elseif ($role === 'treatment') $stationParam = 'treatment';
        }

        $data = Cache::remember($cacheKey, 30, function () use ($clinicId, $date) {
            $baseQuery = Queue::where('clinic_id', $clinicId)
                ->whereNull('deleted_at')
                ->with([
                    'patient:' . $this->queueService->patientFields(),
                    'biteIncident:bite_id,case_number,patient_id,episode_number,episode_type,status,bite_date,exposure_type,severity,remarks,rig_decision_reason',
                    'biteIncident.treatmentPlan:treatment_plan_id,bite_id,plan_type,status,ordered_dose_days',
                    'handledBy:id,name,role,professional_license_no',
                    'handledByUser:id,name,role,professional_license_no',
                    'servedBy:id,name,role,signature_path,professional_license_no',
                    'station:id,name',
                ])
                ->select(
                    'queue_id','queue_number','queue_category','patient_id','bite_id',
                    'visit_type','priority','status','checked_in_at','called_at',
                    'completed_at','cancelled_at','serving_at','second_chance_at',
                    'final_recall_at','absent_at','no_response_at',
                    'checked_in_by','handled_by','served_by','serving_started_at','station_id',
                    'check_in_notes','consultation_notes',
                    'call_count','recall_stage','clinic_id','queue_date'
                );

            $this->queueService->expireStaleTickets($clinicId, $date);

            $categoryOrder = self::CATEGORY_ORDER;
            $priorityLevel = ['emergency' => 1, 'urgent' => 2, 'normal' => 3];
            $statusOrder   = [
                'serving'         => 1, 'in_consultation' => 1,
                'called'          => 2, 'waiting'         => 3,
                'second_chance'   => 4, 'final_recall'    => 5,
                'completed'       => 6, 'cancelled'       => 7,
                'no_response'     => 8, 'absent'          => 9,
            ];

            $mainQueue = (clone $baseQuery)
                ->where('queue_date', $date)
                ->get()
                ->sortBy([
                    fn($a, $b) => ($statusOrder[$a->status] ?? 3)             <=> ($statusOrder[$b->status] ?? 3),
                    fn($a, $b) => ($categoryOrder[$a->queue_category] ?? 4)   <=> ($categoryOrder[$b->queue_category] ?? 4),
                    fn($a, $b) => ($priorityLevel[$a->priority] ?? 3)         <=> ($priorityLevel[$b->priority] ?? 3),
                    fn($a, $b) => $a->queue_number <=> $b->queue_number,
                ])
                ->values();

            $secondQueue = (clone $baseQuery)
                ->where('queue_date', $date)
                ->whereIn('status', self::SECOND_STATUSES)
                ->orderBy('no_response_at', 'asc')
                ->get();

            foreach ($mainQueue as $entry) {
                $entry->is_carry_over = $entry->queue_date &&
                    $entry->queue_date->toDateString() < $date &&
                    in_array($entry->status, self::MAIN_STATUSES);
            }
            foreach ($secondQueue as $entry) {
                $entry->is_carry_over = false;
            }

            $counts             = array_fill_keys(['waiting','called','in_consultation','serving','completed','cancelled','no_response','second_chance','final_recall','absent'], 0);
            $visitTypeCounts    = [];
            $categoryTypeCounts = [];

            foreach ($mainQueue as $entry) {
                if (isset($counts[$entry->status])) $counts[$entry->status]++;
                $visitTypeCounts[$entry->visit_type]        = ($visitTypeCounts[$entry->visit_type] ?? 0) + 1;
                $categoryTypeCounts[$entry->queue_category] = ($categoryTypeCounts[$entry->queue_category] ?? 0) + 1;
            }
            foreach ($secondQueue as $entry) {
                if (isset($counts[$entry->status])) $counts[$entry->status]++;
            }

            $activeServers = $mainQueue
                ->filter(fn($e) => in_array($e->status, ['serving', 'in_consultation']))
                ->map(fn($e)    => $e->servedBy?->name ?? $e->handledBy?->name ?? null)
                ->filter()->unique()->values()->all();

            return [
                'date'                => $date,
                'queue'               => $mainQueue,
                'second_chance_queue' => $secondQueue,
                'stats'               => array_merge($counts, [
                    'date'           => $date,
                    'total'          => $mainQueue->count() + $secondQueue->count(),
                    'by_visit_type'  => $visitTypeCounts,
                    'by_category'    => $categoryTypeCounts,
                    'active_servers' => $activeServers,
                ]),
            ];
        });

        $data['next_patient'] = $this->queueService->getNextEligible($clinicId, $date, $stationParam);

        return response()->json($data);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/call-next
    // ────────────────────────────────────────────────────────────────────────
    public function callNext(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $date     = Carbon::today()->toDateString();
        $station  = $this->resolveStation($request);

        return DB::transaction(function () use ($clinicId, $date, $request, $station) {
            $this->queueService->expireStaleTickets($clinicId, $date);

            $next = $this->queueService->getNextEligible($clinicId, $date, $station);
            if (!$next) {
                $label = $station ? ucfirst($station) . ' queue' : 'queue';
                return response()->json(['message' => "No patients waiting in the {$label}"], 404);
            }

            $queue = Queue::where('clinic_id', $clinicId)->whereNull('deleted_at')
                ->where('queue_id', $next->queue_id)->where('status', 'waiting')
                ->lockForUpdate()->first();

            if (!$queue) {
                return response()->json(['message' => 'Patient was already called by another staff member'], 409);
            }
            if (($queue->call_count ?? 0) >= 3 || $queue->status === 'requires_checkin') {
                return response()->json(['message' => 'Patient did not respond 3 times. Please return to Registration for check-in.'], 422);
            }

            $this->queueService->logHistory($queue, 'called', 'called', $request->user()->id, 'Auto call-next');
            $queue->update([
                'status'             => 'called',
                'called_at'          => now(),
                'handled_by'         => $request->user()->id,
                'served_by'          => $request->user()->id,
                'serving_started_at' => now(),
                'station_id'         => $request->get('station_id') ?: $queue->station_id,
            ]);

            $this->queueService->flushCache($clinicId, $date);

            return response()->json([
                'message'      => "Called #{$queue->queue_number}",
                'queue'        => $queue->fresh()->load(['patient', 'biteIncident', 'servedBy', 'station']),
                'queue_number' => $queue->queue_number,
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/call
    // ────────────────────────────────────────────────────────────────────────
    public function call(Request $request, int $id): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $userId   = $request->user()->id;

        DB::beginTransaction();
        try {
            $queue = Queue::where('clinic_id', $clinicId)->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (($queue->call_count ?? 0) >= 3 || $queue->status === 'requires_checkin') {
                DB::rollBack();
                return response()->json(['message' => 'Patient did not respond 3 times. Please return to Registration for check-in.'], 422);
            }
            if ($queue->status !== 'waiting') {
                DB::rollBack();
                return response()->json(['message' => 'Only waiting patients can be called. Current status: ' . $queue->status], 400);
            }

            $this->queueService->logHistory($queue, 'called', 'called', $userId);
            $queue->update([
                'status'             => 'called',
                'called_at'          => now(),
                'handled_by'         => $userId,
                'served_by'          => $userId,
                'serving_started_at' => now(),
                'station_id'         => $request->get('station_id') ?: $queue->station_id,
            ]);

            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => "Called #{$queue->queue_number} · {$queue->patient->name}",
            'queue'   => $queue->fresh()->load(['patient', 'biteIncident', 'servedBy', 'station']),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/serve
    // ────────────────────────────────────────────────────────────────────────
    public function serve(Request $request, int $id): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $userId   = $request->user()->id;

        DB::beginTransaction();
        try {
            $queue = Queue::where('clinic_id', $clinicId)->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (!in_array($queue->status, ['waiting','called','serving','second_chance','final_recall','in_consultation'])) {
                DB::rollBack();
                return response()->json(['message' => 'Cannot serve queue ticket with status: ' . $queue->status], 400);
            }

            $staleThresholdMinutes = 30;
            $isStale = $queue->serving_started_at &&
                Carbon::parse($queue->serving_started_at)->diffInMinutes(now()) >= $staleThresholdMinutes;

            if ($queue->status === 'serving' && $queue->served_by && $queue->served_by !== $userId && !$isStale) {
                $attendingNurse = $queue->servedBy?->name ?? 'another staff member';
                DB::rollBack();
                return response()->json(['error' => 'conflict', 'message' => "Patient is currently being attended by {$attendingNurse}."], 409);
            }

            $historyNote = ($isStale && $queue->served_by && $queue->served_by !== $userId)
                ? "Takeover from {$queue->servedBy?->name} after {$staleThresholdMinutes}m stale lock"
                : null;
            $historyAction = ($isStale && $queue->served_by && $queue->served_by !== $userId) ? 'transferred' : 'serving';
            $this->queueService->logHistory($queue, $historyAction, 'serving', $userId, $historyNote);

            $queue->update([
                'status'             => 'serving',
                'serving_at'         => now(),
                'serving_started_at' => ($queue->serving_started_at && !$isStale) ? $queue->serving_started_at : now(),
                'served_by'          => $userId,
                'station_id'         => $request->get('station_id') ?: $queue->station_id,
                'recall_stage'       => null,
            ]);

            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => "Patient #{$queue->queue_number} is now being served",
            'queue'   => $queue->fresh()->load(['patient', 'biteIncident', 'servedBy', 'station']),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/no-response
    // ────────────────────────────────────────────────────────────────────────
    public function noResponse(Request $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (!in_array($queue->status, ['waiting', 'called', 'in_consultation'])) {
                return response()->json(['message' => 'Patient must be active (waiting/called) to mark as no response. Current: ' . $queue->status], 400);
            }

            $currentCount = (int) ($queue->call_count ?? 0);
            $newCount     = $currentCount + 1;

            if ($newCount >= 3) {
                $this->queueService->logHistory($queue, 'no_response', 'requires_checkin', $request->user()->id,
                    'Patient did not respond 3 times. Please return to Registration for check-in.');
                $queue->update(['status' => 'requires_checkin', 'recall_stage' => 'requires_checkin', 'call_count' => 3, 'no_response_at' => now()]);
                $msg = 'Patient did not respond 3 times. Please return to Registration for check-in.';
                $requiresCheckin = true;
            } elseif ($newCount === 2) {
                $this->queueService->logHistory($queue, 'no_response', 'second_chance', $request->user()->id, 'Missed second call — Second Chance (2/3)');
                $queue->update(['status' => 'second_chance', 'no_response_at' => now(), 'recall_stage' => 'second_chance', 'second_chance_at' => now(), 'call_count' => 2]);
                $msg = "#{$queue->queue_number} moved to Second Chance Queue";
                $requiresCheckin = false;
            } else {
                $this->queueService->logHistory($queue, 'no_response', 'second_chance', $request->user()->id, 'Missed first call — Second Chance (1/3)');
                $queue->update(['status' => 'second_chance', 'no_response_at' => now(), 'recall_stage' => 'second_chance', 'second_chance_at' => now(), 'call_count' => 1]);
                $msg = "#{$queue->queue_number} moved to Second Chance Queue";
                $requiresCheckin = false;
            }

            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message'          => $msg,
                'queue'            => $queue->fresh()->load(['patient', 'biteIncident']),
                'requires_checkin' => $requiresCheckin ?? false,
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/recall
    // ────────────────────────────────────────────────────────────────────────
    public function recall(Request $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (($queue->call_count ?? 0) >= 3 || $queue->status === 'requires_checkin') {
                return response()->json(['message' => 'Patient did not respond 3 times. Please return to Registration for check-in.'], 422);
            }
            if (!in_array($queue->status, ['second_chance', 'final_recall'])) {
                return response()->json(['message' => 'Patient must be in second chance or final recall to recall. Current: ' . $queue->status], 400);
            }

            $stage = $queue->status === 'final_recall' ? 'Final Recall' : 'Second Chance';
            $this->queueService->logHistory($queue, 'recalled', 'called', $request->user()->id, "Recalled from {$stage}");
            $queue->update(['status' => 'called', 'called_at' => now(), 'handled_by' => $request->user()->id]);
            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => "#{$queue->queue_number} recalled ({$stage})",
                'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/return-to-queue
    // ────────────────────────────────────────────────────────────────────────
    public function returnToQueue(Request $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (($queue->call_count ?? 0) >= 3 || $queue->status === 'requires_checkin') {
                return response()->json(['message' => 'Patient did not respond 3 times. Please return to Registration for check-in.'], 422);
            }
            if (!in_array($queue->status, ['second_chance', 'final_recall', 'no_response'])) {
                return response()->json(['message' => 'Patient must be in second chance queue to return to queue. Current: ' . $queue->status], 400);
            }

            $stage = $queue->status === 'final_recall' ? 'Final Recall' : 'Second Chance';
            $this->queueService->logHistory($queue, 'returned_to_queue', 'waiting', $request->user()->id, "Returned to queue from {$stage}");

            $returnNote   = '[Brought Back] Returned to waiting queue at ' . now()->format('H:i');
            $updatedNotes = $queue->check_in_notes ? $queue->check_in_notes . ' | ' . $returnNote : $returnNote;

            $queue->update([
                'status'           => 'waiting',
                'called_at'        => null,
                'no_response_at'   => null,
                'second_chance_at' => null,
                'final_recall_at'  => null,
                'recall_stage'     => null,
                'check_in_notes'   => $updatedNotes,
            ]);

            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => 'Patient returned to the queue.',
                'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/absent
    // ────────────────────────────────────────────────────────────────────────
    public function markAbsent(Request $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (!in_array($queue->status, ['final_recall', 'second_chance', 'no_response'])) {
                return response()->json(['message' => 'Patient must be in final recall or second chance to mark absent. Current: ' . $queue->status], 400);
            }

            $this->queueService->logHistory($queue, 'absent', 'absent', $request->user()->id, 'No response after all recall attempts — marked No-Show');
            $queue->update(['status' => 'absent', 'absent_at' => now()]);
            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => "#{$queue->queue_number} marked as No-Show",
                'queue'   => $queue->fresh(),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/complete
    // ────────────────────────────────────────────────────────────────────────
    public function complete(CompleteQueueRequest $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (!in_array($queue->status, ['waiting','serving','in_consultation','called','second_chance','final_recall'])) {
                return response()->json(['message' => 'Cannot complete ticket with status: ' . $queue->status], 400);
            }

            $servedAt       = $queue->serving_at ?? $queue->called_at ?? $queue->checked_in_at;
            $waitingSeconds = $queue->checked_in_at ? now()->diffInSeconds($queue->checked_in_at) : null;
            $serviceSeconds = $servedAt ? now()->diffInSeconds($servedAt) : null;

            $incidentPlan      = $queue->bite_id
                ? TreatmentPlan::where('clinic_id', $queue->clinic_id)->where('bite_id', $queue->bite_id)->first()
                : null;
            $isPendingExposure = $queue->biteIncident?->isAwaitingAssessment() ?? false;

            if ($isPendingExposure && !$incidentPlan) {
                return response()->json(['message' => 'Doctor treatment decision is required before this new exposure can be transferred to treatment.'], 422);
            }

            $isTriageTransfer = in_array($request->user()->role, ['triage', 'doctor', 'admin'])
                && in_array($queue->visit_type, ['new_case', 'follow_up', 'observation', 'consultation', 'booster']);

            if ($isTriageTransfer) {
                $transferNotes  = collect(['Doctor completed Form 2 — referred to Treatment.', $request->consultation_notes])->filter()->implode(' | ');
                $intakeStationId = Station::where('clinic_id', $queue->clinic_id)
                    ->where('is_active', true)
                    ->where(fn($q) => $q->where('name', 'like', '%Intake%')->orWhere('name', 'like', '%Station 1%'))
                    ->value('id');

                $this->queueService->logHistory($queue, 'transferred_to_treatment', 'waiting', $request->user()->id, $transferNotes);
                $queue->update([
                    'visit_type'         => 'vaccination',
                    'status'             => 'waiting',
                    'called_at'          => null,
                    'serving_at'         => null,
                    'completed_at'       => null,
                    'consultation_notes' => $transferNotes,
                    'recall_stage'       => null,
                    'station_id'         => $intakeStationId ?? $queue->station_id,
                ]);
                $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

                return response()->json([
                    'message'         => 'Patient transferred to treatment queue',
                    'queue'           => $queue->fresh(),
                    'waiting_seconds' => $waitingSeconds,
                    'service_seconds' => $serviceSeconds,
                ]);
            }

            $this->queueService->logHistory($queue, 'completed', 'completed', $request->user()->id, $request->consultation_notes ?? null);
            $queue->update([
                'status'             => 'completed',
                'completed_at'       => now(),
                'consultation_notes' => $request->consultation_notes,
                'recall_stage'       => null,
            ]);
            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message'         => 'Consultation completed',
                'queue'           => $queue->fresh(),
                'waiting_seconds' => $waitingSeconds,
                'service_seconds' => $serviceSeconds,
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/cancel
    // ────────────────────────────────────────────────────────────────────────
    public function cancel(CancelQueueRequest $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if (in_array($queue->status, ['completed', 'absent', 'cancelled'])) {
                return response()->json(['message' => 'Cannot cancel a ' . $queue->status . ' patient'], 400);
            }

            $this->queueService->logHistory($queue, 'cancelled', 'cancelled', $request->user()->id, $request->reason ?? null);
            $queue->update([
                'status'         => 'cancelled',
                'cancelled_at'   => now(),
                'recall_stage'   => null,
                'check_in_notes' => $request->reason
                    ? ($queue->check_in_notes ? $queue->check_in_notes . ' | Cancelled: ' . $request->reason : 'Cancelled: ' . $request->reason)
                    : $queue->check_in_notes,
            ]);

            if ($queue->patient_id) {
                $confirmedAppts = Appointment::where('clinic_id', $queue->clinic_id)
                    ->where('patient_id', $queue->patient_id)
                    ->where('status', 'confirmed')
                    ->where(fn($q) => $q->where('queue_number', $queue->queue_number)->orWhereNull('queue_number'))
                    ->get();

                foreach ($confirmedAppts as $appt) {
                    $apptDate = $appt->scheduled_date ?? $appt->appointment_date;
                    $isPast   = $apptDate && Carbon::parse($apptDate)->isBefore(Carbon::today());
                    $appt->update(['status' => $isPast ? 'missed' : 'scheduled', 'queue_number' => null]);
                }
            }

            $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json(['message' => "#{$queue->queue_number} cancelled"]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/{id}
    // ────────────────────────────────────────────────────────────────────────
    public function show(Request $request, int $id): JsonResponse
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->with(['patient.details', 'patient.memberships', 'biteIncident', 'checkedInBy:id,name', 'handledBy:id,name', 'history'])
            ->findOrFail($id);

        return response()->json($queue->toArray());
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/{id}/history
    // ────────────────────────────────────────────────────────────────────────
    public function history(Request $request, int $id): JsonResponse
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)->findOrFail($id);

        $history = QueueHistory::where('queue_id', $queue->queue_id)
            ->with('performer:id,name')
            ->orderBy('occurred_at', 'asc')
            ->get()
            ->map(function ($h) {
                $h->performed_by_name = $h->performer?->name ?? 'System';
                unset($h->performer);
                return $h;
            });

        return response()->json($history);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue
    // ────────────────────────────────────────────────────────────────────────
    public function store(StoreQueueRequest $request): JsonResponse
    {
        $clinicId  = $request->user()->clinic_id;
        $todayDate = Carbon::today()->toDateString();

        return DB::transaction(function () use ($request, $clinicId, $todayDate) {
            $result = $this->queueService->addToQueue(
                clinicId:       $clinicId,
                user:           $request->user(),
                patientId:      (int) $request->patient_id,
                biteIncidentId: $request->bite_incident_id ? (int) $request->bite_incident_id : null,
                visitType:      $request->visit_type,
                priority:       $request->get('priority', 'normal'),
                category:       $request->get('queue_category', 'regular'),
                checkInNotes:   $request->check_in_notes,
                todayDate:      $todayDate,
            );

            if ($result['duplicate']) {
                return response()->json([
                    'message'        => 'This patient is already active in today\'s queue (Queue #' . $result['existing']->queue_number . ', Status: ' . $result['existing']->status . ')',
                    'existing_queue' => $result['existing'],
                ], 409);
            }

            return response()->json([
                'message'        => "Patient added to queue as #{$result['queue_number']}",
                'queue'          => $result['queue'],
                'queue_number'   => $result['queue_number'],
                'queue_category' => $result['queue_category'],
                'visit_type'     => $result['visit_type'],
            ], 201);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUT /queue/{id}/priority
    // ────────────────────────────────────────────────────────────────────────
    public function updatePriority(UpdatePriorityRequest $request, int $id): JsonResponse
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)->whereNull('deleted_at')->findOrFail($id);
        $old   = $queue->priority;
        $queue->update(['priority' => $request->priority]);

        $this->queueService->logHistory($queue, 'priority_changed', $queue->status, $request->user()->id, "Priority changed: {$old} → {$request->priority}");
        $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

        return response()->json(['message' => "Priority updated to {$request->priority}", 'queue' => $queue->fresh()]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DELETE /queue/{id}  (soft delete)
    // ────────────────────────────────────────────────────────────────────────
    public function softDelete(Request $request, int $id): JsonResponse
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)->whereNull('deleted_at')->findOrFail($id);

        if (in_array($queue->status, ['in_consultation', 'serving', 'called'])) {
            return response()->json(['message' => 'Cannot trash an active patient (status: ' . $queue->status . '). Complete or cancel first.'], 400);
        }

        $this->queueService->logHistory($queue, 'trashed', $queue->status, $request->user()->id);
        $queue->update(['deleted_at' => now()]);
        $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

        return response()->json(['message' => "Queue #{$queue->queue_number} moved to trash"]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/restore
    // ────────────────────────────────────────────────────────────────────────
    public function restore(Request $request, int $id): JsonResponse
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)->whereNotNull('deleted_at')->findOrFail($id);
        $this->queueService->logHistory($queue, 'restored', $queue->status, $request->user()->id);
        $queue->update(['deleted_at' => null]);
        $this->queueService->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

        return response()->json(['message' => "Queue #{$queue->queue_number} restored", 'queue' => $queue->fresh()->load(['patient', 'biteIncident'])]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/trashed
    // ────────────────────────────────────────────────────────────────────────
    public function trashed(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $date     = $request->get('date', Carbon::today()->toDateString());

        $trashed = Queue::where('clinic_id', $clinicId)->where('queue_date', $date)->whereNotNull('deleted_at')
            ->with(['patient:patient_id,first_name,middle_name,last_name,gender', 'biteIncident:bite_id,case_number'])
            ->orderBy('deleted_at', 'desc')->get();

        return response()->json($trashed);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/waiting
    // ────────────────────────────────────────────────────────────────────────
    public function waiting(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $today    = Carbon::today()->toDateString();

        $queue = Queue::where('clinic_id', $clinicId)->whereNull('deleted_at')
            ->where(fn($q) => $q->where('queue_date', $today)
                ->orWhere(fn($s) => $s->where('queue_date', '<', $today)->whereIn('status', self::MAIN_STATUSES)))
            ->whereIn('status', ['waiting', 'called'])
            ->with(['patient', 'biteIncident'])
            ->orderBy('queue_date')->orderBy('queue_number')->get();

        return response()->json($queue);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/next
    // ────────────────────────────────────────────────────────────────────────
    public function next(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $date     = Carbon::today()->toDateString();
        $station  = $this->resolveStation($request);
        return response()->json(['next_patient' => $this->queueService->getNextEligible($clinicId, $date, $station)]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/skip
    // ────────────────────────────────────────────────────────────────────────
    public function skip(Request $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $clinicId = $request->user()->clinic_id;
            $userId   = $request->user()->id;

            $queue = Queue::where('clinic_id', $clinicId)->whereNull('deleted_at')->lockForUpdate()->findOrFail($id);

            if ($queue->status !== 'called') {
                return response()->json(['message' => 'Only patients with status "called" can be skipped. Current status: ' . $queue->status], 400);
            }

            $isThirdMiss = ($queue->call_count ?? 0) >= 3;

            if ($isThirdMiss) {
                $this->queueService->logHistory($queue, 'skipped', 'requires_checkin', $userId, 'Patient did not respond 3 times. Please return to Registration for check-in.');
                $queue->update(['status' => 'requires_checkin', 'recall_stage' => 'requires_checkin', 'no_response_at' => now(), 'called_at' => null]);
            } else {
                $this->queueService->logHistory($queue, 'skipped', 'waiting', $userId, 'Patient skipped — returned to waiting queue to allow next patient to be called');
                $skipNote     = '[Skipped] Returned to queue at ' . now()->format('H:i');
                $updatedNotes = $queue->check_in_notes ? $queue->check_in_notes . ' | ' . $skipNote : $skipNote;
                $queue->update(['status' => 'waiting', 'called_at' => null, 'check_in_notes' => $updatedNotes]);
            }

            $this->queueService->flushCache($clinicId, $queue->queue_date->toDateString());

            $station = $this->resolveStation($request);
            $date    = Carbon::today()->toDateString();
            $next    = $this->queueService->getNextEligibleExcluding($clinicId, $date, $station, $queue->queue_id);

            if (!$next) {
                $emptyMsg = $isThirdMiss
                    ? 'Patient did not respond 3 times. Please return to Registration for check-in.'
                    : "#{$queue->queue_number} returned to queue. No other patients are waiting.";
                return response()->json(['message' => $emptyMsg, 'skipped_queue' => $queue->fresh()->load(['patient', 'biteIncident']), 'next_called' => null, 'requires_checkin' => $isThirdMiss]);
            }

            $nextQueue = Queue::where('clinic_id', $clinicId)->whereNull('deleted_at')
                ->where('queue_id', $next->queue_id)->where('status', 'waiting')
                ->lockForUpdate()->first();

            if (!$nextQueue) {
                $raceMsg = $isThirdMiss
                    ? 'Patient did not respond 3 times. Please return to Registration for check-in.'
                    : "#{$queue->queue_number} returned to queue. Next patient was already called.";
                return response()->json(['message' => $raceMsg, 'skipped_queue' => $queue->fresh()->load(['patient', 'biteIncident']), 'next_called' => null, 'requires_checkin' => $isThirdMiss]);
            }

            $this->queueService->logHistory($nextQueue, 'called', 'called', $userId, 'Called after skip');
            $nextQueue->update(['status' => 'called', 'called_at' => now(), 'handled_by' => $userId, 'served_by' => $userId, 'serving_started_at' => now(), 'station_id' => $request->get('station_id') ?: $nextQueue->station_id]);
            $this->queueService->flushCache($clinicId, $date);

            $calledMsg = $isThirdMiss
                ? "Patient did not respond 3 times. Please return to Registration for check-in. Now calling #{$nextQueue->queue_number}."
                : "#{$queue->queue_number} skipped. Now calling #{$nextQueue->queue_number}.";

            return response()->json([
                'message'          => $calledMsg,
                'skipped_queue'    => $queue->fresh()->load(['patient', 'biteIncident']),
                'next_called'      => $nextQueue->fresh()->load(['patient', 'biteIncident', 'servedBy', 'station']),
                'queue_number'     => $nextQueue->queue_number,
                'requires_checkin' => $isThirdMiss,
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/statistics
    // ────────────────────────────────────────────────────────────────────────
    public function statistics(Request $request): JsonResponse
    {
        $clinicId = $request->user()->clinic_id;
        $date     = $request->get('date', Carbon::today()->toDateString());

        $agg = DB::table('queues')
            ->where('clinic_id', $clinicId)->where('queue_date', $date)->whereNull('deleted_at')
            ->selectRaw('COUNT(*) as total,
                SUM(status="waiting") as waiting, SUM(status="called") as called,
                SUM(status="in_consultation") as in_consultation, SUM(status="serving") as serving,
                SUM(status="completed") as completed, SUM(status="cancelled") as cancelled,
                SUM(status="no_response") as no_response, SUM(status="second_chance") as second_chance,
                SUM(status="final_recall") as final_recall, SUM(status="absent") as absent')
            ->first();

        return response()->json([
            'date'            => $date,
            'total'           => (int)($agg->total           ?? 0),
            'waiting'         => (int)($agg->waiting         ?? 0),
            'called'          => (int)($agg->called          ?? 0),
            'in_consultation' => (int)($agg->in_consultation ?? 0),
            'serving'         => (int)($agg->serving         ?? 0),
            'completed'       => (int)($agg->completed       ?? 0),
            'cancelled'       => (int)($agg->cancelled       ?? 0),
            'no_response'     => (int)($agg->no_response     ?? 0),
            'second_chance'   => (int)($agg->second_chance   ?? 0),
            'final_recall'    => (int)($agg->final_recall    ?? 0),
            'absent'          => (int)($agg->absent          ?? 0),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Public helper: exposeStaleTickets for external callers (e.g. cron job)
    // ────────────────────────────────────────────────────────────────────────
    public function expireStaleTickets(int $clinicId, string $date): int
    {
        return $this->queueService->expireStaleTickets($clinicId, $date);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function resolveStation(Request $request): ?string
    {
        $station = $request->get('station');
        if (!$station) {
            $role = $request->user()?->role;
            if ($role === 'triage')    return 'triage';
            if ($role === 'treatment') return 'treatment';
        }
        return $station;
    }
}
