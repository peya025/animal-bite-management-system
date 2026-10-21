<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientAccount;
use App\Services\Auth\PatientAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientAccessController extends Controller
{
    public function __construct(
        protected PatientAccessService $accessService
    ) {}

    /**
     * Verify patient profile access for a patient portal account.
     */
    public function verify(Request $request, Patient $patient, PatientAccount $account): JsonResponse
    {
        $this->accessService->verify($patient, $account, $request->user());

        return response()->json([
            'message' => 'Patient profile access verified.',
        ]);
    }

    /**
     * Reject patient profile access for a patient portal account.
     */
    public function reject(Request $request, Patient $patient, PatientAccount $account): JsonResponse
    {
        $this->accessService->reject($patient, $account, $request->user());

        return response()->json([
            'message' => 'Patient profile access rejected.',
        ]);
    }
}
