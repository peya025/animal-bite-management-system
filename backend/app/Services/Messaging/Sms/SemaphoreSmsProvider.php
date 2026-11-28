<?php

namespace App\Services\Messaging\Sms;

use Illuminate\Support\Facades\Http;

class SemaphoreSmsProvider implements SmsProvider
{
    public function configured(): bool
    {
        return (bool) config('messaging.semaphore.key');
    }

    // Semaphore Sent means delivered to the network, not confirmed handset receipt.
    public function capabilities(): array
    {
        return ['receipts' => false, 'idempotency' => false, 'simulated' => false];
    }

    public function send(string $recipient, string $body, string $reference): SmsResult
    {
        if (! preg_match('/^\+639\d{9}$/', $recipient)) {
            return new SmsResult('failed', error: 'unsupported_recipient');
        }
        $response = Http::asForm()->acceptJson()->connectTimeout(5)->timeout(15)
            ->post('https://api.semaphore.co/api/v4/messages', array_filter([
                'apikey' => config('messaging.semaphore.key'), 'number' => ltrim($recipient, '+'),
                'message' => $body, 'sendername' => config('messaging.semaphore.sender'),
            ], fn ($value) => $value !== null && $value !== ''));
        if ($response->status() === 429) {
            return new SmsResult('retry', error: 'rate_limited');
        }
        if ($response->serverError()) {
            return new SmsResult('unknown', error: 'provider_server_error');
        }
        if (! $response->successful()) {
            return new SmsResult('failed', error: 'provider_rejected');
        }
        $id = $response->json('0.message_id');
        if (! $id) {
            return new SmsResult('unknown', error: 'invalid_provider_response');
        }
        $failed = in_array(strtolower((string) $response->json('0.status')), ['failed', 'refunded']);

        return new SmsResult($failed ? 'failed' : 'accepted', (string) $id, $failed ? 'delivery_failed' : null);
    }

    public function status(string $messageId): SmsResult
    {
        return new SmsResult('accepted', $messageId);
    }
}
