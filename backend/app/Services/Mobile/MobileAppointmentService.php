<?php

namespace App\Services\Mobile;

use App\Models\Appointment;
use App\Models\BiteIncidentIntake;
use App\Models\Notification;
use App\Models\PatientAccount;
use App\Services\NotificationService;
use App\Support\BiteIntakeContract;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MobileAppointmentService
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * Get formatted appointment list for patient account and linked patients
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAppointmentsForAccount(PatientAccount $account): array
    {
        $patientIds = $account->patients()->pluck('patients.patient_id')->toArray();
        $patients = $account->patients()->get()->keyBy('patient_id');

        $doseNameMap = [
            0   => 'Day 0',
            3   => 'Day 3',
            7   => 'Day 7',
            14  => 'Day 14',
            28  => 'Day 28',
            90  => 'Booster 1',
            365 => 'Booster 2',
        ];

        $appointments = Appointment::where(function ($q) use ($patientIds, $account) {
            $q->whereIn('patient_id', $patientIds)
              ->orWhere('booked_by_account_id', $account->id);
        })
        ->with(['patient', 'biteIncident'])
        ->orderByRaw('COALESCE(scheduled_date, appointment_date) asc')
        ->get();

        return $appointments->map(function ($app) use ($patients, $doseNameMap) {
            $p = $app->patient;
            $pivot = $patients->get($app->patient_id);
            $rel = $pivot ? ($pivot->pivot->relationship ?? 'self') : 'self';
            $pName = $p ? "{$p->first_name} {$p->last_name}" : 'Patient';

            $date = $app->scheduled_date ?? $app->appointment_date;
            $dateStr = $date ? Carbon::parse($date)->format('Y-m-d') : Carbon::today()->format('Y-m-d');

            $doseName = null;
            if ($app->dose_number !== null && isset($doseNameMap[$app->dose_number])) {
                $doseName = $doseNameMap[$app->dose_number];
            } elseif (preg_match('/(Day \d+|Booster \d+)/i', $app->notes ?? '', $m)) {
                $doseName = $m[1];
            }

            $isVac = str_contains($app->appointment_type ?? '', 'vaccination') || $app->appointment_type === 'booster';
            $idealDate = $app->ideal_date ? Carbon::parse($app->ideal_date)->format('Y-m-d') : $dateStr;

            return [
                'appointment_id'             => $app->appointment_id,
                'patient_id'                 => $app->patient_id,
                'patient_name'               => $pName,
                'relationship'               => $rel,
                'appointment_type'           => $app->appointment_type,
                'type'                       => $isVac ? ($app->appointment_type === 'booster' ? 'booster' : 'vaccination') : 'consultation',
                'type_label'                 => $doseName ? "Anti-rabies vaccine · {$doseName}" : ($app->appointment_type === 'booster' ? 'Rabies Booster' : ($isVac ? 'Vaccination' : 'Bite consultation')),
                'dose_name'                  => $doseName,
                'dose_number'                => $app->dose_number,
                'scheduled_date'             => $dateStr,
                'appointment_date'           => $dateStr,
                'ideal_date'                 => $idealDate,
                'schedule_drift_days'        => (int) ($app->schedule_drift_days ?? 0),
                'schedule_adjustment_reason' => $app->schedule_adjustment_reason,
                'time_slot'                  => $app->time_slot ?? 'morning',
                'status'                     => $app->status,
                'notes'                      => $app->notes,
                'cancellation_reason'        => $app->cancellation_reason,
                'patient'                    => [
                    'patient_id'   => $app->patient_id,
                    'name'         => $pName,
                    'first_name'   => $p?->first_name,
                    'last_name'    => $p?->last_name,
                    'relationship' => $rel,
                ],
            ];
        })->all();
    }

    /**
     * Book appointment with bite intake draft and notifications
     *
     * @param array<string, mixed> $validated
     */
    public function bookAppointment(PatientAccount $account, array $validated): Appointment
    {
        $patient = $account->patients()
            ->whereKey($validated['patient_id'])
            ->wherePivotIn('status', ['pending', 'verified'])
            ->firstOrFail();

        // Booster appointment requires completed primary PEP series
        if ($validated['appointment_type'] === 'booster') {
            if (!$patient->has_completed_primary) {
                throw new HttpResponseException(
                    response()->json([
                        'message'               => 'Booster booking requires completion of the primary 3-dose vaccine series (Day 0, Day 3, Day 7) first.',
                        'has_completed_primary' => false,
                    ], 422)
                );
            }
        }

        DB::beginTransaction();
        try {
            $isBooster = $validated['appointment_type'] === 'booster';

            $appointment = Appointment::create([
                'clinic_id'            => $patient->clinic_id,
                'patient_id'           => $validated['patient_id'],
                'appointment_type'     => $validated['appointment_type'],
                'dose_number'          => $isBooster ? 90 : null,
                'scheduled_date'       => $validated['scheduled_date'],
                'appointment_date'     => $validated['scheduled_date'],
                'ideal_date'           => $validated['scheduled_date'],
                'time_slot'            => $validated['time_slot'] ?? 'morning',
                'notes'                => $isBooster
                    ? trim(($validated['notes'] ?? '') . ' [BOOSTER RE-EXPOSURE: Day 0]')
                    : ($validated['notes'] ?? null),
                'booked_by_account_id' => $account->id,
                'status'               => 'scheduled',
            ]);

            if ($isBooster) {
                $day3Date = Carbon::parse($validated['scheduled_date'])->addDays(3)->format('Y-m-d');
                Appointment::create([
                    'clinic_id'            => $patient->clinic_id,
                    'patient_id'           => $validated['patient_id'],
                    'appointment_type'     => 'booster',
                    'dose_number'          => 365,
                    'scheduled_date'       => $day3Date,
                    'appointment_date'     => $day3Date,
                    'ideal_date'           => $day3Date,
                    'time_slot'            => $validated['time_slot'] ?? 'morning',
                    'notes'                => trim(($validated['notes'] ?? '') . ' [BOOSTER RE-EXPOSURE: Day 3 follow-up]'),
                    'booked_by_account_id' => $account->id,
                    'status'               => 'scheduled',
                ]);
            }

            if ($appointment->appointment_type === 'consultation' && !empty($validated['intake'])) {
                $intakeData = BiteIntakeContract::storagePayload($validated['intake']);

                BiteIncidentIntake::create([
                    ...$intakeData,
                    'clinic_id'          => $patient->clinic_id,
                    'patient_id'         => $patient->patient_id,
                    'patient_account_id' => $account->id,
                    'appointment_id'     => $appointment->appointment_id,
                    'status'             => 'pending',
                    'submitted_at'       => now(),
                ]);
            }

            $readableType = match ($appointment->appointment_type) {
                'booster'      => 'rabies booster (2 doses)',
                'vaccination'  => 'vaccination',
                'consultation' => 'bite consultation',
                default        => $appointment->appointment_type,
            };

            Notification::create([
                'patient_id'         => $patient->patient_id,
                'patient_account_id' => $account->id,
                'appointment_id'     => $appointment->appointment_id,
                'type'               => 'booking_confirmation',
                'message'            => "{$patient->name}'s {$readableType} appointment is scheduled starting on {$appointment->scheduled_date->format('F j, Y')}.",
                'status'             => 'pending',
                'send_time'          => now(),
            ]);

            $this->notificationService->notifyAppointmentEvent($appointment, 'booked');

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        $this->invalidateAppointmentCaches($account->id);

        return $appointment->load(['patient', 'biteIntake']);
    }

    /**
     * Cancel scheduled appointment
     */
    public function cancelAppointment(PatientAccount $account, int $appointmentId, ?string $reason = null): Appointment
    {
        /** @var Appointment $appointment */
        $appointment = $account->appointments()
            ->whereKey($appointmentId)
            ->with('patient')
            ->firstOrFail();

        abort_unless($appointment->status === 'scheduled', 422, 'Only scheduled appointments can be cancelled.');

        // Follow-up vaccination appointments (Day 3 to booster) cannot be cancelled online
        $isFollowUpOrBooster = ($appointment->dose_number !== null && $appointment->dose_number > 0)
            || $appointment->appointment_type === 'booster'
            || preg_match('/(Day [37]|Day 14|Day 28|Booster)/i', $appointment->notes ?? '');

        abort_if(
            $isFollowUpOrBooster,
            422,
            'Follow-up vaccination appointments (Day 3 to booster) cannot be cancelled from mobile to ensure complete rabies protection. Please contact or visit the animal bite clinic directly.'
        );

        $appointment->update([
            'status'              => 'cancelled',
            'cancellation_reason' => $reason,
            'cancelled_at'        => now(),
        ]);

        Notification::create([
            'patient_id'         => $appointment->patient_id,
            'patient_account_id' => $account->id,
            'appointment_id'     => $appointment->appointment_id,
            'type'               => 'booking_cancelled',
            'message'            => "{$appointment->patient->name}'s {$appointment->appointment_type} appointment was cancelled.",
            'status'             => 'pending',
            'send_time'          => now(),
        ]);

        $this->invalidateAppointmentCaches($account->id);

        return $appointment->fresh()->load('patient');
    }

    /**
     * Update bite intake details for an existing scheduled appointment
     */
    public function updateAppointmentIntake(PatientAccount $account, int $appointmentId, array $intakeData): array
    {
        $patientIds = $account->patients()->pluck('patients.patient_id')->toArray();

        $appointment = Appointment::where(function ($q) use ($patientIds, $account) {
            $q->whereIn('patient_id', $patientIds)
              ->orWhere('booked_by_account_id', $account->id);
        })
        ->where('appointment_id', $appointmentId)
        ->firstOrFail();

        if (in_array($appointment->status, ['completed', 'cancelled'])) {
            throw new HttpResponseException(
                response()->json([
                    'message' => 'Intake cannot be modified for a completed or cancelled appointment.',
                ], 422)
            );
        }

        $storagePayload = BiteIntakeContract::storagePayload($intakeData);

        $intake = $appointment->biteIntake;
        if ($intake) {
            $intake->update($storagePayload);
        } else {
            $intake = BiteIncidentIntake::create([
                ...$storagePayload,
                'clinic_id'          => $appointment->clinic_id,
                'patient_id'         => $appointment->patient_id,
                'patient_account_id' => $account->id,
                'appointment_id'     => $appointment->appointment_id,
                'status'             => 'pending',
                'submitted_at'       => now(),
            ]);
        }

        $this->invalidateAppointmentCaches($account->id);

        return [
            'appointment_id' => $appointment->appointment_id,
            'message'        => 'Bite intake updated successfully.',
            'intake'         => $intake->fresh(),
        ];
    }

    /**
     * Invalidate appointment and notification caches for account
     */
    public function invalidateAppointmentCaches(int $accountId): void
    {
        Cache::forget("mobile:appointments:account:{$accountId}");
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("mobile:notifications:account:{$accountId}:page:{$i}");
        }
    }
}
