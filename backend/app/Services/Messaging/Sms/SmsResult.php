<?php

namespace App\Services\Messaging\Sms;

final readonly class SmsResult
{
    public function __construct(
        public string $status,
        public ?string $messageId = null,
        public ?string $error = null,
    ) {}
}
