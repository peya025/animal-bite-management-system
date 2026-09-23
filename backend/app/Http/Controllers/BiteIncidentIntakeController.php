<?php

namespace App\Http\Controllers;

use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Queue;
use App\Models\QueueHistory;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BiteIncidentIntakeController extends Controller
{
    public function index(Request $request)
    {
        $query = BiteIncidentIntake::where('clinic_id', $request->user()->clinic_id)
            ->with(['patient', 'appointment']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function show(Request $request, BiteIncidentIntake $intake)
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        return response()->json($intake->load(['patient', 'appointment', 'reviewer', 'biteIncident']));
    }

    public function markReviewed(Request $request, BiteIncidentIntake $intake)
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        $intake->update([
            'status' => 'reviewed',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json($intake->fresh());
    }

    /**
     * Confirm that a patient with a mobile bite consultation has physically arrived.
     *
     * A mobile booking remains only a scheduled appointment until Registration checks
     * the patient in. This creates the pending Doctor case and its queue ticket
     * together, so a no-show can never appear in the live Doctor queue.
     */
    public function checkIn(Request $request, BiteIncidentIntake $intake)
    {
        $clinicId = $request->user()->clinic_id;
        abort_unless($intake->clinic_id === $clinicId, 404);

        return DB::transaction(function () use ($request, $intake, $clinicId) {
            $intake = BiteIncidentIntake::where('clinic_id', $clinicId)
                ->with('appointment')
                ->lockForUpdate()
                ->findOrFail($intake->intake_id);

            $appointment = $intake->appointment;
            if (!$appointment || !$appointment->booked_by_account_id || $appointment->appointment_type !== 'consultation') {
                return response()->json([
                    'message' => 'Only a mobile bite consultation intake can be checked in from Registration.',
                ], 422);
            }

            if (in_array($appointment->status, ['cancelled', 'completed'])) {
                return response()->json([
                    'message' => 'This appointment is no longer available for check-in.',
                ], 422);
            }

            // Idempotent retry: show the already-created ticket rather than making a
            // second one if Registration double-clicks or refreshes the page.
            if ($intake->bite_id) {
                $queue = Queue::where('clinic_id', $clinicId)
                    ->where('appointment_id', $appointment->appointment_id)
                    ->latest('queue_id')
                    ->first();

                if ($queue) {
                    return response()->json([
                        'message' => 'This mobile intake has already been checked in.',
                        'already_checked_in' => true,
                        'incident' => BiteIncident::find($intake->bite_id),
                        'queue' => $queue->load(['patient', 'biteIncident']),
                    ]);
                }
            }

            if (!in_array($appointment->status, ['scheduled', 'missed'])) {
                return response()->json([
                    'message' => 'This mobile appointment has already been processed and cannot be checked in again.',
                ], 422);
            }

            $scheduledDate = Carbon::parse($appointment->scheduled_date ?? $appointment->appointment_date)->startOfDay();
            if ($scheduledDate->isFuture()) {
                return response()->json([
                    'message' => 'This patient can be checked in on the scheduled appointment date.',
                ], 422);
            }

            $todayDate = Carbon::today()->toDateString();
            $activeQueue = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $intake->patient_id)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->whereIn('status', ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'])
                ->lockForUpdate()
                ->first();

            if ($activeQueue) {
                return response()->json([
                    'message' => "This patient is already active in today's queue (Queue #{$activeQueue->queue_number}).",
                    'existing_queue' => $activeQueue->load(['patient', 'biteIncident']),
                ], 409);
            }

            // Serialize episode numbering per permanent patient profile.
            \App\Models\Patient::where('clinic_id', $clinicId)
                ->where('patient_id', $intake->patient_id)
                ->lockForUpdate()
                ->firstOrFail();

            $episodeNumber = (BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $intake->patient_id)
                ->max('episode_number') ?? 0) + 1;

            $incident = BiteIncident::create([
                'clinic_id' => $clinicId,
                'patient_id' => $intake->patient_id,
                'episode_number' => $episodeNumber,
                'episode_type' => 'pending_assessment',
                'is_previously_vaccinated' => false,
                'bite_date' => $intake->bite_date,
                'bite_place' => $intake->bite_place,
                'site_washed' => $intake->site_washed,
                // Intake uses the detailed Form 3 choices; the incident retains
                // the legacy four-value category used by the Doctor workflow.
                'exposure_type' => $this->incidentExposureType($intake->exposure_type),
                'severity' => 'moderate',
                'animal_type' => $intake->animal_type,
                'animal_status' => $intake->animal_status,
                'animal_captured' => $intake->animal_captured,
                'site_number' => $intake->body_part_exposed ?? $intake->wound_location,
                'wound_description' => $intake->patient_description,
                'status' => 'awaiting_assessment',
                'remarks' => 'Mobile bite intake confirmed at Registration.',
                'created_by' => $request->user()->id,
            ]);

            // Queue numbering is determined while the transaction is open. The
            // unique daily index is the final protection for simultaneous check-ins.
            $lastQueueNumber = DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->lockForUpdate()
                ->max('queue_number') ?? 0;

            $queue = Queue::create([
                'clinic_id' => $clinicId,
                'patient_id' => $intake->patient_id,
                'appointment_id' => $appointment->appointment_id,
                'bite_id' => $incident->bite_id,
                'queue_number' => $lastQueueNumber + 1,
                'queue_date' => $todayDate,
                'visit_type' => 'new_case',
                'queue_category' => 'appointment',
                'priority' => 'normal',
                'status' => 'waiting',
                'checked_in_at' => now(),
                'checked_in_by' => $request->user()->id,
                'check_in_notes' => 'Mobile booking checked in at Registration — Doctor assessment required before any treatment.',
                'call_count' => 0,
            ]);

            $intake->update([
                'status' => 'converted',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'bite_id' => $incident->bite_id,
            ]);
            $appointment->update([
                'bite_id' => $incident->bite_id,
                'status' => 'confirmed',
                'queue_number' => $queue->queue_number,
            ]);

            QueueHistory::create([
                'queue_id' => $queue->queue_id,
                'clinic_id' => $clinicId,
                'patient_id' => $queue->patient_id,
                'action' => 'checked_in',
                'from_status' => 'new',
                'to_status' => 'waiting',
                'call_count' => 0,
                'performed_by' => $request->user()->id,
                'notes' => 'Mobile bite intake checked in and sent to Doctor assessment.',
                'occurred_at' => now(),
            ]);

            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

            return response()->json([
                'message' => 'Mobile bite intake checked in and sent to Doctor assessment.',
                'incident' => $incident,
                'queue' => $queue->load(['patient', 'biteIncident']),
            ], 201);
        });
    }

    private function incidentExposureType(?string $exposureType): string
    {
        return match ($exposureType) {
            'scratch_abrasion', 'scratch' => 'scratch',
            'nibbling_uncovered_skin', 'lick' => 'lick',
            'nibbling_broken_skin', 'handling_ingestion_raw_meat', 'other' => 'other',
            default => 'bite',
        };
    }
}
