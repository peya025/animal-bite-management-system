<?php

namespace App\Http\Controllers\Clinical;

use App\Http\Controllers\Controller;

use App\Http\Requests\Clinical\SaveAddendumRequest;
use App\Http\Requests\Clinical\StoreTreatmentRecordRequest;
use App\Services\Clinical\TreatmentRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreatmentRecordController extends Controller
{
    public function __construct(
        protected TreatmentRecordService $treatmentService
    ) {}

    /**
     * Get treatment record for a patient (for editing)
     */
    public function getByPatient(Request $request, int $patientId): JsonResponse
    {
        $data = $this->treatmentService->getPatientTreatmentDetails(
            $request->user()->clinic_id,
            $patientId,
            $request->get('bite_id') ? (int) $request->get('bite_id') : null
        );

        return $this->json($data);
    }

    /**
     * Store Form 2 data (General Consultation / Individual Treatment Record)
     */
    public function store(StoreTreatmentRecordRequest $request): JsonResponse
    {
        $result = $this->treatmentService->storeConsultation(
            $request->user()->clinic_id,
            $request->validated(),
            $request->user(),
            $request->get('bite_id') ? (int) $request->get('bite_id') : null
        );

        return $this->json($result['data'], $result['status']);
    }

    /**
     * Get all treatment records
     */
    public function index(Request $request): JsonResponse
    {
        $records = $this->treatmentService->getPaginatedRecords(
            $request->user()->clinic_id,
            $request->get('search'),
            (int) $request->get('per_page', 15)
        );

        return $this->json($records);
    }

    /**
     * Show single treatment record
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $record = $this->treatmentService->getRecord($request->user()->clinic_id, $id);

        return $this->json($record);
    }

    /**
     * Save an addendum note for a patient's clinical assessment
     * POST /api/treatment-records/patient/{patientId}/addendum
     */
    public function saveAddendum(SaveAddendumRequest $request, int $patientId): JsonResponse
    {
        $result = $this->treatmentService->saveAddendum(
            $request->user()->clinic_id,
            $patientId,
            $request->validated(),
            $request->user()
        );

        return $this->json($result);
    }
}
