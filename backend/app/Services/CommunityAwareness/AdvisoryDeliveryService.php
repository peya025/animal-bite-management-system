<?php

namespace App\Services\CommunityAwareness;

use App\Jobs\DeliverCommunityAdvisory;
use App\Models\CommunityAdvisory;
use App\Models\CommunityAdvisoryDelivery;
use App\Models\PatientAccount;
use App\Models\PatientDeviceToken;
use App\Services\Messaging\FcmService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class AdvisoryDeliveryService
{
    public const PUSH_TITLE = 'Community Bite Awareness';
    public const PUSH_BODY = 'A clinic community update is available. Open the app to read it.';

    public function __construct(
        private readonly AdvisoryAudienceResolver $audienceResolver,
        private readonly FcmService $fcmService,
    ) {
    }

    /**
     * Write durable outbox rows in chunks and dispatch after-commit delivery jobs.
     * Fails closed unless BOTH publication_enabled and push_enabled are true.
     */
    public function enqueueForAdvisory(CommunityAdvisory $advisory, string $purpose = 'initial_publication'): int
    {
        if (!config('community_awareness.publication_enabled') || !config('community_awareness.push_enabled')) {
            return 0;
        }
        if ($advisory->state !== 'published' || $advisory->withdrawn_at !== null
            || $advisory->expires_on < now('Asia/Manila')->toDateString()
            || !hash_equals($advisory->approved_hash ?? '', $advisory->contentHash())) {
            return 0;
        }

        $queued = 0;
        $this->audienceResolver->eachEligibleAccountChunk($advisory->clinic_id, function (array $accountIds) use ($advisory, $purpose, &$queued) {
            $now = now();
            $rows = array_map(fn (int $accountId) => [
                'advisory_id' => $advisory->id,
                'advisory_version' => $advisory->version,
                'patient_account_id' => $accountId,
                'channel' => 'fcm',
                'delivery_purpose' => $purpose,
                'status' => 'queued',
                'attempts' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ], $accountIds);

            DB::table('community_advisory_deliveries')->insertOrIgnore($rows);

            $deliveries = CommunityAdvisoryDelivery::where('advisory_id', $advisory->id)
                ->where('advisory_version', $advisory->version)
                ->where('channel', 'fcm')
                ->where('delivery_purpose', $purpose)
                ->whereIn('patient_account_id', $accountIds)
                ->where('status', 'queued')
                ->pluck('id');

            foreach ($deliveries as $deliveryId) {
                DeliverCommunityAdvisory::dispatch((int) $deliveryId);
                $queued++;
            }
        });

        return $queued;
    }

    /**
     * Cancel all pending (queued/deferred) outbox rows for a withdrawn advisory.
     */
    public function cancelPendingForAdvisory(int $advisoryId, string $reason = 'advisory_withdrawn'): int
    {
        return CommunityAdvisoryDelivery::where('advisory_id', $advisoryId)
            ->whereIn('status', ['queued', 'deferred'])
            ->update([
                'status' => 'cancelled',
                'cancellation_reason' => $reason,
                'next_attempt_at' => null,
                'updated_at' => now(),
            ]);
    }

    /**
     * Process a single outbox row with full last-moment revalidation:
     * release flags, advisory state/hash/expiry, recipient eligibility/preferences,
     * daily/weekly caps, and Asia/Manila quiet hours.
     */
    public function processDelivery(int $deliveryId): string
    {
        $prepared = DB::transaction(function () use ($deliveryId) {
            $delivery = CommunityAdvisoryDelivery::lockForUpdate()->find($deliveryId);
            if (!$delivery || !in_array($delivery->status, ['queued', 'deferred'], true)) {
                return ['action' => 'skip'];
            }

            if (!config('community_awareness.publication_enabled') || !config('community_awareness.push_enabled')) {
                $this->markCancelled($delivery, 'feature_disabled');
                return ['action' => 'cancelled'];
            }

            $advisory = CommunityAdvisory::find($delivery->advisory_id);
            $todayManila = now('Asia/Manila')->toDateString();
            if (!$advisory || $advisory->state !== 'published' || $advisory->withdrawn_at !== null
                || $advisory->version !== $delivery->advisory_version
                || $advisory->expires_on < $todayManila
                || !hash_equals($advisory->approved_hash ?? '', $advisory->contentHash())) {
                $this->markCancelled($delivery, 'advisory_inactive_or_modified');
                return ['action' => 'cancelled'];
            }

            $account = PatientAccount::find($delivery->patient_account_id);
            if (!$account || !$this->audienceResolver->isAccountEligibleForClinic($account, $advisory->clinic_id)) {
                $this->markCancelled($delivery, 'recipient_ineligible');
                return ['action' => 'cancelled'];
            }

            // Daily & weekly routine community push caps (never apply to personal clinical reminders).
            $dailyCap = max(0, (int) config('community_awareness.push_daily_cap', 1));
            $weeklyCap = max(0, (int) config('community_awareness.push_weekly_cap', 2));
            $sentLast24h = CommunityAdvisoryDelivery::where('patient_account_id', $account->id)
                ->where('status', 'sent')
                ->where('sent_at', '>=', now()->subHours(24))
                ->count();
            $sentLast7d = CommunityAdvisoryDelivery::where('patient_account_id', $account->id)
                ->where('status', 'sent')
                ->where('sent_at', '>=', now()->subDays(7))
                ->count();
            if ($sentLast24h >= $dailyCap || $sentLast7d >= $weeklyCap) {
                $this->markCancelled($delivery, 'rate_cap_reached');
                return ['action' => 'cancelled'];
            }

            // Quiet hours check in Asia/Manila (default 20:00–08:00).
            $nextWindow = $this->nextAllowedWindowManila(CarbonImmutable::now('Asia/Manila'));
            if ($nextWindow !== null) {
                if ($nextWindow->toDateString() > $advisory->expires_on) {
                    $this->markCancelled($delivery, 'expired_during_quiet_hours');
                    return ['action' => 'cancelled'];
                }
                $delayTarget = $nextWindow->setTimezone(config('app.timezone', 'UTC'));
                $delivery->update([
                    'status' => 'deferred',
                    'next_attempt_at' => $delayTarget,
                ]);
                return ['action' => 'deferred', 'delay_until' => $delayTarget];
            }

            $tokens = PatientDeviceToken::where('patient_account_id', $account->id)
                ->where('is_active', true)
                ->get();
            if ($tokens->isEmpty()) {
                $this->markCancelled($delivery, 'no_active_device_tokens');
                return ['action' => 'cancelled'];
            }

            $delivery->increment('attempts');

            return [
                'action' => 'send',
                'delivery_id' => $delivery->id,
                'advisory_id' => $advisory->id,
                'advisory_version' => $advisory->version,
                'tokens' => $tokens,
            ];
        });

        if ($prepared['action'] === 'deferred') {
            DeliverCommunityAdvisory::dispatch($deliveryId)->delay($prepared['delay_until']);
            return 'deferred';
        }
        if ($prepared['action'] !== 'send') {
            return $prepared['action'];
        }

        // Generic lock-screen payload: never includes patient data, exact address, counts, or review reasons.
        $payload = [
            'category' => 'community_advisory',
            'route' => '/community-advisory',
            'advisory_id' => (string) $prepared['advisory_id'],
            'revision' => (string) $prepared['advisory_version'],
        ];

        $acceptedMessageId = null;
        $lastErrorCode = null;
        $hasRetryableFailure = false;

        foreach ($prepared['tokens'] as $token) {
            $result = $this->fcmService->sendToDevice(
                deviceToken: $token,
                title: self::PUSH_TITLE,
                body: self::PUSH_BODY,
                data: $payload,
            );
            if ($result->isSuccessful()) {
                $acceptedMessageId ??= $result->messageId;
            } else {
                $lastErrorCode = $result->errorCode ?? 'PROVIDER_ERROR';
                if ($result->isRetryable()) {
                    $hasRetryableFailure = true;
                }
            }
        }

        $delivery = CommunityAdvisoryDelivery::find($prepared['delivery_id']);
        if (!$delivery) {
            return 'skip';
        }

        if ($acceptedMessageId !== null) {
            $delivery->update([
                'status' => 'sent',
                'sent_at' => now(),
                'provider_message_id' => mb_substr($acceptedMessageId, 0, 191),
                'error_class' => null,
                'next_attempt_at' => null,
            ]);
            return 'sent';
        }

        $delivery->update([
            'status' => $hasRetryableFailure && $delivery->attempts < 3 ? 'queued' : 'failed',
            'error_class' => mb_substr((string) ($lastErrorCode ?? 'PROVIDER_ERROR'), 0, 120),
        ]);

        if ($hasRetryableFailure && $delivery->attempts < 3) {
            throw new \RuntimeException('Transient community advisory push failure: ' . ($lastErrorCode ?? 'UNKNOWN'));
        }

        return 'failed';
    }

    /**
     * Returns null if current Manila time is outside quiet hours;
     * otherwise returns the next allowed Manila timestamp (quiet_hours_end:00).
     */
    private function nextAllowedWindowManila(CarbonImmutable $nowManila): ?CarbonImmutable
    {
        $start = (int) config('community_awareness.quiet_hours_start', 20);
        $end = (int) config('community_awareness.quiet_hours_end', 8);
        $hour = $nowManila->hour;

        if ($start === $end) {
            return null;
        }

        $inQuietHours = $start > $end
            ? ($hour >= $start || $hour < $end)
            : ($hour >= $start && $hour < $end);

        if (!$inQuietHours) {
            return null;
        }

        if ($start > $end && $hour >= $start) {
            return $nowManila->addDay()->setTime($end, 0, 0);
        }

        return $nowManila->setTime($end, 0, 0);
    }

    private function markCancelled(CommunityAdvisoryDelivery $delivery, string $reason): void
    {
        $delivery->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
            'next_attempt_at' => null,
        ]);
    }
}
