<?php

namespace App\Services\Messaging;

use App\Services\Messaging\Sms\SmsResult;
use Illuminate\Mail\Mailable;

/**
 * Contract for outbound transactional email delivery.
 *
 * Implementations must remain free of side effects in configurationError()
 * (no network calls), and must never log credentials, tokens, or message
 * bodies at any log level.
 */
interface EmailTransportInterface
{
    /**
     * Validate the transport configuration without making a network call.
     *
     * Returns null when the transport is ready to send.
     * Returns a machine-readable error code string when misconfigured.
     *
     * @param  string|null  $provider  Named provider/mailer (optional; uses default when null).
     */
    public function configurationError(?string $provider = null): ?string;

    /**
     * Deliver a Mailable to a single recipient.
     *
     * Returns SmsResult with:
     *   - status 'accepted'  : provider accepted the message for delivery
     *   - status 'failed'    : permanent failure; do not retry
     *   - status 'retry'     : transient failure; safe to retry
     *   - status 'unknown'   : outcome uncertain (e.g. timeout after possible acceptance)
     *
     * @param  string       $recipient  Validated email address.
     * @param  Mailable     $mail       Fully constructed Mailable instance.
     * @param  string|null  $provider   Named provider/mailer override (optional).
     */
    public function send(string $recipient, Mailable $mail, ?string $provider = null): SmsResult;

    /**
     * Map a caught Throwable to a safe SmsResult without exposing internals.
     *
     * Callers that catch their own exceptions pass them here so that the
     * transport can classify them consistently (e.g. auth failure vs. timeout).
     */
    public function failure(\Throwable $e): SmsResult;
}
