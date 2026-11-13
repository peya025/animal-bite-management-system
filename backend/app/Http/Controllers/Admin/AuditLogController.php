<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

use App\Http\Requests\Audit\AuditLogFilterRequest;
use App\Services\Audit\AuditLogQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct(
        protected AuditLogQueryService $auditLogQueryService
    ) {}

    /**
     * Get audit logs (staff activity only)
     */
    public function index(AuditLogFilterRequest $request): JsonResponse
    {
        $logs = $this->auditLogQueryService->getFilteredLogs(
            $request->user()->clinic_id,
            $request->validated(),
            (int) $request->input('per_page', 50)
        );

        return response()->json($logs);
    }

    /**
     * Get activity summary (Optimized single-query aggregation)
     */
    public function summary(Request $request): JsonResponse
    {
        $summary = $this->auditLogQueryService->getActivitySummary(
            $request->user()->clinic_id
        );

        return response()->json($summary);
    }

    /**
     * Get user's activity history
     */
    public function userActivity(Request $request, int $userId): JsonResponse
    {
        $logs = $this->auditLogQueryService->getUserActivity(
            $request->user()->clinic_id,
            $userId,
            50
        );

        return response()->json($logs);
    }
}
