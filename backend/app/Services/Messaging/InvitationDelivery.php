<?php

namespace App\Services\Messaging;

use App\Models\OutboundMessage;
use App\Services\Messaging\Sms\SmsResult;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class InvitationDelivery
{
    /** Synchronous; token content is never persisted in the delivery ledger. */
    public function send(int $clinicId, string $recipient, string $purpose, callable $send): bool
    {
        $error = app(DeliveryPolicy::class)->error('email', $recipient);
        $key = 'invitation:'.hash('sha256', $clinicId.'|'.$purpose.'|'.$recipient);

        return (bool) Cache::lock($key.':lock', 120)->get(function () use ($clinicId, $recipient, $purpose, $send, $error, $key) {
            if (RateLimiter::tooManyAttempts($key, 1)) {
                return false;
            }
            $provider = DeliveryPolicy::emailProvider();
            $message = OutboundMessage::create([
                'clinic_id' => $clinicId, 'channel' => 'email', 'purpose' => $purpose,
                'provider' => $provider, 'idempotency_key' => hash('sha256', Str::uuid()->toString()),
                'recipient' => $recipient, 'body' => '[Invitation content omitted]',
                'status' => $error ? 'skipped' : 'processing', 'error_code' => $error,
            ]);
            if ($error) {
                return false;
            }
            RateLimiter::hit($key, 60);
            // A known temporary rejection is safe to retry, at most three submissions.
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                $rateKey = 'messaging:email:'.$provider;
                $allowed = Cache::lock($rateKey.':lock', 5)->get(function () use ($rateKey) {
                    if (RateLimiter::tooManyAttempts($rateKey, max(1, (int) config('messaging.email_per_minute')))) {
                        return false;
                    }
                    RateLimiter::hit($rateKey, 60);

                    return true;
                });
                try {
                    $result = $allowed ? $send() : new SmsResult('failed', error: 'email_rate_limited');
                } catch (\Throwable $e) {
                    $result = app(EmailTransportInterface::class)->failure($e);
                }
                if (! $result instanceof SmsResult) {
                    $result = new SmsResult('failed', error: 'email_not_submitted');
                }
                $status = $result->status === 'retry' ? 'failed' : $result->status;
                $message->update(['status' => $status, 'error_code' => $result->error, 'attempt_count' => $attempt,
                    'provider_message_id' => $result->messageId, 'accepted_at' => $status === 'accepted' ? now() : null]);
                $message->attempts()->create(['provider' => $message->provider, 'status' => $status,
                    'error_code' => $result->error, 'provider_message_id' => $result->messageId]);
                if ($result->status !== 'retry') {
                    break;
                }
            }

            return $status === 'accepted';
        });
    }
}
