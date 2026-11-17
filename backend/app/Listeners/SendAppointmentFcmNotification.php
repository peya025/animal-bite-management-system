<?php

namespace App\Listeners;

use App\Events\AppointmentStatusChanged;
use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
use App\Models\PatientAccount;
use Illuminate\Support\Facades\Log;

class SendAppointmentFcmNotification
{
    /**
     * Handle the appointment status changed event.
     */
    public function handle(AppointmentStatusChanged $event): void
    {
        $action = $event->action;

        // Only process supported appointment notification actions
        if (!in_array($action, ['confirmed', 'cancelled', 'rescheduled'], true)) {
            return;
        }

        // Resolve target patient account
        $account = null;
        if ($event->patientAccountId !== null && $event->patientAccountId > 0) {
            $account = PatientAccount::find($event->patientAccountId);
        }

        if (!$account) {
            $appointment = Appointment::with(['patient.accounts', 'bookedByAccount'])->find($event->appointmentId);
            if (!$appointment) {
                return;
            }

            if ($appointment->booked_by_account_id) {
                $account = $appointment->bookedByAccount;
            } elseif ($appointment->patient && $appointment->patient->accounts->isNotEmpty()) {
                // Prioritize verified or primary relationship to prevent cross-account delivery
                $account = $appointment->patient->accounts->first(fn ($a) =>
                    $a->is_active && ($a->pivot?->status === 'verified' || $a->pivot?->is_primary)
                );
                $account ??= $appointment->patient->accounts->first(fn ($a) => $a->is_active);
            }
        }

        if (!$account || !$account->is_active) {
            Log::info("Appointment FCM skipped: No active authorized patient account found for appointment #{$event->appointmentId}.");
            return;
        }

        // Explicit approved generic templates (zero PHI: no patient names, diagnosis, wound details)
        $notificationConfig = match ($action) {
            'confirmed' => [
                'title'    => 'Appointment Confirmed',
                'body'     => 'Your appointment has been confirmed. Open the app to view your details.',
                'category' => 'appointment',
            ],
            'cancelled' => [
                'title'    => 'Appointment Cancelled',
                'body'     => 'Your appointment has been cancelled. Open the app for more information.',
                'category' => 'appointment_cancelled',
            ],
            'rescheduled' => [
                'title'    => 'Appointment Updated',
                'body'     => 'Your appointment schedule has changed. Open the app to view your updated schedule.',
                'category' => 'appointment_rescheduled',
            ],
        };

        SendFcmPushNotification::dispatch(
            patientAccountId: (int) $account->id,
            title: $notificationConfig['title'],
            body: $notificationConfig['body'],
            data: [
                'category'       => $notificationConfig['category'],
                'route'          => '/appointments',
                'appointment_id' => (string) $event->appointmentId,
            ]
        );

        Log::info("Enqueued FCM push notification for appointment #{$event->appointmentId} [Action: {$action}] to patient account #{$account->id}.");
    }
}
