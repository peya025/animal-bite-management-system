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

    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri'  => env('GOOGLE_REDIRECT_URI'),
    ],

    // -------------------------------------------------------------------------
    // Brevo Transactional Email HTTP API
    // Used by BrevoEmailService when BREVO_API_KEY is present.
    // AppServiceProvider binds EmailTransportInterface to BrevoEmailService
    // when this key is set, and to SmtpEmailService otherwise.
    // -------------------------------------------------------------------------
    'brevo' => [
        'key'          => env('BREVO_API_KEY'),
        'url'          => env('BREVO_API_URL', 'https://api.brevo.com/v3'),
        'sender_email' => env('BREVO_SENDER_EMAIL'),
        'sender_name'  => env('BREVO_SENDER_NAME', 'Tagoloan Animal Bite Treatment Center'),
    ],

];
