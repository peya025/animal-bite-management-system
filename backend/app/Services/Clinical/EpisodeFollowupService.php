<?php

namespace App\Services\Clinical;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\PatientFollowupLog;
use App\Models\User;
use App\Services\AppointmentReminderService;
use App\Services\Messaging\DeliveryPolicy;
use App\Services\Messaging\Sms\SmsManager;
use App\Services\Reporting\EpisodeReportingStateResolver;
use App\Services\Reporting\TreatmentOutcomeResolver;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class EpisodeFollowupService
{
    public function __construct(
        private readonly AppointmentReminderService $reminderService,
        private readonly DeliveryPolicy $deliveryPolicy,
        private readonly TreatmentOutcomeResolver $outcomeResolver,
    ) {}

    public function buildStandardDohSms(string $patientName, int|string $doseDay): string
    {
        $cleanName = trim($patientName) !== '' ? trim($patientName) : 'Patient';
        $dayText = is_numeric($doseDay) ? (string) (int) $doseDay : trim((string) $doseDay);
        if ($dayText === '') {
            $dayText = 'Follow-up';
        }

        return "ABCare Tagoloan Reminder: Maayong adlaw {$cleanName}. Schedule nimo karon para sa imong follow-up anti-rabies shot (Day {$dayText}) sa Tagoloan ABTC. Palihug bisita taliwala sa 8:00 AM - 4:00 PM para sa imong kaluwasan. Salamat!";
    }

    public function formatLog(PatientFollowupLog $log): array
    {
        return [
            'id' => $log->id,
            'contact_type' => $log->contact_type,
            'status' => $log->status,
            'recipient_number' => $log->recipient_number,
            'message_body' => $log->message_body,
            'notes' => $log->notes,
            'dose_label' => $log->dose_label,
            'days_overdue' => $log->days_overdue,
            'created_by' => $log->created_by,
            'created_by_name' => $log->created_by_name ?: $log->creator?->name,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }

    public function listLogs(int $clinicId, int $biteId): array
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient', 'appointments', 'treatmentRecords', 'treatmentPlan', 'followupLogs.creator:id,name,role'])
            ->findOrFail($biteId);

        $patient = $incident->patient;
        $patientPhone = trim((string) ($patient?->contact_number ?? ''));
        $guardianPhone = trim((string) ($patient?->emergency_contact_number ?? ''));

        $state = (new EpisodeReportingStateResolver($this->outcomeResolver))->resolve($incident, CarbonImmutable::now()->endOfDay());
        $firstSlot = $state['course_outcome']['overdue_dose_slots'][0] ?? null;
        $doseDay = $firstSlot ? (int) $firstSlot['dose_number'] : 3;

        return [
            'bite_id' => $incident->bite_id,
            'case_number' => $incident->case_number,
            'patient_id' => $incident->patient_id,
            'patient_name' => $patient?->name ?? 'Unknown patient',
            'follow_up_contact_number' => $patientPhone !== '' ? $patientPhone : ($guardianPhone !== '' ? $guardianPhone : null),
            'follow_up_contact_source' => $patientPhone !== '' ? 'patient' : ($guardianPhone !== '' ? 'guardian' : null),
            'sms_preview' => $this->buildStandardDohSms($patient?->name ?? 'Patient', $doseDay),
            'logs' => $incident->followupLogs->map(fn (PatientFollowupLog $log) => $this->formatLog($log))->values()->all(),
        ];
    }

    public function logAttempt(int $clinicId, int $biteId, array $validated, User $user): array
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient', 'appointments', 'treatmentRecords', 'treatmentPlan'])
            ->findOrFail($biteId);

        $state = (new EpisodeReportingStateResolver($this->outcomeResolver))->resolve($incident, CarbonImmutable::now()->endOfDay());
        $course = $state['course_outcome'];
        $firstSlot = $course['overdue_dose_slots'][0] ?? null;

        $doseDay = $firstSlot ? (int) $firstSlot['dose_number'] : null;
        $doseLabel = $validated['dose_label'] ?? ($firstSlot ? "Day {$doseDay}" : ($course['overdue_dose'] ?? null));
        $daysOverdue = $validated['days_overdue'] ?? ($course['days_overdue'] ?? null);

        $patient = $incident->patient;
        $defaultPhone = trim((string) ($patient?->contact_number ?: $patient?->emergency_contact_number ?: ''));
        $recipient = trim((string) ($validated['recipient_number'] ?? $defaultPhone));

        $appointment = $this->findOverdueAppointment($incident, $doseDay);

        $log = PatientFollowupLog::create([
            'clinic_id' => $clinicId,
            'bite_id' => $incident->bite_id,
            'patient_id' => $incident->patient_id,
            'appointment_id' => $appointment?->appointment_id,
            'dose_label' => $doseLabel,
            'days_overdue' => $daysOverdue !== null ? (int) $daysOverdue : null,
            'contact_type' => $validated['contact_type'],
            'status' => $validated['status'],
            'recipient_number' => $recipient !== '' ? $recipient : null,
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) : null,
            'created_by' => $user->id,
            'created_by_name' => $user->name,
        ]);

        return $this->formatLog($log->load('creator:id,name,role'));
    }

    public function sendReminder(int $clinicId, int $biteId, array $validated, User $user): array
    {
        $incident = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient', 'appointments', 'treatmentRecords', 'treatmentPlan'])
            ->findOrFail($biteId);

        $patient = $incident->patient;
        if (! $patient) {
            throw ValidationException::withMessages(['episode' => 'Patient record is missing for this episode.']);
        }

        $patientPhone = trim((string) ($patient->contact_number ?? ''));
        $guardianPhone = trim((string) ($patient->emergency_contact_number ?? ''));
        $rawRecipient = trim((string) ($validated['recipient_number'] ?? ($patientPhone !== '' ? $patientPhone : $guardianPhone)));

        if ($rawRecipient === '') {
            throw ValidationException::withMessages([
                'recipient_number' => 'No verified patient or guardian mobile number is recorded for this patient.',
            ]);
        }

        $state = (new EpisodeReportingStateResolver($this->outcomeResolver))->resolve($incident, CarbonImmutable::now()->endOfDay());
        $course = $state['course_outcome'];
        $firstSlot = $course['overdue_dose_slots'][0] ?? null;

        $doseDay = $validated['dose_day'] ?? ($firstSlot ? (int) $firstSlot['dose_number'] : null);
        if ($doseDay === null && ! empty($course['overdue_dose']) && preg_match('/(\d+)/', (string) $course['overdue_dose'], $m)) {
            $doseDay = (int) $m[1];
        }
        $doseDayForSms = $doseDay ?? 3;
        $doseLabel = $validated['dose_label'] ?? "Day {$doseDayForSms}";
        $daysOverdue = $validated['days_overdue'] ?? ($course['days_overdue'] ?? null);

        $customMessage = isset($validated['message']) ? trim((string) $validated['message']) : '';
        $smsBody = $customMessage !== ''
            ? $customMessage
            : $this->buildStandardDohSms($patient->name ?? 'Patient', $doseDayForSms);

        $appointment = $this->findOverdueAppointment($incident, $doseDay);
        $availability = $this->deliveryPolicy->availability();

        $normalizedRecipient = $rawRecipient;
        $normalizationError = null;
        try {
            $normalizedRecipient = SmsManager::normalize($rawRecipient);
        } catch (\InvalidArgumentException) {
            $normalizationError = 'invalid_mobile_number';
        }

        $deliveryStatus = 'logged_only';
        $logStatus = 'sms_logged';
        $deliveryNote = '';

        if ($normalizationError !== null) {
            throw ValidationException::withMessages([
                'recipient_number' => 'Mobile number format is invalid for SMS delivery.',
            ]);
        }

        if ($appointment && $patientPhone !== '' && $rawRecipient === $patientPhone) {
            $recallResult = $this->reminderService->sendRecallAlert($appointment, 'sms', $user->id, $smsBody);
            $smsResult = $recallResult['channel_results']['sms'] ?? null;
            $smsStatus = $smsResult['status'] ?? null;
            $smsError = $smsResult['error'] ?? ($recallResult['errors']['sms'] ?? null);

            if (in_array($smsStatus, ['queued', 'processing', 'accepted', 'delivered'], true)) {
                $deliveryStatus = $smsStatus;
                $logStatus = 'sms_' . $smsStatus;
                $deliveryNote = "DOH SMS reminder {$smsStatus} to {$normalizedRecipient}.";
            } elseif ($smsStatus === 'simulated') {
                $deliveryStatus = 'simulated';
                $logStatus = 'sms_simulated';
                $deliveryNote = "DOH SMS reminder simulated for {$normalizedRecipient} (simulated SMS provider active).";
            } else {
                $reason = $this->humanizeSmsSkipReason($smsError);
                $deliveryStatus = 'logged_only';
                $logStatus = 'sms_logged';
                $deliveryNote = "DOH SMS reminder logged for {$normalizedRecipient} ({$reason}).";
            }
        } else {
            // Direct SMS dispatch for verified guardian numbers or overdue episodes without a linked scheduled appointment
            $policyError = $this->deliveryPolicy->error('sms', $normalizedRecipient, config('messaging.sms_provider'));
            if ($policyError === null) {
                try {
                    $adapter = app(SmsManager::class)->provider();
                    $reference = sprintf('followup-ep-%d-%d', $incident->bite_id, now()->timestamp);
                    $smsResult = $adapter->send($normalizedRecipient, $smsBody, $reference);
                    $isSimulated = (bool) ($adapter->capabilities()['simulated'] ?? false);

                    if ($smsResult->accepted) {
                        $deliveryStatus = $isSimulated ? 'simulated' : ($smsResult->status ?: 'sent');
                        $logStatus = $isSimulated ? 'sms_simulated' : 'sms_sent';
                        $deliveryNote = $isSimulated
                            ? "DOH SMS reminder simulated for {$normalizedRecipient} (simulated SMS provider active)."
                            : "DOH SMS reminder sent to {$normalizedRecipient}.";
                    } else {
                        $deliveryStatus = 'failed';
                        $logStatus = 'sms_failed';
                        $deliveryNote = "DOH SMS dispatch failed for {$normalizedRecipient}" . ($smsResult->error ? " ({$smsResult->error})." : '.');
                    }
                } catch (\Throwable $e) {
                    $deliveryStatus = 'logged_only';
                    $logStatus = 'sms_logged';
                    $deliveryNote = "DOH SMS reminder logged for {$normalizedRecipient} (carrier dispatch error).";
                }
            } else {
                $reason = $this->humanizeSmsSkipReason($policyError);
                $deliveryNote = "DOH SMS reminder logged for {$normalizedRecipient} ({$reason}).";
            }
        }

        $log = PatientFollowupLog::create([
            'clinic_id' => $clinicId,
            'bite_id' => $incident->bite_id,
            'patient_id' => $incident->patient_id,
            'appointment_id' => $appointment?->appointment_id,
            'dose_label' => $doseLabel,
            'days_overdue' => $daysOverdue !== null ? (int) $daysOverdue : null,
            'contact_type' => 'sms',
            'status' => $logStatus,
            'recipient_number' => $normalizedRecipient,
            'message_body' => $smsBody,
            'notes' => $deliveryNote,
            'created_by' => $user->id,
            'created_by_name' => $user->name,
        ]);

        return [
            'message' => $deliveryNote,
            'delivery_status' => $deliveryStatus,
            'delivery_note' => $deliveryNote,
            'sms_text' => $smsBody,
            'recipient_number' => $normalizedRecipient,
            'sms_available' => (bool) ($availability['sms'] ?? false),
            'log' => $this->formatLog($log->load('creator:id,name,role')),
        ];
    }

    private function findOverdueAppointment(BiteIncident $incident, ?int $doseDay): ?Appointment
    {
        $appointments = $incident->relationLoaded('appointments')
            ? $incident->appointments
            : $incident->appointments()->get();

        $scheduledPast = $appointments->filter(function (Appointment $a) {
            if ($a->status !== 'scheduled') {
                return false;
            }
            $date = $a->scheduled_date ?? $a->appointment_date;

            return $date !== null && $date->isBefore(today());
        });

        if ($doseDay !== null) {
            $exact = $scheduledPast->first(fn (Appointment $a) => $a->dose_number !== null && (int) $a->dose_number === $doseDay);
            if ($exact) {
                return $exact;
            }
        }

        return $scheduledPast->sortBy(fn (Appointment $a) => $a->scheduled_date ?? $a->appointment_date)->first();
    }

    private function humanizeSmsSkipReason(?string $code): string
    {
        return match ($code) {
            'channel_disabled' => 'SMS gateway is disabled in environment config',
            'communication_consent_required' => 'patient SMS consent not yet recorded',
            'recipient_not_allowlisted' => 'messaging test mode recipient allowlist active',
            'provider_not_configured' => 'SMS provider credentials not configured',
            'fake_provider_not_allowed' => 'fake SMS provider disallowed in production',
            'no_scheduled_appointment' => 'recorded directly on episode without scheduled appointment queue',
            default => $code ? str_replace('_', ' ', $code) : 'SMS dispatch logged',
        };
    }
}
