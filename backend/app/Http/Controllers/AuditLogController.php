<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Get audit logs (staff activity only)
     */
    public function index(Request $request)
    {
        $query = AuditLog::with('user')
            ->where('clinic_id', $request->user()->clinic_id)
            ->whereNotNull('user_id') // Only logged-in staff actions
            ->orderBy('created_at', 'desc');

        // Filters
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by IP address
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('ip_address', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $logs = $query->paginate($request->get('per_page', 50));

        return response()->json($logs);
    }

    /**
     * Get activity summary (Optimized single-query aggregation)
     */
    public function summary(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        $today = today()->toDateString();
        $startOfWeek = now()->startOfWeek()->toDateTimeString();
        $endOfWeek = now()->endOfWeek()->toDateTimeString();

        // 1. Single SQL query to compute all counter metrics in parallel
        $metrics = AuditLog::where('clinic_id', $clinicId)
            ->whereNotNull('user_id')
            ->selectRaw("
                COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_actions,
                COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END) as week_actions,
                COUNT(CASE WHEN DATE(created_at) = ? AND action = 'login' THEN 1 END) as today_logins,
                COUNT(CASE WHEN DATE(created_at) = ? AND (TIME(created_at) < '08:00:00' OR TIME(created_at) > '17:00:00') THEN 1 END) as suspicious_after_hours
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

        return response()->json([
            'today_actions' => (int) ($metrics->today_actions ?? 0),
            'week_actions' => (int) ($metrics->week_actions ?? 0),
            'today_logins' => (int) ($metrics->today_logins ?? 0),
            'most_active_user' => $mostActive,
            'suspicious_after_hours' => (int) ($metrics->suspicious_after_hours ?? 0),
        ]);
    }

    /**
     * Get user's activity history
     */
    public function userActivity(Request $request, int $userId)
    {
        $logs = AuditLog::with('user')
            ->where('clinic_id', $request->user()->clinic_id)
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }
}
