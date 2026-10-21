<?php

namespace App\Services\Clinical;

use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\QueueHistory;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BiteIncidentIntakeService
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Get paginated intake list for clinic.
     */
    public function getPaginatedIntakes(int $clinicId, ?string $status = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = BiteIncidentIntake::where('clinic_id', $clinicId)
            ->with(['patient', 'appointment']);

        if ($status !== null && $status !== '') {
            $query->where('status', $status);
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * Mark an intake as reviewed.
     */
    public function markReviewed(BiteIncidentIntake $intake, User $user): BiteIncidentIntake
    {
        $intake->update([
            'status' => 'reviewed',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        return $intake->fresh();
    }

    /**
     * Confirm physical arrival of a mobile bite intake patient.
     *
     * @return array{status: int, data: array<string, mixed>}
     */
    public function checkIn(BiteIncidentIntake $intake, User $user): array
    {
        $clinicId = $user->clinic_id;

        return DB::transaction(function () use ($intake, $user, $clinicId) {
            $lockedIntake = BiteIncidentIntake::where('clinic_id', $clinicId)
                ->with('appointment')
                ->lockForUpdate()
                ->findOrFail($intake->intake_id);

            $appointment = $lockedIntake->appointment;
            if (!$appointment || !$appointment->booked_by_account_id || $appointment->appointment_type !== 'consultation') {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'Only a mobile bite consultation intake can be checked in from Registration.',
                    ],
                ];
            }

            if (in_array($appointment->status, ['cancelled', 'completed'], true)) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'This appointment is no longer available for check-in.',
                    ],
                ];
            }

            // Idempotent retry: show the already-created ticket rather than making a second one
            if ($lockedIntake->bite_id) {
                $queue = Queue::where('clinic_id', $clinicId)
                    ->where('appointment_id', $appointment->appointment_id)
                    ->latest('queue_id')
                    ->first();

                if ($queue) {
                    return [
                        'status' => 200,
                        'data' => [
                            'message' => 'This mobile intake has already been checked in.',
                            'already_checked_in' => true,
                            'incident' => BiteIncident::find($lockedIntake->bite_id),
                            'queue' => $queue->load(['patient', 'biteIncident']),
                        ],
                    ];
                }
            }

            if (!in_array($appointment->status, ['scheduled', 'missed'], true)) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'This mobile appointment has already been processed and cannot be checked in again.',
                    ],
                ];
            }

            $scheduledDate = Carbon::parse($appointment->scheduled_date ?? $appointment->appointment_date)->startOfDay();
            if ($scheduledDate->isFuture()) {
                return [
                    'status' => 422,
                    'data' => [
                        'message' => 'This patient can be checked in on the scheduled appointment date.',
                    ],
                ];
            }

            $todayDate = Carbon::today()->toDateString();
            $activeQueue = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $lockedIntake->patient_id)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->whereIn('status', ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'])
                ->lockForUpdate()
                ->first();

            if ($activeQueue) {
                return [
                    'status' => 409,
                    'data' => [
                        'message' => "This patient is already active in today's queue (Queue #{$activeQueue->queue_number}).",
                        'existing_queue' => $activeQueue->load(['patient', 'biteIncident']),
                    ],
                ];
            }

            // Serialize episode numbering per permanent patient profile.
            Patient::where('clinic_id', $clinicId)
                ->where('patient_id', $lockedIntake->patient_id)
                ->lockForUpdate()
                ->firstOrFail();

            $episodeNumber = (BiteIncident::where('clinic_id', $clinicId)
                ->where('patient_id', $lockedIntake->patient_id)
                ->max('episode_number') ?? 0) + 1;

            $incident = BiteIncident::create([
                'clinic_id' => $clinicId,
                'patient_id' => $lockedIntake->patient_id,
                'episode_number' => $episodeNumber,
                'episode_type' => 'pending_assessment',
                'is_previously_vaccinated' => null,
                'bite_date' => $lockedIntake->bite_date,
                'bite_place' => null,
                'site_washed' => null,
                'exposure_type' => 'unassessed',
                'exposure_mode' => null,
                'severity' => 'unassessed',
                'animal_type' => null,
                'animal_status' => 'unassessed',
                'animal_captured' => null,
                'animal_available' => null,
                'site_number' => null,
                'body_part_exposed' => null,
                'laterality' => null,
                'wound_description' => null,
                'status' => 'awaiting_assessment',
                'remarks' => 'Mobile bite intake confirmed at Registration.',
                'created_by' => $user->id,
            ]);

            $lastQueueNumber = DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->lockForUpdate()
                ->max('queue_number') ?? 0;

            $queue = Queue::create([
                'clinic_id' => $clinicId,
                'patient_id' => $lockedIntake->patient_id,
                'appointment_id' => $appointment->appointment_id,
                'bite_id' => $incident->bite_id,
                'queue_number' => $lastQueueNumber + 1,
                'queue_date' => $todayDate,
                'visit_type' => 'new_case',
                'queue_category' => 'appointment',
                'priority' => 'normal',
                'status' => 'waiting',
                'checked_in_at' => now(),
                'checked_in_by' => $user->id,
                'check_in_notes' => 'Mobile booking checked in at Registration — Doctor assessment required before any treatment.',
                'call_count' => 0,
            ]);

            $lockedIntake->update([
                'status' => 'converted',
                'checked_in_by' => $user->id,
                'checked_in_at' => now(),
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
                'performed_by' => $user->id,
                'notes' => 'Mobile bite intake checked in and sent to Doctor assessment.',
                'occurred_at' => now(),
            ]);

            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

            $this->notificationService->notifyQueueEvent($queue->load('patient'), 'checked_in', $user);

            return [
                'status' => 201,
                'data' => [
                    'message' => 'Mobile bite intake checked in and sent to Doctor assessment.',
                    'incident' => $incident,
                    'queue' => $queue->load(['patient', 'biteIncident']),
                ],
            ];
        });
    }
}
