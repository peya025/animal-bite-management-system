<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\StoreMobilePatientRequest;
use App\Http\Requests\Mobile\UpdateMobilePatientRequest;
use App\Models\Patient;
use App\Services\Mobile\MobilePatientProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientProfileController extends Controller
{
    public function __construct(
        protected MobilePatientProfileService $profileService
    ) {}

    /**
     * Retrieve all patient profiles linked to the mobile account.
     */
    public function index(Request $request): JsonResponse
    {
        $patients = $this->profileService->listPatients($request->user());

        return response()->json($patients);
    }

    /**
     * Create a new patient profile and attach to the mobile account.
     */
    public function store(StoreMobilePatientRequest $request): JsonResponse
    {
        $patient = $this->profileService->createPatient(
            $request->user(),
            $request->validated(),
            $request->all()
        );

        return response()->json($patient, 201);
    }

    /**
     * Update an existing patient profile linked to the mobile account.
     */
    public function update(UpdateMobilePatientRequest $request, Patient $patient): JsonResponse
    {
        $updated = $this->profileService->updatePatient(
            $request->user(),
            $patient,
            $request->validated(),
            $request->all()
        );

        return response()->json($updated);
    }
}
