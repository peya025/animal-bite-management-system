<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Domain service for appointment check-in operations.
 * Extracted from AppointmentController to remove silent try/catch blocks
 * and give the controller thin, single-responsibility methods.
 *
 * Business logic is preserved exactly — no rules changed.
 */
class AppointmentService
{
    // ── Guard methods ──────────────────────────────────────────────────────

    public function isBoosterAppointment(?Appointment $appointment): bool
    {
        return $appointment !== null && (
            $appointment->appointment_type === 'booster'
            || str_contains(strtolower($appointment->notes ?? ''), 'booster')
        );
    }

    public function isScheduledFollowUp(?Appointment $appointment): bool
    {
        return $appointment !== null && (int) ($appointment->dose_number ?? 0) > 0;
    }

    public function isMobileBiteConsultation(?Appointment $appointment): bool
    {
        return $appointment !== null
            && $appointment->booked_by_account_id !== null
            && $appointment->appointment_type === 'consultation'
            && $appointment->biteIntake()->exists();
    }

    // ── Bulk auto-complete ─────────────────────────────────────────────────

    /**
     * Auto-complete appointments whose matching dose has already been
     * administered in treatment_records.  Called at the top of nursePatients()
     * to keep the worklist fresh without a background job.
     */
    public function autoCompleteAdministeredAppointments(): void
    {
        // Standard dose appointments
        Appointment::whereIn('status', ['scheduled', 'missed', 'confirmed'])
            ->whereNotNull('dose_number')
            ->whereExists(function ($sub) {
                $sub->select(DB::raw(1))
                    ->from('treatment_records')
                    ->whereColumn('treatment_records.patient_id', 'appointments.patient_id')
                    ->whereColumn('treatment_records.dose_number', 'appointments.dose_number')
                    ->where(function ($d) {
                        $d->whereColumn('treatment_records.appointment_id', 'appointments.appointment_id')
                          ->orWhereColumn('treatment_records.treatment_date', '>=', 'appointments.scheduled_date')
                          ->orWhereColumn('treatment_records.created_at', '>=', 'appointments.created_at');
                    });
            })
            ->update(['status' => 'completed']);

        // Booster appointments
        Appointment::whereIn('status', ['scheduled', 'missed', 'confirmed'])
            ->where(function ($q) {
                $q->where('appointment_type', 'booster')
                  ->orWhere('notes', 'like', '%booster%');
            })
            ->whereExists(function ($sub) {
                $sub->select(DB::raw(1))
                    ->from('treatment_records')
                    ->whereColumn('treatment_records.patient_id', 'appointments.patient_id')
                    ->where('treatment_records.status', 'completed')
                    ->where(function ($tr) {
                        $tr->whereColumn('treatment_records.appointment_id', 'appointments.appointment_id')
                           ->orWhere(function ($d) {
                               $d->whereColumn('treatment_records.dose_number', 'appointments.dose_number')
                                 ->whereColumn('treatment_records.treatment_date', '>=', 'appointments.scheduled_date');
                           });
                    });
            })
            ->update(['status' => 'completed']);
    }

    // ── Atomic check-in ───────────────────────────────────────────────────

    /**
     * Atomic check-in handler for scheduled follow-up doses.
     * Creates the queue ticket with race-safe number generation.
     * Returns a ready-to-send JsonResponse.
     */
    public function processCheckIn(
        int             $clinicId,
        Authenticatable $user,
        int             $patientId,
        ?Appointment    $appointment,
        string          $todayDate,
        string          $priority = 'normal',
    ): JsonResponse {
        return DB::transaction(function () use ($clinicId, $user, $patientId, $appointment, $todayDate, $priority) {
            $patient = Patient::where('clinic_id', $clinicId)->findOrFail($patientId);

            // Guard: mobile bite consultation
            if ($this->isMobileBiteConsultation($appointment)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.',
                ], 422);
            }

            // Guard: booster
            if ($this->isBoosterAppointment($appointment)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booster requests must be registered and assessed by the Doctor before treatment.',
                ], 422);
            }

            // Guard: Day 0 direct check-in
            if (!$this->isScheduledFollowUp($appointment) && $appointment?->appointment_type !== 'consultation') {
                return response()->json([
                    'success' => false,
                    'message' => 'Day 0 treatment requires Registration and Doctor assessment. Only a scheduled follow-up dose can check in directly at Treatment.',
                ], 422);
            }

            // Idempotency: patient already active in today's queue
            $activeStatuses  = ['waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall'];
            $existingQueue   = Queue::where('clinic_id', $clinicId)
                ->where('patient_id', $patientId)
                ->where('queue_date', $todayDate)
                ->whereNull('deleted_at')
                ->whereIn('status', $activeStatuses)
                ->lockForUpdate()
                ->first();

            if ($existingQueue) {
                $stationLabel = in_array($existingQueue->visit_type, ['vaccination', 'booster', 'follow_up', 'observation'])
                    ? 'Treatment Room'
                    : 'Doctor Triage';

                return response()->json([
                    'message'      => "{$patient->first_name} {$patient->last_name} is already active in today's {$stationLabel} queue (Queue #{$existingQueue->queue_number})",
                    'queue'        => $existingQueue->load(['patient', 'biteIncident']),
                    'queue_number' => $existingQueue->queue_number,
                    'station'      => in_array($existingQueue->visit_type, ['vaccination', 'booster', 'follow_up', 'observation']) ? 'treatment' : 'triage',
                ], 200);
            }

            // Determine visit type and target station
            $isConsultation = $appointment &&
                ($appointment->appointment_type === 'consultation' ||
                 str_contains(strtolower($appointment->notes ?? ''), 'consultation'));
            $isFollowUp = $appointment && (int) ($appointment->dose_number ?? 0) > 0;

            if ($isConsultation) {
                $visitType    = 'new_case';
                $stationName  = 'Doctor Triage';
                $targetStation = 'triage';
            } elseif ($isFollowUp) {
                $visitType    = 'follow_up';
                $stationName  = 'Station 2 · Follow-up Doses';
                $targetStation = 'treatment';
            } else {
                $visitType    = 'vaccination';
                $stationName  = 'Station 1 · Intake & Day 0';
                $targetStation = 'treatment';
            }

            // Race-safe queue number (must scan soft-deleted rows too)
            $nextQueueNumber = (DB::table('queues')
                ->where('clinic_id', $clinicId)
                ->where('queue_date', $todayDate)
                ->max('queue_number') ?? 0) + 1;

            $doseInfo = $appointment && $appointment->dose_number !== null
                ? "Day {$appointment->dose_number} Dose"
                : null;
            $noteText = $doseInfo ? "Checked in for {$doseInfo}" : 'Checked in via patient list';

            // Resolve station record
            $stationQuery = \App\Models\Station::where('clinic_id', $clinicId)->where('is_active', true);
            $stationObj   = $isFollowUp
                ? (clone $stationQuery)->where(fn($s) =>
                    $s->where('name', 'like', '%Follow-up%')
                      ->orWhere('name', 'like', '%Follow up%')
                      ->orWhere('name', 'like', '%Station 2%')
                  )->first()
                : (clone $stationQuery)->where(fn($s) =>
                    $s->where('name', 'like', '%Intake%')
                      ->orWhere('name', 'like', '%Station 1%')
                  )->first();

            // Auto-seed default stations when missing
            if (!$stationObj) {
                $station1   = \App\Models\Station::firstOrCreate(['clinic_id' => $clinicId, 'name' => 'Station 1 - Intake'], ['is_active' => true]);
                $station2   = \App\Models\Station::firstOrCreate(['clinic_id' => $clinicId, 'name' => 'Station 2 - Follow-ups & Boosters'], ['is_active' => true]);
                $stationObj = $isFollowUp ? $station2 : $station1;
            }

            $queue = Queue::create([
                'clinic_id'      => $clinicId,
                'patient_id'     => $patientId,
                'bite_id'        => $appointment?->bite_id,
                'queue_number'   => $nextQueueNumber,
                'queue_date'     => $todayDate,
                'visit_type'     => $visitType,
                'priority'       => $priority,
                'queue_category' => $appointment ? 'appointment' : 'regular',
                'status'         => 'waiting',
                'checked_in_at'  => now(),
                'checked_in_by'  => $user->id,
                'station_id'     => $stationObj?->id,
                'check_in_notes' => $noteText,
                'call_count'     => 0,
            ]);

            if ($appointment) {
                $appointment->update(['queue_number' => $nextQueueNumber]);
            }

            Cache::forget("web:queue:clinic:{$clinicId}:date:{$todayDate}");

            app(\App\Services\NotificationService::class)
                ->notifyQueueEvent($queue->load('patient'), 'checked_in', $user);

            return response()->json([
                'message'      => "{$patient->first_name} {$patient->last_name} checked in successfully to {$stationName} (Queue #{$nextQueueNumber})",
                'queue'        => $queue->load(['patient', 'biteIncident']),
                'queue_number' => $nextQueueNumber,
                'station'      => $targetStation,
                'visit_type'   => $visitType,
            ]);
        });
    }
}
