<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
     * Get current clinic's module configuration.
     * Access: Authenticated staff assigned to an active clinic.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user?->clinic_id) {
            return response()->json([
                'message' => 'User is not associated with any clinic.',
                'errors'  => [
                    'clinic_id' => ['Authenticated user has no associated clinic context.'],
                ],
            ], 422);
        }

        $config = $this->configService->getOrCreateConfigForClinic($user->clinic_id);
        $canEdit = (bool) $user->isAdmin();

        return response()->json(
            $this->configService->formatConfigResponse($config, $canEdit)
        );
    }

    /**
     * Update clinic module configuration.
     * Access: Admin only with active clinic context.
     */
    public function update(UpdateClinicModuleConfigRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user?->clinic_id) {
            return response()->json([
                'message' => 'User is not associated with any clinic.',
                'errors'  => [
                    'clinic_id' => ['Authenticated user has no associated clinic context.'],
                ],
            ], 422);
        }

        $result = $this->configService->updateConfigForClinic(
            $user->clinic_id,
            $request->validated(),
            $user->id
        );

        $formatted = $this->configService->formatConfigResponse($result['config'], true);

        return response()->json([
            'message' => $result['message'],
            'config'  => $formatted,
        ], 200);
    }

    /**
     * View configuration change audit history for the current clinic.
     * Access: Admin only.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user?->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        if (! $user?->clinic_id) {
            return response()->json([
                'message' => 'User is not associated with any clinic.',
                'errors'  => [
                    'clinic_id' => ['Authenticated user has no associated clinic context.'],
                ],
            ], 422);
        }

        $history = $this->configService->getHistoryForClinic($user->clinic_id);

        return response()->json($history);
    }
}
