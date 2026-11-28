<?php

namespace App\Listeners;

use App\Events\AppointmentStatusChanged;
use App\Jobs\SendFcmPushNotification;
use App\Models\Appointment;
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

        $appointment = Appointment::with('patient.accounts')->find($event->appointmentId);
        if (!$appointment || !$appointment->patient || $appointment->clinic_id != $event->clinicId
            || $appointment->status !== $event->status
            || ($event->appointmentDate !== null && $event->appointmentDate !== $appointment->appointment_date?->format('Y-m-d'))
            || ($event->appointmentTime !== null && $event->appointmentTime !== $appointment->appointment_time?->format('H:i'))) {
            return;
        }
        $eligible = $appointment->patient->accounts->filter(fn ($a) => $a->is_active);
        $targetId = $event->patientAccountId ?? $appointment->booked_by_account_id;
        // An explicit unauthorized recipient must not be substituted with another account.
        $verified = $eligible->filter(fn ($a) => $a->pivot?->status === 'verified');
        // Explicit recipients are subsequently checked by FcmNotificationPolicy, including
        // the narrowly scoped booking-owner exception. Fallback remains verified-only.
        $account = $targetId ? $eligible->firstWhere('id', $targetId)
            : ($verified->first(fn ($a) => $a->pivot->is_primary) ?? $verified->first());

        if (!$account || !$account->is_active) {
            Log::info("Appointment FCM skipped: No active authorized patient account found for appointment #{$event->appointmentId}.");
            return;
        }

        // Test allowlist enforcement for automatic appointment push notifications
        if (!app(\App\Services\Messaging\FcmService::class)->isAccountAllowed($account)) {
            Log::info("Appointment FCM skipped: Patient account #{$account->id} is not in the automatic FCM allowlist.");
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

        if (!\App\Services\Messaging\FcmNotificationPolicy::snapshot((int) $account->id, [
            'category' => $notificationConfig['category'], 'appointment_id' => $event->appointmentId,
        ])) {
            return;
        }
        SendFcmPushNotification::dispatch(
            patientAccountId: (int) $account->id,
            title: $notificationConfig['title'],
            body: $notificationConfig['body'],
            data: [
                'category'       => $notificationConfig['category'],
                'route'          => '/appointments',
                'appointment_id' => (string) $event->appointmentId,
            ],
            idempotencyKey: hash('sha256', json_encode([
                'appointment', $account->id, $event->appointmentId, $action, $event->timestamp,
                $event->status, $event->appointmentDate, $event->appointmentTime, $event->doseNumber,
            ], JSON_THROW_ON_ERROR))
        );

        Log::info("Enqueued FCM push notification for appointment #{$event->appointmentId} [Action: {$action}] to patient account #{$account->id}.");
    }
}
