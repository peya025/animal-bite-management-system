<?php

namespace App\Services\Messaging\Sms;

class FakeSmsProvider implements SmsProvider
{
    public function configured(): bool
    {
        return true;
    }

    public function capabilities(): array
    {
        return ['receipts' => false, 'idempotency' => true, 'simulated' => true];
    }

    public function send(string $recipient, string $body, string $reference): SmsResult
    {
        return new SmsResult('simulated', 'fake-'.$reference);
    }

    public function status(string $messageId): SmsResult
    {
        return new SmsResult('simulated', $messageId);
    }
}
