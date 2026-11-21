<?php

namespace App\Services\Mobile;

use App\Models\Notification;
use App\Models\PatientAccount;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class MobileNotificationService
{
    private const CACHE_TTL_SECONDS = 120; // 2 minutes

    /**
     * Get paginated notifications for the patient account with relationship resolved
     */
    public function getPaginatedNotifications(PatientAccount $account, int $page = 1, int $perPage = 20): LengthAwarePaginator
    {
        $accountId = $account->id;
        $cacheKey = "mobile:notifications:account:{$accountId}:page:{$page}";

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($account, $perPage) {
            $paginated = $account->notifications()
                ->with('patient')
                ->latest()
                ->paginate($perPage);

            $patients = $account->patients()->get()->keyBy('patient_id');

            $paginated->getCollection()->transform(function ($n) use ($patients) {
                $p = $patients->get($n->patient_id);
                $n->relationship = $p ? ($p->pivot->relationship ?? 'self') : 'self';

                return $n;
            });

            return $paginated;
        });
    }

    /**
     * Mark a single notification as read
     */
    public function markNotificationAsRead(PatientAccount $account, int $notificationId): Notification
    {
        /** @var Notification $notification */
        $notification = $account->notifications()
            ->whereKey($notificationId)
            ->firstOrFail();

        $notification->update([
            'status'  => 'read',
            'read_at' => now(),
        ]);

        $this->invalidateNotificationCache($account->id);

        return $notification->fresh();
    }

    /**
     * Mark all unread notifications as read
     */
    public function markAllNotificationsAsRead(PatientAccount $account): int
    {
        $updatedCount = $account->notifications()
            ->where('status', '!=', 'read')
            ->update([
                'status'  => 'read',
                'read_at' => now(),
            ]);

        $this->invalidateNotificationCache($account->id);

        return $updatedCount;
    }

    /**
     * Invalidate notification cache pages
     */
    public function invalidateNotificationCache(int $accountId): void
    {
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("mobile:notifications:account:{$accountId}:page:{$i}");
        }
    }
}
