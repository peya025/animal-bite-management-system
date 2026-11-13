<?php

use App\Services\Messaging\Sms\FakeSmsProvider;
use App\Services\Messaging\Sms\SemaphoreSmsProvider;
use App\Services\Messaging\Sms\TwilioSmsProvider;

return [
    'queue_connection' => env('MESSAGING_QUEUE_CONNECTION', 'database'),
    'queue' => 'notifications',
    'sms_enabled' => env('SMS_ENABLED', false),
    'email_enabled' => env('EMAIL_ENABLED', false),
    'sms_provider' => env('SMS_PROVIDER', 'fake'),
    'test_mode' => env('MESSAGING_TEST_MODE', true),
    'test_recipients' => array_filter(array_map('trim', explode(',', env('MESSAGING_TEST_RECIPIENTS', '')))),
    'max_attempts' => 3,
    'sms_per_minute' => (int) env('SMS_PER_MINUTE', 30),
    'email_per_minute' => (int) env('EMAIL_PER_MINUTE', 30),
    'delivery_transports' => ['smtp', 'sendmail', 'mailgun', 'ses', 'ses-v2', 'postmark', 'resend'],
    'providers' => [
        'fake' => FakeSmsProvider::class,
        'twilio' => TwilioSmsProvider::class,
        'semaphore' => SemaphoreSmsProvider::class,
    ],
    'twilio' => [
        'sid' => env('TWILIO_ACCOUNT_SID'),
        'token' => env('TWILIO_AUTH_TOKEN'),
        'sender' => env('TWILIO_FROM'),
    ],
    'semaphore' => [
        'key' => env('SEMAPHORE_API_KEY'),
        'sender' => env('SEMAPHORE_SENDER_NAME'),
    ],
];
