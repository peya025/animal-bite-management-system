<?php

namespace App\Services\Messaging;

use App\Models\Announcement;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\PatientAccount;

/** FCM-only authorization and state checks. Never include this snapshot in a push. */
class FcmNotificationPolicy
{
    public static function snapshot(int $accountId, array $data): ?string
    {
        $category = $data['category'] ?? 'general';
        $account = PatientAccount::find($accountId);
        if (!$account || !$account->allowsNotificationCategory($category)
            || !app(FcmService::class)->isAccountAllowed($account)) {
            return null;
        }

        $state = [$category];
        if (in_array($category, ['appointment', 'appointment_cancelled', 'appointment_rescheduled',
            'appointment_reminder', 'vaccination_due', 'dose_reminder', 'vaccination_schedule'], true)) {
            $appointment = Appointment::find($data['appointment_id'] ?? 0);
            if (!$appointment || !$appointment->patient
                || $appointment->patient->clinic_id != $appointment->clinic_id) {
                return null;
            }
            if ($category === 'appointment_cancelled' && $appointment->status !== 'cancelled') {
                return null;
            }
            if ($category !== 'appointment_cancelled' && !in_array($appointment->status, ['scheduled', 'confirmed'], true)) {
                return null;
            }
            $patient = $appointment->patient;
            $state[] = $appointment->only(['patient_id', 'clinic_id', 'bite_id', 'booked_by_account_id',
                'status', 'scheduled_date', 'appointment_date', 'appointment_time', 'dose_number', 'cancelled_at']);
        } elseif ($category === 'digital_card') {
            $patient = Patient::find($data['patient_id'] ?? 0);
            if (!$patient) {
                return null;
            }
            // Hash record content as well as timestamps: same-second edits must invalidate old jobs.
            $state[] = $patient->treatmentRecords()->orderBy('treatment_id')->get()->map->getAttributes()->all();
            $state[] = $patient->clinic_id;
        } elseif ($category === 'announcement') {
            $announcement = Announcement::find($data['announcement_id'] ?? 0);
            if (!$announcement || !$announcement->is_published || $announcement->target_barangay
                || ($announcement->expires_on && $announcement->expires_on < now('Asia/Manila')->toDateString())
                || !$account->patients()->wherePivot('status', 'verified')->where('clinic_id', $announcement->clinic_id)->exists()) {
                return null;
            }
            $state[] = $announcement->getAttributes();
        } elseif ($category !== 'general') {
            return null;
        }

        if (isset($patient)) {
            $linked = $account->patients()->whereKey($patient->getKey())->first();
            if (!$linked) {
                return null;
            }
            if ($linked->pivot->status !== 'verified') {
                // Only generic booking updates may use this exception. The mobile controller
                // supplies the authenticated account; MobileAppointmentService writes BOTH
                // the owner and booking_confirmation in the same transaction. Event/client
                // recipient IDs and a pending link alone are never proof of ownership.
                if (!isset($appointment)
                    || !in_array($category, ['appointment', 'appointment_cancelled', 'appointment_rescheduled'], true)
                    || $linked->pivot->status !== 'pending'
                    || $linked->pivot->verified_at !== null || $linked->pivot->verified_by !== null
                    || (int) $appointment->booked_by_account_id !== (int) $account->id
                    || !$linked->pivot->created_at || !$appointment->created_at
                    || $linked->pivot->created_at->gt($appointment->created_at)) {
                    return null;
                }
                $booking = Notification::where('type', 'booking_confirmation')
                    ->where('appointment_id', $appointment->getKey())
                    ->where('patient_id', $patient->getKey())
                    ->where('patient_account_id', $account->id)
                    ->orderBy('notification_id')
                    ->first(['notification_id', 'created_at']);
                if (!$booking) {
                    return null;
                }
                // Read/unread state does not revoke ownership; removal/replacement of proof does.
                $state[] = ['booking_confirmation' => $booking->getKey(), 'created_at' => $booking->created_at];
            }
            $state[] = $linked->pivot->getAttributes();
        }

        return hash('sha256', json_encode($state, JSON_THROW_ON_ERROR));
    }

    public static function payload(array $data): array
    {
        // Only navigation metadata leaves the queue. Reject nested/free-form clinical data.
        $result = [];
        $category = is_string($data['category'] ?? null) ? $data['category'] : 'general';
        $result['category'] = $category;
        $result['route'] = match ($category) {
            'appointment', 'appointment_cancelled', 'appointment_rescheduled' => '/appointments',
            'appointment_reminder', 'vaccination_due', 'dose_reminder', 'vaccination_schedule' => '/calendar',
            'digital_card' => '/menu',
            'announcement' => '/notifications',
            default => '/settings',
        };
        $keys = match ($category) {
            'digital_card' => ['patient_id'],
            'announcement' => ['announcement_id'],
            'appointment', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_reminder',
            'vaccination_due', 'dose_reminder', 'vaccination_schedule' => ['appointment_id'],
            default => [],
        };
        foreach ($keys as $key) {
            if (isset($data[$key]) && is_scalar($data[$key]) && ctype_digit((string) $data[$key])) {
                $result[$key] = (string) $data[$key];
            }
        }
        if (($data['is_test'] ?? null) === 'true') {
            $result['is_test'] = 'true';
        }
        return $result;
    }

    public static function text(string $category, string $body, string $title = ''): array
    {
        if ($category === 'general' && $title === 'Security Alert') {
            return ['Security Alert', 'Your account password has been changed. Open the app if this was not you.'];
        }
        return match ($category) {
            'appointment' => ['Appointment Confirmed', 'Your appointment has been confirmed. Open the app to view your details.'],
            'appointment_cancelled' => ['Appointment Cancelled', 'Your appointment has been cancelled. Open the app for more information.'],
            'appointment_rescheduled' => ['Appointment Updated', 'Your appointment schedule has changed. Open the app to view your updated schedule.'],
            'digital_card' => ['Vaccination Card Updated', 'Your digital vaccination card has been updated. Open the app to view your record.'],
            'announcement' => ['Clinic Announcement', 'A new clinic announcement has been posted. Open the app to view details.'],
            'appointment_reminder', 'vaccination_due', 'dose_reminder', 'vaccination_schedule' => ['Vaccination Reminder',
                $body === 'You have an overdue appointment. Open the app to view your schedule.'
                    ? $body : 'You have an upcoming appointment. Open the app to view your schedule.'],
            default => ['Account Update', 'Your account has an update. Open the app to view details.'],
        };
    }
}
