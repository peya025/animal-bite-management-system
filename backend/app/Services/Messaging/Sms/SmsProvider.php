<?php

namespace App\Services\Messaging\Sms;

interface SmsProvider
{
    public function configured(): bool;

    public function capabilities(): array;

    public function send(string $recipient, string $body, string $reference): SmsResult;

    public function status(string $messageId): SmsResult;
}
