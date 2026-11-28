<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\GetMobileHistoryRequest;
use App\Services\Mobile\MobileHistoryService;
use Illuminate\Http\JsonResponse;

class MobileHistoryController extends Controller
{
    public function __construct(
        private readonly MobileHistoryService $historyService
    ) {}

    /**
     * Get consolidated real-time history (appointments + vaccinations) for the mobile app
     */
    public function index(GetMobileHistoryRequest $request): JsonResponse
    {
        $patientId = $request->filled('patient_id') ? (int) $request->input('patient_id') : null;
        $history = $this->historyService->getHistory($request->user(), $patientId);

        return response()->json($history);
    }
}
