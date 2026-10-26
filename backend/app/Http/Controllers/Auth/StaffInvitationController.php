<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;

use App\Http\Requests\Staff\AcceptStaffInvitationRequest;
use App\Http\Requests\Staff\SendStaffInvitationRequest;
use App\Services\Staff\StaffInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffInvitationController extends Controller
{
    public function __construct(
        protected StaffInvitationService $invitationService
    ) {}

    /**
     * Send staff invitation.
     */
    public function invite(SendStaffInvitationRequest $request): JsonResponse
    {
        $result = $this->invitationService->invite($request->user(), $request->validated());

        return response()->json($result, 201);
    }

    /**
     * Get all invitations for current clinic.
     */
    public function index(Request $request): JsonResponse
    {
        $invitations = $this->invitationService->index($request->user());

        return response()->json($invitations);
    }

    /**
     * Validate invitation token.
     */
    public function validateToken(string $token): JsonResponse
    {
        $result = $this->invitationService->validateToken($token);

        return response()->json($result['data'], $result['status']);
    }

    /**
     * Accept invitation and create staff account.
     */
    public function accept(AcceptStaffInvitationRequest $request, string $token): JsonResponse
    {
        $result = $this->invitationService->accept($token, $request->validated());

        return response()->json($result['data'], $result['status']);
    }

    /**
     * Cancel pending invitation.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $result = $this->invitationService->cancel($request->user(), $id);

        return response()->json($result['data'], $result['status']);
    }
}
