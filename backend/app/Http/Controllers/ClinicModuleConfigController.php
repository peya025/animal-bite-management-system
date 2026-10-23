<?php

namespace App\Http\Controllers;

use App\Http\Requests\Clinic\UpdateClinicModuleConfigRequest;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicModuleConfigController extends Controller
{
    public function __construct(
        protected ClinicModuleConfigService $configService
    ) {}

    /**
     * Get current clinic's module configuration
     * Access: All authenticated users
     */
    public function show(Request $request): JsonResponse
    {
        $config = $this->configService->getOrCreateConfigForClinic($request->user()->clinic_id);

        return response()->json($config);
    }

    /**
     * Update clinic module configuration
     * Access: Admin only
     */
    public function update(UpdateClinicModuleConfigRequest $request): JsonResponse
    {
        $config = $this->configService->updateConfigForClinic(
            $request->user()->clinic_id,
            $request->validated()
        );

        return response()->json([
            'message' => 'Module configuration updated successfully',
            'config'  => $config,
        ]);
    }
}
