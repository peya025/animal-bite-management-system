<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID', 'abtc-management-system'),
        'credentials' => env('GOOGLE_APPLICATION_CREDENTIALS', 'storage/app/private/firebase-credentials.json'),
        'fcm_enabled' => (bool) env('FCM_ENABLED', false),
        'fcm_test_mode' => (bool) env('FCM_TEST_MODE', false),
        'channel_id' => env('FCM_ANDROID_CHANNEL_ID', 'abtcare_reminders'),
        'cache_store' => env('FCM_CACHE_STORE', 'file'),
        'allowed_patient_account_ids' => env('FCM_ALLOWED_PATIENT_ACCOUNT_IDS', '1'),
    ],

];
