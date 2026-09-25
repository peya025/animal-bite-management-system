<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\DohReportService;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class PrintController extends Controller
{
    public function __construct(
        protected DohReportService $dohReportService
    ) {}

    /**
     * Helper to authenticate user either via Sanctum session/bearer or query token
     */
    protected function resolveAuthenticatedUser(Request $request)
    {
        $user = $request->user();
        if (!$user && $request->query('token')) {
            $tokenModel = PersonalAccessToken::findToken($request->query('token'));
            if ($tokenModel) {
                $user = $tokenModel->tokenable;
            }
        }
        return $user;
    }

    /**
     * Display DOH iCLINICSYS Patient Enrolment Record (Form 1 Printout)
     * GET /print/patient/{patient}/enrolment
     */
    public function enrolment(Request $request, Patient $patient)
    {
        $patient->load(['clinic', 'details']);

        if (!$patient->clinic) {
            $user = $this->resolveAuthenticatedUser($request);
            $clinicId = $user?->clinic_id ?? 1;
            $patient->setRelation('clinic', \App\Models\Clinic::find($clinicId));
        }

        return view('prints.patient-enrolment', compact('patient'));
    }

    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * GET /print/reports/exposure-registry
     */
    public function exposureRegistry(Request $request)
    {
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id');
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        $data = $this->dohReportService->getExposureRegistry(
            clinicId: (int) $clinicId,
            fromDate: $request->query('from'),
            toDate: $request->query('to'),
            quarter: $request->query('quarter'),
            year: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category')
        );

        return view('prints.exposure-registry', $data);
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * GET /print/reports/monthly
     */
    public function monthlyReport(Request $request)
    {
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id');
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        $data = $this->dohReportService->getMonthlyReport(
            clinicId: (int) $clinicId,
            monthStr: $request->query('month'),
            user: $user,
            category: $request->query('category'),
            fromDate: $request->query('from'),
            toDate: $request->query('to')
        );

        return view('prints.monthly-report', $data);
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * GET /print/reports/cohort
     */
    public function cohortReport(Request $request)
    {
        $user = $this->resolveAuthenticatedUser($request);
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id');
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        $data = $this->dohReportService->getCohortReport(
            clinicId: (int) $clinicId,
            yearParam: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category')
        );

        return view('prints.cohort-report', $data);
    }
}