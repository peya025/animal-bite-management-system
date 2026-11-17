<?php

namespace App\Jobs;

use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use App\Services\Messaging\Firebase\FcmResult;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendFcmPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 30;
    public array $backoff = [30, 120, 300];

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
        public ?int $deviceTokenId = null
    ) {
        $this->onConnection(config('messaging.queue_connection', 'database'));
        $this->onQueue(config('messaging.queue', 'notifications'));
        $this->afterCommit();
    }

    public function handle(FcmService $fcmService): void
    {
        $account = PatientAccount::find($this->patientAccountId);

        if (!$account || !$account->is_active) {
            Log::info("SendFcmPushNotification aborted: Patient account {$this->patientAccountId} is inactive or no longer exists.");
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

            $result = $fcmService->sendToDevice(
                deviceToken: $deviceToken,
                title: $this->title,
                body: $this->body,
                data: $this->data
            );

            if ($result->isSuccessful() || !$result->isRetryable()) {
                $this->deliveredDeviceTokenIds[] = $deviceToken->id;
            }

            $this->evaluateResult($result);
            return;
        }

        // Target all active devices registered under account
        $hasRetryableFailure = false;
        $maxRetryAfter = null;

        if (empty($this->deliveredDeviceTokenIds)) {
            $results = $fcmService->sendToAccount(
                account: $account,
                title: $this->title,
                body: $this->body,
                data: $this->data
            );

            foreach ($results as $tokenId => $result) {
                if ($result->isSuccessful() || !$result->isRetryable()) {
                    if (is_int($tokenId) && $tokenId > 0) {
                        $this->deliveredDeviceTokenIds[] = $tokenId;
                    }
                }

                if ($result->isRetryable()) {
                    $hasRetryableFailure = true;
                    if ($result->getRetryAfter() !== null) {
                        $maxRetryAfter = max($maxRetryAfter ?? 0, $result->getRetryAfter());
                    }
                }
            }
        } else {
            // Subsequent retry attempt: dispatch only to devices that were not yet accepted
            $remainingTokens = $account->deviceTokens()
                ->active()
                ->whereNotIn('id', $this->deliveredDeviceTokenIds)
                ->get();

            foreach ($remainingTokens as $deviceToken) {
                if ($deviceToken->patient_account_id !== $account->id) {
                    continue;
                }

                $result = $fcmService->sendToDevice(
                    deviceToken: $deviceToken,
                    title: $this->title,
                    body: $this->body,
                    data: $this->data
                );

                if ($result->isSuccessful() || !$result->isRetryable()) {
                    $this->deliveredDeviceTokenIds[] = $deviceToken->id;
                }

                if ($result->isRetryable()) {
                    $hasRetryableFailure = true;
                    if ($result->getRetryAfter() !== null) {
                        $maxRetryAfter = max($maxRetryAfter ?? 0, $result->getRetryAfter());
                    }
                }
            }
        }

        if ($hasRetryableFailure && $this->attempts() < $this->tries) {
            $delay = $maxRetryAfter ?? ($this->backoff[$this->attempts() - 1] ?? 60);
            Log::warning("SendFcmPushNotification encountered retryable failure for account {$account->id}. Re-queueing with {$delay}s delay (attempt {$this->attempts()}/{$this->tries}) for pending devices.");
            $this->release($delay);
        }
    }

    protected function evaluateResult(FcmResult $result): void
    {
        if ($result->isRetryable() && $this->attempts() < $this->tries) {
            $delay = $result->getRetryAfter() ?? ($this->backoff[$this->attempts() - 1] ?? 60);
            Log::warning("SendFcmPushNotification single device encountered retryable failure. Re-queueing with {$delay}s delay (attempt {$this->attempts()}/{$this->tries}).");
            $this->release($delay);
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error("SendFcmPushNotification permanently failed for account {$this->patientAccountId}: " . ($exception?->getMessage() ?? 'Max retries exhausted.'));
    }
}
