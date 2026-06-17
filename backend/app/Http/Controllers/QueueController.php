<?php

namespace App\Http\Controllers;

use App\Models\PatientQueue;
use Illuminate\Http\Request;
use Carbon\Carbon;

class QueueController extends Controller
{
    /**
     * Get today's queue
     * Access: admin, registration, triage
     */
    public function index(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $date = $request->get('date', Carbon::today()->toDateString());

        $queue = PatientQueue::where('clinic_id', $clinicId)
            ->where('queue_date', $date)
            ->with(['patient', 'biteIncident', 'checkedInBy', 'handledBy'])
            ->orderBy('queue_number')
            ->get();

        return response()->json([
            'date' => $date,
            'total_count' => $queue->count(),
            'waiting_count' => $queue->where('status', 'waiting')->count(),
            'in_consultation_count' => $queue->where('status', 'in_consultation')->count(),
            'completed_count' => $queue->where('status', 'completed')->count(),
            'queue' => $queue,
        ]);
    }

    /**
     * Get waiting patients only
     */
    public function waiting(Request $request)
    {
        $clinicId = $request->user()->clinic_id;

        $queue = PatientQueue::where('clinic_id', $clinicId)
            ->today()
            ->waiting()
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
        $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_incident_id' => 'nullable|exists:bite_incidents,bite_id',
            'visit_type' => 'required|in:new_case,follow_up,vaccination,observation',
            'priority' => 'nullable|in:normal,urgent,emergency',
            'check_in_notes' => 'nullable|string',
        ]);

        $queue = PatientQueue::create([
            'clinic_id' => $request->user()->clinic_id,
            'patient_id' => $request->patient_id,
            'bite_incident_id' => $request->bite_incident_id,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => $request->visit_type,
            'priority' => $request->get('priority', 'normal'),
            'status' => 'waiting',
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
        $queue = PatientQueue::where('clinic_id', $request->user()->clinic_id)
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
        $queue = PatientQueue::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        if ($queue->status !== 'waiting') {
            return response()->json([
                'message' => 'Patient is not in waiting status',
            ], 400);
        }

        $queue->callPatient($request->user());

        return response()->json([
            'message' => 'Patient called for consultation',
            'queue' => $queue->fresh()->load(['patient', 'biteIncident']),
        ]);
    }

    /**
     * Complete consultation
     * Access: admin, triage
     */
    public function complete(Request $request, $id)
    {
        $queue = PatientQueue::where('clinic_id', $request->user()->clinic_id)
            ->findOrFail($id);

        if ($queue->status !== 'in_consultation') {
            return response()->json([
                'message' => 'Consultation not in progress',
            ], 400);
        }

        $request->validate([
            'consultation_notes' => 'nullable|string',
        ]);

        $queue->complete($request->consultation_notes);

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
        $queue = PatientQueue::where('clinic_id', $request->user()->clinic_id)
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
        $queue = PatientQueue::where('clinic_id', $request->user()->clinic_id)
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
        $clinicId = $request->user()->clinic_id;

        $nextPatient = PatientQueue::where('clinic_id', $clinicId)
            ->today()
            ->waiting()
            ->orderBy('priority', 'desc') // emergency first
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
    }

    /**
     * Get queue statistics
     */
    public function statistics(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $date = $request->get('date', Carbon::today()->toDateString());

        $stats = [
            'date' => $date,
            'total' => PatientQueue::forClinic($clinicId)->where('queue_date', $date)->count(),
            'waiting' => PatientQueue::forClinic($clinicId)->where('queue_date', $date)->where('status', 'waiting')->count(),
            'in_consultation' => PatientQueue::forClinic($clinicId)->where('queue_date', $date)->where('status', 'in_consultation')->count(),
            'completed' => PatientQueue::forClinic($clinicId)->where('queue_date', $date)->where('status', 'completed')->count(),
            'cancelled' => PatientQueue::forClinic($clinicId)->where('queue_date', $date)->where('status', 'cancelled')->count(),
            'by_visit_type' => PatientQueue::forClinic($clinicId)
                ->where('queue_date', $date)
                ->select('visit_type', \DB::raw('count(*) as count'))
                ->groupBy('visit_type')
                ->pluck('count', 'visit_type'),
            'average_wait_time' => null, // TODO: Calculate based on timestamps
        ];

        return response()->json($stats);
    }
}
