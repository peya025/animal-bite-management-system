<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\Clinic;
use App\Models\Notification;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AppointmentReminderService
{
    /**
     * Helper to resolve detailed clinical context for an appointment.
     * Distinguishes whether the patient missed Doctor Triage (Day 0 / Form 2) or Nurse Treatment (Day 3/7/28).
     */
    protected function resolveClinicalContext(Appointment $appointment, Patient $patient): array
    {
        $hasBiteIncident = (bool) $appointment->bite_id || $patient->biteIncidents()->exists();
        $doseNum = $appointment->dose_number;

        $isInitialTriage = false;
        $station = 'Treatment / Nurse Desk';
        $doseLabel = 'Vaccine Dose';
        $notifType = 'missed_appointment_recall';
        $title = 'Urgent: Missed Vaccination Recall';

        if ($appointment->appointment_type === 'consultation') {
            $station = 'Doctor Consultation Desk';
            $doseLabel = 'General Consultation';
            $notifType = 'missed_consultation_recall';
            $title = 'Missed Medical Consultation';
        } elseif (!$hasBiteIncident || $doseNum === 0 || is_null($doseNum)) {
            $isInitialTriage = true;
            $station = 'Doctor Triage & Assessment (Form 2)';
            $doseLabel = 'Initial Assessment & Day 0 Dose';
            $notifType = 'missed_triage_recall';
            $title = 'Urgent: Missed Doctor Triage & Day 0 Dose';
        } else {
            $station = 'Treatment / Nurse Desk (Form 3)';
            $doseLabel = "Rabies Dose (Day {$doseNum})";
            $notifType = 'missed_treatment_recall';
            $title = "Urgent: Missed Rabies Dose (Day {$doseNum})";
        }

        return [
            'is_initial_triage' => $isInitialTriage,
            'station' => $station,
            'dose_label' => $doseLabel,
            'dose_number' => $doseNum ?? ($isInitialTriage ? 0 : 3),
            'notif_type' => $notifType,
            'title' => $title,
        ];
    }

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
        $scheduledDate = Carbon::parse($appointment->scheduled_date ?? $appointment->appointment_date)->format('M j, Y');

        $ctx = $this->resolveClinicalContext($appointment, $patient);
        $station = $ctx['station'];
        $doseLabel = $ctx['dose_label'];
        $title = $ctx['title'];
        $notifType = $ctx['notif_type'];

        $dispatched = [];
        $errors = [];

        // 1. IN-APP PUSH NOTIFICATION
        if (in_array($channel, ['all', 'in_app'])) {
            if ($customMessage) {
                $inAppMsg = $customMessage;
            } elseif ($ctx['is_initial_triage']) {
                $inAppMsg = "URGENT CLINICAL ADVISORY: {$patientName}, you missed your Doctor Triage & Initial Assessment (Day 0) scheduled on {$scheduledDate}. Prompt bite evaluation and immediate first dose are critical for rabies prevention. Please proceed to Doctor Triage at {$clinicName}.";
            } else {
                $inAppMsg = "URGENT REMINDER: {$patientName}, you missed your scheduled Rabies Vaccination ({$doseLabel}) at the {$station} on {$scheduledDate}. Rabies is 100% fatal without complete PEP. Please visit {$clinicName} immediately for your catch-up injection.";
            }

            $accountId = $appointment->booked_by_account_id;
            if (!$accountId && $patient->accounts && $patient->accounts->isNotEmpty()) {
                $accountId = $patient->accounts->first()->id;
            }

            try {
                Notification::create([
                    'patient_id' => $patient->patient_id,
                    'patient_account_id' => $accountId,
                    'appointment_id' => $appointment->appointment_id,
                    'type' => $notifType,
                    'message' => $inAppMsg,
                    'status' => 'sent',
                    'send_time' => now(),
                ]);

                if ($accountId) {
                    Cache::forget("mobile:notifications:account:{$accountId}:page:1");
                }

                AppointmentReminder::create([
                    'clinic_id' => $appointment->clinic_id ?? 1,
                    'appointment_id' => $appointment->appointment_id,
                    'patient_id' => $patient->patient_id,
                    'channel' => 'in_app',
                    'recipient' => $accountId ? "Account #{$accountId}" : "Patient #{$patient->patient_number}",
                    'subject' => $title,
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

            if ($customMessage) {
                $smsMsg = $customMessage;
            } elseif ($ctx['is_initial_triage']) {
                $smsMsg = "ABTC ALERT: {$patientName}, you missed your Doctor Triage & Day 0 Dose on {$scheduledDate}. Please proceed to Doctor Triage at {$clinicName} immediately for wound evaluation & first dose. Hotline: {$clinicPhone}";
            } else {
                $smsMsg = "ABTC ALERT: {$patientName}, you missed your {$doseLabel} on {$scheduledDate}. Please proceed to {$clinicName} Treatment Desk immediately for catch-up dose. Hotline: {$clinicPhone}";
            }

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

            $emailSubject = "CRITICAL MEDICAL ADVISORY: Missed {$doseLabel} at {$station}";
            if ($customMessage) {
                $emailBody = $customMessage;
            } elseif ($ctx['is_initial_triage']) {
                $emailBody = "Dear {$patientName},\n\nOur records at {$clinicName} indicate that you missed your scheduled Doctor Triage & Initial Assessment (Day 0) on {$scheduledDate}.\n\nAnimal bite wounds carry severe rabies risk and require urgent clinical categorization, wound disinfection, and prompt initiation of Post-Exposure Prophylaxis (PEP).\n\nPlease proceed directly to Doctor Triage at {$clinicName} for your physical evaluation.\n\nClinic Hotline: {$clinicPhone}\n\nTagoloan Animal Bite Treatment Center";
            } else {
                $emailBody = "Dear {$patientName},\n\nOur records at {$clinicName} indicate that you missed your scheduled follow-up {$doseLabel} on {$scheduledDate}.\n\nRabies is an incurable, fatal infection once symptoms manifest, but it is 100% preventable by completing your full prescribed vaccine series without interruption.\n\nPlease proceed directly to the Treatment / Nurse Desk at {$clinicName} for your catch-up dose.\n\nClinic Hotline: {$clinicPhone}\n\nTagoloan Animal Bite Treatment Center";
            }

            if (!empty($email)) {
                try {
                    AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id ?? 1,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'email',
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
            'station' => $station,
            'dose_label' => $doseLabel,
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
        $scheduledDate = Carbon::parse($appointment->scheduled_date ?? $appointment->appointment_date)->format('M j, Y');

        $ctx = $this->resolveClinicalContext($appointment, $patient);
        $station = $ctx['station'];
        $doseLabel = $ctx['dose_label'];

        $dispatched = [];
        $errors = [];

        // 1. In-App
        if (in_array($channel, ['all', 'in_app'])) {
            $msg = $ctx['is_initial_triage']
                ? "UPCOMING SCHEDULE: {$patientName}, your Doctor Triage & Initial Bite Assessment (Day 0) is scheduled for TOMORROW, {$scheduledDate} at {$clinicName}. Please proceed to Doctor Triage on arrival."
                : "UPCOMING SCHEDULE: {$patientName}, your {$doseLabel} is scheduled for TOMORROW, {$scheduledDate} at {$clinicName}. Please proceed directly to the Treatment Desk.";

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

                if ($accountId) {
                    Cache::forget("mobile:notifications:account:{$accountId}:page:1");
                }

                AppointmentReminder::create([
                    'clinic_id' => $appointment->clinic_id ?? 1,
                    'appointment_id' => $appointment->appointment_id,
                    'patient_id' => $patient->patient_id,
                    'channel' => 'in_app',
                    'recipient' => $accountId ? "Account #{$accountId}" : "Patient #{$patient->patient_number}",
                    'subject' => "Upcoming {$doseLabel} Tomorrow ({$station})",
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
            $msg = $ctx['is_initial_triage']
                ? "ABTC REMINDER: {$patientName}, your Doctor Triage & Day 0 Dose is scheduled for TOMORROW, {$scheduledDate} at {$clinicName}. Hotline: {$clinicPhone}"
                : "ABTC REMINDER: {$patientName}, your {$doseLabel} is scheduled for TOMORROW, {$scheduledDate} at {$clinicName} Treatment Desk. Hotline: {$clinicPhone}";

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
                    $subject = "Reminder: Your {$doseLabel} is Scheduled for Tomorrow ({$station})";
                    $body = "Dear {$patientName},\n\nThis is a friendly reminder from {$clinicName} that your appointment for {$doseLabel} is scheduled for TOMORROW, {$scheduledDate}.\n\nStation: {$station}\n\nMaintaining your vaccination schedule on time is essential for complete rabies protection.\n\nClinic Hotline: {$clinicPhone}\n\nTagoloan Animal Bite Treatment Center";

                    AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id ?? 1,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'email',
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
            'station' => $station,
            'dose_label' => $doseLabel,
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
                // Don't send more than once every 20 hours
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
