<?php

namespace App\Services\Messaging\Sms;

use Illuminate\Support\Facades\Http;

class TwilioSmsProvider implements SmsProvider
{
    public function configured(): bool
    {
        return (bool) (config('messaging.twilio.sid') && config('messaging.twilio.token') && config('messaging.twilio.sender'));
    }

    public function capabilities(): array
    {
        return ['receipts' => true, 'idempotency' => false, 'simulated' => false];
    }

    private function client()
    {
        return Http::asForm()->acceptJson()->connectTimeout(5)->timeout(15)
            ->withBasicAuth(config('messaging.twilio.sid'), config('messaging.twilio.token'));
    }

    private function url(): string
    {
        return 'https://api.twilio.com/2010-04-01/Accounts/'.rawurlencode(config('messaging.twilio.sid')).'/Messages';
    }

    private function result($response): SmsResult
    {
        if ($response->status() === 429) {
            return new SmsResult('retry', error: 'rate_limited');
        }
        if ($response->serverError()) {
            return new SmsResult('unknown', error: 'provider_server_error');
        }
        if (! $response->successful()) {
            return new SmsResult('failed', error: 'provider_rejected');
        }
        $id = $response->json('sid');
        if (! $id) {
            return new SmsResult('unknown', error: 'invalid_provider_response');
        }
        $status = match ($response->json('status')) {
            'delivered', 'read' => 'delivered',
            'failed', 'undelivered', 'canceled' => 'failed',
            default => 'accepted',
        };

        return new SmsResult($status, $id, $status === 'failed' ? 'delivery_failed' : null);
    }

    public function send(string $recipient, string $body, string $reference): SmsResult
    {
        return $this->result($this->client()->post($this->url().'.json', [
            'To' => $recipient, 'From' => config('messaging.twilio.sender'), 'Body' => $body,
        ]));
    }

    public function status(string $messageId): SmsResult
    {
        return $this->result($this->client()->get($this->url().'/'.rawurlencode($messageId).'.json'));
    }
}
