<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;

use App\Models\BiteIncidentIntake;
use App\Services\Clinical\BiteIncidentIntakeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiteIncidentIntakeController extends Controller
{
    public function __construct(
        protected BiteIncidentIntakeService $intakeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = $this->intakeService->getPaginatedIntakes(
            $request->user()->clinic_id,
            $request->input('status'),
            20
        );

        return $this->json($paginated);
    }

    public function show(Request $request, BiteIncidentIntake $intake): JsonResponse
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        return $this->json($intake->load(['patient', 'appointment', 'reviewer', 'biteIncident']));
    }

    public function markReviewed(Request $request, BiteIncidentIntake $intake): JsonResponse
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        $updated = $this->intakeService->markReviewed($intake, $request->user());

        return $this->json($updated);
    }

    /**
     * Confirm that a patient with a mobile bite consultation has physically arrived.
     */
    public function checkIn(Request $request, BiteIncidentIntake $intake): JsonResponse
    {
        abort_unless($intake->clinic_id === $request->user()->clinic_id, 404);

        $result = $this->intakeService->checkIn($intake, $request->user());

        return $this->json($result['data'], $result['status']);
    }
}
