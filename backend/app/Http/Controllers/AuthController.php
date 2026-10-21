<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\GoogleLoginRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\Auth\AuthUserResource;
use App\Http\Resources\Auth\MeUserResource;
use App\Services\Auth\GoogleStaffSsoService;
use App\Services\Auth\StaffAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        protected StaffAuthService $authService,
        protected GoogleStaffSsoService $googleSsoService
    ) {}

    /**
     * Register a new administrator user and clinic (gated by config).
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json([
            'user' => (new AuthUserResource($result['user']))->resolve(),
            'token' => $result['token'],
            'token_type' => $result['token_type'],
        ], 201);
    }

    /**
     * Login user and create session token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->email, $request->password);

        return response()->json([
            'user' => (new AuthUserResource($result['user']))->resolve(),
            'token' => $result['token'],
            'token_type' => $result['token_type'],
        ]);
    }

    /**
     * Logout user (revoke token).
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    /**
     * Get authenticated user profile (strictly flat JSON structure for web client).
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['clinic', 'roles']);

        return response()->json((new MeUserResource($user))->resolve());
    }

    /**
     * Update the authenticated user's own profile.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->authService->updateProfile($request->user(), $request->validated());

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => (new AuthUserResource($user))->resolve(),
        ]);
    }

    /**
     * Authenticate a clinical staff member via Google ID Token.
     */
    public function googleLogin(GoogleLoginRequest $request): JsonResponse
    {
        $result = $this->googleSsoService->authenticate($request->credential);

        return response()->json($result['data'], $result['status']);
    }
}
