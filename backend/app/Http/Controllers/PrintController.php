<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\Print\PrintDocumentService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class PrintController extends Controller
{
    public function __construct(
        protected PrintDocumentService $printDocumentService
    ) {}

    /**
     * Display DOH iCLINICSYS Patient Enrolment Record (Form 1 Printout)
     * GET /print/patient/{patient}/enrolment
     */
    public function enrolment(Request $request, Patient $patient): View
    {
        $data = $this->printDocumentService->getEnrolmentData($request, $patient);

        return view('prints.patient-enrolment', $data);
    }

    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * GET /print/reports/exposure-registry
     */
    public function exposureRegistry(Request $request): View
    {
        $data = $this->printDocumentService->getExposureRegistryData($request);

        return view('prints.exposure-registry', $data);
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * GET /print/reports/monthly
     */
    public function monthlyReport(Request $request): View
    {
        $data = $this->printDocumentService->getMonthlyReportData($request);

        return view('prints.monthly-report', $data);
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * GET /print/reports/cohort
     */
    public function cohortReport(Request $request): View
    {
        $data = $this->printDocumentService->getCohortReportData($request);

        return view('prints.cohort-report', $data);
    }
}
