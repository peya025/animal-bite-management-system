<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\CohortReportRequest;
use App\Http\Requests\Reports\ExposureRegistryReportRequest;
use App\Http\Requests\Reports\MonthlyReportRequest;
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
     * Display DOH iCLINICSYS Individual Treatment Record (Form 2 — Doctor Consultation Printout)
     * GET /print/patient/{patient}/form2
     */
    public function form2(Request $request, Patient $patient): View
    {
        $data = $this->printDocumentService->getForm2Data($request, $patient);

        return view('prints.patient-form2', $data);
    }

    /**
     * Display DOH iCLINICSYS Animal Bite Treatment & Vaccination Record (Form 3 — Nurse Printout)
     * GET /print/patient/{patient}/form3
     */
    public function form3(Request $request, Patient $patient): View
    {
        $data = $this->printDocumentService->getForm3Data($request, $patient);

        return view('prints.patient-form3', $data);
    }

    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * GET /print/reports/exposure-registry
     */
    public function exposureRegistry(ExposureRegistryReportRequest $request): View
    {
        $data = $this->printDocumentService->getExposureRegistryData($request);

        return view('prints.exposure-registry', $data);
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * GET /print/reports/monthly
     */
    public function monthlyReport(MonthlyReportRequest $request): View
    {
        $data = $this->printDocumentService->getMonthlyReportData($request);

        return view('prints.monthly-report', $data);
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * GET /print/reports/cohort
     */
    public function cohortReport(CohortReportRequest $request): View
    {
        $data = $this->printDocumentService->getCohortReportData($request);

        return view('prints.cohort-report', $data);
    }

    /**
     * REPORT 4 — Bite Cases Summary A4 Meeting Pack (Executive Summary + Supporting Tables)
     * GET /print/reports/bite-summary
     */
    public function biteSummaryMeetingPack(Request $request): View
    {
        $data = $this->printDocumentService->getBiteSummaryMeetingPackData($request);

        return view('prints.bite-summary-meeting-pack', $data);
    }

    /**
     * PHASE 4 — 1-Page Barangay / MAO Surveillance Advisory Memorandum (Zero PII)
     * GET /print/reports/barangay-advisory-memo
     */
    public function barangayAdvisoryMemo(Request $request): View
    {
        $data = $this->printDocumentService->getBarangayAdvisoryMemoData($request);

        return view('prints.barangay-advisory-memo', $data);
    }

    /**
     * PHASE 4 — 1-Page Daily Shift Turnover & Morning Preparation Print Slip
     * GET /print/reports/daily-turnover
     */
    public function dailyTurnoverSlip(Request $request): View
    {
        $data = $this->printDocumentService->getDailyTurnoverSlipData($request);

        return view('prints.daily-turnover-slip', $data);
    }
}
