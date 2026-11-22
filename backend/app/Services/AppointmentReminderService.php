<?php

namespace App\Services;

use App\Jobs\DeliverOutboundMessage;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\OutboundMessage;
use App\Services\Messaging\DeliveryPolicy;
use App\Services\Messaging\OutboundDelivery;
use App\Services\Messaging\Sms\SmsLength;
use App\Services\Messaging\Sms\SmsManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AppointmentReminderService
{
    public function sendRecallAlert(
        Appointment $appointment,
        string $channel = 'all',
        ?int $senderUserId = null,
        ?string $customMessage = null,
        bool $isTest = false,
        bool $dryRun = false,
        bool $sync = false
    ): array {
        return $this->prepare($appointment, 'recall', $channel, $senderUserId, $customMessage, $isTest, $dryRun, $sync);
    }

    public function sendAdvanceReminder(
        Appointment $appointment,
        string $channel = 'all',
        ?int $senderUserId = null,
        bool $isTest = false,
        bool $dryRun = false,
        bool $sync = false
    ): array {
        return $this->prepare($appointment, 'advance', $channel, $senderUserId, null, $isTest, $dryRun, $sync);
    }

    private function prepare(
        Appointment $appointment,
        string $purpose,
        string $channel,
        ?int $senderUserId,
        ?string $customMessage = null,
        bool $isTest = false,
        bool $dryRun = false,
        bool $sync = false
    ): array {
        if ($isTest) {
            if (! in_array($channel, ['all', 'in_app', 'fcm', 'push'])) {
                throw ValidationException::withMessages(['channel' => 'In test mode, only in-app and FCM push notifications are permitted. SMS and email dispatch are prohibited.']);
            }
            $resolvedChannels = ['in_app'];
        } else {
            if (! in_array($channel, ['all', 'sms', 'email', 'in_app', 'fcm', 'push'])) {
                throw ValidationException::withMessages(['channel' => 'Invalid channel.']);
            }
            $resolvedChannels = match ($channel) {
                'all' => ['in_app', 'sms', 'email'],
                'push', 'fcm' => ['in_app'],
                default => [$channel],
            };
        }

        if ($customMessage !== null && mb_strlen($customMessage) > 1000) {
            throw ValidationException::withMessages(['message' => 'Maximum 1000 characters.']);
        }
        $appointment->loadMissing(['patient.accounts', 'clinic']);
        $patient = $appointment->patient;
        $clinic = $appointment->clinic;
        $date = $appointment->scheduled_date ?? $appointment->appointment_date;
        $result = ['success' => false, 'appointment_id' => $appointment->appointment_id, 'patient_name' => $patient ? trim($patient->first_name.' '.$patient->last_name) : '', 'channels_dispatched' => [], 'channel_results' => [], 'errors' => []];
        if (! $patient || ! $clinic || $patient->clinic_id != $appointment->clinic_id || ! $date || $appointment->status !== 'scheduled'
            || ($purpose === 'recall' && ! $date->isBefore(today()))
            || ($purpose === 'advance' && ! $date->isTomorrow())) {
            $result['errors']['appointment'] = 'Appointment is not eligible for this reminder.';

            return $result;
        }
        $subject = $purpose === 'advance' ? 'Upcoming clinic appointment' : 'Missed clinic appointment';
        $body = $customMessage ?: ($purpose === 'advance'
            ? "Reminder: your appointment at {$clinic->name} is tomorrow, {$date->format('M j, Y')}."
            : "You missed your appointment at {$clinic->name} on {$date->format('M j, Y')}. Please contact the clinic to arrange your follow-up.");
        if (! $customMessage && $appointment->appointment_time) {
            $body .= ' Time: '.$appointment->appointment_time->format('g:i A').'.';
        }
        $phone = $clinic->contact_number ?: $clinic->phone;
        if (! $customMessage && $phone) {
            $body .= " Contact: {$phone}.";
        }

        // Account resolution: prioritize verified booking account, primary self, or any verified linked guardian/parent
        $account = null;
        if ($appointment->booked_by_account_id) {
            $account = $patient->accounts->first(fn ($a) => $a->id == $appointment->booked_by_account_id && $a->is_active && $a->pivot->status === 'verified');
        }
        if (! $account) {
            $account = $patient->accounts->first(fn ($a) => $a->is_active && $a->pivot->status === 'verified' && $a->pivot->is_primary && $a->pivot->relationship === 'self')
                ?? $patient->accounts->first(fn ($a) => $a->is_active && $a->pivot->status === 'verified');
        }

        if ($isTest && (! $account || (int) $account->id !== 1)) {
            $result['errors']['account'] = 'Testing is strictly restricted to Patient Account ID 1 and its authorized linked test profiles.';

            return $result;
        }

        $preferences = DB::table('communication_preferences')->where('patient_id', $patient->patient_id)->first();

        foreach ($resolvedChannels as $selected) {
            $recipient = match ($selected) {
                'sms' => (string) $patient->contact_number,
                'email' => trim((string) $patient->email),
                default => (string) $account?->id,
            };
            $provider = match ($selected) {
                'sms' => config('messaging.sms_provider'), 'email' => config('mail.default'), default => 'database'
            };
            $error = null;
            if ($selected === 'sms') {
                try {
                    $recipient = SmsManager::normalize($recipient);
                } catch (\InvalidArgumentException) {
                    $error = 'invalid_mobile_number';
                }
            }
            if (! $recipient) {
                $error = 'recipient_missing';
            }
            if ($selected !== 'in_app' && ! ($preferences?->{$selected} ?? false)) {
                $error = 'communication_consent_required';
            }
            $error ??= app(DeliveryPolicy::class)->error($selected, $recipient, $provider);
            if ($error) {
                $result['channel_results'][$selected] = ['status' => 'skipped', 'error' => $error];
                $result['errors'][$selected] = $error;

                continue;
            }

            if ($dryRun) {
                $deviceTokens = $account ? $account->deviceTokens()->active()->get() : collect();
                $isAllowed = $account ? app(\App\Services\Messaging\FcmService::class)->isAccountAllowed($account) : false;
                $prefAllowed = $account ? $account->allowsNotificationCategory('appointment_reminder') : true;

                if (! $prefAllowed) {
                    $reason = (! ($account?->notificationPreferences()['reminders'] ?? true))
                        ? 'Vaccination reminders disabled'
                        : 'Push notifications disabled';

                    $result['channel_results'][$selected] = [
                        'status'              => 'skipped',
                        'error'               => 'vaccination_reminders_disabled',
                        'skip_reason'         => $reason,
                        'recipient'           => (string) $account?->id,
                        'device_count'        => $deviceTokens->count(),
                        'allowlisted'         => $isAllowed,
                        'preferences_allowed' => false,
                        'fcm_results'         => [],
                        'dry_run'             => true,
                    ];
                    $result['errors'][$selected] = 'vaccination_reminders_disabled';

                    continue;
                }

                $fcmResults = [];
                if ($account && $isAllowed && $prefAllowed && $deviceTokens->isNotEmpty()) {
                    $pushData = [
                        'category'       => 'appointment_reminder',
                        'route'          => '/calendar',
                        'appointment_id' => (string) $appointment->appointment_id,
                        'is_test'        => 'true',
                    ];
                    $fcmResults = app(\App\Services\Messaging\FcmService::class)->sendToAccount(
                        $account,
                        'Vaccination Reminder',
                        $purpose === 'advance'
                            ? 'You have an upcoming appointment. Open the app to view your schedule.'
                            : 'You have an overdue appointment. Open the app to view your schedule.',
                        $pushData,
                        validateOnly: true,
                        isControlledTest: true
                    );
                }

                $result['channel_results'][$selected] = [
                    'status'              => 'validated',
                    'recipient'           => (string) $account?->id,
                    'device_count'        => $deviceTokens->count(),
                    'allowlisted'         => $isAllowed,
                    'preferences_allowed' => true,
                    'fcm_results'         => $fcmResults,
                    'dry_run'             => true,
                ];
                $result['channels_dispatched'][] = $selected;

                continue;
            }

            $keyPrefix = $isTest ? 'test|' : '';
            $key = hash('sha256', $keyPrefix . implode('|', [$appointment->clinic_id, $appointment->appointment_id, $date->toDateString(), $purpose, $selected, today()->toDateString()]));
            $message = DB::transaction(function () use ($key, $appointment, $patient, $selected, $recipient, $subject, $body, $provider, $purpose, $date, $senderUserId, $isTest, $dryRun, $sync) {
                $message = OutboundMessage::firstOrCreate(['idempotency_key' => $key], [
                    'clinic_id' => $appointment->clinic_id, 'appointment_id' => $appointment->appointment_id,
                    'patient_id' => $patient->patient_id, 'channel' => $selected, 'purpose' => $purpose,
                    'provider' => $provider, 'recipient' => $recipient, 'subject' => $subject, 'body' => $body,
                    'status' => 'queued', 'context' => [
                        'scheduled_date' => $date->toDateString(),
                        'occurrence_date' => today()->toDateString(),
                        'template_version' => 1,
                        'sms_estimate' => $selected === 'sms' ? SmsLength::estimate($body) : null,
                        'is_test' => $isTest,
                        'dry_run' => $dryRun,
                        'sync' => $sync,
                    ],
                ]);
                if ($message->wasRecentlyCreated) {
                    $reminder = AppointmentReminder::create([
                        'clinic_id' => $appointment->clinic_id, 'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id, 'channel' => $selected, 'recipient' => $recipient,
                        'subject' => $subject, 'message' => $body, 'status' => 'pending', 'sent_by_user_id' => $senderUserId,
                    ]);
                    $message->update(['reminder_id' => $reminder->id]);
                }

                return $message;
            });
            if ($message->wasRecentlyCreated || $message->status === 'queued') {
                if ($selected === 'in_app') {
                    app(OutboundDelivery::class)->deliver($message->id);
                } else {
                    DeliverOutboundMessage::dispatch($message->id);
                }
            }
            $message->refresh();
            $prefAllowed = $account ? $account->allowsNotificationCategory('appointment_reminder') : true;
            $skipReason = (! ($account?->notificationPreferences()['reminders'] ?? true))
                ? 'Vaccination reminders disabled'
                : 'Push notifications disabled';

            $result['channel_results'][$selected] = [
                'status'              => $message->status,
                'message_id'          => $message->id,
                'error'               => $message->error_code,
                'preferences_allowed' => $prefAllowed,
                'skip_reason'         => $prefAllowed ? null : $skipReason,
            ];
            if (in_array($message->status, ['queued', 'processing', 'accepted', 'delivered', 'simulated'])) {
                $result['channels_dispatched'][] = $selected;
            } else {
                $result['errors'][$selected] = $message->error_code ?? $message->status;
            }
        }
        $result['success'] = count($result['channels_dispatched']) > 0;
        $appointment->refresh();
        $result['reminder_sent_count'] = $appointment->reminder_sent_count;
        $result['last_reminded_at'] = $appointment->last_reminded_at?->toIso8601String();

        return $result;
    }

    public function sendBulkRecall(array $appointmentIds, string $channel = 'all', ?int $senderUserId = null, ?int $clinicId = null): array
    {
        $results = [];
        $appointments = Appointment::with(['patient.accounts', 'clinic'])->whereIn('appointment_id', array_unique($appointmentIds))
            ->when($clinicId !== null, fn ($q) => $q->where('clinic_id', $clinicId))->get();
        foreach ($appointments as $appointment) {
            $results[] = $this->sendRecallAlert($appointment, $channel, $senderUserId);
        }
        $processed = count(array_filter($results, fn ($r) => $r['success']));

        return ['total_requested' => count(array_unique($appointmentIds)), 'total_processed' => $processed,
            'total_failed' => count(array_unique($appointmentIds)) - $processed, 'details' => $results];
    }

    public function runAutomatedSweep(
        string $channel = 'all',
        ?int $clinicId = null,
        bool $isTest = false,
        ?int $targetAccountId = null,
        bool $dryRun = false,
        bool $sync = false,
        ?\Carbon\CarbonInterface $referenceDate = null
    ): array {
        if ($isTest) {
            if (! in_array($channel, ['all', 'in_app', 'fcm', 'push'])) {
                throw ValidationException::withMessages(['channel' => 'In test mode, only in-app and FCM push channels are permitted. SMS and email are strictly prohibited.']);
            }
            $channel = 'in_app';
            $targetAccountId = $targetAccountId ?? 1;
            if ((int) $targetAccountId !== 1) {
                throw ValidationException::withMessages(['account' => 'Controlled testing is strictly restricted to Patient Account ID 1.']);
            }
            $targetAccount = \App\Models\PatientAccount::findOrFail(1);
            $authorizedPatientIds = $targetAccount->patients()
                ->wherePivot('status', 'verified')
                ->pluck('patients.patient_id')
                ->all();
        } else {
            if (! in_array($channel, ['all', 'sms', 'email', 'in_app', 'fcm', 'push'])) {
                throw ValidationException::withMessages(['channel' => 'Invalid channel.']);
            }
            $authorizedPatientIds = null;
        }

        $counts = [
            'advance_reminders_eligible' => 0,
            'advance_reminders_sent' => 0,
            'missed_recalls_eligible' => 0,
            'missed_recalls_sent' => 0,
            'details' => [],
        ];

        if ($referenceDate !== null) {
            \Carbon\Carbon::setTestNow($referenceDate);
        }

        try {
            Appointment::with(['patient.accounts', 'clinic'])->where('status', 'scheduled')
                ->when($clinicId !== null, fn ($q) => $q->where('clinic_id', $clinicId))
                ->when($isTest, fn ($q) => $q->whereIn('patient_id', $authorizedPatientIds ?? []))
                ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) BETWEEN ? AND ?', [today()->subDays(14)->toDateString(), today()->addDay()->toDateString()])
                ->chunkById(100, function ($appointments) use ($channel, $isTest, $dryRun, $sync, &$counts) {
                    foreach ($appointments as $appointment) {
                        $date = $appointment->scheduled_date ?? $appointment->appointment_date;
                        if ($date->isTomorrow()) {
                            $counts['advance_reminders_eligible']++;
                            $res = $this->sendAdvanceReminder($appointment, $channel, isTest: $isTest, dryRun: $dryRun, sync: $sync);
                            if ($res['success']) {
                                $counts['advance_reminders_sent']++;
                            }
                            $counts['details'][] = $res;
                        } elseif ($date->isBefore(today())) {
                            $counts['missed_recalls_eligible']++;
                            $res = $this->sendRecallAlert($appointment, $channel, isTest: $isTest, dryRun: $dryRun, sync: $sync);
                            if ($res['success']) {
                                $counts['missed_recalls_sent']++;
                            }
                            $counts['details'][] = $res;
                        }
                    }
                }, 'appointment_id');
        } finally {
            if ($referenceDate !== null) {
                \Carbon\Carbon::setTestNow();
            }
        }

        return $counts + ['timestamp' => now()->toIso8601String(), 'total_dispatched' => $counts['advance_reminders_sent'] + $counts['missed_recalls_sent']];
    }
}
