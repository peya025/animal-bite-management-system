<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Services\MobileVaccinationCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileVaccinationCardController extends Controller
{
    public function __construct(
        private readonly MobileVaccinationCardService $cardService,
    ) {}

    /**
     * GET /api/mobile/patients/{patient}/vaccination-card
     *
     * Returns the full DOH-compliant digital vaccination card data for a
     * patient account holder.  Access is scoped to the authenticated mobile
     * patient account's own linked patients.
     */
    public function show(Request $request, int $patient): JsonResponse
    {
        $patientObj = $request->user()->patients()
            ->whereKey($patient)
            ->with(['details', 'clinic'])
            ->first();

        if (!$patientObj) {
            return response()->json([
                'message' => 'Patient profile not found or not linked to this account.',
            ], 404);
        }

        $pivotStatus = $this->cardService->attemptAutoVerify($patientObj);

        if ($pivotStatus !== 'verified') {
            return response()->json([
                'message'             => 'Patient profile linkage is pending verification by clinic staff before official vaccination card can be accessed.',
                'verification_status' => $pivotStatus,
            ], 404);
        }

        return response()->json($this->cardService->buildCard($patientObj));
    }
}
