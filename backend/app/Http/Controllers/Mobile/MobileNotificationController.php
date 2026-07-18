<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MobileNotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->notifications()
                ->with('patient')
                ->latest()
                ->paginate(20),
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

        return response()->json($notification);
    }
}
