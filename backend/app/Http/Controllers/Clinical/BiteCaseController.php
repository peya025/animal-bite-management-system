<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Concerns\EnforcesStationCapabilities;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clinical\RegisterExposureRequest;
use App\Http\Requests\Clinical\ReviewExternalProofRequest;
use App\Http\Requests\Clinical\StoreBiteCaseRequest;
use App\Http\Requests\Clinical\TransferOutBiteCaseRequest;
use App\Http\Requests\Clinical\UpdateBiteCaseRequest;
use App\Services\Clinic\StationCapabilityPolicy;
use App\Services\Clinical\BiteCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiteCaseController extends Controller
{
    use EnforcesStationCapabilities;

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
        $user = $request->user();
        $requiredStations = (!$user->isAdmin() && !$user->isTriage())
            ? [StationCapabilityPolicy::STATION_REGISTRATION, StationCapabilityPolicy::STATION_TRIAGE]
            : [StationCapabilityPolicy::STATION_TRIAGE];
        if ($denied = $this->guardStations($user->clinic_id, $requiredStations, 'register a new bite exposure')) {
            return $denied;
        }

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
        if ($denied = $this->guardStation($request->user()->clinic_id, StationCapabilityPolicy::STATION_TRIAGE, 'create a bite case')) {
            return $denied;
        }

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
     * Read-only, clinic-authorized details for one map incident.
     */
    public function mapDetails(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof \App\Models\User && $user->is_active && $user->clinic_id, 403);
        $incident = \App\Models\BiteIncident::where('clinic_id', $user->clinic_id)->findOrFail($id);
        $patient = $incident->patient()->where('clinic_id', $user->clinic_id)
            ->with(['details', 'memberships'])->firstOrFail();
        \Illuminate\Support\Facades\Gate::authorize('view', $patient);
        // No patient-wide fallback: every clinical query belongs to this exact episode.
        $scope = fn ($query) => $query->where('clinic_id', $user->clinic_id)
            ->where('patient_id', $patient->patient_id);
        $records = $incident->treatmentRecords()->where($scope)->live()
            ->with('administeredBy:id,name')->orderBy('treatment_id')->get();
        $assessments = $records->filter(fn ($r) => $r->dose_number === null && $r->medication_given === null);
        $nurseRecords = $records->reject(fn ($r) => $r->dose_number === null && $r->medication_given === null);
        $patient->setAppends(['name', 'age']);
        return response()->json([
            'incident' => $incident,
            'patient' => $patient,
            'assessments' => $assessments->values(),
            'nurse_records' => $nurseRecords->filter(fn ($r) => $r->treatment_date || $r->administered_at || in_array($r->status, ['completed', 'administered'], true))->values(),
            'plan' => $incident->treatmentPlan()->where($scope)->first(),
            'schedules' => $nurseRecords->whereNotNull('dose_number')->values(),
            'treatment_card' => \App\Models\TagoloanTreatmentCard::where('bite_id', $id)->where($scope)->first(),
            'intake' => $incident->intake()->where($scope)->first(),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function update(UpdateBiteCaseRequest $request, int|string $id): JsonResponse
    {
        if ($denied = $this->guardStation($request->user()->clinic_id, StationCapabilityPolicy::STATION_TRIAGE, 'update a bite case')) {
            return $denied;
        }

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
            'cutoff' => 'nullable|date',
            'severity' => 'nullable|in:ALL,all,I,II,III,Unassessed,unassessed,not_yet_assessed,assessed_category_missing',
            'status' => 'nullable|string|max:50',
            'animal' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:255',
            'aggregate_only' => 'nullable|boolean',
            'privacy_mode' => 'nullable|in:aggregate_only,internal_aggregate',
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
        if ($denied = $this->guardStation($request->user()->clinic_id, StationCapabilityPolicy::STATION_TRIAGE, 'transfer out a bite case')) {
            return $denied;
        }

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
