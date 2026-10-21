<?php

namespace App\Http\Controllers;

use App\Http\Requests\ActivatePatientInvitationRequest;
use App\Http\Requests\LinkPatientAccountRequest;
use App\Http\Requests\Patient\BulkPatientInvitationRequest;
use App\Http\Requests\SendPatientInvitationRequest;
use App\Services\Patient\PatientInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientInvitationController extends Controller
{
    public function __construct(
        protected PatientInvitationService $invitationService
    ) {}

    /**
     * Staff sends an invitation to a walk-in patient.
     */
    public function store(SendPatientInvitationRequest $request): JsonResponse
    {
        $result = $this->invitationService->send((int) $request->patient_id, (int) auth()->id());

        return response()->json($result['data'], $result['status']);
    }

    /**
     * Staff sends invitations in bulk to multiple walk-in patients.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'patient_ids'   => ['required', 'array', 'min:1'],
            'patient_ids.*' => ['required', 'integer'],
        ]);

        $result = $this->invitationService->bulkSend($request->patient_ids, (int) auth()->id());

        return response()->json($result);
    }

    /**
     * Patient activates mobile app account using activation token.
     */
    public function activate(ActivatePatientInvitationRequest $request): JsonResponse
    {
        $result = $this->invitationService->activate($request->validated());

        return response()->json($result['data'], $result['status']);
    }

    /**
     * Staff resends an invitation.
     */
    public function resend($id): JsonResponse
    {
        $result = $this->invitationService->resend((int) $id);

        return response()->json($result['data'], $result['status']);
    }

    /**
     * Staff manually links an existing patient_account to a patient record.
     */
    public function linkAccount(LinkPatientAccountRequest $request, $patientId): JsonResponse
    {
        $result = $this->invitationService->linkAccount((int) $patientId, (int) $request->patient_account_id);

        return response()->json($result['data'], $result['status']);
    }

    /**
     * Staff verifies a manual linkage.
     */
    public function verifyLink($id): JsonResponse
    {
        $result = $this->invitationService->verifyLink((int) $id, (int) auth()->id());

        return response()->json($result['data'], $result['status']);
    }
}
