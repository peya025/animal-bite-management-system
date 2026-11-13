<?php

namespace App\Services\Messaging;

use App\Services\Messaging\Sms\SmsManager;

class DeliveryPolicy
{
    public function mailerReady(?string $mailer = null): bool
    {
        $mailer ??= config('mail.default');

        return in_array(config("mail.mailers.{$mailer}.transport"), config('messaging.delivery_transports'), true);
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

            return $this->mailerReady($provider) ? null : 'delivery_mailer_required';
        }
        try {
            SmsManager::normalize($recipient);
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
