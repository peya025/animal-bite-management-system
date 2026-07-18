<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientAccount;
use Illuminate\Http\Request;

class PatientAccessController extends Controller
{
    public function verify(Request $request, Patient $patient, PatientAccount $account)
    {
        abort_unless($patient->clinic_id === $request->user()->clinic_id, 404);
        $patient->accounts()->whereKey($account->id)->firstOrFail();

        $patient->accounts()->updateExistingPivot($account->id, [
            'status' => 'verified',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        return response()->json(['message' => 'Patient profile access verified.']);
    }

    public function reject(Request $request, Patient $patient, PatientAccount $account)
    {
        abort_unless($patient->clinic_id === $request->user()->clinic_id, 404);
        $patient->accounts()->whereKey($account->id)->firstOrFail();

        $patient->accounts()->updateExistingPivot($account->id, [
            'status' => 'rejected',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        return response()->json(['message' => 'Patient profile access rejected.']);
    }
}
