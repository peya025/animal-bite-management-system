<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

use App\Http\Requests\Clinic\InitializeClinicSetupRequest;
use App\Http\Requests\Clinic\UpdateClinicProfileRequest;
use App\Services\Clinic\ClinicSetupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicSetupController extends Controller
{
    public function __construct(
        protected ClinicSetupService $setupService
    ) {}

    /**
     * Initialize clinic with admin account
     * PUBLIC endpoint - no authentication required
     * Only works if NO clinics exist in database
     */
    public function initialize(InitializeClinicSetupRequest $request): JsonResponse
    {
        $result = $this->setupService->initialize(
            $request->validated(),
            $request->bearerToken()
        );

        return response()->json($result['payload'], $result['status']);
    }

    /**
     * Check setup status
     */
    public function checkSetup(Request $request): JsonResponse
    {
        $status = $this->setupService->checkSetup($request->user()->clinic);

        return response()->json($status);
    }

    /**
     * Get clinic profile
     */
    public function getProfile(Request $request): JsonResponse
    {
        $clinic = $request->user()->clinic;

        if (!$clinic) {
            return response()->json([
                'message' => 'No clinic found for this user',
            ], 404);
        }

        return response()->json($clinic);
    }

    /**
     * Update clinic information
     */
    public function updateClinic(UpdateClinicProfileRequest $request): JsonResponse
    {
        $clinic = $this->setupService->updateClinic(
            $request->user()->clinic,
            $request->validated(),
            $request
        );

        return response()->json([
            'message' => 'Clinic information updated successfully',
            'clinic'  => $clinic,
        ]);
    }

    /**
     * Complete clinic setup
     */
    public function completeSetup(Request $request): JsonResponse
    {
        $clinic = $this->setupService->completeSetup($request->user()->clinic);

        return response()->json([
            'message' => 'Setup completed successfully',
            'clinic'  => $clinic,
        ]);
    }
}
