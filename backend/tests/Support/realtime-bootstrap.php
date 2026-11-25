<?php

// Explicit opt-in bootstrap for the Reverb/FCM audit suite. Never load local
// credentials or a cached production configuration into these tests.
require dirname(__DIR__, 2).'/vendor/autoload.php';

$values = [
    'APP_ENV' => 'testing',
    'APP_KEY' => 'base64:'.base64_encode(str_repeat('t', 32)),
    'APP_CONFIG_CACHE' => sys_get_temp_dir().'/abtc-audit-no-config-'.getmypid().'.php',
    'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => ':memory:', 'DB_URL' => '',
    'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array',
    'QUEUE_CONNECTION' => 'sync', 'MESSAGING_QUEUE_CONNECTION' => 'database',
    'BROADCAST_CONNECTION' => 'null', 'MAIL_MAILER' => 'array',
    'SMS_ENABLED' => 'false', 'SMS_PROVIDER' => 'fake',
    'EMAIL_ENABLED' => 'false', 'EMAIL_APPOINTMENT_EVENTS_ENABLED' => 'false',
    'FCM_ENABLED' => 'false', 'FCM_TEST_MODE' => 'true',
    'FCM_ALLOWED_PATIENT_ACCOUNT_IDS' => '1', 'FCM_CACHE_STORE' => 'array',
    'FIREBASE_CREDENTIALS_JSON' => '', 'FIREBASE_CREDENTIALS_BASE64' => '',
    'GOOGLE_APPLICATION_CREDENTIALS' => sys_get_temp_dir().'/abtc-audit-no-credentials-'.getmypid().'.json',
    'BREVO_API_KEY' => '',
    // Any accidental, unfaked outbound HTTP request fails locally.
    'HTTP_PROXY' => 'http://127.0.0.1:9', 'HTTPS_PROXY' => 'http://127.0.0.1:9',
    'http_proxy' => 'http://127.0.0.1:9', 'https_proxy' => 'http://127.0.0.1:9',
    'NO_PROXY' => '127.0.0.1,localhost', 'no_proxy' => '127.0.0.1,localhost',
];

foreach ($values as $name => $value) {
    putenv("{$name}={$value}");
    $_ENV[$name] = $_SERVER[$name] = $value;
}
