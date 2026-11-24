<?php

namespace App\Services\Messaging\Sms;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Delivers SMS messages via the UniSMS Philippines HTTP API (unismsapi.com).
 *
 * API reference:
 *   - Send SMS:   POST {base_url}/sms
 *   - Status:     GET  {base_url}/sms/{reference_id}
 *   - Auth:       HTTP Basic Auth (API Secret Key as username, empty password)
 *   - Payload:    {"recipient": "+639...", "content": "...", "sender_id": "..."}
 *
 * Security & safety rules:
 *   - Credentials are read strictly from config and never logged or exposed.
 *   - Recipient numbers and message bodies are never written to logs or error codes.
 *   - Connection timeouts and 5xx server errors return 'unknown' so the caller
 *     never automatically resends a message that UniSMS may already have accepted.
 */
class UniSmsProvider implements SmsProvider
{
    private const DEFAULT_BASE_URL = 'https://unismsapi.com/api';

    private const MAX_CONTENT_LENGTH = 670;

    public function configured(): bool
    {
        $apiKey = trim((string) config('messaging.unisms.api_key', ''));
        $senderId = trim((string) config('messaging.unisms.sender_id', ''));

        if ($apiKey === '' || $senderId === '') {
            return false;
        }

        if (preg_match('/[\r\n]/', $senderId)) {
            return false;
        }

        return true;
    }

    public function capabilities(): array
    {
        return [
            'receipts' => (bool) config('messaging.unisms.receipts_enabled', false),
            'idempotency' => false,
            'simulated' => false,
        ];
    }

    public function send(string $recipient, string $body, string $reference): SmsResult
    {
        if (! $this->configured()) {
            return new SmsResult('failed', error: 'provider_not_configured');
        }

        if (! preg_match('/^\+639\d{9}$/', $recipient)) {
            return new SmsResult('failed', error: 'unsupported_recipient');
        }

        if (trim($body) === '') {
            return new SmsResult('failed', error: 'empty_message_body');
        }

        if (mb_strlen($body, 'UTF-8') > self::MAX_CONTENT_LENGTH) {
            return new SmsResult('failed', error: 'message_too_long');
        }

        try {
            $response = $this->client()->post($this->endpoint('/sms'), [
                'recipient' => $recipient,
                'content' => $body,
                'sender_id' => trim((string) config('messaging.unisms.sender_id')),
            ]);

            return $this->interpretResponse($response, isStatusLookup: false);
        } catch (ConnectionException) {
            // An interrupted or timed-out request may already have been accepted
            // by UniSMS: preserve uncertainty and never automatically resend.
            return new SmsResult('unknown', error: 'unisms_connection_timeout');
        } catch (\Throwable) {
            return new SmsResult('unknown', error: 'unisms_unexpected_error');
        }
    }

    public function status(string $messageId): SmsResult
    {
        if (! $this->capabilities()['receipts'] || ! $this->configured() || trim($messageId) === '') {
            return new SmsResult('accepted', $messageId);
        }

        try {
            $response = $this->client()->get($this->endpoint('/sms/'.rawurlencode($messageId)));

            return $this->interpretResponse($response, isStatusLookup: true);
        } catch (ConnectionException) {
            return new SmsResult('unknown', error: 'unisms_connection_timeout');
        } catch (\Throwable) {
            return new SmsResult('unknown', error: 'unisms_unexpected_error');
        }
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->asJson()
            ->withBasicAuth(trim((string) config('messaging.unisms.api_key')), '')
            ->connectTimeout(5)
            ->timeout(15);
    }

    private function endpoint(string $path): string
    {
        $base = rtrim(trim((string) config('messaging.unisms.url', self::DEFAULT_BASE_URL)), '/');
        if ($base === '') {
            $base = self::DEFAULT_BASE_URL;
        }

        return $base.$path;
    }

    private function interpretResponse(Response $response, bool $isStatusLookup): SmsResult
    {
        $httpStatus = $response->status();

        if ($httpStatus === 429) {
            return new SmsResult('retry', error: 'rate_limited');
        }

        if ($response->serverError()) {
            return new SmsResult('unknown', error: 'provider_server_error');
        }

        if ($httpStatus === 401) {
            return new SmsResult('failed', error: 'unisms_authentication_failed');
        }

        if ($httpStatus === 402) {
            return new SmsResult('failed', error: 'unisms_insufficient_credits');
        }

        if ($httpStatus === 403) {
            return new SmsResult('failed', error: 'unisms_sender_or_account_rejected');
        }

        if ($httpStatus === 404) {
            return new SmsResult($isStatusLookup ? 'unknown' : 'failed', error: 'unisms_not_found');
        }

        if ($httpStatus === 422) {
            return new SmsResult('failed', error: $this->classifyValidationError($response));
        }

        if (! $response->successful()) {
            return new SmsResult('failed', error: 'provider_rejected');
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            return new SmsResult('unknown', error: 'invalid_provider_response');
        }

        $id = $this->extractReferenceId($payload);
        if ($id === null) {
            return new SmsResult('unknown', error: 'invalid_provider_response');
        }

        $providerStatus = $this->extractProviderStatus($payload);

        if (in_array($providerStatus, ['failed', 'rejected', 'undelivered'], true)) {
            return new SmsResult('failed', $id, 'delivery_failed');
        }

        if ($isStatusLookup && in_array($providerStatus, ['sent', 'delivered'], true)) {
            return new SmsResult('delivered', $id);
        }

        return new SmsResult('accepted', $id);
    }

    private function extractReferenceId(array $payload): ?string
    {
        $candidates = [
            data_get($payload, 'message.reference_id'),
            data_get($payload, 'reference_id'),
            data_get($payload, 'data.reference_id'),
            data_get($payload, 'data.message_id'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
            if (is_int($candidate) && $candidate > 0) {
                return (string) $candidate;
            }
        }

        return null;
    }

    private function extractProviderStatus(array $payload): string
    {
        $candidates = [
            data_get($payload, 'message.status'),
            data_get($payload, 'status'),
            data_get($payload, 'data.status'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return strtolower(trim($candidate));
            }
        }

        return '';
    }

    /**
     * Map a 422 validation response to a fixed internal error code without
     * persisting or exposing raw provider payloads.
     */
    private function classifyValidationError(Response $response): string
    {
        $payload = $response->json();
        if (! is_array($payload)) {
            return 'unisms_validation_failed';
        }

        $parts = [];
        foreach (['error', 'message', 'detail'] as $key) {
            if (is_string($payload[$key] ?? null)) {
                $parts[] = $payload[$key];
            }
        }
        if (is_array($payload['errors'] ?? null)) {
            $parts[] = implode(' ', array_keys($payload['errors']));
            foreach ($payload['errors'] as $value) {
                if (is_string($value)) {
                    $parts[] = $value;
                } elseif (is_array($value)) {
                    $parts[] = implode(' ', array_filter($value, 'is_string'));
                }
            }
        }

        $haystack = strtolower(implode(' ', $parts));

        if (str_contains($haystack, 'credit') || str_contains($haystack, 'balance') || str_contains($haystack, 'insufficient')) {
            return 'unisms_insufficient_credits';
        }

        if (str_contains($haystack, 'sender')) {
            return 'unisms_sender_rejected';
        }

        if (str_contains($haystack, 'recipient') || str_contains($haystack, 'phone') || str_contains($haystack, 'number')) {
            return 'unisms_invalid_recipient';
        }

        if (str_contains($haystack, 'content') || str_contains($haystack, 'length') || str_contains($haystack, 'long')) {
            return 'message_too_long';
        }

        return 'unisms_validation_failed';
    }
}
