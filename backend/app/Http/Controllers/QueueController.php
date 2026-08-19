<?php

namespace App\Http\Controllers;

use App\Models\Queue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class QueueController extends Controller
{
    /**
     * Get today's queue with stats and next patient (OPTIMIZED - Single API call)
     * Access: admin, registration, triage, treatment
     */
    public function index(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $date = $request->get('date', Carbon::today()->toDateString());
            
            $cacheKey = "web:queue:clinic:{$clinicId}:date:{$date}";

            // Cache for 30 seconds (queue changes very frequently)
            return response()->json(
                Cache::remember($cacheKey, 30, function () use ($clinicId, $date) {
                    // Single optimized query with eager loading and selective fields
                    // Includes entries for target date PLUS uncompleted/active entries from previous dates (carry-over)
                    $queue = Queue::where('clinic_id', $clinicId)
                        ->whereNull('deleted_at')
                        ->where(function ($query) use ($date) {
                            $query->where('queue_date', $date)
                                  ->orWhere(function ($subQuery) use ($date) {
                                      $subQuery->where('queue_date', '<', $date)
                                               ->whereIn('status', ['waiting', 'in_consultation']);
                                  });
                        })
                        ->with([
                            'patient:patient_id,first_name,middle_name,last_name,suffix,date_of_birth,gender,contact_number',
                            'biteIncident:bite_id,case_number,patient_id',
                            'checkedInBy:id,name',
                            'handledBy:id,name'
                        ])
                        ->select('queue_id', 'queue_number', 'patient_id', 'bite_id', 'visit_type', 'priority', 'status', 'checked_in_at', 'called_at', 'completed_at', 'checked_in_by', 'handled_by', 'check_in_notes', 'clinic_id', 'queue_date')
                        ->orderBy('queue_date', 'asc')
                        ->orderBy('queue_number', 'asc')
                        ->get();

                    // Append is_carry_over indicator
                    foreach ($queue as $entry) {
                        $entry->is_carry_over = ($entry->queue_date && $entry->queue_date->toDateString() < $date)
                            && in_array($entry->status, ['waiting', 'in_consultation']);
                    }

                    // Calculate stats from the same query result (no additional DB query)
                    $waitingCount = 0;
                    $inConsultationCount = 0;
                    $completedCount = 0;
                    $cancelledCount = 0;
                    $noResponseCount = 0;
                    $nextPatient = null;
                    $visitTypeCounts = [];

                    foreach ($queue as $entry) {
                        switch ($entry->status) {
                            case 'waiting':
                                $waitingCount++;
                                if ($nextPatient === null) {
                                    $nextPatient = $entry;
                                }
                                break;
                            case 'in_consultation':
                                $inConsultationCount++;
                                break;
                            case 'completed':
                                $completedCount++;
                                break;
                            case 'cancelled':
                                $cancelledCount++;
                                break;
                            case 'no_response':
                                $noResponseCount++;
                                break;
                        }

                        // Count by visit type
                        $visitType = $entry->visit_type;
                        if (!isset($visitTypeCounts[$visitType])) {
                            $visitTypeCounts[$visitType] = 0;
                        }
                        $visitTypeCounts[$visitType]++;
                    }

                    return [
                        'date' => $date,
                        'total_count' => $queue->count(),
                        'waiting_count' => $waitingCount,
                        'in_consultation_count' => $inConsultationCount,
                        'completed_count' => $completedCount,
                        'cancelled_count' => $cancelledCount,
                        'no_response_count' => $noResponseCount,
                        'queue' => $queue,
                        'stats' => [
                            'date' => $date,
                            'total' => $queue->count(),
                            'waiting' => $waitingCount,
                            'in_consultation' => $inConsultationCount,
                            'completed' => $completedCount,
                            'cancelled' => $cancelledCount,
                            'no_response' => $noResponseCount,
                            'by_visit_type' => $visitTypeCounts,
                        ],
                        'next_patient' => $nextPatient,
                    ];
                })
            );
        } catch (\Exception $e) {
            \Log::error('Queue index error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'date' => Carbon::today()->toDateString(),
                'total_count' => 0,
                'waiting_count' => 0,
                'in_consultation_count' => 0,
                'completed_count' => 0,
                'queue' => [],
                'stats' => [
                    'date' => Carbon::today()->toDateString(),
                    'total' => 0,
                    'waiting' => 0,
                    'in_consultation' => 0,
                    'completed' => 0,
                    'cancelled' => 0,
                    'by_visit_type' => [],
                ],
                'next_patient' => null,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get waiting patients only
     */
    public function waiting(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $today = Carbon::today()->toDateString();

        $queue = Queue::where('clinic_id', $clinicId)
            ->where(function ($query) use ($today) {
                $query->where('queue_date', $today)
                      ->orWhere(function ($subQuery) use ($today) {
                          $subQuery->where('queue_date', '<', $today)
                                   ->whereIn('status', ['waiting', 'in_consultation']);
                      });
            })
            ->where('status', 'waiting')
            ->with(['patient', 'biteIncident'])
            ->orderBy('queue_date', 'asc')
            ->orderBy('queue_number', 'asc')
            ->get();

        return response()->json($queue);
    }

    /**
     * Add patient to queue
     * Access: admin, registration
     */
    public function store(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_incident_id' => 'nullable|exists:bite_incidents,bite_id',
            'visit_type' => 'required|in:new_case,follow_up,vaccination,observation',
            'priority' => 'nullable|in:normal,urgent,emergency',
            'check_in_notes' => 'nullable|string',
        ]);

        // Get next queue number for today
        $todayDate = Carbon::today()->toDateString();
        $lastQueue = Queue::where('clinic_id', $clinicId)
            ->where('queue_date', $todayDate)
            ->orderBy('queue_number', 'desc')
            ->first();

        $nextQueueNumber = $lastQueue ? ($lastQueue->queue_number + 1) : 1;

        $queue = Queue::create([
            'clinic_id' => $clinicId,
            'patient_id' => $request->patient_id,
            'bite_id' => $request->bite_incident_id,
            'queue_number' => $nextQueueNumber,
            'queue_date' => $todayDate,
            'visit_type' => $request->visit_type,
            'priority' => $request->get('priority', 'normal'),
            'status' => 'waiting',
            'checked_in_at' => now(),
            'checked_in_by' => $request->user()->id,
            'check_in_notes' => $request->check_in_notes,
        ]);

        // Invalidate queue cache
        Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

        return response()->json([
            'message' => 'Patient added to queue successfully',
            'queue' => $queue->load(['patient', 'biteIncident']),
            'queue_number' => $queue->queue_number,
        ], 201);
    }

    /**
     * Get queue entry details
     */
    public function show(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->with(['patient', 'biteIncident', 'checkedInBy', 'handledBy'])
            ->findOrFail($id);

        return response()->json($queue);
    }

    /**
     * Call patient from queue
     * Access: admin, triage
     */
    public function call(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        if ($queue->status !== 'waiting') {
            return response()->json([
                'message' => 'Patient is not in waiting status',
            ], 400);
        }

        $queue->update([
            'status' => 'in_consultation',
            'called_at' => now(),
            'handled_by' => $request->user()->id,
        ]);

        // Invalidate queue cache
        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json([
            'message' => 'Patient called for consultation',
            'queue' => $queue->fresh()->load(['patient', 'biteIncident']),
        ]);
    }

    /**
     * Complete consultation
     * Access: admin, triage, treatment
     */
    public function complete(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        if ($queue->status !== 'in_consultation' && $queue->status !== 'waiting') {
            return response()->json([
                'message' => 'Consultation not in progress',
            ], 400);
        }

        $request->validate([
            'consultation_notes' => 'nullable|string',
        ]);

        $queue->update([
            'status' => 'completed',
            'completed_at' => now(),
            'consultation_notes' => $request->consultation_notes,
        ]);

        // Invalidate queue cache
        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json([
            'message' => 'Consultation completed',
            'queue' => $queue->fresh(),
        ]);
    }

    /**
     * Cancel queue entry
     * Access: admin, registration
     */
    public function cancel(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        if ($queue->status === 'completed') {
            return response()->json([
                'message' => 'Cannot cancel completed consultation',
            ], 400);
        }

        $queue->update([
            'status' => 'cancelled',
            'completed_at' => now(),
        ]);

        // Invalidate queue cache
        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json([
            'message' => 'Queue entry cancelled',
        ]);
    }

    /**
     * Mark patient as no_response (did not respond when called)
     * Access: admin, triage, treatment
     */
    public function noResponse(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        if ($queue->status !== 'in_consultation' && $queue->status !== 'waiting') {
            return response()->json(['message' => 'Patient is not active in queue'], 400);
        }

        $queue->update([
            'status'         => 'no_response',
            'no_response_at' => now(),
        ]);

        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json([
            'message' => 'Patient marked as no response',
            'queue'   => $queue->fresh(),
        ]);
    }

    /**
     * Give patient a second chance — re-queue them at end of today's queue
     * Access: admin, triage, treatment
     */
    public function secondChance(Request $request, $id)
    {
        $clinicId = $request->user()->clinic_id;

        $queue = Queue::where('clinic_id', $clinicId)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        if ($queue->status !== 'no_response') {
            return response()->json(['message' => 'Patient must be in no_response status to give a second chance'], 400);
        }

        $todayDate = Carbon::today()->toDateString();

        // Get next queue number
        $lastQueue = Queue::where('clinic_id', $clinicId)
            ->where('queue_date', $todayDate)
            ->whereNull('deleted_at')
            ->orderBy('queue_number', 'desc')
            ->first();

        $nextQueueNumber = $lastQueue ? ($lastQueue->queue_number + 1) : 1;

        // Create a new queue entry (second chance) for end of queue
        $newEntry = Queue::create([
            'clinic_id'      => $clinicId,
            'patient_id'     => $queue->patient_id,
            'bite_id'        => $queue->bite_id,
            'appointment_id' => $queue->appointment_id,
            'queue_number'   => $nextQueueNumber,
            'queue_date'     => $todayDate,
            'visit_type'     => $queue->visit_type,
            'priority'       => $queue->priority,
            'status'         => 'waiting',
            'checked_in_at'  => now(),
            'checked_in_by'  => $request->user()->id,
            'check_in_notes' => '[Second Chance] ' . ($queue->check_in_notes ?? ''),
        ]);

        Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");
        Cache::forget("web:queue:clinic:{$clinicId}:date:{$queue->queue_date}");

        return response()->json([
            'message'   => 'Patient re-queued with a second chance',
            'queue'     => $newEntry->load(['patient', 'biteIncident']),
            'queue_number' => $newEntry->queue_number,
        ], 201);
    }

    /**
     * Soft-delete (trash) a queue entry
     * Access: admin, registration
     */
    public function softDelete(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        if ($queue->status === 'in_consultation') {
            return response()->json(['message' => 'Cannot trash a patient currently in consultation'], 400);
        }

        $queue->update(['deleted_at' => now()]);

        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json(['message' => 'Queue entry moved to trash']);
    }

    /**
     * Restore a trashed queue entry
     * Access: admin, registration
     */
    public function restore(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->whereNotNull('deleted_at')
            ->findOrFail($id);

        $queue->update(['deleted_at' => null]);

        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json([
            'message' => 'Queue entry restored',
            'queue'   => $queue->fresh()->load(['patient', 'biteIncident']),
        ]);
    }

    /**
     * List trashed queue entries for today
     * Access: admin, registration
     */
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

    /**
     * Update queue priority
     * Access: admin, registration, triage
     */
    public function updatePriority(Request $request, $id)
    {
        $queue = Queue::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        $request->validate([
            'priority' => 'required|in:normal,urgent,emergency',
        ]);

        $queue->update(['priority' => $request->priority]);

        // Invalidate queue cache
        Cache::forget("web:queue:clinic:{$request->user()->clinic_id}:date:{$queue->queue_date}");

        return response()->json([
            'message' => 'Priority updated successfully',
            'queue' => $queue,
        ]);
    }

    /**
     * Get next patient in queue (DEPRECATED - now included in index())
     * Kept for backwards compatibility
     */
    public function next(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $todayDate = Carbon::today()->toDateString();

            $nextPatient = Queue::where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->where('status', 'waiting')
                ->orderBy('queue_number')
                ->with(['patient', 'biteIncident'])
                ->first();

            if (!$nextPatient) {
                return response()->json([
                    'message' => 'No patients waiting in queue',
                    'next_patient' => null,
                ]);
            }

            return response()->json([
                'message' => 'Next patient in queue',
                'next_patient' => $nextPatient,
            ]);
        } catch (\Exception $e) {
            \Log::error('Queue next error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching next patient',
                'next_patient' => null,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get queue statistics (DEPRECATED - now included in index())
     * Kept for backwards compatibility
     */
    public function statistics(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $date = $request->get('date', Carbon::today()->toDateString());

            // Run a single aggregated query for all status counts
            $aggregates = \Illuminate\Support\Facades\DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $date)
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN status = "waiting" THEN 1 ELSE 0 END) as waiting,
                    SUM(CASE WHEN status = "in_consultation" THEN 1 ELSE 0 END) as in_consultation,
                    SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled
                ')
                ->first();

            $stats = [
                'date' => $date,
                'total' => (int) ($aggregates->total ?? 0),
                'waiting' => (int) ($aggregates->waiting ?? 0),
                'in_consultation' => (int) ($aggregates->in_consultation ?? 0),
                'completed' => (int) ($aggregates->completed ?? 0),
                'cancelled' => (int) ($aggregates->cancelled ?? 0),
            ];

            // Get visit type counts
            $visitTypes = \Illuminate\Support\Facades\DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $date)
                ->select('visit_type', \Illuminate\Support\Facades\DB::raw('count(*) as count'))
                ->groupBy('visit_type')
                ->get();

            $stats['by_visit_type'] = [];
            foreach ($visitTypes as $vt) {
                $stats['by_visit_type'][$vt->visit_type] = $vt->count;
            }

            return response()->json($stats);
        } catch (\Exception $e) {
            \Log::error('Queue statistics error: ' . $e->getMessage());
            return response()->json([
                'date' => Carbon::today()->toDateString(),
                'total' => 0,
                'waiting' => 0,
                'in_consultation' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'by_visit_type' => [],
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
