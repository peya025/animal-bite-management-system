<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AppointmentReminderService
{
    /**
     * Dispatch a multi-channel recall alert for a missed/overdue appointment.
     */
    public function sendRecallAlert(
        Appointment $appointment,
        string $channel = 'all',
        ?int $senderUserId = null,
        ?string $customMessage = null
    ): array {
        $appointment->loadMissing(['patient.accounts', 'clinic']);
        $patient = $appointment->patient;
        $clinic = $appointment->clinic ?? Clinic::find(1);

        if (!$patient) {
            return [
                'success' => false,
                'message' => 'Patient record not found for appointment #' . $appointment->appointment_id,
                'channels_dispatched' => [],
            ];
        }

        $clinicName = $clinic?->name ?? 'Tagoloan Animal Bite Treatment Center';
        $clinicPhone = $clinic?->phone ?? '09123456789';
        $patientName = "{$patient->first_name} {$patient->last_name}";
        $doseName = $appointment->dose_number === 0 ? 'Initial Dose (Day 0)' : "Dose (Day {$appointment->dose_number})";
        $scheduledDate = Carbon::parse($appointment->scheduled_date ?? $appointment->appointment_date)->format('M j, Y');

        $dispatched = [];
        $errors = [];

        // 1. IN-APP PUSH NOTIFICATION
        if (in_array($channel, ['all', 'in_app'])) {
            $inAppMsg = $customMessage ?? "URGENT REMINDER: {$patientName}, you missed your scheduled Rabies Vaccination ({$doseName}) on {$scheduledDate}. Rabies is 100% fatal without complete PEP. Please visit {$clinicName} immediately for your catch-up dose.";
            
            $accountId = $appointment->booked_by_account_id;
            if (!$accountId && $patient->accounts && $patient->accounts->isNotEmpty()) {
                $accountId = $patient->accounts->first()->id;
            }

            try {
                Notification::create([
                    'patient_id' => $patient->patient_id,
                    'patient_account_id' => $accountId,
                    'appointment_id' => $appointment->appointment_id,
                    'type' => 'missed_appointment_recall',
                    'message' => $inAppMsg,
                    'status' => 'sent',
                    'send_time' => now(),
                ]);

                if ($accountId) {
                    \Illuminate\Support\Facades\Cache::forget("mobile:notifications:account:{$accountId}:page:1");
                }

                AppointmentReminder::create([
                    'clinic_id' => $appointment->clinic_id ?? 1,
                    'appointment_id' => $appointment->appointment_id,
                    'patient_id' => $patient->patient_id,
                    'channel' => 'in_app',
                    'recipient' => $accountId ? "Account #{$accountId}" : "Patient #{$patient->patient_number}",
                    'subject' => "Urgent: Missed Rabies {$doseName} Recall",
                    'message' => $inAppMsg,
                    'status' => 'sent',
                    'sent_by_user_id' => $senderUserId,
                ]);

                $dispatched[] = 'in_app';
            } catch (\Exception $e) {
                Log::error('In-App Recall dispatch failed: ' . $e->getMessage());
                $errors['in_app'] = $e->getMessage();
            }
        }

        // 2. SMS NOTIFICATION
        if (in_array($channel, ['all', 'sms'])) {
            $phone = $patient->contact_number ?? $patient->phone;
            $smsMsg = $customMessage ?? "ABTC ALERT: {$patientName}, you missed your Rabies {$doseName} on {$scheduledDate}. Please go to {$clinicName} immediately for catch-up dose. Hotline: {$clinicPhone}";

            if (!empty($phone)) {
                try {
                    AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id ?? 1,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'sms',
                        'recipient' => $phone,
                        'subject' => null,
                        'message' => $smsMsg,
                        'status' => 'sent',
                        'sent_by_user_id' => $senderUserId,
                    ]);

                    $dispatched[] = 'sms';
                } catch (\Exception $e) {
                    Log::error('SMS Recall dispatch failed: ' . $e->getMessage());
                    $errors['sms'] = $e->getMessage();
                }
            } else {
                $errors['sms'] = 'No contact number on file for patient.';
            }
        }

        // 3. EMAIL NOTIFICATION
        if (in_array($channel, ['all', 'email'])) {
            $email = $patient->email;
            if (!$email && $patient->accounts && $patient->accounts->isNotEmpty()) {
                $email = $patient->accounts->first()->email;
            }

            $emailSubject = "CRITICAL MEDICAL ADVISORY: Missed Rabies PEP {$doseName}";
            $emailBody = $customMessage ?? "Dear {$patientName},\n\nOur records at {$clinicName} indicate that you missed your scheduled Rabies Post-Exposure Prophylaxis ({$doseName}) appointment on {$scheduledDate}.\n\nRabies is an incurable, fatal infection once symptoms manifest, but it is 100% preventable by completing your full prescribed vaccine series on time.\n\nPlease proceed to {$clinicName} immediately for your catch-up dose. Our clinic is open to administer your delayed injection.\n\nFor inquiries or immediate assistance, contact us at {$clinicPhone}.\n\nTagoloan Animal Bite Treatment Center";

            if (!empty($email)) {
                try {
                    AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id ?? 1,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'email',
                        'recipient' => $email,
                        'subject' => $emailSubject,
                        'message' => $emailBody,
                        'status' => 'sent',
                        'sent_by_user_id' => $senderUserId,
                    ]);

                    $dispatched[] = 'email';
                } catch (\Exception $e) {
                    Log::error('Email Recall dispatch failed: ' . $e->getMessage());
                    $errors['email'] = $e->getMessage();
                }
            } else {
                $errors['email'] = 'No email address on file for patient.';
            }
        }

        // Update appointment reminder tracking stats
        if (!empty($dispatched)) {
            $appointment->reminder_sent_count = ($appointment->reminder_sent_count ?? 0) + 1;
            $appointment->last_reminded_at = now();
            if (!$appointment->missed_at) {
                $appointment->missed_at = now();
            }
            $appointment->save();
        }

        return [
            'success' => !empty($dispatched),
            'appointment_id' => $appointment->appointment_id,
            'patient_name' => $patientName,
            'channels_dispatched' => $dispatched,
            'errors' => $errors,
            'reminder_sent_count' => $appointment->reminder_sent_count,
            'last_reminded_at' => $appointment->last_reminded_at?->toIso8601String(),
        ];
    }

    /**
     * Dispatch recall alerts in bulk to multiple appointments.
     */
    public function sendBulkRecall(array $appointmentIds, string $channel = 'all', ?int $senderUserId = null): array
    {
        $appointments = Appointment::with(['patient.accounts', 'clinic'])
            ->whereIn('appointment_id', $appointmentIds)
            ->get();

        $results = [];
        $totalSent = 0;
        $totalFailed = 0;

        foreach ($appointments as $appt) {
            $res = $this->sendRecallAlert($appt, $channel, $senderUserId);
            $results[] = $res;
            if ($res['success']) {
                $totalSent++;
            } else {
                $totalFailed++;
            }
        }

        return [
            'total_requested' => count($appointmentIds),
            'total_sent' => $totalSent,
            'total_failed' => $totalFailed,
            'details' => $results,
        ];
    }

    /**
     * Dispatch an advance 1-day reminder for an upcoming appointment.
     */
    public function sendAdvanceReminder(
        Appointment $appointment,
        string $channel = 'all',
        ?int $senderUserId = null
    ): array {
        $appointment->loadMissing(['patient.accounts', 'clinic']);
        $patient = $appointment->patient;
        $clinic = $appointment->clinic ?? Clinic::find(1);

        if (!$patient) {
            return ['success' => false, 'message' => 'Patient record not found', 'channels_dispatched' => []];
        }

        $clinicName = $clinic?->name ?? 'Tagoloan Animal Bite Treatment Center';
        $clinicPhone = $clinic?->phone ?? '09123456789';
        $patientName = "{$patient->first_name} {$patient->last_name}";
        $doseName = $appointment->dose_number === 0 ? 'Initial Dose (Day 0)' : "Dose (Day {$appointment->dose_number})";
        $scheduledDate = Carbon::parse($appointment->scheduled_date ?? $appointment->appointment_date)->format('M j, Y');

        $dispatched = [];
        $errors = [];

        // 1. In-App
        if (in_array($channel, ['all', 'in_app'])) {
            $msg = "UPCOMING SCHEDULE: {$patientName}, your Rabies {$doseName} is scheduled for TOMORROW, {$scheduledDate} at {$clinicName}. Please arrive on time.";
            $accountId = $appointment->booked_by_account_id;
            if (!$accountId && $patient->accounts && $patient->accounts->isNotEmpty()) {
                $accountId = $patient->accounts->first()->id;
            }

            try {
                Notification::create([
                    'patient_id' => $patient->patient_id,
                    'patient_account_id' => $accountId,
                    'appointment_id' => $appointment->appointment_id,
                    'type' => 'upcoming_appointment_reminder',
                    'message' => $msg,
                    'status' => 'sent',
                    'send_time' => now(),
                ]);

                AppointmentReminder::create([
                    'clinic_id' => $appointment->clinic_id ?? 1,
                    'appointment_id' => $appointment->appointment_id,
                    'patient_id' => $patient->patient_id,
                    'channel' => 'in_app',
                    'recipient' => $accountId ? "Account #{$accountId}" : "Patient #{$patient->patient_number}",
                    'subject' => "Upcoming Rabies {$doseName} Tomorrow",
                    'message' => $msg,
                    'status' => 'sent',
                    'sent_by_user_id' => $senderUserId,
                ]);

                $dispatched[] = 'in_app';
            } catch (\Exception $e) {
                $errors['in_app'] = $e->getMessage();
            }
        }

        // 2. SMS
        if (in_array($channel, ['all', 'sms'])) {
            $phone = $patient->contact_number ?? $patient->phone;
            $msg = "ABTC REMINDER: {$patientName}, your Rabies {$doseName} is scheduled for TOMORROW, {$scheduledDate} at {$clinicName}. Inquiries: {$clinicPhone}";

            if (!empty($phone)) {
                try {
                    AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id ?? 1,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'sms',
                        'recipient' => $phone,
                        'subject' => null,
                        'message' => $msg,
                        'status' => 'sent',
                        'sent_by_user_id' => $senderUserId,
                    ]);
                    $dispatched[] = 'sms';
                } catch (\Exception $e) {
                    $errors['sms'] = $e->getMessage();
                }
            }
        }

        // 3. Email
        if (in_array($channel, ['all', 'email'])) {
            $email = $patient->email;
            if (!$email && $patient->accounts && $patient->accounts->isNotEmpty()) {
                $email = $patient->accounts->first()->email;
            }

            if (!empty($email)) {
                try {
                    $subject = "Reminder: Your Rabies PEP {$doseName} is Scheduled for Tomorrow";
                    $body = "Dear {$patientName},\n\nThis is a friendly reminder from {$clinicName} that your next Rabies Vaccination ({$doseName}) is scheduled for TOMORROW, {$scheduledDate}.\n\nMaintaining your vaccination schedule on time is essential for complete rabies protection.\n\nClinic Hotline: {$clinicPhone}\n\nTagoloan Animal Bite Treatment Center";

                    AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id ?? 1,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'email',
                        'recipient' => $email,
                        'subject' => $subject,
                        'message' => $body,
                        'status' => 'sent',
                        'sent_by_user_id' => $senderUserId,
                    ]);
                    $dispatched[] = 'email';
                } catch (\Exception $e) {
                    $errors['email'] = $e->getMessage();
                }
            }
        }

        if (!empty($dispatched)) {
            $appointment->reminder_sent_count = ($appointment->reminder_sent_count ?? 0) + 1;
            $appointment->last_reminded_at = now();
            $appointment->save();
        }

        return [
            'success' => !empty($dispatched),
            'appointment_id' => $appointment->appointment_id,
            'patient_name' => $patientName,
            'channels_dispatched' => $dispatched,
            'errors' => $errors,
        ];
    }

    /**
     * Run the fully automated sweep for both Tomorrow's Reminders and Past Missed Recalls.
     */
    public function runAutomatedSweep(string $channel = 'all'): array
    {
        $today = Carbon::today();
        $tomorrow = $today->copy()->addDay()->toDateString();
        $fourteenDaysAgo = $today->copy()->subDays(14)->toDateString();

        // 1. Advance Reminders for Tomorrow
        $upcomingAppts = Appointment::with(['patient.accounts', 'clinic'])
            ->where('status', 'scheduled')
            ->where(function ($q) use ($tomorrow) {
                $q->whereDate('scheduled_date', $tomorrow)
                  ->orWhereDate('appointment_date', $tomorrow);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('last_reminded_at')
                  ->orWhereDate('last_reminded_at', '<', $today);
            })
            ->get();

        $advanceSent = 0;
        foreach ($upcomingAppts as $appt) {
            $res = $this->sendAdvanceReminder($appt, $channel);
            if ($res['success']) $advanceSent++;
        }

        // 2. Urgent Recalls for Missed / Overdue Appointments (Past 1 to 14 days)
        $missedAppts = Appointment::with(['patient.accounts', 'clinic'])
            ->where('status', 'scheduled')
            ->where(function ($q) use ($today, $fourteenDaysAgo) {
                $q->whereDate('scheduled_date', '<', $today->toDateString())
                  ->whereDate('scheduled_date', '>=', $fourteenDaysAgo);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('last_reminded_at')
                  ->orWhere('last_reminded_at', '<', Carbon::now()->subHours(20));
            })
            ->get();

        $missedRecalled = 0;
        foreach ($missedAppts as $appt) {
            $res = $this->sendRecallAlert($appt, $channel);
            if ($res['success']) $missedRecalled++;
        }

        return [
            'timestamp' => now()->toIso8601String(),
            'advance_reminders_eligible' => $upcomingAppts->count(),
            'advance_reminders_sent' => $advanceSent,
            'missed_recalls_eligible' => $missedAppts->count(),
            'missed_recalls_sent' => $missedRecalled,
            'total_dispatched' => $advanceSent + $missedRecalled,
        ];
    }
}
