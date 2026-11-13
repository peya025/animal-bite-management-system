<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;

use App\Http\Requests\Landing\UpdateLandingPageSettingsRequest;
use App\Services\Landing\LandingPageSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LandingPageSettingsController extends Controller
{
    public function __construct(
        protected LandingPageSettingsService $landingPageSettingsService
    ) {}

    /**
     * Get landing page & footer settings (Public API)
     */
    public function getSettings(Request $request): JsonResponse
    {
        $settings = $this->landingPageSettingsService->getSettings();

        return response()->json($settings);
    }

    /**
     * Update landing page & footer settings (Developer / Admin API)
     */
    public function updateSettings(UpdateLandingPageSettingsRequest $request): JsonResponse
    {
        $settings = $this->landingPageSettingsService->updateSettings(
            $request->validated()
        );

        return response()->json([
            'message'  => 'Landing page settings updated successfully',
            'settings' => $settings,
        ]);
    }
}
