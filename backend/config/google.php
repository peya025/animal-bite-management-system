<?php

/**
 * Google OAuth 2.0 configuration
 * Credentials are stored in .env — never commit real values.
 */
return [
    'client_id'     => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect_uri'  => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/auth/google/callback'),
];
