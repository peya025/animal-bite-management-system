<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get notifications for authenticated web user.
     * GET /api/notifications
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $notifications = $this->notificationService->getNotificationsForUser($user, (int) $request->input('limit', 50));
        $unreadCount = $this->notificationService->getUnreadCountForUser($user);

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    /**
     * Get unread notifications badge count.
     * GET /api/notifications/unread-count
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['unread_count' => 0]);
        }

        return response()->json([
            'unread_count' => $this->notificationService->getUnreadCountForUser($user),
        ]);
    }

    /**
     * Mark a single notification as read.
     * POST /api/notifications/{id}/read
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $notification = Notification::where('clinic_id', $user->clinic_id)
            ->findOrFail($id);

        $this->notificationService->markAsRead($notification, $user);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }

    /**
     * Mark all notifications as read for current user.
     * POST /api/notifications/read-all
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $this->notificationService->markAllAsReadForUser($user);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }
}
