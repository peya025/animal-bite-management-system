<?php

namespace App\Services\Messaging;

use App\Services\Messaging\Sms\SmsResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email as SymfonyEmail;

/**
 * Delivers transactional email through the Brevo HTTP API.
 *
 * Replaces Symfony Mailer / SMTP for environments where outbound TCP on
 * ports 25, 465, and 587 is blocked (e.g. Railway Hobby).
 *
 * API reference: https://developers.brevo.com/reference/sendtransacemail
 *
 * Security rules enforced here:
 *   - The API key is read exclusively from config; never logged or included
 *     in any exception message, error code, or audit record.
 *   - Rendered email content (HTML/text) is never written to any log.
 *   - On connection timeout the outcome is 'unknown': Brevo may already have
 *     accepted the message. The caller must not automatically resend.
 *   - Recipient and sender addresses are validated before any network call.
 */
class BrevoEmailService implements EmailTransportInterface
{
    private const API_PATH = '/smtp/email';

    // -------------------------------------------------------------------------
    // EmailTransportInterface implementation
    // -------------------------------------------------------------------------

    /**
     * Validate Brevo configuration without making a network call.
     *
     * The $provider parameter is accepted for interface compatibility but is
     * unused: Brevo is a single global transport, not a per-mailer concept.
     */
    public function configurationError(?string $provider = null): ?string
    {
        if (empty(config('services.brevo.key'))) {
            return 'brevo_api_key_missing';
        }

        $senderEmail = (string) config('services.brevo.sender_email', '');

        if ($senderEmail === '' || ! filter_var($senderEmail, FILTER_VALIDATE_EMAIL)) {
            return 'brevo_sender_email_missing';
        }

        if (preg_match('/[\r\n]/', (string) config('services.brevo.sender_name', ''))) {
            return 'brevo_sender_name_invalid';
        }

        return null;
    }

    /**
     * Render a Mailable and deliver it via the Brevo transactional API.
     *
     * Never logs the recipient, the rendered body, or any credential.
     */
    public function send(string $recipient, Mailable $mail, ?string $provider = null): SmsResult
    {
        // Recipient guard — mirrors SmtpEmailService.
        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)
            || preg_match('/[\r\n]/', $recipient)) {
            return new SmsResult('failed', error: 'invalid_email');
        }

        // Sender config guard.
        $configError = $this->configurationError();
        if ($configError !== null) {
            return new SmsResult('failed', error: $configError);
        }

        $senderEmail = (string) config('services.brevo.sender_email');
        $senderName  = trim((string) config('services.brevo.sender_name', '')) ?: 'Tagoloan Animal Bite Treatment Center';

        // Render the Mailable to HTML + plain text using the array transport.
        // The array mailer is entirely in-memory — no SMTP, no HTTP call.
        try {
            [$html, $text, $subject] = $this->renderMailable($mail, $recipient, $senderEmail, $senderName);
        } catch (\Throwable $e) {
            return new SmsResult('failed', error: 'email_template_invalid');
        }

        // Header injection guard on subject.
        if (preg_match('/[\r\n]/', $subject)) {
            return new SmsResult('failed', error: 'email_template_invalid');
        }

        try {
            $response = Http::withHeaders([
                'api-key'      => config('services.brevo.key'),
                'Content-Type' => 'application/json',
                'Accept'       => 'application/json',
            ])
                ->connectTimeout(10)
                ->timeout(20)
                ->post($this->apiUrl(), [
                    'sender'      => ['name' => $senderName, 'email' => $senderEmail],
                    'to'          => [['email' => $recipient]],
                    'subject'     => $subject,
                    'htmlContent' => $html,
                    'textContent' => $text,
                ]);

            return $this->interpretResponse($response);

        } catch (ConnectionException $e) {
            // A connection timeout after the request was sent means Brevo may
            // have already queued the message for delivery. Return 'unknown'
            // so the caller does not automatically resend and risk a duplicate.
            return new SmsResult('unknown', error: 'brevo_connection_timeout');

        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    /**
     * Map any Throwable to a safe SmsResult.
     *
     * Never includes exception messages, stack traces, or any value that
     * could contain credentials or personal data.
     */
    public function failure(\Throwable $e): SmsResult
    {
        if ($e instanceof ConnectionException) {
            return new SmsResult('unknown', error: 'brevo_connection_timeout');
        }

        // All other unexpected exceptions: treat as unknown to prevent a
        // duplicate send on the assumption the error was post-acceptance.
        return new SmsResult('unknown', error: 'brevo_unexpected_error');
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Render a Mailable to [htmlBody, textBody, subject] using the array transport.
     *
     * We route through the 'array' mailer so that the full Mailable lifecycle
     * runs (prepareMailableForDelivery, Blade rendering, subject building) in
     * memory without any network activity. The transport is flushed after so
     * test harness state is not polluted.
     *
     * @return array{string, string, string}
     *
     * @throws \RuntimeException when rendering produces no message.
     */
    private function renderMailable(Mailable $mail, string $recipient, string $senderEmail, string $senderName): array
    {
        // Obtain the array transport and flush any pre-existing messages so
        // our extraction below always targets exactly the message we just sent.
        $transport = Mail::mailer('array')->getSymfonyTransport();
        $transport->flush();

        // Explicitly apply the configured Brevo sender so Symfony Mailer always
        // has a From header even when MAIL_FROM_ADDRESS is empty or unset.
        $mail->from = [];
        $mail->from($senderEmail, $senderName);

        // Send through the array mailer (in-memory, no sockets).
        Mail::mailer('array')->to($recipient)->send($mail);

        /** @var \Symfony\Component\Mailer\SentMessage|null $sentMessage */
        $sentMessage = $transport->messages()->last();

        if ($sentMessage === null) {
            throw new \RuntimeException('Array mailer produced no message.');
        }

        // getOriginalMessage() returns a Symfony\Component\Mime\Email when the
        // Mailable carries both HTML and text parts.
        $original = $sentMessage->getOriginalMessage();

        if (! $original instanceof SymfonyEmail) {
            throw new \RuntimeException('Mailable did not produce a Symfony Email instance.');
        }

        $html    = (string) ($original->getHtmlBody() ?? '');
        $text    = (string) ($original->getTextBody() ?? '');
        $subject = (string) ($original->getSubject() ?? '');

        // Flush the transport so this render pass does not appear in Mail::fake()
        // assertion counts during tests that call send() on a fake-configured mailer.
        $transport->flush();

        return [$html, $text, $subject];
    }

    /**
     * Translate a Brevo HTTP response to a SmsResult.
     *
     * Brevo success: HTTP 201, body {"messageId": "<uuid@...>"}.
     * Error bodies are intentionally not logged — they can contain sender
     * addresses or other identifying information. Only the HTTP status code
     * is inspected.
     */
    private function interpretResponse(\Illuminate\Http\Client\Response $response): SmsResult
    {
        $status = $response->status();

        if ($status === 201) {
            $messageId = $response->json('messageId');

            return new SmsResult('accepted', messageId: is_string($messageId) ? $messageId : null);
        }

        // Permanent failures — do not retry.
        if ($status === 400) {
            // Bad request: invalid parameters, unverified sender, bad recipient.
            return new SmsResult('failed', error: 'brevo_bad_request');
        }

        if ($status === 401 || $status === 403) {
            // Invalid API key or suspended account.
            return new SmsResult('failed', error: 'brevo_authentication_failed');
        }

        // Transient failures — safe to retry via InvitationDelivery's retry loop.
        if ($status === 429) {
            return new SmsResult('retry', error: 'brevo_rate_limited');
        }

        if ($status >= 500 && $status <= 599) {
            return new SmsResult('retry', error: 'brevo_server_error');
        }

        // Any other unexpected status (unexpected 2xx, 3xx, unrecognised 4xx).
        return new SmsResult('failed', error: 'brevo_unexpected_status');
    }

    /**
     * Construct the full API endpoint URL.
     *
     * Defaults to https://api.brevo.com/v3 so BREVO_API_URL only needs to be
     * set when overriding for a test stub or a future region-specific endpoint.
     */
    private function apiUrl(): string
    {
        $base = rtrim((string) config('services.brevo.url', 'https://api.brevo.com/v3'), '/');

        return $base.self::API_PATH;
    }
}
