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
     * Resolve and validate Firebase service account credentials from:
     * 1. Environment variable JSON string (services.firebase.credentials_json / FIREBASE_CREDENTIALS_JSON)
     * 2. Environment variable Base64 string (services.firebase.credentials_base64 / FIREBASE_CREDENTIALS_BASE64)
     * 3. Configured/local file path (services.firebase.credentials)
     *
     * @return array{data: array, source: string, file_path: ?string}
     */
    public function resolveCredentials(): array
    {
        // 1. Check raw JSON environment variable
        $envJson = config('services.firebase.credentials_json');
        if (!empty($envJson) && is_string($envJson)) {
            $data = json_decode(trim($envJson), true);

            if (!is_array($data)) {
                throw new FirebaseAuthenticationException('Firebase service account credentials from environment variable [FIREBASE_CREDENTIALS_JSON] are malformed or invalid JSON.');
            }

            $this->normalizePrivateKey($data);
            $this->assertValidCredentialsArray($data, 'FIREBASE_CREDENTIALS_JSON');

            $filePath = $this->getCredentialsFilePath();
            if (!File::exists($filePath)) {
                $this->materializeCredentialsFile($data, false);
            }

            return [
                'data' => $data,
                'source' => 'env_json',
                'file_path' => $filePath,
            ];
        }

        // 2. Check Base64-encoded environment variable
        $envBase64 = config('services.firebase.credentials_base64');
        if (!empty($envBase64) && is_string($envBase64)) {
            $decoded = base64_decode(trim($envBase64), true);

            if ($decoded === false) {
                throw new FirebaseAuthenticationException('Firebase service account credentials in environment variable [FIREBASE_CREDENTIALS_BASE64] are not valid Base64.');
            }

            $data = json_decode(trim($decoded), true);

            if (!is_array($data)) {
                throw new FirebaseAuthenticationException('Firebase service account credentials decoded from [FIREBASE_CREDENTIALS_BASE64] are malformed or invalid JSON.');
            }

            $this->normalizePrivateKey($data);
            $this->assertValidCredentialsArray($data, 'FIREBASE_CREDENTIALS_BASE64');

            $filePath = $this->getCredentialsFilePath();
            if (!File::exists($filePath)) {
                $this->materializeCredentialsFile($data, false);
            }

            return [
                'data' => $data,
                'source' => 'env_base64',
                'file_path' => $filePath,
            ];
        }

        // 3. Fallback to local or configured credentials file
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
            'data' => $data,
            'source' => 'file',
            'file_path' => $filePath,
        ];
    }

    /**
     * Validate required service account credential fields without exposing secrets.
     */
    protected function assertValidCredentialsArray(array $data, string $sourceName): void
    {
        if (empty($data['client_email']) || empty($data['private_key'])) {
            throw new FirebaseAuthenticationException("Firebase service account credentials from [{$sourceName}] are malformed: missing client_email or private_key.");
        }

        $expectedProjectId = $this->getProjectId();
        $credsProjectId = $data['project_id'] ?? null;

        if ($expectedProjectId !== $credsProjectId) {
            Log::warning("Firebase project ID mismatch between configuration and credentials from [{$sourceName}].", [
                'configured_project_id' => $expectedProjectId,
                'credentials_project_id' => $credsProjectId,
            ]);
            throw new FirebaseAuthenticationException("Firebase project ID mismatch between configuration and credentials from [{$sourceName}].");
        }
    }

    /**
     * Normalize escaped newlines in RSA private key if provided via string environment variable.
     */
    protected function normalizePrivateKey(array &$data): void
    {
        if (isset($data['private_key']) && is_string($data['private_key'])) {
            if (str_contains($data['private_key'], '\n') && !str_contains($data['private_key'], "\n")) {
                $data['private_key'] = str_replace('\n', "\n", $data['private_key']);
            }
        }
    }

    /**
     * Safely materialize credentials to the private storage file if not already present.
     *
     * @param array $credentialsData
     * @param bool $overwrite Whether to overwrite if the file already exists (defaults to false).
     * @return string|null Path to materialized file, or null if skipped/failed.
     */
    public function materializeCredentialsFile(array $credentialsData, bool $overwrite = false): ?string
    {
        try {
            $filePath = $this->getCredentialsFilePath();

            // Do not overwrite existing credentials unless explicitly requested
            if (File::exists($filePath) && !$overwrite) {
                return $filePath;
            }

            $directory = dirname($filePath);
            if (!File::isDirectory($directory)) {
                File::makeDirectory($directory, 0700, true, true);
            }

            $encoded = json_encode($credentialsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                Log::warning('Firebase credentials serialization for materialization failed.');
                return null;
            }

            $bytesWritten = @file_put_contents($filePath, $encoded, LOCK_EX);
            if ($bytesWritten === false) {
                Log::warning('Firebase credentials file could not be written to disk at private path. Continuing with in-memory credentials.');
                return null;
            }

            // Restrictive file permissions (POSIX)
            @chmod($filePath, 0600);

            Log::info('Firebase credentials successfully materialized to private storage.', [
                'path' => $filePath,
                'project_id' => $credentialsData['project_id'] ?? null,
            ]);

            return $filePath;
        } catch (Throwable $e) {
            Log::warning('Firebase credentials materialization encountered an error: ' . $e->getMessage() . '. Continuing with in-memory credentials.');
            return null;
        }
    }

    /**
     * Validate that credentials exist, are valid JSON, and match the project ID.
     *
     * @return array Decoded JSON credentials metadata (without private key).
     */
    public function validateCredentialsFile(): array
    {
        $resolved = $this->resolveCredentials();
        $data = $resolved['data'];

        return [
            'type'         => $data['type'] ?? 'service_account',
            'project_id'   => $data['project_id'] ?? $this->getProjectId(),
            'client_email' => $data['client_email'],
            'source'       => $resolved['source'],
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
        $resolved = $this->resolveCredentials();
        $credentialsData = $resolved['data'];

        try {
            $credentials = new ServiceAccountCredentials([self::FCM_OAUTH_SCOPE], $credentialsData);
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
                    'source' => $resolved['source'],
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
