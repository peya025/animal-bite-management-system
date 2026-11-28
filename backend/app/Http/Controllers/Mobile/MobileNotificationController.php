<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileNotificationController extends Controller
{
    public function __construct(
        protected MobileNotificationService $notificationService
    ) {}

    /**
     * Get paginated notifications for the authenticated patient account
     */
    public function index(Request $request): JsonResponse
    {
        $page = (int) $request->input('page', 1);
        $paginated = $this->notificationService->getPaginatedNotifications(
            $request->user(),
            $page
        );

        return response()->json($paginated);
    }

    /**
     * Mark a specific notification as read
     */
    public function markAsRead(Request $request, int $notification): JsonResponse
    {
        $updated = $this->notificationService->markNotificationAsRead(
            $request->user(),
            $notification
        );

        return response()->json($updated);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->notificationService->markAllNotificationsAsRead($request->user());

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }
}
