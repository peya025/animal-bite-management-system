<?php

namespace App\Services\Messaging;

use App\Exceptions\FirebaseAuthenticationException;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\Firebase\FirebaseAuthService;
use App\Services\Messaging\Firebase\FcmResult;
use App\Jobs\SendFcmPushNotification;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class FcmService
{
    public const DEFAULT_CHANNEL_ID = 'abtcare_reminders';
    public const FCM_SEND_ENDPOINT_TEMPLATE = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';

    public const ALLOWED_CATEGORIES = [
        'appointment',
        'appointment_reminder',
        'appointment_rescheduled',
        'appointment_cancelled',
        'vaccination_due',
        'dose_reminder',
        'vaccination_schedule',
        'digital_card',
        'announcement',
        'general',
    ];

    /**
     * Prohibited fields to protect Patient Health Information (PHI) / Privacy.
     */
    public const PROHIBITED_SENSITIVE_KEYS = [
        'patient_name',
        'patient_first_name',
        'patient_last_name',
        'diagnosis',
        'exposure_category',
        'medical_history',
        'contact_number',
        'phone',
        'email',
        'address',
        'dob',
        'birthdate',
        'philhealth',
    ];

    public function __construct(
        protected FirebaseAuthService $authService
    ) {}

    /**
     * Whether FCM push delivery is enabled globally in configuration.
     */
    public function isEnabled(): bool
    {
        return (bool) config('services.firebase.fcm_enabled', false);
    }

    /**
     * Whether FCM is running in test mode.
     */
    public function isTestMode(): bool
    {
        return (bool) config('services.firebase.fcm_test_mode', true);
    }

    /**
     * Get the configured Android notification channel ID.
     */
    public function getChannelId(): string
    {
        return (string) config('services.firebase.channel_id', self::DEFAULT_CHANNEL_ID);
    }

    /**
     * Get the configured allowlist of patient account IDs for automatic push notifications.
     * Returns null if unrestricted (all accounts allowed), or array of int IDs if restricted.
     *
     * @return array<int>|null
     */
    public function getAllowedPatientAccountIds(): ?array
    {
        $raw = config('services.firebase.allowed_patient_account_ids');

        if ($raw === null || $raw === '' || $raw === '*') {
            return null;
        }

        if (is_array($raw)) {
            return array_map('intval', $raw);
        }

        $tokens = array_filter(
            array_map('trim', explode(',', (string) $raw)),
            fn ($val) => $val !== '' && is_numeric($val)
        );

        return array_map('intval', array_values($tokens));
    }

    /**
     * Check whether automatic push notification delivery is permitted for a given patient account ID.
     */
    public function isAccountAllowed(int|PatientAccount $account): bool
    {
        $allowedIds = $this->getAllowedPatientAccountIds();

        // If allowlist is null, allowlist filtering is disabled (unrestricted)
        if ($allowedIds === null) {
            return true;
        }

        $accountId = $account instanceof PatientAccount ? $account->id : (int) $account;

        return in_array($accountId, $allowedIds, true);
    }

    /**
     * Send a push notification to a specific FCM registration token.
     */
    public function sendToToken(
        string $token,
        string $title,
        string $body,
        array $data = [],
        bool $validateOnly = false,
        ?PatientDeviceToken $deviceToken = null,
        bool $isControlledTest = false
    ): FcmResult {
        if (empty($token)) {
            return FcmResult::failure('INVALID_TOKEN', 'FCM device token cannot be empty.', 400);
        }

        // Configuration gate:
        // 1. If this is an automated dispatch (not a controlled test) and FCM is disabled globally:
        if (!$isControlledTest && !$validateOnly && !$this->isEnabled()) {
            return FcmResult::skipped('FCM push delivery is disabled in application configuration (FCM_ENABLED=false).', [
                'token' => $this->maskToken($token),
            ]);
        }

        // 2. Simulated test mode gate (when FCM_TEST_MODE=true)
        if ($this->isTestMode()) {
            $projectId = $this->authService->getProjectId();
            $simulatedMessageId = sprintf('projects/%s/messages/simulated_%s', $projectId, bin2hex(random_bytes(8)));
            Log::info("FCM simulated test mode active (FCM_TEST_MODE=true): Simulated push response for token {$this->maskToken($token)}");

            return FcmResult::success(
                messageId: $simulatedMessageId,
                statusCode: 200,
                details: [
                    'token' => $this->maskToken($token),
                    'simulated' => true,
                    'test_mode' => true,
                    'validate_only' => $validateOnly,
                ]
            );
        }

        $sanitizedData = $this->validateAndSanitizeData($data);
        $payload = $this->buildPayload($token, $title, $body, $sanitizedData, $validateOnly);
        $projectId = $this->authService->getProjectId();
        $endpoint = sprintf(self::FCM_SEND_ENDPOINT_TEMPLATE, $projectId);

        try {
            $accessToken = $this->authService->getAccessToken();

            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->asJson()
                ->timeout(15)
                ->post($endpoint, $payload);

            // Handle HTTP 401 Unauthorized by invalidating token and retrying once
            if ($response->status() === 401) {
                Log::warning('Firebase HTTP 401 Unauthorized received. Invalidating cached access token and retrying once...');
                $this->authService->invalidateToken();
                $freshToken = $this->authService->getAccessToken(forceRefresh: true);

                $response = Http::withToken($freshToken)
                    ->acceptJson()
                    ->asJson()
                    ->timeout(15)
                    ->post($endpoint, $payload);
            }

            return $this->handleFcmResponse($response, $token, $deviceToken, $validateOnly);
        } catch (FirebaseAuthenticationException $e) {
            Log::error('Firebase authentication failure during push dispatch: ' . $e->getMessage());
            return FcmResult::failure(
                errorCode: 'AUTH_FAILED',
                errorMessage: 'Firebase authentication failed: ' . $e->getMessage(),
                statusCode: 401,
                isRetryable: false,
                details: ['token' => $this->maskToken($token)]
            );
        } catch (ConnectionException $e) {
            Log::warning('Network connection timeout while contacting Firebase Cloud Messaging API: ' . $e->getMessage());
            return FcmResult::failure(
                errorCode: 'NETWORK_TIMEOUT',
                errorMessage: 'Network timeout contacting Firebase Cloud Messaging endpoint.',
                statusCode: 0,
                isRetryable: true,
                details: ['token' => $this->maskToken($token)]
            );
        } catch (Throwable $e) {
            Log::error('Unexpected exception during FCM delivery: ' . $e->getMessage());
            return FcmResult::failure(
                errorCode: 'UNEXPECTED_ERROR',
                errorMessage: 'Unexpected failure during push notification delivery.',
                statusCode: 500,
                isRetryable: true,
                details: ['token' => $this->maskToken($token)]
            );
        }
    }

    /**
     * Send a notification to an active registered PatientDeviceToken.
     */
    public function sendToDevice(
        PatientDeviceToken $deviceToken,
        string $title,
        string $body,
        array $data = [],
        bool $validateOnly = false,
        bool $isControlledTest = false
    ): FcmResult {
        if (!$deviceToken->is_active) {
            return FcmResult::skipped('Device registration token is inactive or revoked.', [
                'device_token_id' => $deviceToken->id,
                'token' => $deviceToken->masked_token,
            ]);
        }

        $account = $deviceToken->relationLoaded('patientAccount')
            ? $deviceToken->patientAccount
            : PatientAccount::find($deviceToken->patient_account_id);

        if (!$account || !$account->is_active) {
            return FcmResult::skipped('Patient account is inactive or missing.', [
                'device_token_id' => $deviceToken->id,
                'patient_account_id' => $deviceToken->patient_account_id,
            ]);
        }

        // Test allowlist enforcement for automatic push notifications
        if (!$isControlledTest && !$this->isAccountAllowed($account)) {
            Log::info("FCM dispatch skipped: Patient account {$account->id} is not in the automatic FCM allowlist.");
            return FcmResult::skipped('Patient account is not in the automatic FCM allowlist.', [
                'device_token_id' => $deviceToken->id,
                'patient_account_id' => $account->id,
            ]);
        }

        $category = $data['category'] ?? 'general';
        if (method_exists($account, 'allowsNotificationCategory') && !$account->allowsNotificationCategory($category)) {
            return FcmResult::skipped('Notification category disabled by patient account preferences.', [
                'device_token_id' => $deviceToken->id,
                'patient_account_id' => $account->id,
                'category' => $category,
            ]);
        }

        $result = $this->sendToToken(
            token: $deviceToken->fcm_token,
            title: $title,
            body: $body,
            data: $data,
            validateOnly: $validateOnly,
            deviceToken: $deviceToken,
            isControlledTest: $isControlledTest
        );

        if ($result->isSuccessful() && !$result->isSimulated() && !$validateOnly) {
            $deviceToken->update(['last_used_at' => now()]);
        }

        return $result;
    }

    /**
     * Send a push notification to all active devices registered under a patient account.
     *
     * @return array<int, FcmResult> Array keyed by device token ID.
     */
    public function sendToAccount(
        PatientAccount $account,
        string $title,
        string $body,
        array $data = [],
        bool $validateOnly = false,
        bool $isControlledTest = false
    ): array {
        if (!$account->exists || !$account->is_active) {
            Log::info("FCM dispatch skipped: Patient account {$account->id} does not exist or is inactive.");
            return [
                0 => FcmResult::skipped('Patient account is inactive or does not exist.', [
                    'patient_account_id' => $account->id,
                ]),
            ];
        }

        // Test allowlist enforcement for automatic push notifications
        if (!$isControlledTest && !$this->isAccountAllowed($account)) {
            Log::info("FCM dispatch skipped: Patient account {$account->id} is not in the automatic FCM allowlist.");
            return [
                0 => FcmResult::skipped('Patient account is not in the automatic FCM allowlist.', [
                    'patient_account_id' => $account->id,
                ]),
            ];
        }

        $category = $data['category'] ?? 'general';
        if (method_exists($account, 'allowsNotificationCategory') && !$account->allowsNotificationCategory($category)) {
            Log::info("FCM dispatch skipped: Category '{$category}' is disabled by user preferences for account {$account->id}.");
            return [
                0 => FcmResult::skipped('Notification category disabled by patient account preferences.', [
                    'patient_account_id' => $account->id,
                    'category' => $category,
                ]),
            ];
        }

        $activeTokens = $account->deviceTokens()->with('patientAccount')->active()->get();

        if ($activeTokens->isEmpty()) {
            Log::info("FCM dispatch skipped: No active device registrations found for patient account {$account->id}.");
            return [];
        }

        $results = [];

        foreach ($activeTokens as $deviceToken) {
            // Re-verify relationship ownership immediately before sending
            if ($deviceToken->patient_account_id !== $account->id) {
                Log::warning("FCM security alert: Token ID {$deviceToken->id} does not belong to account {$account->id}. Skipped.");
                continue;
            }

            $results[$deviceToken->id] = $this->sendToDevice(
                deviceToken: $deviceToken,
                title: $title,
                body: $body,
                data: $data,
                validateOnly: $validateOnly,
                isControlledTest: $isControlledTest
            );
        }

        return $results;
    }

    /**
     * Queue a push notification for background delivery using Laravel's queue.
     */
    public function queueToAccount(
        PatientAccount $account,
        string $title,
        string $body,
        array $data = []
    ): void {
        if (!$this->isAccountAllowed($account)) {
            Log::info("FCM queue skipped: Patient account {$account->id} is not in the automatic FCM allowlist.");
            return;
        }

        SendFcmPushNotification::dispatch(
            patientAccountId: $account->id,
            title: $title,
            body: $body,
            data: $data
        );
    }

    /**
     * Queue a push notification for a single registered device.
     */
    public function queueToDevice(
        PatientDeviceToken $deviceToken,
        string $title,
        string $body,
        array $data = []
    ): void {
        if (!$this->isAccountAllowed($deviceToken->patient_account_id)) {
            Log::info("FCM queue skipped: Patient account {$deviceToken->patient_account_id} is not in the automatic FCM allowlist.");
            return;
        }

        SendFcmPushNotification::dispatch(
            patientAccountId: $deviceToken->patient_account_id,
            title: $title,
            body: $body,
            data: $data,
            deviceTokenId: $deviceToken->id
        );
    }

    /**
     * Build the official Firebase Cloud Messaging HTTP v1 request payload.
     */
    public function buildPayload(
        string $token,
        string $title,
        string $body,
        array $sanitizedData = [],
        bool $validateOnly = false
    ): array {
        $payload = [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body'  => $body,
                ],
                'data' => $sanitizedData,
                'android' => [
                    'priority' => 'HIGH',
                    'notification' => [
                        'channel_id'              => $this->getChannelId(),
                        'sound'                   => 'default',
                        'notification_priority'   => 'PRIORITY_HIGH',
                        'default_sound'           => true,
                        'default_vibrate_timings' => true,
                    ],
                ],
            ],
        ];

        if ($validateOnly) {
            $payload['validate_only'] = true;
        }

        return $payload;
    }

    /**
     * Validate and sanitize the data payload:
     * - Strictly strips or forbids protected sensitive health information (PHI)
     * - Casts all values to string (as required by FCM HTTP v1)
     * - Validates category against allowed mobile navigation routes
     */
    public function validateAndSanitizeData(array $data): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            $cleanKey = strtolower(trim((string) $key));

            // Strip prohibited sensitive medical/PII keys
            if (in_array($cleanKey, self::PROHIBITED_SENSITIVE_KEYS, true)) {
                Log::warning("FCM security filter: Stripped prohibited sensitive key '{$key}' from push payload.");
                continue;
            }

            // In FCM HTTP v1, all data values must be strings
            if (is_bool($value)) {
                $sanitized[$key] = $value ? 'true' : 'false';
            } elseif (is_null($value)) {
                $sanitized[$key] = '';
            } elseif (is_scalar($value)) {
                $sanitized[$key] = (string) $value;
            } elseif (is_array($value)) {
                $sanitized[$key] = json_encode($value);
            } else {
                $sanitized[$key] = (string) $value;
            }
        }

        // Validate or default category
        if (isset($sanitized['category']) && !in_array($sanitized['category'], self::ALLOWED_CATEGORIES, true)) {
            Log::info("FCM category '{$sanitized['category']}' not in standard whitelist; mapped to general.");
            $sanitized['category'] = 'general';
        }

        return $sanitized;
    }

    /**
     * Parse and structure the response from Firebase Cloud Messaging HTTP v1 API.
     */
    protected function handleFcmResponse(
        Response $response,
        string $token,
        ?PatientDeviceToken $deviceToken = null,
        bool $validateOnly = false
    ): FcmResult {
        $status = $response->status();
        $body = $response->json() ?? [];
        $maskedToken = $this->maskToken($token);

        // Success: HTTP 200 with name (projects/{project_id}/messages/{message_id})
        if ($response->successful()) {
            $messageId = $body['name'] ?? null;
            $isGoogleSentinel = $messageId !== null && str_contains($messageId, 'fake_message_id');

            Log::info("FCM push accepted by Firebase: messageId={$messageId}, token={$maskedToken}" . ($isGoogleSentinel ? ' [Google validate_only sentinel]' : ''));

            return FcmResult::success(
                messageId: $messageId ?? 'unknown_message_id',
                statusCode: $status,
                details: [
                    'token' => $maskedToken,
                    'validate_only' => $validateOnly,
                    'google_sentinel' => $isGoogleSentinel,
                    'simulated' => false,
                ]
            );
        }

        // Error details inspection
        $error = $body['error'] ?? [];
        $errorCode = 'UNKNOWN_ERROR';
        $errorMessage = $error['message'] ?? 'Unknown Firebase error occurred.';

        // Extract FCM HTTP v1 errorCode from details if present
        if (!empty($error['details']) && is_array($error['details'])) {
            foreach ($error['details'] as $detail) {
                if (isset($detail['errorCode'])) {
                    $errorCode = (string) $detail['errorCode'];
                    break;
                }
            }
        }

        if ($errorCode === 'UNKNOWN_ERROR') {
            $errorCode = $error['status'] ?? ('HTTP_' . $status);
        }

        // Handle UNREGISTERED token. Only deactivate registration tokens when the Firebase response
        // specifically confirms an invalid or unregistered device token.
        // Generic HTTP 404 project or endpoint errors must not deactivate valid tokens.
        $isProjectOrEndpoint404 = ($status === 404) && (
            str_contains(strtolower($errorMessage), 'project')
            || str_contains(strtolower($errorMessage), 'not found on server')
            || str_contains(strtolower($errorMessage), 'url')
        );

        $isUnregistered = false;
        if (!$isProjectOrEndpoint404) {
            $isUnregistered = ($errorCode === 'UNREGISTERED')
                || str_contains($errorMessage, 'UNREGISTERED')
                || ($status === 404 && (
                    $errorCode === 'UNREGISTERED'
                    || (str_contains($errorMessage, 'Requested entity was not found') && !str_contains(strtolower($errorMessage), 'project'))
                ));
        }

        if ($isUnregistered) {
            $this->deactivateInvalidToken($token, $deviceToken);

            Log::warning("FCM token unregistered by Google Play Services. Deactivated registration: {$maskedToken}");

            return FcmResult::failure(
                errorCode: 'UNREGISTERED',
                errorMessage: 'Device token is no longer registered or has been revoked by Google Play Services.',
                statusCode: $status,
                isRetryable: false,
                isUnregistered: true,
                details: ['token' => $maskedToken]
            );
        }

        if ($isProjectOrEndpoint404) {
            Log::error("FCM endpoint or project not found (HTTP 404): {$errorMessage}. Token {$maskedToken} preserved.");

            return FcmResult::failure(
                errorCode: 'ENDPOINT_OR_PROJECT_NOT_FOUND',
                errorMessage: 'Firebase project or endpoint not found: ' . $errorMessage,
                statusCode: $status,
                isRetryable: false,
                isUnregistered: false,
                details: ['token' => $maskedToken]
            );
        }

        // Rate limit / Quota (HTTP 429)
        if ($status === 429 || $errorCode === 'RESOURCE_EXHAUSTED' || $errorCode === 'QUOTA_EXCEEDED') {
            $retryAfter = null;
            if ($response->hasHeader('Retry-After')) {
                $retryAfter = (int) $response->header('Retry-After');
            }

            Log::warning("FCM rate limit hit (HTTP 429). Retry-After: " . ($retryAfter ?? 'none'));

            return FcmResult::failure(
                errorCode: 'RATE_LIMITED',
                errorMessage: 'Firebase Cloud Messaging rate limit exceeded.',
                statusCode: $status,
                isRetryable: true,
                isUnregistered: false,
                retryAfter: $retryAfter,
                details: ['token' => $maskedToken]
            );
        }

        // Server errors (HTTP 500, 503 UNAVAILABLE)
        if ($status >= 500) {
            $retryAfter = null;
            if ($response->hasHeader('Retry-After')) {
                $retryAfter = (int) $response->header('Retry-After');
            }

            Log::warning("FCM temporary server error (HTTP {$status}).");

            return FcmResult::failure(
                errorCode: 'SERVER_ERROR',
                errorMessage: 'Firebase Cloud Messaging server error: ' . $errorMessage,
                statusCode: $status,
                isRetryable: true,
                isUnregistered: false,
                retryAfter: $retryAfter,
                details: ['token' => $maskedToken]
            );
        }

        // Client errors (HTTP 400 INVALID_ARGUMENT, 403 SENDER_ID_MISMATCH / PERMISSION_DENIED)
        Log::warning("FCM dispatch rejected by Firebase (HTTP {$status}, code: {$errorCode}): {$errorMessage}", [
            'token' => $maskedToken,
        ]);

        return FcmResult::failure(
            errorCode: $errorCode,
            errorMessage: 'Firebase rejected request: ' . $errorMessage,
            statusCode: $status,
            isRetryable: false,
            isUnregistered: false,
            details: ['token' => $maskedToken]
        );
    }

    /**
     * Deactivate an unregistered or obsolete device token from the database.
     */
    protected function deactivateInvalidToken(string $fcmToken, ?PatientDeviceToken $deviceToken = null): void
    {
        try {
            if ($deviceToken) {
                $deviceToken->update(['is_active' => false]);
            } else {
                PatientDeviceToken::where('fcm_token', $fcmToken)->update(['is_active' => false]);
            }
        } catch (Throwable $e) {
            Log::error('Failed to deactivate invalid device token: ' . $e->getMessage());
        }
    }

    /**
     * Mask an FCM token for secure logging and display without exposing credentials.
     */
    public function maskToken(?string $token): string
    {
        if (empty($token)) {
            return '***';
        }

        $len = strlen($token);
        if ($len <= 10) {
            return '***';
        }

        return substr($token, 0, 6) . '...' . substr($token, -4);
    }
}
