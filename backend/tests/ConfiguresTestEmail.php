<?php

namespace Tests;

use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Transport\NullTransport;

trait ConfiguresTestEmail
{
    protected function configureTestEmail(): void
    {
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test',
            'mail.mailers.smtp.port' => 587, 'mail.mailers.smtp.scheme' => 'smtp',
            'mail.mailers.smtp.username' => 'test-user', 'mail.mailers.smtp.password' => 'test-secret',
            'mail.mailers.smtp.url' => null, 'mail.from.address' => 'clinic@example.test',
            'app.url' => 'https://api.example.test', 'app.frontend_url' => 'https://staff.example.test',
            'messaging.appointment_events_enabled' => false, 'messaging.email_enabled' => true, 'messaging.test_mode' => false]);
        // Unit/feature tests only: renders real multipart messages without network traffic.
        Mail::mailer('smtp')->setSymfonyTransport(new NullTransport);
    }
}
