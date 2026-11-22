<?php

namespace App\Services\Messaging;

use App\Services\Messaging\Sms\SmsResult;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class SmtpEmailService implements EmailTransportInterface
{
    public function configurationError(?string $mailer = null): ?string
    {
        $config = config('mail.mailers.'.($mailer ?? config('mail.default')), []);
        if (($config['transport'] ?? null) !== 'smtp') {
            return 'smtp_required';
        }
        // A URL can override security options and credentials. Use explicit settings only.
        if (! empty($config['url'])) {
            return 'smtp_url_not_supported';
        }
        if (empty($config['host']) || empty($config['username']) || empty($config['password'])) {
            return 'smtp_credentials_missing';
        }
        $port = (int) ($config['port'] ?? 0);
        $scheme = $config['scheme'] ?? 'smtp';
        if (! in_array($scheme, ['smtp', 'smtps'], true) || $port < 1 || $port > 65535
            || ($port === 465 && $scheme !== 'smtps') || ($port === 587 && $scheme !== 'smtp')) {
            return 'smtp_encryption_mismatch';
        }
        if (($config['require_tls'] ?? false) !== true || ($config['verify_peer'] ?? true) !== true
            || ($config['auto_tls'] ?? true) !== true) {
            return 'smtp_tls_required';
        }
        if (! filter_var(config('mail.from.address'), FILTER_VALIDATE_EMAIL)
            || preg_match('/[\r\n]/', (string) config('mail.from.name'))) {
            return 'invalid_sender';
        }

        return null;
    }

    public function send(string $recipient, Mailable $mail, ?string $mailer = null): SmsResult
    {
        $error = app(DeliveryPolicy::class)->error('email', $recipient, $mailer);
        if ($error) {
            return new SmsResult('failed', error: $error);
        }
        try {
            $sent = Mail::mailer($mailer ?? config('mail.default'))->to($recipient)->send($mail);

            // Cancelled MessageSending events / null returns are not SMTP acceptance.
            return $sent ? new SmsResult('accepted', messageId: $sent->getMessageId())
                : new SmsResult('failed', error: 'email_not_submitted');
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    public function failure(\Throwable $e): SmsResult
    {
        // Inspect only SMTP reply codes; never expose exception text or SMTP debug transcripts.
        $code = $e instanceof TransportExceptionInterface ? (int) $e->getCode() : 0;
        if (in_array($code, [530, 534, 535, 538], true)) {
            return new SmsResult('failed', error: 'smtp_authentication_failed');
        }
        if ($code >= 500 && $code <= 599) {
            return new SmsResult('failed', error: 'smtp_rejected');
        }
        if ($code >= 400 && $code <= 499) {
            return new SmsResult('retry', error: 'smtp_temporary_rejection');
        }
        if ($e instanceof TransportExceptionInterface && preg_match('/certificate|STARTTLS|TLS required|SSL operation/i', $e->getMessage())) {
            return new SmsResult('failed', error: 'smtp_tls_failure');
        }
        if ($e instanceof TransportExceptionInterface && preg_match('/Connection refused|getaddrinfo|php_network_getaddresses/i', $e->getMessage())) {
            return new SmsResult('retry', error: 'smtp_connection_failed');
        }
        if ($e instanceof \InvalidArgumentException) {
            return new SmsResult('failed', error: 'email_template_invalid');
        }

        // A disconnect may occur after acceptance. Do not automatically duplicate a message.
        return new SmsResult('unknown', error: 'smtp_outcome_unknown');
    }
}
