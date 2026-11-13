<?php

namespace App\Services\Messaging;

use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\Notification;
use App\Models\OutboundMessage;
use App\Services\Messaging\Sms\SmsManager;
use App\Services\Messaging\Sms\SmsResult;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

class OutboundDelivery
{
    public function deliver(int $id): void
    {
        // Atomic claim: duplicate queue jobs cannot both contact the provider.
        $claimed = OutboundMessage::whereKey($id)->where('status', 'queued')
            ->where(fn ($q) => $q->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', now()))
            ->update(['status' => 'processing', 'updated_at' => now()]);
        if (! $claimed) {
            return;
        }
        $message = OutboundMessage::findOrFail($id);
        try {
            $error = app(DeliveryPolicy::class)->error($message->channel, $message->recipient, $message->provider);
            if ($error) {
                $this->finish($message, new SmsResult('skipped', error: $error));

                return;
            }
            $appointment = Appointment::with(['patient.accounts', 'clinic'])->find($message->appointment_id);
            $date = $appointment?->scheduled_date ?? $appointment?->appointment_date;
            if (! $appointment || ! $appointment->patient || ! $appointment->clinic || $appointment->status !== 'scheduled'
                || $appointment->clinic_id != $message->clinic_id
                || $appointment->patient->clinic_id != $message->clinic_id
                || $date?->toDateString() !== ($message->context['scheduled_date'] ?? null)
                || now()->toDateString() !== ($message->context['occurrence_date'] ?? null)) {
                $this->finish($message, new SmsResult('skipped', error: 'appointment_changed_or_message_expired'));

                return;
            }
            if ($message->channel !== 'in_app') {
                $consent = DB::table('communication_preferences')->where('patient_id', $message->patient_id)->value($message->channel);
                try {
                    $current = $message->channel === 'sms'
                        ? SmsManager::normalize((string) $appointment->patient->contact_number)
                        : trim((string) $appointment->patient->email);
                } catch (\InvalidArgumentException) {
                    $current = '';
                }
                if (! $consent || $current !== $message->recipient) {
                    $this->finish($message, new SmsResult('skipped', error: 'consent_or_contact_changed'));

                    return;
                }
                $rateKey = 'messaging:'.$message->channel.':'.$message->provider;
                $limit = max(1, (int) config('messaging.'.$message->channel.'_per_minute', 30));
                $allowed = Cache::lock($rateKey.':lock', 5)->get(function () use ($rateKey, $limit) {
                    if (RateLimiter::tooManyAttempts($rateKey, $limit)) {
                        return false;
                    }
                    RateLimiter::hit($rateKey, 60);

                    return true;
                });
                if (! $allowed) {
                    $message->update(['status' => 'queued', 'next_attempt_at' => now()->addMinute()]);

                    return;
                }
            }
            $message->increment('attempt_count');
            if ($message->channel === 'sms') {
                $result = app(SmsManager::class)->provider($message->provider)->send($message->recipient, $message->body, $message->idempotency_key);
            } elseif ($message->channel === 'email') {
                Mail::mailer($message->provider)->raw($message->body, fn ($mail) => $mail->to($message->recipient)->subject($message->subject));
                $result = new SmsResult('accepted');
            } else {
                // Recheck verified account linkage; never choose an arbitrary account.
                $account = $appointment->patient->accounts->first(fn ($a) => $a->id == $message->recipient && $a->is_active && $a->pivot->status === 'verified');
                if (! $account) {
                    $this->finish($message, new SmsResult('skipped', error: 'verified_account_required'));

                    return;
                }
                DB::transaction(function () use ($message, $account) {
                    Notification::create([
                        'clinic_id' => $message->clinic_id, 'patient_id' => $message->patient_id,
                        'patient_account_id' => $account->id, 'appointment_id' => $message->appointment_id,
                        'type' => $message->purpose === 'advance' ? 'upcoming_appointment_reminder' : 'missed_appointment_recall',
                        'message' => $message->body, 'status' => 'sent', 'send_time' => now(),
                    ]);
                    $this->finish($message, new SmsResult('delivered'));
                });
                Cache::forget("mobile:notifications:account:{$account->id}:page:1");

                return;
            }
            $this->finish($message, $result);
        } catch (\Throwable $e) {
            // Do not log exception bodies, tokens, contacts or message content.
            // An interrupted request may already have been accepted: never blindly resend.
            $this->finish($message, new SmsResult('unknown', error: 'delivery_outcome_unknown'));
        }
    }

    public function finish(OutboundMessage $message, SmsResult $result): void
    {
        $status = $result->status;
        if ($status === 'retry') {
            $status = $message->attempt_count < config('messaging.max_attempts') ? 'queued' : 'failed';
        }
        DB::transaction(function () use ($message, $result, $status) {
            $message->update([
                'status' => $status, 'provider_message_id' => $result->messageId,
                'error_code' => $result->error,
                'next_attempt_at' => $status === 'queued' ? now()->addMinutes(2 ** $message->attempt_count) : null,
                'accepted_at' => in_array($status, ['accepted', 'delivered']) ? now() : null,
                'delivered_at' => $status === 'delivered' ? now() : null,
            ]);
            $message->attempts()->create([
                'provider' => $message->provider, 'status' => $status,
                'error_code' => $result->error, 'provider_message_id' => $result->messageId,
            ]);
            if ($message->reminder_id) {
                AppointmentReminder::whereKey($message->reminder_id)->update([
                    'status' => in_array($status, ['accepted', 'delivered']) ? 'sent' : (in_array($status, ['queued', 'processing']) ? 'pending' : 'failed'),
                    'error_details' => $result->error,
                ]);
            }
            if (in_array($status, ['accepted', 'delivered'])) {
                Appointment::whereKey($message->appointment_id)->update([
                    'reminder_sent_count' => DB::raw('COALESCE(reminder_sent_count, 0) + 1'),
                    'last_reminded_at' => now(),
                ]);
            }
        });
    }
}
