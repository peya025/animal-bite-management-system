<?php

namespace App\Services\Reporting;

use App\Models\BiteReportAction;
use App\Models\BiteReportSnapshot;
use App\Models\Clinic;
use App\Models\User;
use App\Services\Clinical\BiteCaseService;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Phase 6 Meeting Report Service (BCS-06.1, BCS-06.2, BCS-06.3):
 * - Immutable report snapshots with draft -> finalized lifecycle and revision linkage
 * - Reviewable descriptive findings backed by counts, denominators, period, and rule version
 * - Conference privacy & small-cell disclosure control (<5 with complementary suppression)
 * - Action register CRUD linked to findings and snapshots
 */
class MeetingReportService
{
    public const SMALL_CELL_THRESHOLD = 5;

    public function __construct(
        protected ?ReportingMetricService $metricService = null,
        protected ?BiteCaseService $biteCaseService = null,
    ) {}

    private function metricService(): ReportingMetricService
    {
        return $this->metricService ??= app(ReportingMetricService::class);
    }

    private function biteCaseService(): BiteCaseService
    {
        return $this->biteCaseService ??= app(BiteCaseService::class);
    }

    /**
     * Build a complete, aggregate-only meeting summary payload with descriptive findings
     * and conference disclosure controls. Never includes identifiable patient records.
     */
    public function buildMeetingSummaryPayload(int $clinicId, array $params = [], ?User $user = null): array
    {
        $privacyMode = ($params['privacy_mode'] ?? 'internal_aggregate') === 'aggregate_only'
            ? 'aggregate_only'
            : 'internal_aggregate';

        $biteSummary = $this->metricService()->getBiteSummary(
            $clinicId,
            array_merge($params, ['no_cache' => true, 'privacy_mode' => $privacyMode]),
            $user
        );

        $scope = $biteSummary['scope'];
        $locationSummary = $this->biteCaseService()->getLocationRiskSummary($clinicId, [
            'from' => $scope['period_start'],
            'to' => $scope['period_end'],
            'cutoff' => $scope['cutoff'],
            'severity' => $params['category'] ?? $params['severity'] ?? null,
            'animal' => $params['animal'] ?? null,
            'status' => $params['status'] ?? null,
            'search' => $params['search'] ?? null,
            'privacy_mode' => 'aggregate_only',
        ]);

        // Guaranteed removal of any case-level array in snapshot/meeting payloads
        unset($locationSummary['cases']);

        $dohSummary = $locationSummary['doh_summary'] ?? [];
        $locations = $locationSummary['locations'] instanceof \Illuminate\Support\Collection
            ? $locationSummary['locations']->values()->all()
            : (array) ($locationSummary['locations'] ?? []);

        $findings = $this->buildDescriptiveFindings($biteSummary, $dohSummary, $locations);

        $payload = array_merge($biteSummary, [
            'doh_summary' => $dohSummary,
            'locations' => $locations,
            'summary' => $locationSummary['summary'] ?? [],
            'insights' => $findings,
            'limitations' => $this->buildLimitations($scope, $dohSummary),
        ]);

        return $this->applyConferencePrivacy($payload, $privacyMode === 'aggregate_only');
    }

    /**
     * Produce reviewable descriptive findings supported by counts, denominators, period, and rule version.
     * Uses conditional wording ("Review...", "Consider...") and avoids automatic clinical/outbreak claims.
     */
    public function buildDescriptiveFindings(array $biteSummary, array $dohSummary, array $locations): array
    {
        $scope = $biteSummary['scope'] ?? [];
        $periodLabel = ($scope['period_start'] ?? '') . ' to ' . ($scope['period_end'] ?? '');
        $cutoff = $scope['cutoff'] ?? '';
        $ruleVersion = $scope['rule_version'] ?? ReportingMetricService::RULE_VERSION;

        $pepBio = $dohSummary['pep_and_biologics'] ?? [];
        $outcomes = $dohSummary['completion_and_outcomes'] ?? [];
        $cats = $dohSummary['categories'] ?? [];
        $demos = $dohSummary['demographics'] ?? [];
        $aging = $dohSummary['data_quality_and_aging']['unresolved_review_age_buckets'] ?? [];

        $recorded = (int) ($pepBio['recorded_exposures'] ?? 0);
        $assessed = (int) ($pepBio['finalized_assessments'] ?? 0);
        $awaitingAssess = (int) ($pepBio['awaiting_assessment'] ?? 0);
        $prescribed = (int) ($pepBio['pep_prescribed'] ?? 0);
        $givenPep = (int) ($pepBio['given_pep'] ?? 0);
        $noAdmin = (int) ($pepBio['no_administration_recorded'] ?? 0);
        $cat3 = (int) ($cats['III'] ?? 0);
        $rigGiven = (int) ($pepBio['given_rig'] ?? 0);
        $maturedCourses = (int) ($outcomes['matured_courses'] ?? 0);
        $completedMature = (int) ($outcomes['completed_total'] ?? 0);
        $overdueEp = (int) ($outcomes['overdue_episodes'] ?? 0);
        $overdueSlots = (int) ($outcomes['outstanding_dose_slots'] ?? 0);
        $childrenCount = (int) ($demos['age_below_15'] ?? 0);
        $over30Days = (int) ($aging['over_30_days'] ?? 0);

        $findings = [];

        $findings[] = [
            'finding_key' => 'exposure_and_assessment_coverage',
            'title' => 'Exposure Recording & Doctor Assessment Coverage',
            'supporting_metric' => "{$assessed}/{$recorded} assessed ({$awaitingAssess} awaiting assessment) | Period: {$periodLabel} | Cutoff: {$cutoff} | Rule: {$ruleVersion}",
            'statement' => "Of {$recorded} recorded exposure episode(s) in {$periodLabel}, {$assessed} had a finalized doctor assessment and {$awaitingAssess} remained at Form 1 awaiting assessment as of {$cutoff}.",
            'recommended_review' => $awaitingAssess > 0
                ? "Review {$awaitingAssess} registration-only encounter(s) (including {$over30Days} open >30 days) to verify whether patients are still awaiting consultation, departed, or need chart finalization."
                : 'Continue standard registration-to-doctor handoff verification.',
        ];

        $findings[] = [
            'finding_key' => 'pep_initiation_and_pending_admin',
            'title' => 'Prescribed PEP vs. Recorded Administration',
            'supporting_metric' => "{$givenPep}/{$prescribed} started PEP ({$noAdmin} no administration recorded) | Cutoff: {$cutoff} | Rule: {$ruleVersion}",
            'statement' => "Of {$prescribed} episode(s) prescribed PEP at Form 2, {$givenPep} had recorded vaccine administration at Form 3 and {$noAdmin} had no administration recorded by {$cutoff}.",
            'recommended_review' => $noAdmin > 0
                ? "Review {$noAdmin} episode(s) with no administration recorded to verify nurse encoding or external facility treatment; do not assume treatment refusal."
                : 'All prescribed PEP episodes in this cohort have recorded vaccine initiation.',
        ];

        $findings[] = [
            'finding_key' => 'severity_completion_and_followup',
            'title' => 'Category III Burden, Mature Completion & Follow-Up Backlog',
            'supporting_metric' => "Cat III: {$cat3}/{$assessed} assessed | Mature Completion: {$completedMature}/{$maturedCourses} | Overdue: {$overdueEp} ep ({$overdueSlots} slots) | Children <15y: {$childrenCount}/{$recorded}",
            'statement' => "Category III accounted for {$cat3} of {$assessed} assessed exposure(s) ({$rigGiven} with verified RIG). Among {$maturedCourses} mature D28 cohort course(s), {$completedMature} completed required doses, with {$overdueEp} episode(s) ({$overdueSlots} dose slot(s)) currently overdue.",
            'recommended_review' => ($overdueEp > 0 || $cat3 > 0)
                ? "Consider targeted recall for {$overdueEp} overdue episode(s) and review RIG stock/documentation for Category III exposures and pediatric cases (<15y: {$childrenCount})."
                : 'Maintain routine follow-up scheduling and stock monitoring.',
        ];

        return $findings;
    }

    /**
     * Build explicit scope and data limitations for snapshots and meeting packs.
     */
    public function buildLimitations(array $scope, array $dohSummary): array
    {
        $unknownDate = (int) ($scope['unknown_exposure_date_count'] ?? 0);
        $unassessed = (int) ($dohSummary['categories']['unassessed_or_missing_total'] ?? 0);
        $isPartial = (bool) ($scope['is_partial_period'] ?? false);

        $items = [
            'Facility-based surveillance: counts reflect patients presenting to this ABTC and do not represent population-wide bite incidence without external denominator validation.',
            'Incomplete journeys: “No administration recorded” indicates absence of a local Form 3 record as of cutoff and does not rule out treatment at another facility.',
        ];

        if ($isPartial) {
            $items[] = 'Partial period: the selected date window is still open or extends to/past the cutoff date; figures may change as pending encounters progress.';
        }
        if ($unknownDate > 0) {
            $items[] = "{$unknownDate} episode(s) have provisional/unconfirmed exposure dates and are excluded from exposure-date cohort rates until verified.";
        }
        if ($unassessed > 0) {
            $items[] = "{$unassessed} episode(s) have no finalized WHO category (Form 1 only or category missing) and are reconciled separately from Category I–III tables.";
        }

        return $items;
    }

    /**
     * Enforce conference privacy and small-cell suppression (<5 with complementary suppression)
     * so suppressed cells cannot be trivially recovered from totals.
     */
    public function applyConferencePrivacy(array $payload, bool $suppressSmallCells): array
    {
        unset($payload['cases']);

        if (isset($payload['scope']) && is_array($payload['scope'])) {
            $payload['scope']['small_cell_suppression_applied'] = $suppressSmallCells;
            $payload['scope']['small_cell_threshold'] = $suppressSmallCells ? self::SMALL_CELL_THRESHOLD : null;
        }

        if (!$suppressSmallCells) {
            return $payload;
        }

        if (!empty($payload['locations']) && is_array($payload['locations'])) {
            $payload['locations'] = $this->suppressLocationRows($payload['locations'], self::SMALL_CELL_THRESHOLD);
        }

        if (!empty($payload['breakdowns']['exposure_barangays']) && is_array($payload['breakdowns']['exposure_barangays'])) {
            $payload['breakdowns']['exposure_barangays'] = $this->suppressBarangayBreakdownRows(
                $payload['breakdowns']['exposure_barangays'],
                self::SMALL_CELL_THRESHOLD
            );
        }

        return $payload;
    }

    /**
     * Apply primary (<5) and complementary small-cell suppression across location rows.
     */
    private function suppressLocationRows(array $rows, int $threshold): array
    {
        $smallIndexes = [];
        foreach ($rows as $idx => $row) {
            $count = (int) ($row['total_cases'] ?? 0);
            if ($count > 0 && $count < $threshold) {
                $smallIndexes[] = $idx;
            }
        }

        // Complementary suppression: if exactly 1 row is suppressed and >1 rows exist,
        // also suppress the next smallest positive row so subtraction from total cannot recover it.
        if (count($smallIndexes) === 1 && count($rows) > 1) {
            $candidateIdx = null;
            $candidateVal = PHP_INT_MAX;
            foreach ($rows as $idx => $row) {
                if (in_array($idx, $smallIndexes, true)) {
                    continue;
                }
                $count = (int) ($row['total_cases'] ?? 0);
                if ($count > 0 && $count < $candidateVal) {
                    $candidateVal = $count;
                    $candidateIdx = $idx;
                }
            }
            if ($candidateIdx !== null) {
                $smallIndexes[] = $candidateIdx;
            }
        }

        foreach ($rows as $idx => &$row) {
            $isSuppressed = in_array($idx, $smallIndexes, true);
            $row['is_small_cell_suppressed'] = $isSuppressed;
            $row['display_total_cases'] = $isSuppressed ? '<' . $threshold : (string) ($row['total_cases'] ?? 0);
            if ($isSuppressed) {
                foreach ([
                    'total', 'total_cases', 'previous_total', 'change',
                    'cat_1', 'cat_2', 'cat_3', 'mild', 'moderate', 'severe', 'unassessed',
                    'male', 'female', 'unknown_sex', 'age_below_15', 'age_15_above', 'age_unknown',
                    'stray', 'dogs', 'cats', 'other_animals', 'unknown_animals', 'children_count',
                    'new_course_prescribed', 'new_course_started', 'pep_prescribed', 'given_pep',
                    'no_administration_recorded', 'no_pep_required', 'transferred', 'completed',
                    'given_rig', 'erig', 'hrig', 'overdue_doses', 'overdue_episodes',
                    'overdue_patients', 'overdue_courses', 'outstanding_dose_slots',
                ] as $numericKey) {
                    if (array_key_exists($numericKey, $row)) {
                        $row[$numericKey] = null;
                    }
                }
                $row['animal_types'] = [];
            }
        }
        unset($row);

        return $rows;
    }

    private function suppressBarangayBreakdownRows(array $rows, int $threshold): array
    {
        $smallIndexes = [];
        foreach ($rows as $idx => $row) {
            $count = (int) ($row['current'] ?? 0);
            if ($count > 0 && $count < $threshold) {
                $smallIndexes[] = $idx;
            }
        }

        if (count($smallIndexes) === 1 && count($rows) > 1) {
            $candidateIdx = null;
            $candidateVal = PHP_INT_MAX;
            foreach ($rows as $idx => $row) {
                if (in_array($idx, $smallIndexes, true)) {
                    continue;
                }
                $count = (int) ($row['current'] ?? 0);
                if ($count > 0 && $count < $candidateVal) {
                    $candidateVal = $count;
                    $candidateIdx = $idx;
                }
            }
            if ($candidateIdx !== null) {
                $smallIndexes[] = $candidateIdx;
            }
        }

        foreach ($rows as $idx => &$row) {
            $isSuppressed = in_array($idx, $smallIndexes, true);
            $row['is_small_cell_suppressed'] = $isSuppressed;
            $row['display_current'] = $isSuppressed ? '<' . $threshold : (string) ($row['current'] ?? 0);
            if ($isSuppressed) {
                $row['current'] = null;
                $row['prior'] = null;
                $row['delta'] = null;
                $row['category_iii'] = null;
                $row['children_under_15'] = null;
                $row['overdue_episodes'] = null;
            }
        }
        unset($row);

        return $rows;
    }

    /**
     * List snapshots for a clinic (newest first).
     */
    public function listSnapshots(int $clinicId): array
    {
        return BiteReportSnapshot::where('clinic_id', $clinicId)
            ->with(['preparedBy:user_id,name', 'reviewedBy:user_id,name'])
            ->orderByDesc('snapshot_id')
            ->limit(50)
            ->get()
            ->map(fn (BiteReportSnapshot $s) => $this->formatSnapshotHeader($s))
            ->values()
            ->all();
    }

    /**
     * Retrieve a single immutable snapshot with its stored payload and linked actions.
     */
    public function getSnapshot(int $clinicId, int $snapshotId, ?string $requestedPrivacyMode = null): array
    {
        $snapshot = BiteReportSnapshot::where('clinic_id', $clinicId)
            ->where('snapshot_id', $snapshotId)
            ->with(['preparedBy:user_id,name', 'reviewedBy:user_id,name', 'actions'])
            ->first();

        if (!$snapshot) {
            throw new HttpException(404, 'Report snapshot not found for this clinic.');
        }

        $payload = $snapshot->payload_json ?? [];
        $enforceAggregateOnly = $requestedPrivacyMode === 'aggregate_only'
            || $snapshot->privacy_mode === 'aggregate_only';

        if ($enforceAggregateOnly) {
            $payload = $this->applyConferencePrivacy($payload, true);
        }

        $payload['snapshot'] = $this->formatSnapshotHeader($snapshot);
        if (isset($payload['scope']) && is_array($payload['scope'])) {
            $payload['scope']['status'] = $snapshot->status;
            $payload['scope']['snapshot_code'] = $snapshot->snapshot_code;
            $payload['scope']['snapshot_version'] = $snapshot->version;
        }

        return [
            'snapshot' => $this->formatSnapshotHeader($snapshot),
            'payload' => $payload,
            'summary_payload' => $payload,
            'actions' => $this->listActions($clinicId, $snapshot->snapshot_id),
        ];
    }

    /**
     * Create a new draft/finalized snapshot or a new versioned revision linked to a parent snapshot.
     * Existing finalized snapshots are never mutated.
     */
    public function createSnapshot(int $clinicId, array $params, User $user): array
    {
        $parentSnapshotId = !empty($params['parent_snapshot_id']) ? (int) $params['parent_snapshot_id'] : null;
        $version = 1;

        if ($parentSnapshotId !== null) {
            $parent = BiteReportSnapshot::where('clinic_id', $clinicId)
                ->where('snapshot_id', $parentSnapshotId)
                ->first();

            if (!$parent) {
                throw new HttpException(404, 'Parent snapshot not found for this clinic.');
            }

            $maxChildVersion = (int) BiteReportSnapshot::where('clinic_id', $clinicId)
                ->where(function ($q) use ($parent) {
                    $rootId = $parent->parent_snapshot_id ?: $parent->snapshot_id;
                    $q->where('snapshot_id', $rootId)
                        ->orWhere('parent_snapshot_id', $rootId)
                        ->orWhere('parent_snapshot_id', $parent->snapshot_id);
                })
                ->max('version');

            $version = max($parent->version + 1, $maxChildVersion + 1);
        }

        $privacyMode = ($params['privacy_mode'] ?? 'internal_aggregate') === 'aggregate_only'
            ? 'aggregate_only'
            : 'internal_aggregate';

        $finalizeNow = !empty($params['finalize']) || ($params['status'] ?? '') === 'finalized';
        if (isset($params['status']) && in_array($params['status'], ['draft', 'finalized'], true)) {
            unset($params['status']);
        }

        $payload = $this->buildMeetingSummaryPayload($clinicId, $params, $user);
        $scope = $payload['scope'];
        $now = CarbonImmutable::now('Asia/Manila');

        $seq = BiteReportSnapshot::where('clinic_id', $clinicId)->count() + 1;
        $snapshotCode = sprintf(
            'BCS-%s-C%d-%04d-V%d',
            $now->format('Ymd'),
            $clinicId,
            $seq,
            $version
        );

        $payload['scope']['status'] = $finalizeNow ? 'finalized' : 'draft';
        $payload['scope']['snapshot_code'] = $snapshotCode;
        $payload['scope']['snapshot_version'] = $version;

        $snapshot = BiteReportSnapshot::create([
            'clinic_id' => $clinicId,
            'snapshot_code' => $snapshotCode,
            'version' => $version,
            'parent_snapshot_id' => $parentSnapshotId,
            'status' => $finalizeNow ? 'finalized' : 'draft',
            'privacy_mode' => $privacyMode,
            'rule_version' => $scope['rule_version'] ?? ReportingMetricService::RULE_VERSION,
            'period_start' => $scope['period_start'],
            'period_end' => $scope['period_end'],
            'cutoff_date' => $scope['cutoff'],
            'date_basis' => $scope['date_basis'] ?? 'exposure_date',
            'filters_json' => $scope['filters'] ?? [],
            'payload_json' => $payload,
            'notes' => $params['notes'] ?? null,
            'prepared_by_user_id' => $user->user_id,
            'reviewed_by_user_id' => $finalizeNow ? $user->user_id : null,
            'generated_at' => $now,
            'finalized_at' => $finalizeNow ? $now : null,
        ]);

        $snapshot->load(['preparedBy:user_id,name', 'reviewedBy:user_id,name']);

        return [
            'snapshot' => $this->formatSnapshotHeader($snapshot),
            'payload' => $payload,
            'summary_payload' => $payload,
        ];
    }

    /**
     * Finalize a draft snapshot, locking its payload against in-place mutation.
     */
    public function finalizeSnapshot(int $clinicId, int $snapshotId, User $user, ?string $notes = null): array
    {
        $snapshot = BiteReportSnapshot::where('clinic_id', $clinicId)
            ->where('snapshot_id', $snapshotId)
            ->first();

        if (!$snapshot) {
            throw new HttpException(404, 'Report snapshot not found for this clinic.');
        }

        if ($snapshot->status === 'finalized') {
            throw new HttpException(422, 'Snapshot is already finalized and immutable. Save a revision instead.');
        }

        $now = CarbonImmutable::now('Asia/Manila');
        $payload = $snapshot->payload_json ?? [];
        if (isset($payload['scope']) && is_array($payload['scope'])) {
            $payload['scope']['status'] = 'finalized';
        }

        $snapshot->status = 'finalized';
        $snapshot->reviewed_by_user_id = $user->user_id;
        $snapshot->finalized_at = $now;
        if ($notes !== null && trim($notes) !== '') {
            $snapshot->notes = trim($notes);
        }
        $snapshot->payload_json = $payload;
        $snapshot->save();

        $snapshot->load(['preparedBy:user_id,name', 'reviewedBy:user_id,name']);

        return [
            'snapshot' => $this->formatSnapshotHeader($snapshot),
            'payload' => $payload,
            'summary_payload' => $payload,
        ];
    }

    /**
     * List action register entries for a clinic (optionally filtered by snapshot).
     */
    public function listActions(int $clinicId, ?int $snapshotId = null): array
    {
        $query = BiteReportAction::where('clinic_id', $clinicId)
            ->with(['snapshot:snapshot_id,snapshot_code,version,status'])
            ->orderByDesc('action_id');

        if ($snapshotId !== null) {
            $query->where('snapshot_id', $snapshotId);
        }

        return $query->limit(100)->get()->map(fn (BiteReportAction $a) => [
            'action_id' => $a->action_id,
            'clinic_id' => $a->clinic_id,
            'snapshot_id' => $a->snapshot_id,
            'snapshot_code' => $a->snapshot?->snapshot_code,
            'finding_key' => $a->finding_key,
            'observed_pattern' => $a->observed_pattern,
            'supporting_metric' => $a->supporting_metric,
            'proposed_action' => $a->proposed_action,
            'owner_name' => $a->owner_name,
            'due_date' => $a->due_date?->format('Y-m-d'),
            'resources_notes' => $a->resources_notes,
            'baseline_value' => $a->baseline_value,
            'target_measure' => $a->target_measure,
            'status' => $a->status,
            'review_date' => $a->review_date?->format('Y-m-d'),
            'review_outcome' => $a->review_outcome,
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ])->values()->all();
    }

    /**
     * Create a planning action record linked to clinic evidence/snapshot.
     */
    public function createAction(int $clinicId, array $data, User $user): array
    {
        if (!empty($data['snapshot_id'])) {
            $exists = BiteReportSnapshot::where('clinic_id', $clinicId)
                ->where('snapshot_id', (int) $data['snapshot_id'])
                ->exists();
            if (!$exists) {
                throw new HttpException(404, 'Linked snapshot does not belong to this clinic.');
            }
        }

        $requestedStatus = $data['status'] ?? 'Proposed';
        $status = in_array($requestedStatus, BiteReportAction::ALLOWED_STATUSES, true)
            ? $requestedStatus
            : 'Proposed';

        $action = BiteReportAction::create([
            'clinic_id' => $clinicId,
            'snapshot_id' => !empty($data['snapshot_id']) ? (int) $data['snapshot_id'] : null,
            'finding_key' => $data['finding_key'] ?? null,
            'observed_pattern' => $data['observed_pattern'],
            'supporting_metric' => !empty($data['supporting_metric']) ? $data['supporting_metric'] : 'Unspecified',
            'proposed_action' => $data['proposed_action'],
            'owner_name' => !empty($data['owner_name']) ? $data['owner_name'] : 'Unassigned',
            'due_date' => !empty($data['due_date']) ? $data['due_date'] : null,
            'resources_notes' => $data['resources_notes'] ?? null,
            'baseline_value' => $data['baseline_value'] ?? null,
            'target_measure' => $data['target_measure'] ?? null,
            'status' => $status,
            'review_date' => !empty($data['review_date']) ? $data['review_date'] : null,
            'review_outcome' => $data['review_outcome'] ?? null,
            'created_by_user_id' => $user->user_id,
            'updated_by_user_id' => $user->user_id,
        ]);

        $action->load('snapshot:snapshot_id,snapshot_code,version,status');

        return [
            'action_id' => $action->action_id,
            'clinic_id' => $action->clinic_id,
            'snapshot_id' => $action->snapshot_id,
            'snapshot_code' => $action->snapshot?->snapshot_code,
            'finding_key' => $action->finding_key,
            'observed_pattern' => $action->observed_pattern,
            'supporting_metric' => $action->supporting_metric,
            'proposed_action' => $action->proposed_action,
            'owner_name' => $action->owner_name,
            'due_date' => $action->due_date?->format('Y-m-d'),
            'resources_notes' => $action->resources_notes,
            'baseline_value' => $action->baseline_value,
            'target_measure' => $action->target_measure,
            'status' => $action->status,
            'review_date' => $action->review_date?->format('Y-m-d'),
            'review_outcome' => $action->review_outcome,
        ];
    }

    /**
     * Update an existing action record's status, owner, target, or review outcome.
     */
    public function updateAction(int $clinicId, int $actionId, array $data, User $user): array
    {
        $action = BiteReportAction::where('clinic_id', $clinicId)
            ->where('action_id', $actionId)
            ->first();

        if (!$action) {
            throw new HttpException(404, 'Action record not found for this clinic.');
        }

        foreach ([
            'observed_pattern',
            'supporting_metric',
            'proposed_action',
            'owner_name',
            'due_date',
            'resources_notes',
            'baseline_value',
            'target_measure',
            'review_date',
            'review_outcome',
        ] as $field) {
            if (array_key_exists($field, $data)) {
                $action->{$field} = $data[$field];
            }
        }

        if (!empty($data['status']) && in_array($data['status'], BiteReportAction::ALLOWED_STATUSES, true)) {
            $action->status = $data['status'];
        }

        $action->updated_by_user_id = $user->user_id;
        $action->save();
        $action->load('snapshot:snapshot_id,snapshot_code,version,status');

        return [
            'action_id' => $action->action_id,
            'clinic_id' => $action->clinic_id,
            'snapshot_id' => $action->snapshot_id,
            'snapshot_code' => $action->snapshot?->snapshot_code,
            'finding_key' => $action->finding_key,
            'observed_pattern' => $action->observed_pattern,
            'supporting_metric' => $action->supporting_metric,
            'proposed_action' => $action->proposed_action,
            'owner_name' => $action->owner_name,
            'due_date' => $action->due_date?->format('Y-m-d'),
            'resources_notes' => $action->resources_notes,
            'baseline_value' => $action->baseline_value,
            'target_measure' => $action->target_measure,
            'status' => $action->status,
            'review_date' => $action->review_date?->format('Y-m-d'),
            'review_outcome' => $action->review_outcome,
        ];
    }

    /**
     * Prepare view data for the A4 Meeting Pack print/PDF template (supports live or immutable snapshot_id).
     */
    public function getMeetingPackPrintData(int $clinicId, array $params, ?User $user): array
    {
        $clinic = Clinic::find($clinicId);
        $privacyMode = ($params['privacy_mode'] ?? 'internal_aggregate') === 'aggregate_only'
            ? 'aggregate_only'
            : 'internal_aggregate';

        if (!empty($params['snapshot_id'])) {
            $snapshotData = $this->getSnapshot($clinicId, (int) $params['snapshot_id'], $privacyMode);
            $payload = $snapshotData['payload'];
            $snapshotHeader = $snapshotData['snapshot'];
            $actions = $snapshotData['actions'];
        } else {
            $payload = $this->buildMeetingSummaryPayload($clinicId, $params, $user);
            $snapshotHeader = [
                'snapshot_id' => null,
                'snapshot_code' => 'LIVE-DRAFT',
                'version' => 1,
                'status' => 'live_draft',
                'privacy_mode' => $privacyMode,
                'rule_version' => $payload['scope']['rule_version'] ?? ReportingMetricService::RULE_VERSION,
                'generated_at' => CarbonImmutable::now('Asia/Manila')->format('Y-m-d H:i'),
                'finalized_at' => null,
                'prepared_by_name' => $user?->name ?? 'Authorized Staff',
                'reviewed_by_name' => null,
                'notes' => null,
            ];
            $actions = $this->listActions($clinicId);
        }

        return [
            'clinic_name' => $clinic?->name ?? ($payload['scope']['clinic_name'] ?? 'Animal Bite Treatment Center'),
            'municipality' => $clinic?->municipality ?? ($payload['scope']['municipality'] ?? 'Tagoloan'),
            'province' => $clinic?->province ?? ($payload['scope']['province'] ?? 'Misamis Oriental'),
            'left_print_logo_url' => $clinic?->left_print_logo_url,
            'right_print_logo_url' => $clinic?->right_print_logo_url,
            'snapshot' => $snapshotHeader,
            'payload' => $payload,
            'actions' => $actions,
        ];
    }

    private function formatSnapshotHeader(BiteReportSnapshot $s): array
    {
        return [
            'snapshot_id' => $s->snapshot_id,
            'clinic_id' => $s->clinic_id,
            'snapshot_code' => $s->snapshot_code,
            'version' => $s->version,
            'parent_snapshot_id' => $s->parent_snapshot_id,
            'status' => $s->status,
            'privacy_mode' => $s->privacy_mode,
            'rule_version' => $s->rule_version,
            'period_start' => $s->period_start?->format('Y-m-d'),
            'period_end' => $s->period_end?->format('Y-m-d'),
            'cutoff_date' => $s->cutoff_date?->format('Y-m-d'),
            'date_basis' => $s->date_basis,
            'filters' => $s->filters_json ?? [],
            'notes' => $s->notes,
            'prepared_by_user_id' => $s->prepared_by_user_id,
            'prepared_by_name' => $s->preparedBy?->name,
            'reviewed_by_user_id' => $s->reviewed_by_user_id,
            'reviewed_by_name' => $s->reviewedBy?->name,
            'generated_at' => $s->generated_at?->toIso8601String(),
            'finalized_at' => $s->finalized_at?->toIso8601String(),
        ];
    }
}
