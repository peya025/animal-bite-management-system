<?php

namespace App\Services\CommunityAwareness;

use App\Models\PatientAccount;
use App\Services\Messaging\FcmService;

class AdvisoryAudienceResolver
{
    public function __construct(private readonly FcmService $fcmService)
    {
    }

    /**
     * Resolve eligible clinic-linked opted-in patient accounts in bounded chunks
     * (replaces any fixed 50-account limit and deduplicates multi-patient accounts).
     *
     * @param callable(array<int, int>): void $onChunk Receives deduplicated patient_account_id lists
     */
    public function eachEligibleAccountChunk(int $clinicId, callable $onChunk): int
    {
        $chunkSize = max(1, (int) config('community_awareness.recipient_chunk_size', 100));
        $total = 0;

        PatientAccount::query()
            ->where('is_active', true)
            ->whereHas('patients', fn ($q) => $q->where('clinic_id', $clinicId))
            ->orderBy('id')
            ->chunkById($chunkSize, function ($accounts) use ($onChunk, &$total) {
                $ids = [];
                foreach ($accounts as $account) {
                    if (!$account->allowsNotificationCategory('community_advisory')) {
                        continue;
                    }
                    if (!$this->fcmService->isAccountAllowed((int) $account->id)) {
                        continue;
                    }
                    $ids[] = (int) $account->id;
                }
                if ($ids !== []) {
                    $total += count($ids);
                    $onChunk($ids);
                }
            });

        return $total;
    }

    public function isAccountEligibleForClinic(PatientAccount $account, int $clinicId): bool
    {
        if (!$account->is_active) {
            return false;
        }
        if (!$account->allowsNotificationCategory('community_advisory')) {
            return false;
        }
        if (!$this->fcmService->isAccountAllowed((int) $account->id)) {
            return false;
        }
        return $account->patients()->where('clinic_id', $clinicId)->exists();
    }
}
