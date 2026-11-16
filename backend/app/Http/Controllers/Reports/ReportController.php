<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;

use App\Http\Requests\Reports\BiteSummaryReportRequest;
use App\Http\Requests\Reports\CohortReportRequest;
use App\Http\Requests\Reports\ExposureRegistryReportRequest;
use App\Http\Requests\Reports\MonthlyReportRequest;
use App\Services\DohReportService;
use App\Services\Reporting\MeetingReportService;
use App\Services\Reporting\ReportingMetricService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        protected DohReportService $dohReportService,
        protected ?ReportingMetricService $reportingMetricService = null,
        protected ?MeetingReportService $meetingReportService = null
    ) {}

    private function reportingMetricService(): ReportingMetricService
    {
        return $this->reportingMetricService ??= app(ReportingMetricService::class);
    }

    private function meetingReportService(): MeetingReportService
    {
        return $this->meetingReportService ??= app(MeetingReportService::class);
    }

    /**
     * Resolve authorized clinic ID strictly from the authenticated user's assignment.
     */
    protected function resolveClinicId(Request $request): int
    {
        return $this->dohReportService->authorizeReportAccess($request, $request->user());
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
            category: $request->query('category'),
            cutoffDate: $request->query('cutoff'),
            aggregateOnly: $request->boolean('aggregate_only')
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
            toDate: $request->query('to'),
            cutoffDate: $request->query('cutoff'),
            aggregateOnly: $request->boolean('aggregate_only')
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
            category: $request->query('category'),
            cutoffDate: $request->query('cutoff'),
            aggregateOnly: $request->boolean('aggregate_only')
        );

        return response()->json($data);
    }

    /**
     * Aggregate-only Bite Cases Summary contract (no patient identifiers).
     */
    public function biteSummary(BiteSummaryReportRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $params = $request->validated();
        $params['no_cache'] = $request->boolean('no_cache');

        return response()->json(
            $this->reportingMetricService()->getBiteSummary($clinicId, $params, $request->user())
        );
    }

    /**
     * Separate authorized drill-down case list for Bite Cases Summary.
     */
    public function biteSummaryCases(BiteSummaryReportRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        return response()->json(
            $this->reportingMetricService()->getBiteSummaryCases($clinicId, $request->validated())
        );
    }

    /**
     * List saved report snapshots and action register items for the clinic (Phase 6 BCS-06.1).
     */
    public function listSnapshots(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $snapshots = $this->meetingReportService()->listSnapshots($clinicId);

        return response()->json([
            'data' => $snapshots,
            'snapshots' => $snapshots,
            'actions' => $this->meetingReportService()->listActions($clinicId),
        ]);
    }

    /**
     * Create a new draft/finalized snapshot or a new revision linked to a parent snapshot.
     */
    public function storeSnapshot(BiteSummaryReportRequest $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $result = $this->meetingReportService()->createSnapshot(
            $clinicId,
            $request->validated(),
            $request->user()
        );

        return response()->json($result, 201);
    }

    /**
     * Retrieve an immutable saved snapshot by ID.
     */
    public function showSnapshot(Request $request, int $snapshotId): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);

        return response()->json(
            $this->meetingReportService()->getSnapshot(
                $clinicId,
                $snapshotId,
                $request->query('privacy_mode')
            )
        );
    }

    /**
     * Finalize a draft snapshot, locking its payload against mutation.
     */
    public function finalizeSnapshot(Request $request, int $snapshotId): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        return response()->json(
            $this->meetingReportService()->finalizeSnapshot(
                $clinicId,
                $snapshotId,
                $request->user(),
                $validated['notes'] ?? null
            )
        );
    }

    /**
     * List action register entries for the clinic (Phase 6 BCS-06.3).
     */
    public function listActions(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $snapshotId = $request->filled('snapshot_id') ? (int) $request->query('snapshot_id') : null;
        $actions = $this->meetingReportService()->listActions($clinicId, $snapshotId);

        return response()->json([
            'data' => $actions,
            'actions' => $actions,
        ]);
    }

    /**
     * Create a planning action record linked to clinic evidence/snapshot.
     */
    public function storeAction(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $validated = $request->validate([
            'snapshot_id' => ['nullable', 'integer', 'min:1'],
            'finding_key' => ['nullable', 'string', 'max:64'],
            'observed_pattern' => ['required', 'string', 'max:255'],
            'supporting_metric' => ['nullable', 'string', 'max:255'],
            'proposed_action' => ['required', 'string', 'max:2000'],
            'owner_name' => ['nullable', 'string', 'max:160'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'resources_notes' => ['nullable', 'string', 'max:1000'],
            'baseline_value' => ['nullable', 'string', 'max:160'],
            'target_measure' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:Proposed,Accepted,In progress,Completed,Deferred,open,in_progress,completed,deferred'],
            'review_date' => ['nullable', 'date_format:Y-m-d'],
            'review_outcome' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json([
            'action' => $this->meetingReportService()->createAction($clinicId, $validated, $request->user()),
        ], 201);
    }

    /**
     * Update an existing action record.
     */
    public function updateAction(Request $request, int $actionId): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $validated = $request->validate([
            'observed_pattern' => ['sometimes', 'string', 'max:255'],
            'supporting_metric' => ['sometimes', 'nullable', 'string', 'max:255'],
            'proposed_action' => ['sometimes', 'string', 'max:2000'],
            'owner_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
            'resources_notes' => ['nullable', 'string', 'max:1000'],
            'baseline_value' => ['nullable', 'string', 'max:160'],
            'target_measure' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:Proposed,Accepted,In progress,Completed,Deferred,open,in_progress,completed,deferred'],
            'review_date' => ['nullable', 'date_format:Y-m-d'],
            'review_outcome' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json([
            'action' => $this->meetingReportService()->updateAction($clinicId, $actionId, $validated, $request->user()),
        ]);
    }

    /**
     * Phase 8 (BCS-08.1 - BCS-08.3): Supply scenario projection and simulation.
     */
    public function supplyProjection(Request $request): JsonResponse
    {
        $clinicId = $this->resolveClinicId($request);
        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'cutoff' => ['nullable', 'date_format:Y-m-d'],
            'buffer_days' => ['nullable', 'integer', 'min:1', 'max:90'],
        ]);

        $summary = $this->reportingMetricService()->getBiteSummary($clinicId, array_merge($validated, ['no_cache' => true]), $request->user());

        return response()->json([
            'supply_scenarios' => $summary['planning_projections']['supply_scenarios'] ?? [],
            'population_context' => $summary['planning_projections']['population_context'] ?? [],
            'veterinary_surveillance_links' => $summary['planning_projections']['veterinary_surveillance_links'] ?? [],
            'baseline_forecast' => $summary['planning_projections']['baseline_forecast'] ?? [],
        ]);
    }
}
