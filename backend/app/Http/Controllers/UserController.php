<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateAssignedModuleRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Services\User\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        protected UserManagementService $userService
    ) {}

    /**
     * Get all clinic staff users (admin only).
     */
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $users = $this->userService->listClinicUsers((int) $request->user()->clinic_id);

        return response()->json($users);
    }

    /**
     * Create new staff user with workstation roles (admin only).
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser(
            (int) $request->user()->clinic_id,
            $request->all(),
            $request,
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'User created successfully',
            'user'    => $user,
        ], 201);
    }

    /**
     * Get single user in current clinic.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $this->userService->getClinicUser((int) $request->user()->clinic_id, (int) $id);

        return response()->json($user);
    }

    /**
     * Update user details, password, workstation roles, and signature.
     */
    public function update(UpdateUserRequest $request, $id): JsonResponse
    {
        $user = $this->userService->updateUser(
            (int) $request->user()->clinic_id,
            (int) $id,
            $request->all(),
            $request,
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user,
        ]);
    }

    /**
     * Delete user from clinic.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $this->userService->deleteUser(
            (int) $request->user()->clinic_id,
            (int) $id,
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Update staff member's assigned module (admin only).
     */
    public function updateAssignedModule(UpdateAssignedModuleRequest $request, $id): JsonResponse
    {
        $user = $this->userService->updateAssignedModule(
            (int) $request->user()->clinic_id,
            (int) $id,
            (string) $request->assigned_module
        );

        return response()->json([
            'message' => 'Staff module assignment updated successfully',
            'user'    => $user,
        ]);
    }

    /**
     * List all patient accounts (admin only).
     */
    public function patientAccounts(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $accounts = $this->userService->listPatientAccounts();

        return response()->json($accounts);
    }

    /**
     * Toggle patient account active status (admin only).
     */
    public function togglePatientAccount(Request $request, $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $account = $this->userService->togglePatientAccount((int) $id);

        return response()->json([
            'message' => 'Patient account ' . ($account->is_active ? 'activated' : 'deactivated'),
            'account' => $account,
        ]);
    }
}
