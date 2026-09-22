<?php

namespace App\Http\Controllers;

use App\Services\DohReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        protected DohReportService $dohReportService
    ) {}

    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * Matches Image 2 & 4 — DOH Rabies Exposure Registry form
     */
    public function exposureRegistry(Request $request): JsonResponse
    {
        $user = $request->user();
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

        return response()->json($data);
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * Matches Image 1 — National Rabies Prevention and Control Program monthly form
     */
    public function monthlyReport(Request $request): JsonResponse
    {
        $user = $request->user();
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

        return response()->json($data);
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * Matches Image 3 — Quarterly cohort by category with completion rate
     */
    public function cohortReport(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinicId = $user?->clinic_id ?? $request->query('clinic_id');
        abort_unless($clinicId, 403, 'A clinic assignment is required.');

        $data = $this->dohReportService->getCohortReport(
            clinicId: (int) $clinicId,
            yearParam: $request->query('year') ? (int) $request->query('year') : null,
            user: $user,
            category: $request->query('category')
        );

        return response()->json($data);
    }
}
