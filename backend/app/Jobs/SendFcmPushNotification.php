<?php

namespace App\Jobs;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\FcmNotificationPolicy;
use App\Services\Messaging\Firebase\FcmResult;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class SendFcmPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public ?string $stateSnapshot = null;
    public ?int $expiresAt = null;

    public int $tries = 3;
    public int $timeout = 30;
    public array $backoff = [30, 120, 300];

    /**
     * Unique idempotency identifier persisted across job retries and restarts.
     */
    public ?string $idempotencyKey = null;

    /**
     * Tracks device token IDs whose delivery has already succeeded or completed,
     * ensuring that queued retries target ONLY unsuccessful devices.
     */
    public array $deliveredDeviceTokenIds = [];

    public function __construct(
        public int $patientAccountId,
        public string $title,
        public string $body,
        public array $data = [],
        public ?int $deviceTokenId = null,
        ?string $idempotencyKey = null,
        public bool $validateOnly = false,
        public bool $isControlledTest = false
    ) {
        $this->data = FcmNotificationPolicy::payload($data);
        if (!$isControlledTest) {
            [$this->title, $this->body] = FcmNotificationPolicy::text($this->data['category'], $body, $title);
        }
        $this->stateSnapshot = FcmNotificationPolicy::snapshot($patientAccountId, $this->data);
        $this->expiresAt = ($data['category'] ?? '') === 'appointment_reminder'
            ? now()->endOfDay()->timestamp : now()->addDay()->timestamp;
        $this->idempotencyKey = $idempotencyKey ?? (string) Str::uuid();
        $this->onConnection(config('services.firebase.queue_connection', config('messaging.queue_connection', 'database')));
        $this->onQueue(config('services.firebase.queue', 'fcm'));
        $this->afterCommit();
    }

    /**
     * Generate or return the persistent cache key for tracking delivered devices across retries.
     */
    public function getDeliveredCacheKey(): string
    {
        if (empty($this->idempotencyKey)) {
            $contentHash = md5("{$this->patientAccountId}:{$this->title}:{$this->body}:" . json_encode($this->data));
            $this->idempotencyKey = "hash_{$contentHash}";
        }

        return "fcm:job:delivered:{$this->patientAccountId}:{$this->idempotencyKey}";
    }

    /**
     * Load previously delivered device IDs from persistent cache storage.
     */
    protected function loadDeliveredDevicesFromStorage(): void
    {
        $cached = Cache::get($this->getDeliveredCacheKey(), []);
        $this->deliveredDeviceTokenIds = array_values(array_unique(array_merge(
            $this->deliveredDeviceTokenIds, is_array($cached) ? $cached : []
        )));
    }

    protected function recordDeviceDelivered(int $tokenId): void
    {
        $this->deliveredDeviceTokenIds = array_values(array_unique([...$this->deliveredDeviceTokenIds, $tokenId]));
        if (!Cache::put($this->getDeliveredCacheKey(), $this->deliveredDeviceTokenIds, now()->addDays(2))) {
            throw new \RuntimeException('FCM delivery checkpoint could not be persisted.');
        }
    }

    public function handle(FcmService $fcmService): void
    {
        // Legacy jobs have no snapshot/expiry and must be reviewed, never silently replayed.
        if (!$this->expiresAt || now()->timestamp >= $this->expiresAt || !$this->stateSnapshot
            || $this->stateSnapshot !== FcmNotificationPolicy::snapshot($this->patientAccountId, $this->data)) {
            Log::info('FCM job skipped: expired, legacy, or recipient/resource state changed.');
            return;
        }
        $lock = Cache::lock($this->getDeliveredCacheKey().':lock', 90);
        if (!$lock->get()) {
            $this->release(5);
            return;
        }
        try {
            $this->deliver($fcmService);
        } finally {
            $lock->release();
        }
    }

    protected function deliver(FcmService $fcmService): void
    {
        // 1. Recover persistent delivery state to survive worker crashes, reboots, and queue deserialization
        $this->loadDeliveredDevicesFromStorage();

        $account = PatientAccount::find($this->patientAccountId);

        if (!$account || !$account->is_active) {
            Log::info("SendFcmPushNotification aborted: Patient account {$this->patientAccountId} is inactive or no longer exists.");
            return;
        }

        // Test allowlist enforcement for automatic push notifications
        if (!app(FcmService::class)->isAccountAllowed($account)) {
            Log::info("SendFcmPushNotification skipped: Patient account {$account->id} is not in the automatic FCM allowlist.");
            return;
        }

        // Backend notification preference enforcement
        $category = $this->data['category'] ?? 'general';
        if (method_exists($account, 'allowsNotificationCategory') && !$account->allowsNotificationCategory($category)) {
            Log::info("SendFcmPushNotification aborted: Category '{$category}' is disabled by user preferences for account {$account->id}.");
            return;
        }

        // Target single specific device if requested
        if ($this->deviceTokenId !== null) {
            if (in_array($this->deviceTokenId, $this->deliveredDeviceTokenIds, true)) {
                Log::info("SendFcmPushNotification skipped: Device token {$this->deviceTokenId} was already accepted in a previous attempt.");
                return;
            }

            $deviceToken = PatientDeviceToken::find($this->deviceTokenId);

            if (!$deviceToken || !$deviceToken->is_active || $deviceToken->patient_account_id !== $account->id) {
                Log::info("SendFcmPushNotification aborted: Device token {$this->deviceTokenId} is invalid, inactive, or reassigned.");
                return;
            }

            if (now()->timestamp >= $this->expiresAt
                || $this->stateSnapshot !== FcmNotificationPolicy::snapshot($this->patientAccountId, $this->data)) {
                return;
            }

            $result = $fcmService->sendToDevice(
                deviceToken: $deviceToken,
                title: $this->title,
                body: $this->body,
                data: $this->data,
                validateOnly: $this->validateOnly,
                isControlledTest: $this->isControlledTest
            );

            if ($result->isSuccessful() || !$result->isRetryable()) {
                $this->recordDeviceDelivered($deviceToken->id);
            }

            $this->evaluateResult($result);
            return;
        }

        // Target all active devices registered under account
        $hasRetryableFailure = false;
        $maxRetryAfter = null;

        // Persist each result before contacting the next device, including the first attempt.
        $remainingTokens = $account->deviceTokens()
            ->active()
            ->whereNotIn('id', $this->deliveredDeviceTokenIds)
            ->get();

        foreach ($remainingTokens as $deviceToken) {
            if (now()->timestamp >= $this->expiresAt
                || $this->stateSnapshot !== FcmNotificationPolicy::snapshot($this->patientAccountId, $this->data)) {
                return;
            }
            $deviceToken = $deviceToken->fresh();
            if (!$deviceToken || !$deviceToken->is_active || $deviceToken->patient_account_id !== $account->id) {
                continue;
            }

            $result = $fcmService->sendToDevice(
                deviceToken: $deviceToken,
                title: $this->title,
                body: $this->body,
                data: $this->data,
                validateOnly: $this->validateOnly,
                isControlledTest: $this->isControlledTest
            );

            if ($result->isSuccessful() || !$result->isRetryable()) {
                $this->recordDeviceDelivered($deviceToken->id);
            }

            if ($result->isRetryable()) {
                $hasRetryableFailure = true;
                if ($result->getRetryAfter() !== null) {
                    $maxRetryAfter = max($maxRetryAfter ?? 0, $result->getRetryAfter());
                }
            }
        }

        if ($hasRetryableFailure) {
            if ($this->attempts() < $this->tries) {
                $delay = $maxRetryAfter ?? ($this->backoff[$this->attempts() - 1] ?? 60);
                Log::warning("SendFcmPushNotification encountered retryable failure for account {$account->id}. Re-queueing with {$delay}s delay (attempt {$this->attempts()}/{$this->tries}) for pending devices.");
                $this->release($delay);
            } else {
                $this->fail(new \RuntimeException("SendFcmPushNotification exhausted max retries ({$this->tries}) for account {$account->id} with pending retryable device failures."));
            }
        }
    }

    protected function evaluateResult(FcmResult $result): void
    {
        if ($result->isRetryable()) {
            if ($this->attempts() < $this->tries) {
                $delay = $result->getRetryAfter() ?? ($this->backoff[$this->attempts() - 1] ?? 60);
                Log::warning("SendFcmPushNotification single device encountered retryable failure. Re-queueing with {$delay}s delay (attempt {$this->attempts()}/{$this->tries}).");
                $this->release($delay);
            } else {
                $this->fail(new \RuntimeException("SendFcmPushNotification exhausted max retries ({$this->tries}) for device token {$this->deviceTokenId}: " . $result->getErrorMessage()));
            }
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error("SendFcmPushNotification permanently failed for account {$this->patientAccountId}: " . ($exception?->getMessage() ?? 'Max retries exhausted.'));
    }
}
