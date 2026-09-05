<?php

namespace App\Http\Controllers;

use App\Models\Queue;
use App\Models\QueueHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class QueueController extends Controller
{
    // ── Status groups ────────────────────────────────────────────────────────
    const MAIN_STATUSES   = ['waiting', 'called', 'in_consultation', 'serving'];
    const SECOND_STATUSES = ['second_chance', 'final_recall'];
    const DONE_STATUSES   = ['completed', 'cancelled', 'absent', 'no_response'];

    // Priority order for category-based sorting (lower = higher priority)
    const CATEGORY_ORDER = [
        'priority'       => 1,
        'senior_citizen' => 2,
        'pwd'            => 2,
        'pregnant'       => 2,
        'appointment'    => 3,
        'regular'        => 4,
    ];

    // ── Helper: log history ──────────────────────────────────────────────────
    private function logHistory(Queue $queue, string $action, string $toStatus, ?int $userId, ?string $notes = null): void
    {
        QueueHistory::create([
            'queue_id'     => $queue->queue_id,
            'clinic_id'    => $queue->clinic_id,
            'patient_id'   => $queue->patient_id,
            'action'       => $action,
            'from_status'  => $queue->status,
            'to_status'    => $toStatus,
            'call_count'   => $queue->call_count ?? 0,
            'performed_by' => $userId,
            'notes'        => $notes,
            'occurred_at'  => now(),
        ]);
    }

    // ── Helper: flush cache ──────────────────────────────────────────────────
    private function flushCache(int $clinicId, ?string $date = null): void
    {
        $date = $date ?? Carbon::today()->toDateString();
        Cache::forget("web:queue:clinic:{$clinicId}:date:{$date}");
    }

    // ── Helper: patient select fields ────────────────────────────────────────
    private function patientFields(): string
    {
        return 'patient_id,first_name,middle_name,last_name,suffix,date_of_birth,gender,contact_number';
    }

    // ── Helper: find next eligible patient (priority-aware FIFO, station-scoped) ─────
    private function getNextEligible(int $clinicId, string $date, ?string $station = null): ?Queue
    {
        // Priority categories first, then FIFO within same category
        $categoryOrder = self::CATEGORY_ORDER;

        $query = Queue::where('clinic_id', $clinicId)
            ->whereNull('deleted_at')
            ->where('status', 'waiting')
            ->where(function ($q) use ($date) {
                $q->where('queue_date', $date)
                  ->orWhere(function ($s) use ($date) {
                      $s->where('queue_date', '<', $date)
                        ->whereIn('status', self::MAIN_STATUSES);
                  });
            });

        if ($station === 'triage') {
            $query->whereIn('visit_type', ['new_case', 'consultation']);
        } elseif ($station === 'treatment') {
            $query->whereIn('visit_type', ['vaccination', 'follow_up', 'observation']);
        }

        $waiting = $query->with(['patient:' . $this->patientFields(), 'biteIncident:bite_id,case_number,patient_id'])
            ->get();

        if ($waiting->isEmpty()) return null;

        // Sort: by category priority, then by priority level, then by queue_number (FIFO)
        $priorityLevel = ['emergency' => 1, 'urgent' => 2, 'normal' => 3];

        return $waiting->sortBy([
            fn($a, $b) => ($categoryOrder[$a->queue_category] ?? 4) <=> ($categoryOrder[$b->queue_category] ?? 4),
            fn($a, $b) => ($priorityLevel[$a->priority] ?? 3) <=> ($priorityLevel[$b->priority] ?? 3),
            fn($a, $b) => $a->queue_number <=> $b->queue_number,
        ])->first();
    }

    // ── Helper: auto-expire unserved tickets from previous days ─────────────
    public function expireStaleTickets(int $clinicId, string $date): int
    {
        $staleStatuses = array_merge(self::MAIN_STATUSES, self::SECOND_STATUSES);
        $staleTickets = Queue::where('clinic_id', $clinicId)
            ->where('queue_date', '<', $date)
            ->whereIn('status', $staleStatuses)
            ->whereNull('deleted_at')
            ->get();

        $count = 0;
        foreach ($staleTickets as $ticket) {
            $ticket->update([
                'status'             => 'no_response',
                'no_response_at'     => now(),
                'consultation_notes' => 'Auto-expired: patient did not complete visit before clinic closed',
            ]);
            $this->logHistory($ticket, 'auto_expired', 'no_response', null, 'Auto-expired at end of clinic day');
            $count++;
        }

        return $count;
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue  —  Main + second chance queues + stats
    // ────────────────────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $date     = $request->get('date', Carbon::today()->toDateString());
            $cacheKey = "web:queue:clinic:{$clinicId}:date:{$date}";

            $stationParam = $request->get('station');
            if (!$stationParam) {
                $userRole = $request->user()?->role;
                if ($userRole === 'triage') $stationParam = 'triage';
                elseif ($userRole === 'treatment') $stationParam = 'treatment';
            }

            $data = Cache::remember($cacheKey, 30, function () use ($clinicId, $date) {

                $baseQuery = Queue::where('clinic_id', $clinicId)
                    ->whereNull('deleted_at')
                    ->with([
                        'patient:' . $this->patientFields(),
                        'biteIncident:bite_id,case_number,patient_id',
                    ])
                    ->select(
                        'queue_id','queue_number','queue_category','patient_id','bite_id',
                        'visit_type','priority','status','checked_in_at','called_at',
                        'completed_at','cancelled_at','serving_at','second_chance_at',
                        'final_recall_at','absent_at','no_response_at',
                        'checked_in_by','handled_by','check_in_notes','consultation_notes',
                        'call_count','recall_stage','clinic_id','queue_date'
                    );

                // Auto-expire stale unserved tickets from previous days (both main and second-chance)
                $this->expireStaleTickets($clinicId, $date);

                // Main queue: strictly today's tickets
                $mainQueue = (clone $baseQuery)
                    ->where('queue_date', $date)
                    ->orderBy('queue_number', 'asc')
                    ->get();

                // Second chance queue: strictly for the requested date
                $secondQueue = (clone $baseQuery)
                    ->where('queue_date', $date)
                    ->whereIn('status', self::SECOND_STATUSES)
                    ->orderBy('no_response_at', 'asc')
                    ->get();

                // Carry-over flags
                foreach ($mainQueue as $entry) {
                    $entry->is_carry_over = $entry->queue_date &&
                        $entry->queue_date->toDateString() < $date &&
                        in_array($entry->status, self::MAIN_STATUSES);
                }
                foreach ($secondQueue as $entry) {
                    $entry->is_carry_over = false;
                }

                // Stats
                $counts = array_fill_keys([
                    'waiting','called','in_consultation','serving',
                    'completed','cancelled','no_response',
                    'second_chance','final_recall','absent',
                ], 0);
                $visitTypeCounts     = [];
                $categoryTypeCounts  = [];

                foreach ($mainQueue as $entry) {
                    if (isset($counts[$entry->status])) $counts[$entry->status]++;
                    $visitTypeCounts[$entry->visit_type]         = ($visitTypeCounts[$entry->visit_type]         ?? 0) + 1;
                    $categoryTypeCounts[$entry->queue_category]  = ($categoryTypeCounts[$entry->queue_category]  ?? 0) + 1;
                }
                foreach ($secondQueue as $entry) {
                    if (isset($counts[$entry->status])) $counts[$entry->status]++;
                }

                return [
                    'date'                => $date,
                    'queue'               => $mainQueue,
                    'second_chance_queue' => $secondQueue,
                    'stats'               => array_merge($counts, [
                        'date'            => $date,
                        'total'           => $mainQueue->count() + $secondQueue->count(),
                        'by_visit_type'   => $visitTypeCounts,
                        'by_category'     => $categoryTypeCounts,
                    ]),
                ];
            });

            // Priority-aware next patient (computed per station/user role dynamically)
            $data['next_patient'] = $this->getNextEligible($clinicId, $date, $stationParam);

            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error('Queue index error: ' . $e->getMessage());
            return response()->json([
                'date' => Carbon::today()->toDateString(),
                'queue' => [], 'second_chance_queue' => [], 'next_patient' => null,
                'stats' => [
                    'date'=>Carbon::today()->toDateString(),
                    'total'=>0,'waiting'=>0,'called'=>0,'in_consultation'=>0,'serving'=>0,
                    'completed'=>0,'cancelled'=>0,'no_response'=>0,
                    'second_chance'=>0,'final_recall'=>0,'absent'=>0,
                    'by_visit_type'=>[],'by_category'=>[],
                ],
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/call-next  —  Auto-select + call next eligible patient
    // ────────────────────────────────────────────────────────────────────────
    public function callNext(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $date     = Carbon::today()->toDateString();
        $userRole = $request->user()->role ?? null;
        $station  = $request->get('station');

        if (!$station) {
            if ($userRole === 'triage') {
                $station = 'triage';
            } elseif ($userRole === 'treatment') {
                $station = 'treatment';
            }
        }

        return DB::transaction(function () use ($clinicId, $date, $request, $station) {
            // Task 2.3: Expire stale tickets before picking next
            $this->expireStaleTickets($clinicId, $date);

            $next = $this->getNextEligible($clinicId, $date, $station);

            if (!$next) {
                $label = $station ? ucfirst($station) . ' queue' : 'queue';
                return response()->json(['message' => "No patients waiting in the {$label}"], 404);
            }

            // Re-fetch with lock to prevent simultaneous calls
            $queue = Queue::where('clinic_id', $clinicId)
                ->whereNull('deleted_at')
                ->where('queue_id', $next->queue_id)
                ->where('status', 'waiting')
                ->lockForUpdate()
                ->first();

            if (!$queue) {
                return response()->json(['message' => 'Patient was already called by another staff member'], 409);
            }

            $this->logHistory($queue, 'called', 'called', $request->user()->id, 'Auto call-next');

            $queue->update([
                'status'     => 'called',
                'called_at'  => now(),
                'call_count' => ($queue->call_count ?? 0) + 1,
                'handled_by' => $request->user()->id,
            ]);

            $this->flushCache($clinicId, $date);

            return response()->json([
                'message'      => "Called #{$queue->queue_number}",
                'queue'        => $queue->fresh()->load(['patient', 'biteIncident']),
                'queue_number' => $queue->queue_number,
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/call  —  WAITING → CALLED (with lock)
    // ────────────────────────────────────────────────────────────────────────
    public function call(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if ($queue->status !== 'waiting') {
                return response()->json([
                    'message' => 'Only waiting patients can be called. Current status: ' . $queue->status,
                ], 400);
            }

            $this->logHistory($queue, 'called', 'called', $request->user()->id);

            $queue->update([
                'status'     => 'called',
                'called_at'  => now(),
                'call_count' => ($queue->call_count ?? 0) + 1,
                'handled_by' => $request->user()->id,
            ]);

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => "Called #{$queue->queue_number} · {$queue->patient->name}",
                'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/serve  —  CALLED / SECOND_CHANCE / FINAL_RECALL → SERVING
    // ────────────────────────────────────────────────────────────────────────
    public function serve(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($queue->status, ['waiting', 'called', 'serving', 'second_chance', 'final_recall', 'in_consultation'])) {
                return response()->json([
                    'message' => 'Cannot serve queue ticket with status: ' . $queue->status,
                ], 400);
            }

            $this->logHistory($queue, 'serving', 'serving', $request->user()->id);

            $queue->update([
                'status'       => 'serving',
                'serving_at'   => now(),
                // Reset recall_stage so subsequent misses start fresh
                'recall_stage' => null,
            ]);

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => "Patient #{$queue->queue_number} is now being served",
                'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/no-response  —  Auto-progress: CALLED → SECOND_CHANCE → FINAL_RECALL
    // ────────────────────────────────────────────────────────────────────────
    public function noResponse(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($queue->status, ['waiting', 'called', 'in_consultation'])) {
                return response()->json([
                    'message' => 'Patient must be active (waiting/called) to mark as no response. Current: ' . $queue->status,
                ], 400);
            }

            // Use recall_stage to determine which miss this is
            $recallStage = $queue->recall_stage;

            if ($recallStage === 'second_chance') {
                // Second miss → final_recall
                $this->logHistory($queue, 'no_response', 'final_recall', $request->user()->id, 'Missed second call — Final Recall');
                $queue->update([
                    'status'          => 'final_recall',
                    'no_response_at'  => now(),
                    'recall_stage'    => 'final_recall',
                    'final_recall_at' => now(),
                ]);
                $msg = "#{$queue->queue_number} missed second call — moved to Final Recall";
            } else {
                // First miss → second_chance
                $this->logHistory($queue, 'no_response', 'second_chance', $request->user()->id, 'Missed first call — Second Chance');
                $queue->update([
                    'status'           => 'second_chance',
                    'no_response_at'   => now(),
                    'recall_stage'     => 'second_chance',
                    'second_chance_at' => now(),
                ]);
                $msg = "#{$queue->queue_number} moved to Second Chance Queue";
            }

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => $msg,
                'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/recall  —  SECOND_CHANCE / FINAL_RECALL → CALLED
    // ────────────────────────────────────────────────────────────────────────
    public function recall(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($queue->status, ['second_chance', 'final_recall'])) {
                return response()->json([
                    'message' => 'Patient must be in second chance or final recall to recall. Current: ' . $queue->status,
                ], 400);
            }

            $stage = $queue->status === 'final_recall' ? 'Final Recall' : 'Second Chance';
            $this->logHistory($queue, 'recalled', 'called', $request->user()->id, "Recalled from {$stage}");

            $queue->update([
                'status'     => 'called',
                'called_at'  => now(),
                'call_count' => ($queue->call_count ?? 0) + 1,
                'handled_by' => $request->user()->id,
            ]);

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => "#{$queue->queue_number} recalled ({$stage})",
                'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/absent  —  FINAL_RECALL / SECOND_CHANCE → ABSENT (No-Show)
    // ────────────────────────────────────────────────────────────────────────
    public function markAbsent(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($queue->status, ['final_recall', 'second_chance', 'no_response'])) {
                return response()->json([
                    'message' => 'Patient must be in final recall or second chance to mark absent. Current: ' . $queue->status,
                ], 400);
            }

            $this->logHistory($queue, 'absent', 'absent', $request->user()->id, 'No response after all recall attempts — marked No-Show');

            $queue->update([
                'status'    => 'absent',
                'absent_at' => now(),
            ]);

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message' => "#{$queue->queue_number} marked as No-Show",
                'queue'   => $queue->fresh(),
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/complete  —  SERVING → COMPLETED
    // ────────────────────────────────────────────────────────────────────────
    public function complete(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($queue->status, ['waiting', 'serving', 'in_consultation', 'called', 'second_chance', 'final_recall'])) {
                return response()->json([
                    'message' => 'Cannot complete ticket with status: ' . $queue->status,
                ], 400);
            }

            $request->validate(['consultation_notes' => 'nullable|string|max:2000']);

            $servedAt = $queue->serving_at ?? $queue->called_at ?? $queue->checked_in_at;
            $waitingSeconds = $queue->checked_in_at
                ? now()->diffInSeconds($queue->checked_in_at)
                : null;
            $serviceSeconds = $servedAt ? now()->diffInSeconds($servedAt) : null;

            $isTriageTransfer = in_array($request->user()->role, ['triage', 'doctor', 'admin'])
                && in_array($queue->visit_type, ['new_case', 'follow_up', 'observation', 'consultation']);

            if ($isTriageTransfer) {
                $transferNotes = collect([
                    'Doctor completed Form 2 — referred to Treatment.',
                    $request->consultation_notes,
                ])->filter()->implode(' | ');

                $this->logHistory($queue, 'transferred_to_treatment', 'waiting', $request->user()->id, $transferNotes);

                $queue->update([
                    'visit_type'         => 'vaccination',
                    'status'             => 'waiting',
                    'called_at'          => null,
                    'serving_at'         => null,
                    'completed_at'       => null,
                    'consultation_notes' => $transferNotes,
                    'recall_stage'       => null,
                ]);

                $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

                return response()->json([
                    'message'          => 'Patient transferred to treatment queue',
                    'queue'            => $queue->fresh(),
                    'waiting_seconds'  => $waitingSeconds,
                    'service_seconds'  => $serviceSeconds,
                ]);
            }

            $this->logHistory($queue, 'completed', 'completed', $request->user()->id,
                $request->consultation_notes ?? null);

            $queue->update([
                'status'             => 'completed',
                'completed_at'       => now(),
                'consultation_notes' => $request->consultation_notes,
                'recall_stage'       => null,
            ]);

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json([
                'message'          => 'Consultation completed',
                'queue'            => $queue->fresh(),
                'waiting_seconds'  => $waitingSeconds,
                'service_seconds'  => $serviceSeconds,
            ]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/cancel
    // ────────────────────────────────────────────────────────────────────────
    public function cancel(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $queue = Queue::where('clinic_id', $request->user()->clinic_id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($id);

            if (in_array($queue->status, ['completed', 'absent', 'cancelled'])) {
                return response()->json([
                    'message' => 'Cannot cancel a ' . $queue->status . ' patient',
                ], 400);
            }

            $request->validate(['reason' => 'nullable|string|max:500']);

            $this->logHistory($queue, 'cancelled', 'cancelled', $request->user()->id,
                $request->reason ?? null);

            $queue->update([
                'status'       => 'cancelled',
                'cancelled_at' => now(),
                'recall_stage' => null,
                'check_in_notes' => $request->reason
                    ? ($queue->check_in_notes ? $queue->check_in_notes . ' | Cancelled: ' . $request->reason : 'Cancelled: ' . $request->reason)
                    : $queue->check_in_notes,
            ]);

            $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

            return response()->json(['message' => "#{$queue->queue_number} cancelled"]);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/{id}  —  Single entry with history + performer names
    // ────────────────────────────────────────────────────────────────────────
    public function show(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->with(['patient.details', 'patient.memberships', 'biteIncident', 'checkedInBy:id,name', 'handledBy:id,name', 'history'])
            ->findOrFail($id);

        return response()->json($queue);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/{id}/history  —  Audit trail with performer names
    // ────────────────────────────────────────────────────────────────────────
    public function history(Request $request, $id)
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
    // POST /queue  —  Add patient to queue (with race-condition-safe number generation)
    // ────────────────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $request->validate([
            'patient_id'       => 'required|exists:patients,patient_id',
            'bite_incident_id' => 'nullable|exists:bite_incidents,bite_id',
            'visit_type'       => 'required|in:new_case,consultation,follow_up,vaccination,observation',
            'priority'         => 'nullable|in:normal,urgent,emergency',
            'queue_category'   => 'nullable|in:regular,appointment,senior_citizen,pwd,pregnant,priority',
            'check_in_notes'   => 'nullable|string|max:1000',
        ]);

        $todayDate = Carbon::today()->toDateString();

        return DB::transaction(function () use ($request, $clinicId, $todayDate) {
            // Task 9: Prevent duplicate — same patient cannot be active in queue twice today
            $existing = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $request->patient_id)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->whereIn('status', array_merge(self::MAIN_STATUSES, self::SECOND_STATUSES))
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'This patient is already active in today\'s queue (Queue #' . $existing->queue_number . ', Status: ' . $existing->status . ')',
                    'existing_queue' => $existing->load(['patient', 'biteIncident']),
                ], 409);
            }

            // Task 2.3: Auto-expire unserved tickets from prior days before generating today's queue
            $this->expireStaleTickets($clinicId, $todayDate);

            // Task 1: Race-condition-safe queue number generation using DB lock
            $lastQueue = Queue::where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->orderBy('queue_number', 'desc')
                ->first();

            $nextQueueNumber = $lastQueue ? ($lastQueue->queue_number + 1) : 1;

            // Determine category — if patient is pregnant/senior/pwd and not explicitly set,
            // default to regular (staff can always override)
            $category = $request->get('queue_category', 'regular');

            $visitType = $request->visit_type;
            if ($visitType === 'consultation') {
                $visitType = 'new_case';
            }
            if ($visitType === 'follow_up') {
                $visitType = 'vaccination';
            }

            $queue = Queue::create([
                'clinic_id'      => $clinicId,
                'patient_id'     => $request->patient_id,
                'bite_id'        => $request->bite_incident_id,
                'queue_number'   => $nextQueueNumber,
                'queue_date'     => $todayDate,
                'visit_type'     => $visitType,
                'priority'       => $request->get('priority', 'normal'),
                'queue_category' => $category,
                'status'         => 'waiting',
                'checked_in_at'  => now(),
                'checked_in_by'  => $request->user()->id,
                'check_in_notes' => $request->check_in_notes,
                'call_count'     => 0,
            ]);

            // Sync any scheduled appointments for today with this queue number
            \App\Models\Appointment::where('patient_id', $request->patient_id)
                ->where('status', 'scheduled')
                ->where(function ($q) use ($todayDate) {
                    $q->whereDate('scheduled_date', $todayDate)
                      ->orWhereDate('appointment_date', $todayDate);
                })
                ->update([
                    'queue_number' => $nextQueueNumber,
                ]);

            $this->logHistory($queue, 'checked_in', 'waiting', $request->user()->id,
                "Category: {$category}, Priority: {$queue->priority}");

            $this->flushCache($clinicId, $todayDate);

            return response()->json([
                'message'        => "Patient added to queue as #{$nextQueueNumber}",
                'queue'          => $queue->load(['patient', 'biteIncident']),
                'queue_number'   => $nextQueueNumber,
                'queue_category' => $category,
                'visit_type'     => $visitType,
            ], 201);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUT /queue/{id}/priority
    // ────────────────────────────────────────────────────────────────────────
    public function updatePriority(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->whereNull('deleted_at')->findOrFail($id);

        $request->validate(['priority' => 'required|in:normal,urgent,emergency']);

        $old = $queue->priority;
        $queue->update(['priority' => $request->priority]);

        // Task 8: Log priority changes
        $this->logHistory($queue, 'priority_changed', $queue->status, $request->user()->id,
            "Priority changed: {$old} → {$request->priority}");

        $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

        return response()->json([
            'message' => "Priority updated to {$request->priority}",
            'queue'   => $queue->fresh(),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // DELETE /queue/{id}  —  Soft delete (trash)
    // ────────────────────────────────────────────────────────────────────────
    public function softDelete(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->whereNull('deleted_at')->findOrFail($id);

        if (in_array($queue->status, ['in_consultation', 'serving', 'called'])) {
            return response()->json([
                'message' => 'Cannot trash an active patient (status: ' . $queue->status . '). Complete or cancel first.',
            ], 400);
        }

        // Task 8: Log trash action
        $this->logHistory($queue, 'trashed', $queue->status, $request->user()->id);

        $queue->update(['deleted_at' => now()]);
        $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

        return response()->json(['message' => "Queue #{$queue->queue_number} moved to trash"]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST /queue/{id}/restore
    // ────────────────────────────────────────────────────────────────────────
    public function restore(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->whereNotNull('deleted_at')->findOrFail($id);

        // Task 8: Log restore action
        $this->logHistory($queue, 'restored', $queue->status, $request->user()->id);

        $queue->update(['deleted_at' => null]);
        $this->flushCache($queue->clinic_id, $queue->queue_date->toDateString());

        return response()->json([
            'message' => "Queue #{$queue->queue_number} restored",
            'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/trashed
    // ────────────────────────────────────────────────────────────────────────
    public function trashed(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $date     = $request->get('date', Carbon::today()->toDateString());

        $trashed = Queue::where('clinic_id', $clinicId)
            ->where('queue_date', $date)
            ->whereNotNull('deleted_at')
            ->with(['patient:patient_id,first_name,middle_name,last_name,gender', 'biteIncident:bite_id,case_number'])
            ->orderBy('deleted_at', 'desc')
            ->get();

        return response()->json($trashed);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/waiting
    // ────────────────────────────────────────────────────────────────────────
    public function waiting(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $today    = Carbon::today()->toDateString();

        $queue = Queue::where('clinic_id', $clinicId)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($today) {
                $q->where('queue_date', $today)
                  ->orWhere(function ($s) use ($today) {
                      $s->where('queue_date', '<', $today)->whereIn('status', self::MAIN_STATUSES);
                  });
            })
            ->whereIn('status', ['waiting', 'called'])
            ->with(['patient', 'biteIncident'])
            ->orderBy('queue_date')->orderBy('queue_number')->get();

        return response()->json($queue);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/next
    // ────────────────────────────────────────────────────────────────────────
    public function next(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $date     = Carbon::today()->toDateString();
        $stationParam = $request->get('station');
        if (!$stationParam) {
            $userRole = $request->user()?->role;
            if ($userRole === 'triage') $stationParam = 'triage';
            elseif ($userRole === 'treatment') $stationParam = 'treatment';
        }
        $next = $this->getNextEligible($clinicId, $date, $stationParam);
        return response()->json(['next_patient' => $next]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET /queue/statistics
    // ────────────────────────────────────────────────────────────────────────
    public function statistics(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $date     = $request->get('date', Carbon::today()->toDateString());

        $agg = DB::table('queues')
            ->where('clinic_id', $clinicId)
            ->where('queue_date', $date)
            ->whereNull('deleted_at')
            ->selectRaw('COUNT(*) as total,
                SUM(status="waiting") as waiting,
                SUM(status="called") as called,
                SUM(status="in_consultation") as in_consultation,
                SUM(status="serving") as serving,
                SUM(status="completed") as completed,
                SUM(status="cancelled") as cancelled,
                SUM(status="no_response") as no_response,
                SUM(status="second_chance") as second_chance,
                SUM(status="final_recall") as final_recall,
                SUM(status="absent") as absent')
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
}
