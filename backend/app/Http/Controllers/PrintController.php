<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class PrintController extends Controller
{
    /**
     * Display DOH iCLINICSYS Patient Enrolment Record (Form 1 Printout)
     * GET /print/patient/{id}/enrolment
     */
    public function enrolment(Request $request, $id)
    {
        // Support token authentication via query parameter for browser tab window.open
        if ($request->has('token')) {
            $personalAccessToken = PersonalAccessToken::findToken($request->query('token'));
            if ($personalAccessToken) {
                $user = $personalAccessToken->tokenable;
                auth()->login($user);
            }
        }

        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized access. Please log in.'], 401);
        }

        // Access control: Only clinic staff roles can access
        if (!in_array($user->role, ['admin', 'registration', 'triage', 'treatment', 'developer'])) {
            return response()->json(['message' => 'Forbidden. Access restricted to clinic staff.'], 403);
        }

        $patient = Patient::with(['clinic', 'details'])->findOrFail($id);

        return view('prints.patient-enrolment', compact('patient'));
    }
}
