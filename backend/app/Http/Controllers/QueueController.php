<?php

namespace App\Http\Controllers;

use App\Models\Queue;
use Illuminate\Http\Request;
use Carbon\Carbon;

class QueueController extends Controller
{
    /**
     * Get today's queue
     * Access: admin, registration, triage, treatment
     */
    public function index(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $date = $request->get('date', Carbon::today()->toDateString());

            $queue = Queue::where('clinic_id', $clinicId)
                ->where('queue_date', $date)
                ->with(['patient', 'biteIncident', 'checkedInBy', 'handledBy'])
                ->orderBy('queue_number')
                ->get()
                ->map(function ($entry) {
                    // Ensure patient data is properly formatted for frontend
                    if ($entry->patient) {
                        $entry->patient->contact_number = $entry->patient->contact_number ?? $entry->patient->phone ?? '';
                    }
                    return $entry;
                });

            return response()->json([
                'date' => $date,
                'total_count' => $queue->count(),
                'waiting_count' => $queue->where('status', 'waiting')->count(),
                'in_consultation_count' => $queue->where('status', 'in_consultation')->count(),
                'completed_count' => $queue->where('status', 'completed')->count(),
                'queue' => $queue,
            ]);
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

        $queue = Queue::where('clinic_id', $clinicId)
            ->where('queue_date', Carbon::today()->toDateString())
            ->where('status', 'waiting')
            ->with(['patient', 'biteIncident'])
            ->orderBy('queue_number')
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

        return response()->json([
            'message' => 'Queue entry cancelled',
        ]);
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

        return response()->json([
            'message' => 'Priority updated successfully',
            'queue' => $queue,
        ]);
    }

    /**
     * Get next patient in queue
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
     * Get queue statistics
     */
    public function statistics(Request $request)
    {
        try {
            $clinicId = $request->user()->clinic_id;
            $date = $request->get('date', Carbon::today()->toDateString());

            $stats = [
                'date' => $date,
                'total' => Queue::where('clinic_id', $clinicId)->where('queue_date', $date)->count(),
                'waiting' => Queue::where('clinic_id', $clinicId)->where('queue_date', $date)->where('status', 'waiting')->count(),
                'in_consultation' => Queue::where('clinic_id', $clinicId)->where('queue_date', $date)->where('status', 'in_consultation')->count(),
                'completed' => Queue::where('clinic_id', $clinicId)->where('queue_date', $date)->where('status', 'completed')->count(),
                'cancelled' => Queue::where('clinic_id', $clinicId)->where('queue_date', $date)->where('status', 'cancelled')->count(),
            ];

            // Get visit type counts
            $visitTypes = Queue::where('clinic_id', $clinicId)
                ->where('queue_date', $date)
                ->select('visit_type', \DB::raw('count(*) as count'))
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
