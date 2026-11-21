<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\GetBarangaysRequest;
use App\Services\Mobile\MobileLocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileLocationController extends Controller
{
    public function __construct(
        protected MobileLocationService $locationService
    ) {}

    /**
     * Get clinic geographic context including resolved province and municipality
     */
    public function context(Request $request): JsonResponse
    {
        $clinic = $this->locationService->resolveClinic($request);
        $context = $this->locationService->getClinicContext($clinic);

        return response()->json($context);
    }

    /**
     * Get municipalities for the current clinic context
     */
    public function municipalities(Request $request): JsonResponse
    {
        $clinic = $this->locationService->resolveClinic($request);
        $municipalities = $this->locationService->getMunicipalitiesForClinic($clinic);

        return response()->json($municipalities);
    }

    /**
     * Get barangays for a given municipality code
     */
    public function barangays(GetBarangaysRequest $request): JsonResponse
    {
        $barangays = $this->locationService->getBarangaysForMunicipality(
            $request->validated('municipality_code')
        );

        return response()->json([
            'data' => $barangays,
        ]);
    }
}
