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
    public function sendRecallAlert(Appointment $appointment, string $channel = 'all', ?int $senderUserId = null, ?string $customMessage = null): array
    {
        return $this->prepare($appointment, 'recall', $channel, $senderUserId, $customMessage);
    }

    public function sendAdvanceReminder(Appointment $appointment, string $channel = 'all', ?int $senderUserId = null): array
    {
        return $this->prepare($appointment, 'advance', $channel, $senderUserId);
    }

    private function prepare(Appointment $appointment, string $purpose, string $channel, ?int $senderUserId, ?string $customMessage = null): array
    {
        if (! in_array($channel, ['all', 'sms', 'email', 'in_app'])) {
            throw ValidationException::withMessages(['channel' => 'Invalid channel.']);
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
        $phone = $clinic->contact_number ?: $clinic->phone;
        if (! $customMessage && $phone) {
            $body .= " Contact: {$phone}.";
        }
        // No automatic guardian email fallback. Direct contacts require recorded consent.
        $account = $patient->accounts->first(fn ($a) => $a->is_active && $a->pivot->status === 'verified'
            && ($appointment->booked_by_account_id ? $a->id == $appointment->booked_by_account_id : ($a->pivot->is_primary && $a->pivot->relationship === 'self')));
        $preferences = DB::table('communication_preferences')->where('patient_id', $patient->patient_id)->first();
        foreach ($channel === 'all' ? ['in_app', 'sms', 'email'] : [$channel] as $selected) {
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
            $key = hash('sha256', implode('|', [$appointment->clinic_id, $appointment->appointment_id, $date->toDateString(), $purpose, $selected, today()->toDateString()]));
            $message = DB::transaction(function () use ($key, $appointment, $patient, $selected, $recipient, $subject, $body, $provider, $purpose, $date, $senderUserId) {
                $message = OutboundMessage::firstOrCreate(['idempotency_key' => $key], [
                    'clinic_id' => $appointment->clinic_id, 'appointment_id' => $appointment->appointment_id,
                    'patient_id' => $patient->patient_id, 'channel' => $selected, 'purpose' => $purpose,
                    'provider' => $provider, 'recipient' => $recipient, 'subject' => $subject, 'body' => $body,
                    'status' => 'queued', 'context' => ['scheduled_date' => $date->toDateString(), 'occurrence_date' => today()->toDateString(), 'template_version' => 1, 'sms_estimate' => $selected === 'sms' ? SmsLength::estimate($body) : null],
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
            $result['channel_results'][$selected] = ['status' => $message->status, 'message_id' => $message->id, 'error' => $message->error_code];
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

    public function runAutomatedSweep(string $channel = 'all', ?int $clinicId = null): array
    {
        if (! in_array($channel, ['all', 'sms', 'email', 'in_app'])) {
            throw ValidationException::withMessages(['channel' => 'Invalid channel.']);
        }
        $counts = ['advance_reminders_eligible' => 0, 'advance_reminders_sent' => 0, 'missed_recalls_eligible' => 0, 'missed_recalls_sent' => 0];
        Appointment::with(['patient.accounts', 'clinic'])->where('status', 'scheduled')
            ->when($clinicId !== null, fn ($q) => $q->where('clinic_id', $clinicId))
            ->whereRaw('DATE(COALESCE(scheduled_date, appointment_date)) BETWEEN ? AND ?', [today()->subDays(14)->toDateString(), today()->addDay()->toDateString()])
            ->chunkById(100, function ($appointments) use ($channel, &$counts) {
                foreach ($appointments as $appointment) {
                    $date = $appointment->scheduled_date ?? $appointment->appointment_date;
                    if ($date->isTomorrow()) {
                        $counts['advance_reminders_eligible']++;
                        if ($this->sendAdvanceReminder($appointment, $channel)['success']) {
                            $counts['advance_reminders_sent']++;
                        }
                    } elseif ($date->isBefore(today())) {
                        $counts['missed_recalls_eligible']++;
                        if ($this->sendRecallAlert($appointment, $channel)['success']) {
                            $counts['missed_recalls_sent']++;
                        }
                    }
                }
            }, 'appointment_id');

        return $counts + ['timestamp' => now()->toIso8601String(), 'total_dispatched' => $counts['advance_reminders_sent'] + $counts['missed_recalls_sent']];
    }
}
