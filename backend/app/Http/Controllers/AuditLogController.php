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
     * Get activity summary
     */
    public function summary(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        // Today's activity count
        $todayCount = AuditLog::where('clinic_id', $clinicId)
            ->whereDate('created_at', today())
            ->whereNotNull('user_id')
            ->count();

        // This week's activity count
        $weekCount = AuditLog::where('clinic_id', $clinicId)
            ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->whereNotNull('user_id')
            ->count();

        // Login count today
        $loginCount = AuditLog::where('clinic_id', $clinicId)
            ->where('action', 'login')
            ->whereDate('created_at', today())
            ->count();

        // Most active user today
        $mostActive = AuditLog::where('clinic_id', $clinicId)
            ->whereDate('created_at', today())
            ->whereNotNull('user_id')
            ->selectRaw('user_id, count(*) as action_count')
            ->groupBy('user_id')
            ->orderBy('action_count', 'desc')
            ->with('user')
            ->first();

        // Suspicious activity (after hours)
        $suspiciousCount = AuditLog::where('clinic_id', $clinicId)
            ->whereDate('created_at', today())
            ->whereNotNull('user_id')
            ->where(function($query) {
                $query->whereTime('created_at', '<', '08:00:00')
                      ->orWhereTime('created_at', '>', '17:00:00');
            })
            ->count();

        return response()->json([
            'today_actions' => $todayCount,
            'week_actions' => $weekCount,
            'today_logins' => $loginCount,
            'most_active_user' => $mostActive,
            'suspicious_after_hours' => $suspiciousCount,
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
