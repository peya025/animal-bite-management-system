<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;

use App\Exceptions\DuplicatePatientException;
use App\Http\Requests\Clinical\CheckDuplicatePatientRequest;
use App\Http\Requests\Clinical\StorePatientRequest;
use App\Http\Requests\Clinical\UpdatePatientRequest;
use App\Services\Clinical\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function __construct(
        protected PatientService $patientService
    ) {}

    /**
     * Display a listing of patients with tab filtering and summary counts.
     */
    public function index(Request $request): JsonResponse
    {
        $result = $this->patientService->getPaginatedPatients(
            $request->user()->clinic_id,
            $request->all(),
            (int) $request->get('per_page', 15)
        );

        return $this->json($result);
    }

    /**
     * Check for potential duplicate or same-name (homonym) patient records.
     * GET /api/patients/check-duplicates
     */
    public function checkDuplicates(CheckDuplicatePatientRequest $request): JsonResponse
    {
        $result = $this->patientService->checkDuplicatePatients(
            $request->user()->clinic_id,
            $request->validated()
        );

        return $this->json($result);
    }

    /**
     * Register new patient
     * Access: admin, registration
     */
    public function store(StorePatientRequest $request): JsonResponse
    {
        try {
            $patient = $this->patientService->storePatient(
                $request->user()->clinic_id,
                $request->validated(),
                $request->user(),
                $request->all()
            );
        } catch (DuplicatePatientException $e) {
            return $this->json([
                'message'    => $e->getMessage(),
                'code'       => 'duplicate_patient_detected',
                'duplicates' => $e->getDuplicates(),
            ], 409);
        }

        return $this->json([
            'message' => 'Patient registered successfully',
            'patient' => $patient->load(['registeredBy', 'details', 'memberships']),
        ], 201);
    }

    /**
     * Get patient details with related data
     * Access: admin, registration, triage, treatment
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $patient = $this->patientService->getPatientDetails(
            $request->user()->clinic_id,
            (int) $id
        );

        return $this->json($patient);
    }

    /**
     * Update patient information
     * Access: admin, registration
     */
    public function update(UpdatePatientRequest $request, int|string $id): JsonResponse
    {
        $patient = $this->patientService->updatePatient(
            $request->user()->clinic_id,
            (int) $id,
            $request->validated(),
            $request->user(),
            $request->all()
        );

        return $this->json([
            'message' => 'Patient updated successfully',
            'patient' => $patient,
        ]);
    }

    /**
     * Delete patient (soft delete)
     * Access: admin only
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $this->patientService->deletePatient($request->user()->clinic_id, (int) $id);

        return $this->json([
            'message' => 'Patient deleted successfully',
        ]);
    }

    /**
     * Get patient's bite case history
     */
    public function biteCases(Request $request, int|string $id): JsonResponse
    {
        $cases = $this->patientService->getPatientBiteCases($request->user()->clinic_id, (int) $id);

        return $this->json($cases);
    }

    /**
     * Get patient's vaccination history
     */
    public function vaccinations(Request $request, int|string $id): JsonResponse
    {
        $vaccinations = $this->patientService->getPatientVaccinations($request->user()->clinic_id, (int) $id);

        return $this->json($vaccinations);
    }

    /**
     * Check in a returning patient who missed their initial triage schedule
     * and place them into today's Triage Doctor queue.
     * POST /api/patients/{id}/check-in
     * Access: admin, registration, developer
     */
    public function checkIn(Request $request, int|string $id): JsonResponse
    {
        $result = $this->patientService->checkInReturningPatient(
            $request->user()->clinic_id,
            (int) $id,
            $request->user()
        );

        return $this->json($result['data'], $result['status']);
    }
}
