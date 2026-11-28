<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;
use App\Services\Clinical\EpisodeFollowupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EpisodeFollowupController extends Controller
{
    public function __construct(
        private readonly EpisodeFollowupService $followupService,
    ) {}

    /**
     * GET /api/cases/{id}/followup-logs
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $data = $this->followupService->listLogs((int) $request->user()->clinic_id, $id);

        return response()->json($data);
    }

    /**
     * POST /api/cases/{id}/followup-logs
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'contact_type' => 'required|in:call,sms,visit,other',
            'status' => 'required|string|max:50',
            'notes' => 'nullable|string|max:1000',
            'dose_label' => 'nullable|string|max:50',
            'days_overdue' => 'nullable|integer|min:0|max:3650',
            'recipient_number' => 'nullable|string|max:50',
        ]);

        $log = $this->followupService->logAttempt(
            (int) $request->user()->clinic_id,
            $id,
            $validated,
            $request->user(),
        );

        return response()->json([
            'message' => 'Contact attempt logged successfully.',
            'log' => $log,
        ], 201);
    }

    /**
     * POST /api/cases/{id}/send-reminder
     * POST /api/v1/clinical/episodes/{id}/send-reminder
     */
    public function sendReminder(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'dose_day' => 'nullable|integer|min:0|max:365',
            'dose_label' => 'nullable|string|max:50',
            'days_overdue' => 'nullable|integer|min:0|max:3650',
            'recipient_number' => 'nullable|string|max:50',
            'message' => 'nullable|string|max:1000',
        ]);

        $result = $this->followupService->sendReminder(
            (int) $request->user()->clinic_id,
            $id,
            $validated,
            $request->user(),
        );

        return response()->json($result, 200);
    }
}
