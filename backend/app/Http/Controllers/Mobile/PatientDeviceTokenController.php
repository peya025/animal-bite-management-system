<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\Device\DeleteDeviceTokenRequest;
use App\Http\Requests\Mobile\Device\RegisterDeviceTokenRequest;
use App\Services\Mobile\DeviceTokenService;
use Illuminate\Http\JsonResponse;

class PatientDeviceTokenController extends Controller
{
    public function __construct(
        protected DeviceTokenService $deviceTokenService
    ) {}

    /**
     * Register or update an FCM device token for push notification delivery.
     */
    public function register(RegisterDeviceTokenRequest $request): JsonResponse
    {
        $deviceToken = $this->deviceTokenService->registerToken(
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Device token registered successfully.',
            'device'  => [
                'id'           => $deviceToken->id,
                'device_type'  => $deviceToken->device_type,
                'device_name'  => $deviceToken->device_name,
                'masked_token' => $deviceToken->masked_token,
                'last_used_at' => $deviceToken->last_used_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Remove or invalidate a device registration upon logout or preference change.
     */
    public function destroy(DeleteDeviceTokenRequest $request): JsonResponse
    {
        $this->deviceTokenService->deleteToken(
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Device registration removed successfully.',
        ]);
    }
}
