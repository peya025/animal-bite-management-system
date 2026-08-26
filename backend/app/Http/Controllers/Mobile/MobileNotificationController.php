<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MobileNotificationController extends Controller
{
    public function index(Request $request)
    {
        $accountId = $request->user()->id;
        $page = $request->input('page', 1);
        $cacheKey = "mobile:notifications:account:{$accountId}:page:{$page}";

        // Cache for 2 minutes (notifications update frequently)
        return response()->json(
            Cache::remember($cacheKey, 120, function () use ($request) {
                $paginated = $request->user()->notifications()
                    ->with('patient')
                    ->latest()
                    ->paginate(20);

                $patients = $request->user()->patients()->get()->keyBy('patient_id');

                $paginated->getCollection()->transform(function ($n) use ($patients) {
                    $p = $patients->get($n->patient_id);
                    $n->relationship = $p ? ($p->pivot->relationship ?? 'self') : 'self';
                    return $n;
                });

                return $paginated;
            })
        );
    }

    public function markAsRead(Request $request, int $notification)
    {
        $notification = $request->user()->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        $notification->update([
            'status' => 'read',
            'read_at' => now(),
        ]);

        // Invalidate cache for all notification pages
        $accountId = $request->user()->id;
        Cache::forget("mobile:notifications:account:{$accountId}:page:1");
        // Clear up to 10 pages of cache
        for ($i = 2; $i <= 10; $i++) {
            Cache::forget("mobile:notifications:account:{$accountId}:page:{$i}");
        }

        return response()->json($notification);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->notifications()
            ->where('status', '!=', 'read')
            ->update([
                'status' => 'read',
                'read_at' => now(),
            ]);

        // Invalidate cache for all notification pages
        $accountId = $request->user()->id;
        Cache::forget("mobile:notifications:account:{$accountId}:page:1");
        // Clear up to 10 pages of cache
        for ($i = 2; $i <= 10; $i++) {
            Cache::forget("mobile:notifications:account:{$accountId}:page:{$i}");
        }

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
