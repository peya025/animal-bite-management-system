<?php

namespace App\Services\Messaging\Firebase;

use App\Exceptions\FirebaseAuthenticationException;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Throwable;

class FirebaseAuthService
{
    public const FCM_OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
    public const CACHE_KEY = 'firebase:fcm:access_token';
    public const TOKEN_EXPIRY_BUFFER_SECONDS = 120; // 2 minute buffer before actual expiry

    /**
     * Resolve the absolute path to the Firebase service account credentials file.
     */
    public function getCredentialsFilePath(): string
    {
        $path = config('services.firebase.credentials', 'storage/app/private/firebase-credentials.json');

        if (empty($path)) {
            throw new FirebaseAuthenticationException('Firebase credentials path is not configured.');
        }

        if ($this->isAbsolutePath($path)) {
            return $path;
        }

        return base_path($path);
    }

    /**
     * Check if a path is absolute (supports UNIX and Windows).
     */
    protected function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/')
            || str_starts_with($path, '\\')
            || (bool) preg_match('/^[a-zA-Z]:[\\\\\/]/', $path);
    }

    /**
     * Get the configured Firebase project ID.
     */
    public function getProjectId(): string
    {
        $projectId = config('services.firebase.project_id');

        if (empty($projectId)) {
            throw new FirebaseAuthenticationException('Firebase project ID is not configured.');
        }

        return $projectId;
    }

    /**
     * Validate that the credentials file exists, is valid JSON, and matches the project ID.
     *
     * @return array Decoded JSON credentials metadata (without private key).
     */
    public function validateCredentialsFile(): array
    {
        $filePath = $this->getCredentialsFilePath();

        if (!File::exists($filePath)) {
            throw new FirebaseAuthenticationException('Firebase service account credentials file not found.');
        }

        $raw = @file_get_contents($filePath);
        if ($raw === false) {
            throw new FirebaseAuthenticationException('Firebase service account credentials file could not be read.');
        }

        $data = json_decode($raw, true);

        if (!is_array($data) || empty($data['client_email']) || empty($data['private_key'])) {
            throw new FirebaseAuthenticationException('Firebase service account credentials file is malformed or invalid JSON.');
        }

        $expectedProjectId = $this->getProjectId();
        $fileProjectId = $data['project_id'] ?? null;

        if ($expectedProjectId !== $fileProjectId) {
            Log::warning('Firebase project ID mismatch between configuration and credentials file.', [
                'configured_project_id' => $expectedProjectId,
                'credentials_project_id' => $fileProjectId,
            ]);
            throw new FirebaseAuthenticationException('Firebase project ID mismatch between configuration and credentials file.');
        }

        return [
            'type'         => $data['type'] ?? 'service_account',
            'project_id'   => $fileProjectId,
            'client_email' => $data['client_email'],
        ];
    }

    /**
     * Generate or retrieve a cached OAuth 2.0 access token for Firebase Cloud Messaging HTTP v1.
     */
    /**
     * Resolve the cache store to use for OAuth access token caching (defaults to file store in production/local, default in tests).
     */
    protected function getCacheStore()
    {
        if (app()->runningUnitTests()) {
            return Cache::store();
        }

        $storeName = config('services.firebase.cache_store', 'file');

        try {
            return Cache::store($storeName);
        } catch (Throwable) {
            return Cache::store();
        }
    }

    /**
     * Generate or retrieve a cached OAuth 2.0 access token for Firebase Cloud Messaging HTTP v1.
     */
    public function getAccessToken(bool $forceRefresh = false): string
    {
        if (!$forceRefresh) {
            try {
                $cachedToken = $this->getCacheStore()->get(self::CACHE_KEY);
                if (!empty($cachedToken) && is_string($cachedToken)) {
                    return $cachedToken;
                }
            } catch (Throwable $e) {
                Log::warning('Firebase token cache read failed, fetching fresh token: ' . $e->getMessage());
            }
        }

        return $this->fetchAndCacheFreshToken();
    }

    /**
     * Invalidate any cached OAuth 2.0 access token (e.g. after receiving HTTP 401 Unauthorized from Firebase).
     */
    public function invalidateToken(): void
    {
        try {
            $this->getCacheStore()->forget(self::CACHE_KEY);
            Log::info('Firebase OAuth access token cache invalidated.');
        } catch (Throwable $e) {
            Log::warning('Firebase token cache invalidation skipped: ' . $e->getMessage());
        }
    }

    /**
     * Authenticate using service account credentials and store the token in cache.
     */
    protected function fetchAndCacheFreshToken(): string
    {
        $this->validateCredentialsFile();
        $filePath = $this->getCredentialsFilePath();

        try {
            $credentials = new ServiceAccountCredentials([self::FCM_OAUTH_SCOPE], $filePath);
            $tokenData = $credentials->fetchAuthToken();

            if (empty($tokenData['access_token'])) {
                $errorMsg = $tokenData['error_description'] ?? $tokenData['error'] ?? 'No access token returned by Google OAuth.';
                Log::error('Firebase authentication failed to return an access token: ' . $errorMsg);
                throw new FirebaseAuthenticationException('Failed to retrieve Google OAuth access token: ' . $errorMsg);
            }

            $accessToken = $tokenData['access_token'];

            // Calculate TTL in seconds with buffer
            $expiresIn = 3600; // Default Google token lifetime is 1 hour
            if (!empty($tokenData['expires_in'])) {
                $expiresIn = (int) $tokenData['expires_in'];
            } elseif (!empty($tokenData['expires_at'])) {
                $expiresIn = (int) $tokenData['expires_at'] - time();
            }

            $cacheTtlSeconds = max(60, $expiresIn - self::TOKEN_EXPIRY_BUFFER_SECONDS);

            try {
                $this->getCacheStore()->put(self::CACHE_KEY, $accessToken, $cacheTtlSeconds);
                Log::info('Firebase OAuth access token successfully generated and cached.', [
                    'project_id' => $this->getProjectId(),
                    'ttl_seconds' => $cacheTtlSeconds,
                ]);
            } catch (Throwable $e) {
                Log::warning('Firebase token cache write skipped: ' . $e->getMessage());
            }

            return $accessToken;
        } catch (FirebaseAuthenticationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('Firebase authentication error: ' . $e->getMessage());
            throw new FirebaseAuthenticationException('Firebase authentication failed: ' . $e->getMessage(), 0, $e);
        }
    }
}
