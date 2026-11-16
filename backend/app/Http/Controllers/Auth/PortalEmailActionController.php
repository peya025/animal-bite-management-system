<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ActivatePatientInvitationRequest;
use App\Services\Mobile\PatientPasswordRecovery;
use App\Services\Patient\PatientInvitationService;
use Illuminate\Http\Request;

class PortalEmailActionController extends Controller
{
    public function activateForm()
    {
        return response()->view('auth.email-action', ['mode' => 'activate'])->header('Referrer-Policy', 'no-referrer')->header('Cache-Control', 'no-store');
    }

    public function activate(ActivatePatientInvitationRequest $request, PatientInvitationService $service)
    {
        $result = $service->activate($request->validated(), false);
        if ($result['status'] !== 200) {
            return back()->withErrors(['email' => $result['data']['message']]);
        }

        return redirect('/patient-portal/activate')->with('status', 'Account activated. You can now sign in to the ABTCare app.');
    }

    public function resetForm()
    {
        return response()->view('auth.email-action', ['mode' => 'reset-password'])->header('Referrer-Policy', 'no-referrer')->header('Cache-Control', 'no-store');
    }

    public function reset(Request $request, PatientPasswordRecovery $service)
    {
        $data = $request->validate(['token' => 'required|string|size:64', 'email' => 'required|email', 'password' => 'required|string|min:8|confirmed']);
        if (! $service->reset($data)) {
            return back()->withErrors(['email' => 'Invalid or expired reset code. Request a new email.']);
        }

        return redirect('/patient-portal/reset-password')->with('status', 'Password changed. Sign in to the app using your new password.');
    }
}
