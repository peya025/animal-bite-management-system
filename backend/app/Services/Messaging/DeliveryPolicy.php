<?php

namespace App\Services\Messaging;

use App\Services\Messaging\Sms\SmsManager;

class DeliveryPolicy
{
    public static function emailProvider(?string $configuredProvider = null): string
    {
        if (app(EmailTransportInterface::class) instanceof BrevoEmailService) {
            return 'brevo';
        }

        return $configuredProvider ?: (string) config('mail.default');
    }

    public function mailerReady(?string $mailer = null): bool
    {
        return app(EmailTransportInterface::class)->configurationError($mailer) === null;
    }

    public function error(string $channel, string $recipient, ?string $provider = null): ?string
    {
        if ($channel === 'in_app') {
            return null;
        }
        if (! config("messaging.{$channel}_enabled")) {
            return 'channel_disabled';
        }
        if (config('messaging.test_mode') && ! in_array($recipient, config('messaging.test_recipients'), true)) {
            return 'recipient_not_allowlisted';
        }
        if ($channel === 'email') {
            if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                return 'invalid_email';
            }

            return app(EmailTransportInterface::class)->configurationError($provider);
        }
        try {
            $normalizedRecipient = SmsManager::normalize($recipient);
            if (config('messaging.sms_test_mode', true) && ! $this->isSmsRecipientAllowlisted($normalizedRecipient)) {
                return 'recipient_not_allowlisted';
            }
            $adapter = app(SmsManager::class)->provider($provider);
            if (! $adapter->configured()) {
                return 'provider_not_configured';
            }
            if ($adapter->capabilities()['simulated'] && app()->isProduction()) {
                return 'fake_provider_not_allowed';
            }
        } catch (\InvalidArgumentException) {
            return 'invalid_sms_configuration_or_recipient';
        }

        return null;
    }

    private function isSmsRecipientAllowlisted(string $normalizedRecipient): bool
    {
        $configured = config('messaging.sms_test_recipients', []);
        if (is_string($configured)) {
            $configured = array_filter(array_map('trim', explode(',', $configured)));
        }
        if (! is_array($configured)) {
            return false;
        }

        foreach ($configured as $entry) {
            if (! is_string($entry) || trim($entry) === '') {
                continue;
            }
            try {
                if (SmsManager::normalize($entry) === $normalizedRecipient) {
                    return true;
                }
            } catch (\InvalidArgumentException) {
                // Ignore malformed allowlist entries rather than failing open.
            }
        }

        return false;
    }

    public function availability(): array
    {
        $sms = false;
        try {
            $adapter = app(SmsManager::class)->provider();
            $sms = config('messaging.sms_enabled') && $adapter->configured()
                && ! (app()->isProduction() && $adapter->capabilities()['simulated']);
        } catch (\InvalidArgumentException) {
        }

        return ['sms' => $sms, 'email' => config('messaging.email_enabled') && $this->mailerReady(), 'in_app' => true];
    }
}
