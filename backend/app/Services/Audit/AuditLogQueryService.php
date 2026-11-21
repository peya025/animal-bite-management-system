<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Services\ClinicScheduleService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AuditLogQueryService
{
    public function __construct(
        protected ClinicScheduleService $scheduleService
    ) {}

    /**
     * Retrieve filtered paginated audit logs for staff activity.
     */
    public function getFilteredLogs(int $clinicId, array $filters = [], int $perPage = 50): LengthAwarePaginator
    {
        $query = AuditLog::with('user')
            ->where('clinic_id', $clinicId)
            ->whereNotNull('user_id') // Only logged-in staff actions
            ->orderBy('created_at', 'desc');

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (isset($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Compute activity summary metrics for the clinic.
     */
    public function getActivitySummary(int $clinicId): array
    {
        $today = today()->toDateString();
        $startOfWeek = now()->startOfWeek()->toDateTimeString();
        $endOfWeek = now()->endOfWeek()->toDateTimeString();

        $hours = $this->scheduleService->getOperatingHoursForDate($clinicId, today());
        $openTime = $hours['open_time'] ?? '08:00:00';
        $closeTime = $hours['close_time'] ?? '17:00:00';
        $isOpenToday = $hours['is_open'] ?? true;

        // 1. Single SQL query to compute metrics in parallel
        $metrics = AuditLog::where('clinic_id', $clinicId)
            ->whereNotNull('user_id')
            ->selectRaw("
                COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_actions,
                COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END) as week_actions,
                COUNT(CASE WHEN DATE(created_at) = ? AND action = 'login' THEN 1 END) as today_logins,
                COUNT(CASE WHEN DATE(created_at) = ? AND (" . ($isOpenToday ? "(TIME(created_at) < '{$openTime}' OR TIME(created_at) > '{$closeTime}')" : "1=1") . ") THEN 1 END) as suspicious_after_hours
            ", [$today, $startOfWeek, $endOfWeek, $today, $today])
            ->first();

        // 2. Fetch top active user for today
        $mostActive = AuditLog::where('clinic_id', $clinicId)
            ->whereDate('created_at', $today)
            ->whereNotNull('user_id')
            ->selectRaw('user_id, count(*) as action_count')
            ->groupBy('user_id')
            ->orderBy('action_count', 'desc')
            ->with('user:id,name,email,role')
            ->first();

        return [
            'today_actions'          => (int) ($metrics->today_actions ?? 0),
            'week_actions'           => (int) ($metrics->week_actions ?? 0),
            'today_logins'           => (int) ($metrics->today_logins ?? 0),
            'most_active_user'       => $mostActive,
            'suspicious_after_hours' => (int) ($metrics->suspicious_after_hours ?? 0),
            'operating_hours'        => [
                'is_open'    => $isOpenToday,
                'open_time'  => $openTime,
                'close_time' => $closeTime,
            ],
        ];
    }

    /**
     * Retrieve paginated activity logs for a specific user.
     */
    public function getUserActivity(int $clinicId, int $userId, int $perPage = 50): LengthAwarePaginator
    {
        return AuditLog::with('user')
            ->where('clinic_id', $clinicId)
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
}
