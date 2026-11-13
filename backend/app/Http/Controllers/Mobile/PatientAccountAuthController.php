<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\Auth\MobileChangePasswordRequest;
use App\Http\Requests\Mobile\Auth\MobileDeleteAccountRequest;
use App\Http\Requests\Mobile\Auth\MobileForgotPasswordRequest;
use App\Http\Requests\Mobile\Auth\MobileGoogleLoginRequest;
use App\Http\Requests\Mobile\Auth\MobileLoginRequest;
use App\Http\Requests\Mobile\Auth\MobileRegisterRequest;
use App\Http\Requests\Mobile\Auth\MobileUpdateAccountRequest;
use App\Services\Mobile\PatientAccountAuthService;
use App\Services\Mobile\PatientAccountGoogleSsoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientAccountAuthController extends Controller
{
    public function __construct(
        protected PatientAccountAuthService $authService,
        protected PatientAccountGoogleSsoService $googleSsoService
    ) {}

    public function register(MobileRegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json($result, 201);
    }

    public function login(MobileLoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->validated('email'),
            $request->validated('password')
        );

        return response()->json($result);
    }

    public function me(Request $request): JsonResponse
    {
        $account = $this->authService->getMe($request->user());

        return response()->json($account);
    }

    public function update(MobileUpdateAccountRequest $request): JsonResponse
    {
        $account = $this->authService->updateAccount($request->user(), $request->validated());

        return response()->json($account);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json(['message' => 'Successfully logged out.']);
    }

    public function changePassword(MobileChangePasswordRequest $request): JsonResponse
    {
        $this->authService->changePassword(
            $request->user(),
            $request->validated('current_password'),
            $request->validated('password')
        );

        return response()->json(['message' => 'Password has been changed successfully.']);
    }

    public function logoutOtherDevices(Request $request): JsonResponse
    {
        $this->authService->logoutOtherDevices($request->user());

        return response()->json(['message' => 'Successfully logged out of all other devices.']);
    }

    public function deleteAccount(MobileDeleteAccountRequest $request): JsonResponse
    {
        $this->authService->deleteAccount($request->user(), $request->validated('password'));

        return response()->json(['message' => 'Your account has been deactivated successfully.']);
    }

    public function forgotPassword(MobileForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->forgotPassword($request->validated('email'));

        return response()->json([
            'message' => 'If an account with that email exists, password reset instructions have been sent.',
        ]);
    }

    public function googleLogin(MobileGoogleLoginRequest $request): JsonResponse
    {
        $result = $this->googleSsoService->handleGoogleLogin($request->validated('credential'));

        return response()->json($result['data'], $result['status']);
    }
}
