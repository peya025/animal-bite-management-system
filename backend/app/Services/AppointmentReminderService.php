<?php

namespace App\Services;

use App\Jobs\DeliverOutboundMessage;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\BiteIncident;
use App\Models\OutboundMessage;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Services\Messaging\DeliveryPolicy;
use App\Services\Messaging\OutboundDelivery;
use App\Services\Messaging\Sms\SmsLength;
use App\Services\Messaging\Sms\SmsManager;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AppointmentReminderService
{
    public const ADVANCE_ELIGIBLE_STATUSES = ['scheduled'];

    public const SAME_DAY_ELIGIBLE_STATUSES = ['scheduled'];

    public const RECALL_ELIGIBLE_STATUSES = ['scheduled', 'missed'];

    public const DEFAULT_OVERDUE_MILESTONES = [1, 3, 7];

    public const INELIGIBLE_EPISODE_STATUSES = [
        'completed',
        'completed_no_pep',
        'cancelled',
        'abandoned',
        'transferred_out',
        'discontinued',
        'void',
        'voided',
        'duplicate',
    ];

    public const INELIGIBLE_PLAN_STATUSES = [
        'completed',
        'cancelled',
        'discontinued',
    ];

    public const ELIGIBLE_PEP_PLAN_TYPES = [
        'full_pep',
        'single_booster',
        'two_dose_booster',
    ];

    public const INELIGIBLE_PATIENT_STATUSES = [
        'inactive',
        'transferred',
        'transferred_out',
        'deceased',
        'archived',
    ];

    public function isEpisodeIneligible(?BiteIncident $incident): bool
    {
        if (! $incident) {
            return false;
        }

        if ($incident->isTransferredOut()) {
            return true;
        }

        if (in_array((string) $incident->status, self::INELIGIBLE_EPISODE_STATUSES, true)) {
            return true;
        }

        $incident->loadMissing('treatmentPlan');
        if (! $this->hasApprovedPepPlan($incident->treatmentPlan)) {
            return true;
        }

        $referralRecords = TreatmentRecord::where('clinic_id', $incident->clinic_id)
            ->where('patient_id', $incident->patient_id)
            ->where('bite_id', $incident->bite_id)
            ->whereNull('voided_at')
            ->where(function ($query): void {
                $query->where('outcome', 'Transferred/Referred')
                    ->orWhereNotNull('referred_to');
            })
            ->get(['outcome', 'referred_to', 'actions_taken']);

        foreach ($referralRecords as $record) {
            if ($this->isBlockingReferralRecord($record)) {
                return true;
            }
        }

        return false;
    }

    private function hasApprovedPepPlan(?TreatmentPlan $plan): bool
    {
        if (! $plan || in_array((string) $plan->status, self::INELIGIBLE_PLAN_STATUSES, true)) {
            return false;
        }

        return $plan->status === 'approved'
            && in_array((string) $plan->plan_type, self::ELIGIBLE_PEP_PLAN_TYPES, true);
    }

    /**
     * Allow internal RHU/ABTC continuation consultations while blocking external or unlabelled referrals.
     */
    private function isBlockingReferralRecord(TreatmentRecord $record): bool
    {
        $destination = trim((string) ($record->referred_to ?? ''));

        if (TreatmentRecord::isExternalReferralDestination($destination)) {
            return true;
        }

        $actionsTaken = strtolower((string) ($record->actions_taken ?? ''));
        if ($record->outcome === 'Transferred/Referred' || str_contains($actionsTaken, 'transferred/referred')) {
            return $destination === '' || str_contains($actionsTaken, 'transferred/referred');
        }

        return false;
    }

    public function hasOutstandingDose(Appointment $appointment): bool
    {
        $date = $appointment->scheduled_date ?? $appointment->appointment_date;

        $completedByAppointment = TreatmentRecord::where('clinic_id', $appointment->clinic_id)
            ->where('patient_id', $appointment->patient_id)
            ->where('appointment_id', $appointment->appointment_id)
            ->whereNull('voided_at')
            ->whereIn('status', ['completed', 'administered'])
            ->exists();

        if ($completedByAppointment) {
            return false;
        }

        if ($appointment->dose_number === null) {
            return true;
        }

        $doseNumber = (int) $appointment->dose_number;
        $isBooster = $appointment->appointment_type === 'booster' || $doseNumber >= 90;

        $query = TreatmentRecord::where('clinic_id', $appointment->clinic_id)
            ->where('patient_id', $appointment->patient_id)
            ->whereNull('voided_at')
            ->whereIn('status', ['completed', 'administered'])
            ->whereNotNull('dose_number');

        if ($appointment->bite_id !== null) {
            $query->where('bite_id', $appointment->bite_id);
            if ($isBooster || $doseNumber === 0) {
                $query->where('dose_number', $doseNumber);
            } else {
                $query->where('dose_number', '>=', $doseNumber)
                    ->where('dose_number', '<', 90);
            }
        } else {
            $query->where('dose_number', $doseNumber);
            if ($date !== null) {
                $query->where(function ($q) use ($date, $appointment) {
                    $q->whereDate('treatment_date', '>=', $date->toDateString())
                        ->orWhere('created_at', '>=', $appointment->created_at ?? $date);
                });
            }
        }

        return ! $query->exists();
    }

    public function isEpisodeDoseOutstanding(BiteIncident $incident, ?int $doseDay): bool
    {
        if ($doseDay === null) {
            return true;
        }

        $query = TreatmentRecord::where('clinic_id', $incident->clinic_id)
            ->where('patient_id', $incident->patient_id)
            ->where('bite_id', $incident->bite_id)
            ->whereNull('voided_at')
            ->whereIn('status', ['completed', 'administered'])
            ->whereNotNull('dose_number');

        if ($doseDay >= 90 || $doseDay === 0) {
            $query->where('dose_number', $doseDay);
        } else {
            $query->where('dose_number', '>=', $doseDay)
                ->where('dose_number', '<', 90);
        }

        return ! $query->exists();
    }

    public function reminderTimezone(): string
    {
        return (string) config('messaging.reminders.timezone', config('app.timezone', 'Asia/Manila'));
    }

    /**
     * @return list<int>
     */
    public function overdueMilestones(): array
    {
        $configured = config('messaging.reminders.overdue_milestones', self::DEFAULT_OVERDUE_MILESTONES);
        if (is_string($configured)) {
            $configured = explode(',', $configured);
        }
        if (! is_array($configured)) {
            return self::DEFAULT_OVERDUE_MILESTONES;
        }

        $milestones = array_values(array_unique(array_filter(
            array_map('intval', $configured),
            fn (int $days) => $days > 0
        )));
        sort($milestones);

        return $milestones !== [] ? $milestones : self::DEFAULT_OVERDUE_MILESTONES;
    }

    public function overdueDaysFor(Appointment $appointment, ?CarbonInterface $today = null): int
    {
        $date = $appointment->scheduled_date ?? $appointment->appointment_date;
        if (! $date) {
            return 0;
        }

        $tz = $this->reminderTimezone();
        $todayStart = ($today ? Carbon::instance($today)->copy()->setTimezone($tz) : today($tz))->startOfDay();
        $appointmentDay = Carbon::parse($date->toDateString(), $tz)->startOfDay();

        return (int) $appointmentDay->diffInDays($todayStart, false);
    }

    public function matchingOverdueMilestone(Appointment $appointment, ?CarbonInterface $today = null): ?int
    {
        $daysOverdue = $this->overdueDaysFor($appointment, $today);

        return in_array($daysOverdue, $this->overdueMilestones(), true) ? $daysOverdue : null;
    }

    public function ineligibilityReason(
        Appointment $appointment,
        string $purpose,
        ?CarbonInterface $today = null,
        bool $checkDateWindow = true
    ): ?string {
        $tz = $this->reminderTimezone();
        $todayStart = ($today ? Carbon::instance($today)->copy()->setTimezone($tz) : today($tz))->startOfDay();
        $appointment->loadMissing(['patient', 'clinic', 'biteIncident.treatmentPlan']);
        $patient = $appointment->patient;
        $clinic = $appointment->clinic;
        $date = $appointment->scheduled_date ?? $appointment->appointment_date;

        if (! $patient || ! $clinic || $patient->clinic_id != $appointment->clinic_id || ! $date) {
            return 'appointment_ineligible';
        }

        if (in_array((string) ($patient->status ?? ''), self::INELIGIBLE_PATIENT_STATUSES, true)) {
            return 'patient_ineligible';
        }

        $allowedStatuses = match ($purpose) {
            'recall' => self::RECALL_ELIGIBLE_STATUSES,
            'same_day' => self::SAME_DAY_ELIGIBLE_STATUSES,
            default => self::ADVANCE_ELIGIBLE_STATUSES,
        };

        if (! in_array((string) $appointment->status, $allowedStatuses, true)) {
            return 'appointment_status_ineligible';
        }

        if ($checkDateWindow) {
            $appointmentDay = Carbon::parse($date->toDateString(), $tz)->startOfDay();
            if ($purpose === 'recall' && ! $appointmentDay->lt($todayStart)) {
                return 'appointment_not_overdue';
            }
            if ($purpose === 'same_day' && ! $appointmentDay->equalTo($todayStart)) {
                return 'appointment_not_today';
            }
            if ($purpose === 'advance' && ! $appointmentDay->equalTo($todayStart->copy()->addDay())) {
                return 'appointment_not_tomorrow';
            }
        }

        if ($this->isEpisodeIneligible($appointment->biteIncident)) {
            return 'episode_ineligible';
        }

        if (! $this->hasOutstandingDose($appointment)) {
            return 'dose_already_administered';
        }

        return null;
    }

    public function sendRecallAlert(
        Appointment $appointment,
        string $channel = 'all',
        ?int $senderUserId = null,
        ?string $customMessage = null,
        bool $isTest = false,
        bool $dryRun = false,
        bool $sync = false,
        ?int $overdueMilestone = null
    ): array {
        return $this->prepare($appointment, 'recall', $channel, $senderUserId, $customMessage, $isTest, $dryRun, $sync, $overdueMilestone);
    }

    public function sendSameDayReminder(
        Appointment $appointment,
        string $channel = 'all',
        ?int $senderUserId = null,
        bool $isTest = false,
        bool $dryRun = false,
        bool $sync = false
    ): array {
        return $this->prepare($appointment, 'same_day', $channel, $senderUserId, null, $isTest, $dryRun, $sync);
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

    private function buildReminderMessage(
        Appointment $appointment,
        string $purpose,
        CarbonInterface $date,
        ?int $overdueMilestone = null
    ): array {
        $clinic = $appointment->clinic;
        $clinicName = trim((string) ($clinic?->name ?: 'Tagoloan ABTC'));
        $phone = trim((string) ($clinic?->contact_number ?: $clinic?->phone ?: ''));
        $timeText = $appointment->appointment_time ? $appointment->appointment_time->format('g:i A') : null;

        if ($purpose === 'same_day') {
            $subject = 'Vaccination appointment today';
            $body = "{$clinicName} Reminder: Your scheduled vaccination is today. Please visit the clinic during your scheduled time.";
            if ($timeText) {
                $body .= " Time: {$timeText}.";
            }
            $body .= $phone !== ''
                ? " Contact {$phone} if you need assistance."
                : ' Contact the clinic if you need assistance.';

            return [$subject, $body];
        }

        if ($purpose === 'advance') {
            $subject = 'Upcoming vaccination appointment';
            $body = "{$clinicName} Reminder: Your scheduled vaccination is tomorrow, {$date->format('M j, Y')}.";
            if ($timeText) {
                $body .= " Time: {$timeText}.";
            }
            $body .= ' Please visit the clinic on schedule.';
            if ($phone !== '') {
                $body .= " Contact: {$phone}.";
            }

            return [$subject, $body];
        }

        $subject = 'Missed vaccination appointment';
        $finalMilestone = max($this->overdueMilestones());
        if ($overdueMilestone !== null && $overdueMilestone >= $finalMilestone) {
            $body = "{$clinicName} Reminder: Your vaccination scheduled on {$date->format('M j, Y')} is still overdue. Please visit or contact the clinic as soon as possible for guidance.";
        } else {
            $body = "{$clinicName} Reminder: You missed your scheduled vaccination on {$date->format('M j, Y')}. Please visit or contact the clinic to continue your follow-up.";
        }
        if ($phone !== '') {
            $body .= " Contact: {$phone}.";
        }

        return [$subject, $body];
    }

    private function prepare(
        Appointment $appointment,
        string $purpose,
        string $channel,
        ?int $senderUserId,
        ?string $customMessage = null,
        bool $isTest = false,
        bool $dryRun = false,
        bool $sync = false,
        ?int $overdueMilestone = null
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
        $appointment->loadMissing(['patient.accounts', 'clinic', 'biteIncident.treatmentPlan']);
        $patient = $appointment->patient;
        $clinic = $appointment->clinic;
        $date = $appointment->scheduled_date ?? $appointment->appointment_date;
        $result = ['success' => false, 'appointment_id' => $appointment->appointment_id, 'patient_name' => $patient ? trim($patient->first_name.' '.$patient->last_name) : '', 'channels_dispatched' => [], 'channel_results' => [], 'errors' => []];
        if ($this->ineligibilityReason($appointment, $purpose) !== null) {
            $result['errors']['appointment'] = 'Appointment is not eligible for this reminder.';

            return $result;
        }

        $tz = $this->reminderTimezone();
        $todayString = today($tz)->toDateString();
        $daysOverdue = $purpose === 'recall' ? max(1, $this->overdueDaysFor($appointment)) : null;
        $resolvedMilestone = $purpose === 'recall'
            ? ($overdueMilestone ?? $this->matchingOverdueMilestone($appointment))
            : null;

        [$subject, $defaultBody] = $this->buildReminderMessage($appointment, $purpose, $date, $resolvedMilestone);
        $body = $customMessage ?: $defaultBody;

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
                'sms' => config('messaging.sms_provider'), 'email' => DeliveryPolicy::emailProvider(), default => 'database'
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
                        match ($purpose) {
                            'same_day' => 'Your vaccination appointment is scheduled for today. Open the app to view your schedule.',
                            'advance' => 'You have an upcoming appointment. Open the app to view your schedule.',
                            default => 'You have an overdue appointment. Open the app to view your schedule.',
                        },
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
            $doseToken = 'dose:'.($appointment->dose_number !== null ? (string) $appointment->dose_number : 'none');
            $milestoneToken = $purpose === 'recall'
                ? 'day_'.($resolvedMilestone ?? $daysOverdue ?? 1)
                : $purpose;
            $key = hash('sha256', $keyPrefix . implode('|', [
                $appointment->clinic_id,
                $appointment->appointment_id,
                $date->toDateString(),
                $doseToken,
                $purpose,
                $milestoneToken,
                $selected,
            ]));

            $wasRecentlyCreated = false;
            try {
                $message = DB::transaction(function () use ($key, $appointment, $patient, $selected, $recipient, $subject, $body, $provider, $purpose, $date, $todayString, $resolvedMilestone, $daysOverdue, $senderUserId, $isTest, $dryRun, $sync, &$wasRecentlyCreated) {
                    $message = OutboundMessage::firstOrCreate(['idempotency_key' => $key], [
                        'clinic_id' => $appointment->clinic_id, 'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id, 'channel' => $selected, 'purpose' => $purpose,
                        'provider' => $provider, 'recipient' => $recipient, 'subject' => $subject, 'body' => $body,
                        'status' => 'queued', 'context' => [
                            'scheduled_date' => $date->toDateString(),
                            'occurrence_date' => $todayString,
                            'dose_number' => $appointment->dose_number,
                            'milestone_day' => $resolvedMilestone,
                            'days_overdue' => $daysOverdue,
                            'template_version' => 2,
                            'sms_estimate' => $selected === 'sms' ? SmsLength::estimate($body) : null,
                            'is_test' => $isTest,
                            'dry_run' => $dryRun,
                            'sync' => $sync,
                        ],
                    ]);
                    $wasRecentlyCreated = $message->wasRecentlyCreated;
                    if ($wasRecentlyCreated) {
                        $reminder = AppointmentReminder::create([
                            'clinic_id' => $appointment->clinic_id, 'appointment_id' => $appointment->appointment_id,
                            'patient_id' => $patient->patient_id, 'channel' => $selected, 'recipient' => $recipient,
                            'subject' => $subject, 'message' => $body, 'status' => 'pending', 'sent_by_user_id' => $senderUserId,
                        ]);
                        $message->update(['reminder_id' => $reminder->id]);
                    }

                    return $message;
                });
            } catch (UniqueConstraintViolationException) {
                $wasRecentlyCreated = false;
                $message = OutboundMessage::where('idempotency_key', $key)->firstOrFail();
            }
            if ($wasRecentlyCreated || $message->status === 'queued') {
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
                'reused'              => ! $wasRecentlyCreated,
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

    public function sendEpisodeFollowupSms(
        BiteIncident $incident,
        ?Appointment $appointment,
        string $recipient,
        string $recipientType,
        string $body,
        ?int $senderUserId = null,
        ?int $doseDay = null
    ): array {
        if ($appointment && $recipientType === 'patient') {
            $recallResult = $this->sendRecallAlert($appointment, 'sms', $senderUserId, $body);
            $smsResult = $recallResult['channel_results']['sms'] ?? [];

            return [
                'success' => $recallResult['success'],
                'status' => $smsResult['status'] ?? 'skipped',
                'message_id' => $smsResult['message_id'] ?? null,
                'error' => $smsResult['error'] ?? ($recallResult['errors']['sms'] ?? ($recallResult['errors']['appointment'] ?? null)),
                'reused' => (bool) ($smsResult['reused'] ?? false),
            ];
        }

        $incident->loadMissing(['patient', 'clinic', 'treatmentPlan']);
        $patient = $incident->patient;
        $clinic = $incident->clinic;

        if (! $patient || ! $clinic || $patient->clinic_id != $incident->clinic_id
            || in_array((string) ($patient->status ?? ''), self::INELIGIBLE_PATIENT_STATUSES, true)
            || $this->isEpisodeIneligible($incident)) {
            return [
                'success' => false,
                'status' => 'skipped',
                'message_id' => null,
                'error' => 'episode_ineligible',
                'reused' => false,
            ];
        }

        if ($appointment && $this->ineligibilityReason($appointment, 'recall') !== null) {
            return [
                'success' => false,
                'status' => 'skipped',
                'message_id' => null,
                'error' => 'appointment_ineligible',
                'reused' => false,
            ];
        }

        if (! $appointment && ! $this->isEpisodeDoseOutstanding($incident, $doseDay)) {
            return [
                'success' => false,
                'status' => 'skipped',
                'message_id' => null,
                'error' => 'dose_already_administered',
                'reused' => false,
            ];
        }

        $provider = (string) config('messaging.sms_provider');
        $error = null;
        try {
            $normalizedRecipient = SmsManager::normalize($recipient);
        } catch (\InvalidArgumentException) {
            $normalizedRecipient = '';
            $error = 'invalid_mobile_number';
        }

        if ($normalizedRecipient === '') {
            $error ??= 'recipient_missing';
        }

        $preferences = DB::table('communication_preferences')->where('patient_id', $patient->patient_id)->first();
        if (! ($preferences?->sms ?? false)) {
            $error ??= 'communication_consent_required';
        }

        $error ??= app(DeliveryPolicy::class)->error('sms', $normalizedRecipient, $provider);
        if ($error) {
            return [
                'success' => false,
                'status' => 'skipped',
                'message_id' => null,
                'error' => $error,
                'reused' => false,
            ];
        }

        $todayString = today($this->reminderTimezone())->toDateString();
        $date = $appointment ? ($appointment->scheduled_date ?? $appointment->appointment_date) : null;
        $keyParts = $appointment
            ? [$incident->clinic_id, 'episode_followup', $incident->bite_id, $appointment->appointment_id, $normalizedRecipient, $todayString]
            : [$incident->clinic_id, 'episode_followup', $incident->bite_id, 'dose:'.($doseDay ?? 'any'), $normalizedRecipient, $todayString];
        $key = hash('sha256', implode('|', $keyParts));

        $subject = 'Missed vaccination appointment';
        $wasRecentlyCreated = false;
        try {
            $message = DB::transaction(function () use ($key, $incident, $appointment, $patient, $provider, $normalizedRecipient, $subject, $body, $recipientType, $doseDay, $date, $todayString, $senderUserId, &$wasRecentlyCreated) {
                $message = OutboundMessage::firstOrCreate(['idempotency_key' => $key], [
                    'clinic_id' => $incident->clinic_id,
                    'appointment_id' => $appointment?->appointment_id,
                    'patient_id' => $patient->patient_id,
                    'channel' => 'sms',
                    'purpose' => 'episode_followup',
                    'provider' => $provider,
                    'recipient' => $normalizedRecipient,
                    'subject' => $subject,
                    'body' => $body,
                    'status' => 'queued',
                    'context' => [
                        'bite_id' => $incident->bite_id,
                        'dose_day' => $doseDay,
                        'recipient_type' => $recipientType,
                        'scheduled_date' => $date?->toDateString(),
                        'occurrence_date' => $todayString,
                        'template_version' => 2,
                        'sms_estimate' => SmsLength::estimate($body),
                    ],
                ]);
                $wasRecentlyCreated = $message->wasRecentlyCreated;

                if ($wasRecentlyCreated && $appointment) {
                    $reminder = AppointmentReminder::create([
                        'clinic_id' => $incident->clinic_id,
                        'appointment_id' => $appointment->appointment_id,
                        'patient_id' => $patient->patient_id,
                        'channel' => 'sms',
                        'recipient' => $normalizedRecipient,
                        'subject' => $subject,
                        'message' => $body,
                        'status' => 'pending',
                        'sent_by_user_id' => $senderUserId,
                    ]);
                    $message->update(['reminder_id' => $reminder->id]);
                }

                return $message;
            });
        } catch (UniqueConstraintViolationException) {
            $wasRecentlyCreated = false;
            $message = OutboundMessage::where('idempotency_key', $key)->firstOrFail();
        }

        if ($wasRecentlyCreated || $message->status === 'queued') {
            DeliverOutboundMessage::dispatch($message->id);
        }

        $message->refresh();
        $success = in_array($message->status, ['queued', 'processing', 'accepted', 'delivered', 'simulated'], true);

        return [
            'success' => $success,
            'status' => $message->status,
            'message_id' => $message->id,
            'error' => $success ? null : ($message->error_code ?? $message->status),
            'reused' => ! $wasRecentlyCreated,
        ];
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
            'same_day_reminders_eligible' => 0,
            'same_day_reminders_sent' => 0,
            'missed_recalls_eligible' => 0,
            'missed_recalls_sent' => 0,
            'details' => [],
        ];

        if ($referenceDate !== null) {
            \Carbon\Carbon::setTestNow($referenceDate);
        }

        try {
            $tz = $this->reminderTimezone();
            $todayStart = today($tz)->startOfDay();
            $tomorrowStart = $todayStart->copy()->addDay();
            $milestones = $this->overdueMilestones();
            $maxMilestone = max($milestones);
            $sameDayEnabled = (bool) config('messaging.reminders.same_day_enabled', true);

            Appointment::with(['patient.accounts', 'clinic', 'biteIncident.treatmentPlan'])
                ->whereIn('status', self::RECALL_ELIGIBLE_STATUSES)
                ->when($clinicId !== null, fn ($q) => $q->where('clinic_id', $clinicId))
                ->when($isTest, fn ($q) => $q->whereIn('patient_id', $authorizedPatientIds ?? []))
                ->whereRaw(
                    'DATE(COALESCE(scheduled_date, appointment_date)) BETWEEN ? AND ?',
                    [$todayStart->copy()->subDays($maxMilestone)->toDateString(), $tomorrowStart->toDateString()]
                )
                ->chunkById(100, function ($appointments) use ($channel, $isTest, $dryRun, $sync, $tz, $todayStart, $tomorrowStart, $sameDayEnabled, &$counts) {
                    foreach ($appointments as $appointment) {
                        $date = $appointment->scheduled_date ?? $appointment->appointment_date;
                        if (! $date) {
                            continue;
                        }
                        $appointmentDay = Carbon::parse($date->toDateString(), $tz)->startOfDay();

                        if ($appointmentDay->equalTo($tomorrowStart)) {
                            if ($this->ineligibilityReason($appointment, 'advance', $todayStart) !== null) {
                                continue;
                            }
                            $counts['advance_reminders_eligible']++;
                            $res = $this->sendAdvanceReminder($appointment, $channel, isTest: $isTest, dryRun: $dryRun, sync: $sync);
                            if ($res['success']) {
                                $counts['advance_reminders_sent']++;
                            }
                            $counts['details'][] = $res;
                        } elseif ($sameDayEnabled && $appointmentDay->equalTo($todayStart)) {
                            if ($this->ineligibilityReason($appointment, 'same_day', $todayStart) !== null) {
                                continue;
                            }
                            $counts['same_day_reminders_eligible']++;
                            $res = $this->sendSameDayReminder($appointment, $channel, isTest: $isTest, dryRun: $dryRun, sync: $sync);
                            if ($res['success']) {
                                $counts['same_day_reminders_sent']++;
                            }
                            $counts['details'][] = $res;
                        } elseif ($appointmentDay->lt($todayStart)) {
                            $milestone = $this->matchingOverdueMilestone($appointment, $todayStart);
                            if ($milestone === null) {
                                continue;
                            }
                            if ($this->ineligibilityReason($appointment, 'recall', $todayStart) !== null) {
                                continue;
                            }
                            $counts['missed_recalls_eligible']++;
                            $res = $this->sendRecallAlert($appointment, $channel, isTest: $isTest, dryRun: $dryRun, sync: $sync, overdueMilestone: $milestone);
                            if ($res['success']) {
                                $counts['missed_recalls_sent']++;
                                if (! $isTest && ! $dryRun) {
                                    $this->recordAutomatedFollowupLog($appointment, $date, $res);
                                }
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

        return $counts + [
            'timestamp' => now($this->reminderTimezone())->toIso8601String(),
            'total_dispatched' => $counts['advance_reminders_sent'] + $counts['same_day_reminders_sent'] + $counts['missed_recalls_sent'],
        ];
    }

    /**
     * Phase 3: Write an idempotent daily entry in patient_followup_logs when automated
     * missed-dose recall succeeds so nurses see auto-recall history inside /bite-cases.
     */
    private function recordAutomatedFollowupLog(
        Appointment $appointment,
        \Carbon\CarbonInterface $scheduledDate,
        array $dispatchResult
    ): void {
        if (! $appointment->bite_id) {
            return;
        }

        $channels = $dispatchResult['channels_dispatched'] ?? [];
        if (empty($channels)) {
            return;
        }

        $alreadyLoggedToday = \App\Models\PatientFollowupLog::where('clinic_id', $appointment->clinic_id)
            ->where('bite_id', $appointment->bite_id)
            ->where('appointment_id', $appointment->appointment_id)
            ->where('created_by_name', 'Automated Recall')
            ->whereDate('created_at', today()->toDateString())
            ->exists();

        if ($alreadyLoggedToday) {
            return;
        }

        $primaryChannel = in_array('sms', $channels, true)
            ? 'sms'
            : (in_array('email', $channels, true) ? 'email' : 'in_app');

        $primaryStatus = (string) ($dispatchResult['channel_results'][$primaryChannel]['status'] ?? 'dispatched');
        $logStatus = match (true) {
            $primaryChannel === 'sms' && $primaryStatus === 'simulated' => 'sms_simulated',
            $primaryChannel === 'sms' && in_array($primaryStatus, ['queued', 'processing', 'accepted'], true) => 'sms_queued',
            $primaryChannel === 'sms' && $primaryStatus === 'delivered' => 'sms_delivered',
            $primaryChannel === 'sms' => 'sms_sent',
            default => 'auto_recalled',
        };

        $contactType = $primaryChannel === 'sms' ? 'sms' : 'other';
        $doseLabel = $appointment->dose_number !== null ? "Day {$appointment->dose_number}" : 'Follow-up';
        $daysOverdue = max(1, (int) $scheduledDate->copy()->startOfDay()->diffInDays(today()));
        $channelList = implode(', ', array_map(fn ($c) => strtoupper(str_replace('_', ' ', (string) $c)), $channels));

        \App\Models\PatientFollowupLog::create([
            'clinic_id' => $appointment->clinic_id,
            'bite_id' => $appointment->bite_id,
            'patient_id' => $appointment->patient_id,
            'appointment_id' => $appointment->appointment_id,
            'dose_label' => $doseLabel,
            'days_overdue' => $daysOverdue,
            'contact_type' => $contactType,
            'status' => $logStatus,
            'recipient_number' => $primaryChannel === 'sms' ? ($appointment->patient?->contact_number ?: null) : null,
            'notes' => "Automated recall dispatched via {$channelList} on " . today()->format('M j, Y') . '.',
            'created_by' => null,
            'created_by_name' => 'Automated Recall',
        ]);
    }
}
