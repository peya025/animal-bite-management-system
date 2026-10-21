<?php

namespace App\Http\Controllers;

use App\Http\Requests\Clinical\RegisterExposureRequest;
use App\Http\Requests\Clinical\ReviewExternalProofRequest;
use App\Http\Requests\Clinical\StoreBiteCaseRequest;
use App\Http\Requests\Clinical\TransferOutBiteCaseRequest;
use App\Http\Requests\Clinical\UpdateBiteCaseRequest;
use App\Services\Clinical\BiteCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiteCaseController extends Controller
{
    public function __construct(
        protected BiteCaseService $biteCaseService
    ) {}

    /**
     * Register a new bite exposure episode for an existing patient.
     * POST /api/cases/register-exposure
     * Access: admin, registration
     */
    public function registerNewExposure(RegisterExposureRequest $request): JsonResponse
    {
        $result = $this->biteCaseService->registerNewExposure(
            $request->user()->clinic_id,
            $request->validated(),
            $request->user(),
            $request->all()
        );

        return $this->json($result['data'], $result['status']);
    }

    /**
     * Display a listing of bite cases with filtering.
     * Access: admin, triage, treatment
     */
    public function index(Request $request): JsonResponse
    {
        $paginated = $this->biteCaseService->getPaginatedBiteCases(
            $request->user()->clinic_id,
            $request->all(),
            (int) $request->get('per_page', 15)
        );

        return $this->json($paginated);
    }

    /**
     * Store a newly created bite case.
     * Access: admin, triage
     */
    public function store(StoreBiteCaseRequest $request): JsonResponse
    {
        $incident = $this->biteCaseService->storeBiteCase(
            $request->user()->clinic_id,
            $request->validated(),
            $request->user(),
            $request->all()
        );

        return $this->json([
            'message' => 'Bite case registered successfully',
            'incident' => $incident,
        ], 201);
    }

    /**
     * Display the specified bite case.
     * Access: admin, triage, treatment
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $incident = $this->biteCaseService->getBiteCase($request->user()->clinic_id, (int) $id);

        return $this->json($incident);
    }

    /**
     * Update the specified bite case.
     * Access: admin, triage
     */
    public function update(UpdateBiteCaseRequest $request, int|string $id): JsonResponse
    {
        $incident = $this->biteCaseService->updateBiteCase(
            $request->user()->clinic_id,
            (int) $id,
            $request->validated()
        );

        return $this->json([
            'message' => 'Bite case updated successfully',
            'incident' => $incident,
        ]);
    }

    /**
     * Delete bite case (soft delete)
     * Access: admin only
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $this->biteCaseService->deleteBiteCase($request->user()->clinic_id, (int) $id);

        return $this->json([
            'message' => 'Bite case deleted successfully',
        ]);
    }

    /**
     * Get vaccination schedule for a bite case
     * Access: admin, triage, treatment
     */
    public function vaccinations(Request $request, int|string $id): JsonResponse
    {
        $vaccinations = $this->biteCaseService->getBiteVaccinations($request->user()->clinic_id, (int) $id);

        return $this->json($vaccinations);
    }

    /**
     * Get statistics for bite cases
     * Access: admin, triage
     */
    public function statistics(Request $request): JsonResponse
    {
        $stats = $this->biteCaseService->getStatistics($request->user()->clinic_id);

        return $this->json($stats);
    }

    /**
     * Descriptive bite surveillance grouped by place of exposure.
     */
    public function locationRiskSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'severity' => 'nullable|in:I,II,III',
            'status' => 'nullable|string|max:50',
            'animal' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:255',
        ]);

        $summary = $this->biteCaseService->getLocationRiskSummary($request->user()->clinic_id, $validated);

        return $this->json($summary);
    }

    /**
     * Get bite cases with location data for map visualization
     * Access: admin
     */
    public function getMapData(Request $request): JsonResponse
    {
        $mapData = $this->biteCaseService->getMapData($request->user()->clinic_id, $request->all());

        return $this->json($mapData);
    }

    /**
     * Get all bite episodes for a patient with immunization history summary
     * GET /api/cases/patient/{patientId}/episodes
     */
    public function patientEpisodes(Request $request, int|string $patientId): JsonResponse
    {
        $episodes = $this->biteCaseService->getPatientEpisodes($request->user()->clinic_id, (int) $patientId);

        return $this->json($episodes);
    }

    /**
     * Transfer patient case out to external facility
     * POST /api/cases/{id}/transfer-out
     */
    public function transferOut(TransferOutBiteCaseRequest $request, int|string $id): JsonResponse
    {
        $incident = $this->biteCaseService->transferOut(
            $request->user()->clinic_id,
            (int) $id,
            $request->validated()
        );

        return $this->json([
            'message' => 'Patient case transferred out successfully',
            'incident' => $incident,
        ]);
    }

    /**
     * Review and verify external vaccination proof / certificate
     * POST /api/cases/{id}/review-proof
     */
    public function reviewExternalProof(ReviewExternalProofRequest $request, int|string $id): JsonResponse
    {
        $incident = $this->biteCaseService->reviewExternalProof(
            $request->user()->clinic_id,
            (int) $id,
            $request->validated(),
            $request->user()
        );

        return $this->json([
            'message' => 'External proof review recorded',
            'incident' => $incident,
        ]);
    }

    /**
     * Get distinct saved Purok/Zone options for a given Barangay and Municipality.
     * GET /api/cases/puroks or /api/locations/puroks
     */
    public function getPuroks(Request $request): JsonResponse
    {
        $puroks = $this->biteCaseService->getPuroks(
            trim((string) $request->query('barangay', '')),
            trim((string) $request->query('municipality', ''))
        );

        return $this->json(['puroks' => $puroks]);
    }
}
