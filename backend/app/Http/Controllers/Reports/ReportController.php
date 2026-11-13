<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;

use App\Http\Requests\Reports\CohortReportRequest;
use App\Http\Requests\Reports\ExposureRegistryReportRequest;
use App\Http\Requests\Reports\MonthlyReportRequest;
use App\Services\DohReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        protected DohReportService $dohReportService
    ) {}

    /**
     * Resolve clinic ID from authenticated user or request parameters.
     */
    protected function resolveClinicId(Request $request): int
    {
        $clinicId = $request->user()?->clinic_id ?? $request->query('clinic_id');
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        return (int) $clinicId;
    }

    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * Matches Image 2 & 4 — DOH Rabies Exposure Registry form
     */
    public function exposureRegistry(ExposureRegistryReportRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $data = $this->dohReportService->getExposureRegistry(
            clinicId: $clinicId,
            fromDate: $request->query('from'),
            toDate: $request->query('to'),
            quarter: $request->query('quarter'),
            year: $request->query('year') ? (int) $request->query('year') : null,
            user: $request->user(),
            category: $request->query('category')
        );

        return response()->json($data);
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * Matches Image 1 — National Rabies Prevention and Control Program monthly form
     */
    public function monthlyReport(MonthlyReportRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $data = $this->dohReportService->getMonthlyReport(
            clinicId: $clinicId,
            monthStr: $request->query('month'),
            user: $request->user(),
            category: $request->query('category'),
            fromDate: $request->query('from'),
            toDate: $request->query('to')
        );

        return response()->json($data);
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * Matches Image 3 — Quarterly cohort by category with completion rate
     */
    public function cohortReport(CohortReportRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        $data = $this->dohReportService->getCohortReport(
            clinicId: $clinicId,
            yearParam: $request->query('year') ? (int) $request->query('year') : null,
            user: $request->user(),
            category: $request->query('category')
        );

        return response()->json($data);
    }
}
