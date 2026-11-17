<?php

namespace App\Services\Messaging\Firebase;

class FcmResult
{
    public function __construct(
        public readonly bool $successful,
        public readonly ?string $messageId = null,
        public readonly ?string $errorCode = null,
        public readonly ?string $errorMessage = null,
        public readonly int $statusCode = 200,
        public readonly bool $isRetryable = false,
        public readonly bool $isUnregistered = false,
        public readonly ?int $retryAfter = null,
        public readonly array $details = []
    ) {}

    public static function success(string $messageId, int $statusCode = 200, array $details = []): self
    {
        return new self(
            successful: true,
            messageId: $messageId,
            statusCode: $statusCode,
            details: $details
        );
    }

    public static function failure(
        string $errorCode,
        string $errorMessage,
        int $statusCode = 400,
        bool $isRetryable = false,
        bool $isUnregistered = false,
        ?int $retryAfter = null,
        array $details = []
    ): self {
        return new self(
            successful: false,
            errorCode: $errorCode,
            errorMessage: $errorMessage,
            statusCode: $statusCode,
            isRetryable: $isRetryable,
            isUnregistered: $isUnregistered,
            retryAfter: $retryAfter,
            details: $details
        );
    }

    public static function skipped(string $reason, array $details = []): self
    {
        return new self(
            successful: false,
            errorCode: 'SKIPPED',
            errorMessage: $reason,
            statusCode: 200,
            isRetryable: false,
            isUnregistered: false,
            details: $details
        );
    }

    public function isSuccessful(): bool
    {
        return $this->successful;
    }

    public function isSkipped(): bool
    {
        return $this->errorCode === 'SKIPPED';
    }

    public function getSkippedReason(): ?string
    {
        return $this->isSkipped() ? $this->errorMessage : null;
    }

    public function isRetryable(): bool
    {
        return $this->isRetryable;
    }

    public function isUnregistered(): bool
    {
        return $this->isUnregistered;
    }

    public function getMessageId(): ?string
    {
        return $this->messageId;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getErrorMessage(): ?string
    {
        return $this->errorMessage;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getRetryAfter(): ?int
    {
        return $this->retryAfter;
    }

    public function getDetails(): array
    {
        return $this->details;
    }

    public function toArray(): array
    {
        return [
            'successful'      => $this->successful,
            'message_id'      => $this->messageId,
            'error_code'      => $this->errorCode,
            'error_message'   => $this->errorMessage,
            'status_code'     => $this->statusCode,
            'is_retryable'    => $this->isRetryable,
            'is_unregistered' => $this->isUnregistered,
            'retry_after'     => $this->retryAfter,
            'details'         => $this->details,
        ];
    }
}
