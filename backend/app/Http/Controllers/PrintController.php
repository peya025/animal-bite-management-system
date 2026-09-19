<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;

class PrintController extends Controller
{
    /**
     * Display DOH iCLINICSYS Patient Enrolment Record (Form 1 Printout)
     * GET /print/patient/{patient}/enrolment
     */
    public function enrolment(Request $request, Patient $patient)
    {
        $patient->load(['clinic', 'details']);

        return view('prints.patient-enrolment', compact('patient'));
    }
}