<?php

namespace App\Services\Reporting;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Computes versioned, aggregate-only reporting contracts for Bite Cases Summary
 * and cross-form reconciliation against the 3 confirmed DOH Submissions templates.
 */
class ReportingMetricService
{
    public const RULE_VERSION = 'bcs-phase1-local-v1';

    public function __construct(
        protected ?ExposureReportingQuery $queryService = null,
        protected ?EpisodeReportingStateResolver $stateResolver = null,
        protected ?TreatmentOutcomeResolver $outcomeResolver = null,
        protected ?SupplyPlanningService $supplyPlanningService = null,
    ) {}

    private function supplyPlanningService(): SupplyPlanningService
    {
        return $this->supplyPlanningService ??= app(SupplyPlanningService::class);
    }

    private function outcomeResolver(): TreatmentOutcomeResolver
    {
        return $this->outcomeResolver ??= app(TreatmentOutcomeResolver::class);
    }

    private function stateResolver(): EpisodeReportingStateResolver
    {
        return $this->stateResolver ??= new EpisodeReportingStateResolver($this->outcomeResolver());
    }

    private function queryService(): ExposureReportingQuery
    {
        return $this->queryService ??= new ExposureReportingQuery($this->stateResolver(), $this->outcomeResolver());
    }

    /**
     * Build the aggregate-only Bite Cases Summary contract (no patient identifiers).
     */
    public function getBiteSummary(int $clinicId, array $params = [], ?User $user = null): array
    {
        $period = $this->resolvePeriodAndCutoff($params);
        $from = $period['from'];
        $to = $period['to'];
        $cutoff = $period['cutoff'];
        $comparisonMode = $period['comparison'];
        $normalizedFilters = $this->normalizeFilters($params);
        $privacyMode = ($params['privacy_mode'] ?? 'internal_aggregate') === 'aggregate_only'
            ? 'aggregate_only'
            : 'internal_aggregate';

        $compute = function () use ($clinicId, $from, $to, $cutoff, $comparisonMode, $normalizedFilters, $privacyMode, $params): array {
            $clinic = Clinic::find($clinicId);
            $dataset = $this->queryService()->fetchPeriodDataset($clinicId, $from, $to, $cutoff, $normalizedFilters, $clinic);

            $primaryItems = $dataset['all_eligible_episodes'];
            $unknownDateItems = $dataset['unknown_exposure_date_episodes'];

            $nonDateFilters = $this->stripDateAndGeographyComparisonDiffs($normalizedFilters);
            $preloadedIncidents = $dataset['loaded_incidents'] ?? null;
            $arvPool = $this->queryService()->fetchIncidentsWithArvActivityInRange(
                $clinicId,
                $from->toDateString(),
                $to->toDateString(),
                $preloadedIncidents
            );
            $d0Cohort = $this->queryService()->computeD0CohortMetrics($clinicId, $from, $to, $cutoff, $nonDateFilters, $clinic, $arvPool);
            $servicePeriod = $this->queryService()->computeServicePeriodMetrics($clinicId, $from, $to, $cutoff, $nonDateFilters, $clinic, $arvPool);
            $backlog = $this->queryService()->computeBacklogAtCutoff($clinicId, $cutoff, $nonDateFilters, $clinic, $preloadedIncidents);

            $currentMetrics = $this->aggregateEpisodeItems($primaryItems, $unknownDateItems, $cutoff, $to);

            $comparison = $this->buildComparison(
                $clinicId,
                $clinic,
                $from,
                $to,
                $cutoff,
                $comparisonMode,
                $normalizedFilters,
                $currentMetrics,
                $d0Cohort
            );

            $breakdowns = $this->buildBreakdowns(
                $primaryItems,
                $comparison['prior_exposure_barangays'] ?? collect(),
                $from,
                $to,
                $cutoff
            );

            $reconciliation = $this->buildReconciliation(
                $primaryItems,
                $currentMetrics['reconciliation'],
                $d0Cohort,
                $servicePeriod,
                $backlog
            );

            $indicators = $this->buildIndicators(
                $currentMetrics,
                $d0Cohort,
                $servicePeriod,
                $backlog,
                $dataset['date_basis']
            );

            $nowManila = CarbonImmutable::now('Asia/Manila')->endOfDay();
            $isPartialPeriod = $to->gt($cutoff) || $to->gt($nowManila);

            $planningProjections = $this->supplyPlanningService()->computePlanningProjections(
                $clinicId,
                $clinic,
                $from,
                $to,
                $cutoff,
                $currentMetrics,
                $servicePeriod,
                $backlog,
                $params
            );

            $result = [
                'scope' => [
                    'clinic_id' => $clinicId,
                    'clinic_name' => $clinic?->name ?? 'Animal Bite Treatment Center',
                    'municipality' => $clinic?->municipality ?? 'Tagoloan',
                    'province' => $clinic?->province ?? 'Misamis Oriental',
                    'timezone' => 'Asia/Manila',
                    'rule_version' => self::RULE_VERSION,
                    'privacy_mode' => $privacyMode,
                    'date_basis' => $dataset['date_basis'],
                    'period_start' => $from->toDateString(),
                    'period_end' => $to->toDateString(),
                    'cutoff' => $cutoff->toDateString(),
                    'is_partial_period' => $isPartialPeriod,
                    'comparison_mode' => $comparisonMode,
                    'filters' => $normalizedFilters,
                    'record_count' => $primaryItems->count(),
                    'unknown_exposure_date_count' => $unknownDateItems->count(),
                    'status' => 'live_draft',
                ],
                'metric_definitions' => $this->metricDefinitions(),
                'indicators' => $indicators,
                'journey_progress' => $this->buildJourneyProgress($currentMetrics['reconciliation']),
                'breakdowns' => $breakdowns,
                'comparison' => $comparison['payload'],
                'data_quality' => $this->buildDataQuality($primaryItems, $unknownDateItems, $cutoff),
                'reconciliation' => $reconciliation,
                'planning_projections' => $planningProjections,
                'source_reports' => [
                    'exposure_registry' => [
                        'endpoint' => '/api/reports/exposure-registry',
                        'date_basis' => 'exposure_date',
                        'params' => [
                            'from' => $from->toDateString(),
                            'to' => $to->toDateString(),
                            'cutoff' => $cutoff->toDateString(),
                            'category' => $normalizedFilters['category'] ?: 'ALL',
                        ],
                    ],
                    'monthly' => [
                        'endpoint' => '/api/reports/monthly',
                        'date_basis' => 'exposure_date',
                        'params' => [
                            'from' => $from->toDateString(),
                            'to' => $to->toDateString(),
                            'cutoff' => $cutoff->toDateString(),
                            'category' => $normalizedFilters['category'] ?: 'ALL',
                        ],
                    ],
                    'cohort' => [
                        'endpoint' => '/api/reports/cohort',
                        'date_basis' => 'exposure_date',
                        'params' => [
                            'year' => $from->year,
                            'cutoff' => $cutoff->toDateString(),
                            'category' => $normalizedFilters['category'] ?: 'ALL',
                        ],
                    ],
                ],
            ];

            if ($privacyMode === 'aggregate_only') {
                return app(MeetingReportService::class)->applyConferencePrivacy($result, true);
            }

            return $result;
        };

        if (!empty($params['no_cache'])) {
            return $compute();
        }

        $cacheKey = $this->buildCacheKey(
            $clinicId,
            $privacyMode,
            $from->toDateString(),
            $to->toDateString(),
            $cutoff->toDateString(),
            $comparisonMode,
            $normalizedFilters
        );

        return Cache::remember($cacheKey, 60, $compute);
    }

    /**
     * Authorized identifiable drill-down endpoint (kept separate from aggregate summary).
     */
    public function getBiteSummaryCases(int $clinicId, array $params = []): array
    {
        $period = $this->resolvePeriodAndCutoff($params);
        $from = $period['from'];
        $to = $period['to'];
        $cutoff = $period['cutoff'];
        $normalizedFilters = $this->normalizeFilters($params);
        $bucket = strtolower(trim((string) ($params['bucket'] ?? 'all')));
        $page = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($params['per_page'] ?? 25)));

        $clinic = Clinic::find($clinicId);
        $dataset = $this->queryService()->fetchPeriodDataset($clinicId, $from, $to, $cutoff, $normalizedFilters, $clinic);

        $sourceItems = $bucket === 'unknown_exposure_date'
            ? $dataset['unknown_exposure_date_episodes']
            : $dataset['all_eligible_episodes'];

        $filteredItems = $sourceItems
            ->filter(fn (array $item): bool => $this->matchesDrilldownBucket($item, $bucket, $cutoff))
            ->values();

        $total = $filteredItems->count();
        $paged = $filteredItems->forPage($page, $perPage)->values()->map(function (array $item) use ($to, $cutoff): array {
            /** @var BiteIncident $incident */
            $incident = $item['incident'];
            $state = $item['state'];
            $stage = $state['stage_summary'];
            $expGeo = $item['exposure_geo'];
            $resGeo = $item['residence_geo'];
            $course = $state['course_outcome'];
            $rig = $state['rig_evidence'];
            $reviewAge = $this->stateResolver()->computeReviewAgeInfo($incident, $state, $cutoff);

            return [
                'bite_id' => $incident->bite_id,
                'case_number' => $incident->case_number ?? ('BC-' . $incident->bite_id),
                'patient_id' => $incident->patient_id,
                'patient_name' => $incident->patient?->name ?? 'Unknown',
                'age_at_exposure' => $incident->patient?->ageAtDate($incident->bite_date ?? $to),
                'gender' => $incident->patient?->gender ? ucfirst($incident->patient->gender) : 'Unknown',
                'bite_date' => $incident->bite_date?->toDateString(),
                'bite_date_is_provisional' => $incident->hasProvisionalBiteDate(),
                'animal_type' => $this->queryService()->normalizedAnimalCategory($incident),
                'exposure_barangay' => $expGeo['barangay'],
                'exposure_municipality' => $expGeo['municipality'],
                'exposure_geography_scope' => $expGeo['scope'],
                'residence_barangay' => $resGeo['barangay'],
                'residence_municipality' => $resGeo['municipality'],
                'category' => $stage['category_display'],
                'assessment' => $state['assessment'],
                'pep_decision' => $state['pep_decision'],
                'course_outcome' => $course['outcome'],
                'encounter_disposition' => $state['encounter_disposition'],
                'status' => $stage['resolved_status'],
                'last_completed_stage' => $stage['last_completed_stage'],
                'stage_label' => $stage['stage_label'],
                'what_can_be_reported' => $stage['what_can_be_reported'],
                'treatment_decision_display' => $stage['treatment_decision_display'],
                'administration_display' => $stage['administration_display'],
                'vaccination_display' => $stage['vaccination_display'],
                'external_treatment_display' => $stage['external_treatment_display'],
                'rig_indicated' => $rig['indicated_rig_type'] ?: 'None',
                'rig_given' => $rig['administered_rig_type'] ?: 'None',
                'is_overdue' => (bool) ($course['is_overdue'] ?? false),
                'days_overdue' => (int) ($course['days_overdue'] ?? 0),
                'outstanding_dose_slot_count' => (int) ($course['outstanding_dose_slot_count'] ?? 0),
                'is_unresolved_review' => $reviewAge['is_unresolved_review'],
                'review_age_days' => $reviewAge['review_age_days'],
                'review_age_bucket' => $reviewAge['review_age_bucket'],
            ];
        })->all();

        return [
            'scope' => [
                'clinic_id' => $clinicId,
                'rule_version' => self::RULE_VERSION,
                'date_basis' => $dataset['date_basis'],
                'period_start' => $from->toDateString(),
                'period_end' => $to->toDateString(),
                'cutoff' => $cutoff->toDateString(),
                'bucket' => $bucket ?: 'all',
            ],
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
            'cases' => $paged,
        ];
    }

    private function aggregateEpisodeItems(
        Collection $items,
        Collection $unknownDateItems,
        CarbonImmutable $cutoff,
        CarbonImmutable $refEnd
    ): array {
        $states = $items->pluck('state')->values();
        $reconciliation = $this->stateResolver()->reconcileStates($states, $cutoff);

        $uniquePatients = $items
            ->map(fn (array $item) => $item['incident']->patient_id)
            ->filter(fn ($id) => $id !== null)
            ->unique()
            ->count();

        $rigIndicated = $states->filter(fn (array $s) => (bool) ($s['rig_evidence']['rig_indicated'] ?? false))->count();
        $rigVerified = $states->filter(fn (array $s) => (bool) ($s['rig_evidence']['rig_administered'] ?? false))->count();

        return [
            'recorded_episodes' => $reconciliation['recorded_episodes'],
            'unique_patients' => $uniquePatients,
            'unknown_exposure_date_episodes' => $unknownDateItems->count(),
            'reconciliation' => $reconciliation,
            'rig_indicated' => $rigIndicated,
            'rig_verified' => $rigVerified,
            'ref_end' => $refEnd,
        ];
    }

    private function buildIndicators(
        array $currentMetrics,
        array $d0Cohort,
        array $servicePeriod,
        array $backlog,
        string $dateBasis
    ): array {
        $rec = $currentMetrics['reconciliation'];
        $recorded = (int) $rec['recorded_episodes'];
        $assessed = (int) $rec['finalized_assessments'];
        $catTotal = (int) $rec['categorized_cases_total'];
        $cat3 = (int) $rec['cat_III'];
        $newPrescribed = (int) $rec['new_course_prescribed'];
        $newStarted = (int) $rec['new_course_started'];
        $mature = (int) $d0Cohort['mature_started_courses'];
        $completedMature = (int) $d0Cohort['completed_mature_courses'];
        $rigIndicated = (int) $currentMetrics['rig_indicated'];
        $rigVerified = (int) $currentMetrics['rig_verified'];

        return [
            'recorded_exposures' => $this->makeIndicator('EXP01', 'Recorded exposure episodes', $recorded, $recorded, null, 'episodes', $dateBasis),
            'unique_patients' => $this->makeIndicator('EXP02', 'Unique patients', $currentMetrics['unique_patients'], $currentMetrics['unique_patients'], null, 'patients', $dateBasis),
            'unknown_exposure_date_episodes' => $this->makeIndicator('EXP03', 'Registered episodes with unknown exposure date', $currentMetrics['unknown_exposure_date_episodes'], $currentMetrics['unknown_exposure_date_episodes'], null, 'episodes', 'registration_date'),
            'finalized_assessments' => $this->makeIndicator('AS01', 'Finalized doctor assessments', $assessed, $assessed, null, 'episodes', $dateBasis),
            'assessment_completion_pct' => $this->makeIndicator('AS02', 'Assessment completion', $recorded > 0 ? round(($assessed / $recorded) * 100, 1) : null, $assessed, $recorded, 'percent', $dateBasis, $recorded > 0 ? null : 'no_data'),
            'unassessed_episodes' => $this->makeIndicator('AS03', 'No finalized assessment recorded', (int) $rec['awaiting_assessment'], (int) $rec['awaiting_assessment'], null, 'episodes', $dateBasis),
            'category_III_count' => $this->makeIndicator('CAT01', 'Category III exposures', $cat3, $cat3, null, 'episodes', $dateBasis),
            'category_III_share_pct' => $this->makeIndicator('CAT02', 'Category III share of assessed episodes', $catTotal > 0 ? round(($cat3 / $catTotal) * 100, 1) : null, $cat3, $catTotal, 'percent', $dateBasis, $catTotal > 0 ? null : 'not_applicable'),
            'new_course_prescribed' => $this->makeIndicator('PEP01', 'New-course PEP prescribed', $newPrescribed, $newPrescribed, null, 'episodes', $dateBasis),
            'new_course_started' => $this->makeIndicator('PEP02', 'New-course PEP initiated', $newStarted, $newStarted, null, 'episodes', $dateBasis),
            'documented_pep_initiation_pct' => $this->makeIndicator('PEP02', 'Documented new-course PEP initiation', $newPrescribed > 0 ? round(($newStarted / $newPrescribed) * 100, 1) : null, $newStarted, $newPrescribed, 'percent', $dateBasis, $newPrescribed > 0 ? null : 'not_applicable'),
            'no_administration_recorded' => $this->makeIndicator('PEP03', 'New course prescribed without recorded administration', (int) $rec['new_course_no_receipt'], (int) $rec['new_course_no_receipt'], null, 'episodes', $dateBasis),
            'continuing_episodes' => $this->makeIndicator('PEP04', 'Continuing-course episodes', (int) $rec['continuing_episodes'], (int) $rec['continuing_episodes'], null, 'episodes', $dateBasis),
            'mature_started_courses' => $this->makeIndicator('OUT01', 'Mature started courses (D0 cohort)', $mature, $mature, null, 'courses', 'd0_cohort'),
            'completed_mature_courses' => $this->makeIndicator('OUT02', 'Completed mature courses (D0 cohort)', $completedMature, $completedMature, null, 'courses', 'd0_cohort'),
            'mature_course_completion_pct' => $this->makeIndicator('OUT02', 'Mature-cohort completion rate', $mature > 0 ? round(($completedMature / $mature) * 100, 1) : null, $completedMature, $mature, 'percent', 'd0_cohort', $mature > 0 ? null : 'not_applicable'),
            'ongoing_not_mature_courses' => $this->makeIndicator('OUT03', 'Started courses not yet mature', (int) $d0Cohort['ongoing_not_mature_courses'], (int) $d0Cohort['ongoing_not_mature_courses'], null, 'courses', 'd0_cohort'),
            'overdue_episodes' => $this->makeIndicator('FU01', 'Overdue episodes (at cutoff)', (int) $backlog['overdue_episodes'], (int) $backlog['overdue_episodes'], null, 'episodes', 'backlog_at_cutoff'),
            'overdue_patients' => $this->makeIndicator('FU01', 'Overdue patients (at cutoff)', (int) $backlog['overdue_patients'], (int) $backlog['overdue_patients'], null, 'patients', 'backlog_at_cutoff'),
            'overdue_courses' => $this->makeIndicator('FU01', 'Overdue courses (at cutoff)', (int) $backlog['overdue_courses'], (int) $backlog['overdue_courses'], null, 'courses', 'backlog_at_cutoff'),
            'outstanding_dose_slots' => $this->makeIndicator('FU01', 'Outstanding overdue dose slots (at cutoff)', (int) $backlog['outstanding_dose_slots'], (int) $backlog['outstanding_dose_slots'], null, 'dose_slots', 'backlog_at_cutoff'),
            'rig_indicated' => $this->makeIndicator('RIG01', 'RIG indicated episodes', $rigIndicated, $rigIndicated, null, 'episodes', $dateBasis),
            'rig_verified' => $this->makeIndicator('RIG01', 'Verified RIG receipt', $rigVerified, $rigVerified, null, 'episodes', $dateBasis),
            'rig_receipt_pct' => $this->makeIndicator('RIG01', 'Verified RIG receipt among indicated episodes', $rigIndicated > 0 ? round(($rigVerified / $rigIndicated) * 100, 1) : null, $rigVerified, $rigIndicated, 'percent', $dateBasis, $rigIndicated > 0 ? null : 'not_applicable'),
            'transferred_referred' => $this->makeIndicator('REF01', 'Transferred or referred episodes', (int) $rec['transferred_referred'], (int) $rec['transferred_referred'], null, 'episodes', $dateBasis),
            'local_arv_events_in_service_period' => $this->makeIndicator('SVC01', 'Local ARV administration events', (int) $servicePeriod['local_arv_events_in_service_period'], (int) $servicePeriod['local_arv_events_in_service_period'], null, 'events', 'service_date'),
            'external_arv_events_in_service_period' => $this->makeIndicator('SVC02', 'Verified external ARV events', (int) $servicePeriod['external_arv_events_in_service_period'], (int) $servicePeriod['external_arv_events_in_service_period'], null, 'events', 'service_date'),
            'human_rabies_cases' => $this->makeIndicator('HR01', 'Human rabies cases', null, null, null, 'cases', $dateBasis, 'source_not_verified'),
        ];
    }

    private function buildJourneyProgress(array $rec): array
    {
        return [
            'mutually_exclusive_partitions' => [
                'recorded_episodes' => (int) $rec['recorded_episodes'],
                'assessment_partition' => [
                    'finalized_assessments' => (int) $rec['finalized_assessments'],
                    'awaiting_assessment' => (int) $rec['awaiting_assessment'],
                    'reconciles' => ((int) $rec['finalized_assessments'] + (int) $rec['awaiting_assessment']) === (int) $rec['recorded_episodes'],
                ],
                'decision_partition_among_finalized' => [
                    'new_course_prescribed' => (int) $rec['new_course_prescribed'],
                    'continuing_episodes' => (int) $rec['continuing_episodes'],
                    'explicit_no_pep' => (int) $rec['explicit_no_pep'],
                    'decision_missing' => (int) $rec['decision_missing'],
                    'transferred_finalized' => (int) $rec['transferred_finalized'],
                ],
                'new_course_initiation_partition' => [
                    'new_course_prescribed' => (int) $rec['new_course_prescribed'],
                    'new_course_started' => (int) $rec['new_course_started'],
                    'no_administration_recorded' => (int) $rec['new_course_no_receipt'],
                ],
                'all_prescribed_initiation_partition' => [
                    'pep_prescribed' => (int) $rec['pep_prescribed'],
                    'verified_vaccine_initiation' => (int) $rec['verified_vaccine_initiation'],
                    'no_administration_recorded' => (int) $rec['no_administration_recorded'],
                ],
                'stage_counts' => $rec['stage_counts'],
            ],
            'overlapping_indicators' => [
                'note' => 'Transferred, external-care, and overdue flags can overlap treatment progress and must not be summed into total episodes.',
                'transferred_referred' => (int) $rec['transferred_referred'],
                'conflict_review' => (int) $rec['conflict_review'],
            ],
            'stage_matrix' => $this->stateResolver()->buildStageMatrix($rec['stage_counts'] ?? []),
            'narrative' => $rec['narrative'],
        ];
    }

    private function buildBreakdowns(
        Collection $items,
        Collection $priorExposureBarangays,
        CarbonImmutable $from,
        CarbonImmutable $to,
        CarbonImmutable $cutoff
    ): array {
        $byCategory = [
            'I' => 0,
            'II' => 0,
            'III' => 0,
            'not_yet_assessed' => 0,
            'assessed_category_missing' => 0,
        ];
        $byAgeGroup = ['below_15' => 0, '15_above' => 0, 'unknown' => 0];
        $bySex = ['male' => 0, 'female' => 0, 'unknown' => 0];
        $byAnimal = ['dog' => 0, 'cat' => 0, 'other' => 0, 'unknown' => 0];
        $byPlanType = [];

        foreach ($items as $item) {
            /** @var BiteIncident $incident */
            $incident = $item['incident'];
            $state = $item['state'];

            if ($state['assessment'] !== 'finalized') {
                $byCategory['not_yet_assessed']++;
            } elseif (in_array($state['category'], ['I', 'II', 'III'], true)) {
                $byCategory[$state['category']]++;
            } else {
                $byCategory['assessed_category_missing']++;
            }

            $age = $incident->patient?->ageAtDate($incident->bite_date ?? $to);
            if ($age === null) {
                $byAgeGroup['unknown']++;
            } elseif ($age < 15) {
                $byAgeGroup['below_15']++;
            } else {
                $byAgeGroup['15_above']++;
            }

            $gender = strtolower(trim((string) ($incident->patient?->gender ?? '')));
            $bySex[in_array($gender, ['male', 'female'], true) ? $gender : 'unknown']++;

            $animal = $this->queryService()->normalizedAnimalCategory($incident);
            $byAnimal[$animal]++;

            $plan = strtolower(trim((string) ($state['plan_type'] ?? '')));
            $planKey = $plan !== '' ? $plan : 'unassigned';
            $byPlanType[$planKey] = ($byPlanType[$planKey] ?? 0) + 1;
        }

        $exposureBarangays = $items
            ->groupBy(fn (array $item) => $item['exposure_geo']['barangay'])
            ->map(function (Collection $group, string $barangay) use ($priorExposureBarangays, $to): array {
                $firstGeo = $group->first()['exposure_geo'];
                $total = $group->count();
                $priorCount = $priorExposureBarangays->has($barangay)
                    ? $priorExposureBarangays->get($barangay)->count()
                    : 0;
                $cat1 = $group->filter(fn (array $i) => $i['state']['assessment'] === 'finalized' && $i['state']['category'] === 'I')->count();
                $cat2 = $group->filter(fn (array $i) => $i['state']['assessment'] === 'finalized' && $i['state']['category'] === 'II')->count();
                $cat3 = $group->filter(fn (array $i) => $i['state']['assessment'] === 'finalized' && $i['state']['category'] === 'III')->count();
                $assessedCatTotal = $cat1 + $cat2 + $cat3;
                $unassessed = $total - $assessedCatTotal;

                $children = $group->filter(function (array $i) use ($to): bool {
                    $age = $i['incident']->patient?->ageAtDate($i['incident']->bite_date ?? $to);
                    return $age !== null && $age < 15;
                })->count();

                $newPrescribed = $group->filter(fn (array $i) => $i['state']['pep_decision'] === 'new_course_prescribed');
                $newStarted = $newPrescribed->filter(fn (array $i) => (bool) ($i['state']['administration_evidence']['has_vaccine_administration'] ?? false))->count();

                $overdue = $this->outcomeResolver()->summarizeOverdueMetrics($group->pluck('state'));
                $delta = $total - $priorCount;

                return [
                    'barangay' => $barangay,
                    'municipality' => $firstGeo['municipality'],
                    'scope' => $firstGeo['scope'],
                    'total_cases' => $total,
                    'prior_cases' => $priorCount,
                    'delta' => $delta,
                    'pct_change' => $priorCount > 0 ? round(($delta / $priorCount) * 100, 1) : null,
                    'pct_change_reason' => $priorCount > 0 ? null : 'prior_period_zero',
                    'cat_1' => $cat1,
                    'cat_2' => $cat2,
                    'cat_3' => $cat3,
                    'unassessed' => $unassessed,
                    'cat_3_share_pct' => $assessedCatTotal > 0 ? round(($cat3 / $assessedCatTotal) * 100, 1) : null,
                    'children_below_15' => $children,
                    'new_course_prescribed' => $newPrescribed->count(),
                    'new_course_started' => $newStarted,
                    'initiation_rate_pct' => $newPrescribed->count() > 0 ? round(($newStarted / $newPrescribed->count()) * 100, 1) : null,
                    'overdue_episodes' => $overdue['overdue_episodes'],
                    'overdue_courses' => $overdue['overdue_courses'],
                    'outstanding_dose_slots' => $overdue['outstanding_dose_slots'],
                ];
            })
            ->sortByDesc('total_cases')
            ->values()
            ->all();

        $residenceBarangays = $items
            ->groupBy(fn (array $item) => $item['residence_geo']['barangay'])
            ->map(function (Collection $group, string $barangay): array {
                $firstGeo = $group->first()['residence_geo'];

                return [
                    'barangay' => $barangay,
                    'municipality' => $firstGeo['municipality'],
                    'scope' => $firstGeo['scope'],
                    'total_cases' => $group->count(),
                ];
            })
            ->sortByDesc('total_cases')
            ->values()
            ->all();

        $residenceScopeCounts = [
            'clinic_residents' => $items->filter(fn (array $i) => $i['residence_geo']['scope'] === 'clinic_resident')->count(),
            'outside_municipality_residents' => $items->filter(fn (array $i) => $i['residence_geo']['scope'] === 'outside_municipality')->count(),
            'unknown_residence' => $items->filter(fn (array $i) => $i['residence_geo']['scope'] === 'unknown')->count(),
        ];

        $weeklyTrend = $this->buildBoundedWeeklyTrend($items, $from, $to);

        return [
            'by_category' => $byCategory,
            'by_age_group' => $byAgeGroup,
            'by_sex' => $bySex,
            'by_animal' => $byAnimal,
            'by_plan_type' => $byPlanType,
            'by_exposure_barangay' => $exposureBarangays,
            'by_residence_barangay' => $residenceBarangays,
            'residence_summary' => $residenceScopeCounts,
            'weekly_trend' => $weeklyTrend,
        ];
    }

    private function buildBoundedWeeklyTrend(Collection $items, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rangeStart = $from->startOfDay();
        $rangeEnd = $to->startOfDay();
        $curr = $rangeStart->startOfWeek(CarbonInterface::MONDAY);
        $limit = $rangeEnd->endOfWeek(CarbonInterface::SUNDAY)->startOfDay();
        $weeks = [];

        while ($curr->lte($limit)) {
            $weekStart = $curr;
            $weekEnd = $curr->endOfWeek(CarbonInterface::SUNDAY)->startOfDay();
            $boundedStart = $weekStart->lt($rangeStart) ? $rangeStart : $weekStart;
            $boundedEnd = $weekEnd->gt($rangeEnd) ? $rangeEnd : $weekEnd;

            if ($boundedStart->lte($boundedEnd)) {
                $startStr = $boundedStart->toDateString();
                $endStr = $boundedEnd->toDateString();

                $weekItems = $items->filter(function (array $item) use ($startStr, $endStr): bool {
                    $dateStr = $item['incident']->bite_date?->toDateString();
                    return $dateStr !== null && $dateStr >= $startStr && $dateStr <= $endStr;
                });

                $weeks[] = [
                    'start_date' => $startStr,
                    'end_date' => $endStr,
                    'label' => $boundedStart->format('n/j/Y'),
                    'episodes' => $weekItems->count(),
                    'cat_I' => $weekItems->filter(fn (array $i) => $i['state']['assessment'] === 'finalized' && $i['state']['category'] === 'I')->count(),
                    'cat_II' => $weekItems->filter(fn (array $i) => $i['state']['assessment'] === 'finalized' && $i['state']['category'] === 'II')->count(),
                    'cat_III' => $weekItems->filter(fn (array $i) => $i['state']['assessment'] === 'finalized' && $i['state']['category'] === 'III')->count(),
                    'unassessed' => $weekItems->filter(fn (array $i) => $i['state']['assessment'] !== 'finalized')->count(),
                ];
            }

            $curr = $curr->addWeek();
        }

        return $weeks;
    }

    private function buildComparison(
        int $clinicId,
        ?Clinic $clinic,
        CarbonImmutable $from,
        CarbonImmutable $to,
        CarbonImmutable $cutoff,
        string $comparisonMode,
        array $filters,
        array $currentMetrics,
        array $currentD0
    ): array {
        if ($comparisonMode === 'none') {
            return [
                'prior_exposure_barangays' => collect(),
                'payload' => ['enabled' => false, 'mode' => 'none'],
            ];
        }

        $periodDays = max(1, (int) $from->startOfDay()->diffInDays($to->startOfDay()) + 1);
        $nowManila = CarbonImmutable::now('Asia/Manila')->endOfDay();
        $effectiveEnd = $cutoff->lt($to) ? $cutoff->startOfDay() : $to->startOfDay();
        $isPartial = $to->gt($cutoff) || $to->gt($nowManila);
        $elapsedDays = max(1, min($periodDays, (int) $from->startOfDay()->diffInDays($effectiveEnd) + 1));

        if ($comparisonMode === 'same_period_last_year') {
            $priorStart = $from->subYear()->startOfDay();
            $priorEnd = $priorStart->addDays(($isPartial ? $elapsedDays : $periodDays) - 1)->endOfDay();
        } else {
            $priorEnd = $from->subDay()->endOfDay();
            $priorStart = $priorEnd->startOfDay()->subDays(($isPartial ? $elapsedDays : $periodDays) - 1);
        }

        $priorCutoff = $priorEnd->endOfDay();
        $priorDataset = $this->queryService()->fetchPeriodDataset($clinicId, $priorStart, $priorEnd, $priorCutoff, $filters, $clinic);
        $priorItems = $priorDataset['all_eligible_episodes'];
        $priorUnknownItems = $priorDataset['unknown_exposure_date_episodes'];

        $priorMetrics = $this->aggregateEpisodeItems($priorItems, $priorUnknownItems, $priorCutoff, $priorEnd);
        $nonDateFilters = $this->stripDateAndGeographyComparisonDiffs($filters);
        $priorD0 = $this->queryService()->computeD0CohortMetrics($clinicId, $priorStart, $priorEnd, $priorCutoff, $nonDateFilters, $clinic);

        $curRec = $currentMetrics['reconciliation'];
        $priRec = $priorMetrics['reconciliation'];

        $curAssessedPct = $curRec['recorded_episodes'] > 0
            ? round(($curRec['finalized_assessments'] / $curRec['recorded_episodes']) * 100, 1)
            : null;
        $priAssessedPct = $priRec['recorded_episodes'] > 0
            ? round(($priRec['finalized_assessments'] / $priRec['recorded_episodes']) * 100, 1)
            : null;

        $curInitPct = $curRec['new_course_prescribed'] > 0
            ? round(($curRec['new_course_started'] / $curRec['new_course_prescribed']) * 100, 1)
            : null;
        $priInitPct = $priRec['new_course_prescribed'] > 0
            ? round(($priRec['new_course_started'] / $priRec['new_course_prescribed']) * 100, 1)
            : null;

        return [
            'prior_exposure_barangays' => $priorItems->groupBy(fn (array $item) => $item['exposure_geo']['barangay']),
            'payload' => [
                'enabled' => true,
                'mode' => $comparisonMode,
                'prior_start' => $priorStart->toDateString(),
                'prior_end' => $priorEnd->toDateString(),
                'prior_cutoff' => $priorCutoff->toDateString(),
                'is_partial_matched' => $isPartial,
                'matched_elapsed_days' => $isPartial ? $elapsedDays : $periodDays,
                'prior_record_count' => $priorItems->count(),
                'indicators' => [
                    'recorded_exposures' => $this->compareValues($curRec['recorded_episodes'], $priRec['recorded_episodes']),
                    'category_III' => $this->compareValues($curRec['cat_III'], $priRec['cat_III']),
                    'assessment_completion_pct' => $this->compareRateValues($curAssessedPct, $priAssessedPct),
                    'documented_pep_initiation_pct' => $this->compareRateValues($curInitPct, $priInitPct),
                    'mature_course_completion_pct' => $this->compareRateValues(
                        $currentD0['mature_completion_rate_pct'],
                        $priorD0['mature_completion_rate_pct']
                    ),
                ],
            ],
        ];
    }

    private function buildDataQuality(
        Collection $items,
        Collection $unknownDateItems,
        CarbonImmutable $cutoff
    ): array {
        $total = $items->count();
        $finalizedItems = $items->filter(fn (array $i) => $i['state']['assessment'] === 'finalized');
        $finalizedCount = $finalizedItems->count();

        $awaitingAssessment = $items->filter(fn (array $i) => $i['state']['assessment'] !== 'finalized')->count();
        $awaitingTreatment = $items->filter(fn (array $i) => in_array($i['state']['pep_decision'], ['new_course_prescribed', 'continue_course'], true)
            && !($i['state']['administration_evidence']['has_vaccine_administration'] ?? false))->count();

        $assessedCategoryMissing = $finalizedItems->filter(fn (array $i) => !in_array($i['state']['category'], ['I', 'II', 'III'], true))->count();
        $decisionMissing = $finalizedItems->filter(fn (array $i) => $i['state']['pep_decision'] === 'missing_after_finalization')->count();
        $rigIndicated = $items->filter(fn (array $i) => (bool) ($i['state']['rig_evidence']['rig_indicated'] ?? false))->count();
        $rigGap = $items->filter(fn (array $i) => (bool) ($i['state']['rig_evidence']['rig_administration_unverified'] ?? false))->count();
        $unknownLocation = $items->filter(fn (array $i) => $i['exposure_geo']['scope'] === 'unknown')->count();
        $unknownAnimal = $items->filter(fn (array $i) => $this->queryService()->normalizedAnimalCategory($i['incident']) === 'unknown')->count();
        $unknownAge = $items->filter(fn (array $i) => $i['incident']->patient?->ageAtDate($i['incident']->bite_date) === null)->count();
        $referralOutcomeUnknown = $items->filter(fn (array $i) => $i['state']['encounter_disposition'] === 'transferred_referred'
            && !($i['state']['administration_evidence']['has_external_vaccine'] ?? false))->count();
        $conflicts = $items->filter(fn (array $i) => $i['state']['pep_decision'] === 'conflict_review'
            || ($i['state']['assessment'] !== 'finalized' && (bool) ($i['state']['administration_evidence']['has_vaccine_administration'] ?? false)))->count();

        $ageBuckets = ['0_7_days' => 0, '8_30_days' => 0, 'over_30_days' => 0, 'total' => 0];
        foreach ($items as $item) {
            $reviewAge = $this->stateResolver()->computeReviewAgeInfo($item['incident'], $item['state'], $cutoff);
            if (!$reviewAge['is_unresolved_review']) {
                continue;
            }
            $ageBuckets['total']++;
            $bucket = $reviewAge['review_age_bucket'];
            if ($bucket !== null && isset($ageBuckets[$bucket])) {
                $ageBuckets[$bucket]++;
            }
        }

        return [
            'expected_pending' => [
                'awaiting_assessment' => $awaitingAssessment,
                'awaiting_treatment_no_admin' => $awaitingTreatment,
                'unknown_exposure_date_episodes' => $unknownDateItems->count(),
            ],
            'documentation_gaps' => [
                'assessed_category_missing' => $assessedCategoryMissing,
                'decision_missing_after_finalization' => $decisionMissing,
                'rig_indicated_no_verified_admin' => $rigGap,
                'unknown_exposure_location' => $unknownLocation,
                'unknown_animal_type' => $unknownAnimal,
                'unknown_patient_age' => $unknownAge,
                'referral_external_outcome_unknown' => $referralOutcomeUnknown,
                'conflicting_records' => $conflicts,
            ],
            'field_completeness' => [
                'category_after_finalization' => [
                    'missing_count' => $assessedCategoryMissing,
                    'eligible_count' => $finalizedCount,
                    'missing_pct' => $finalizedCount > 0 ? round(($assessedCategoryMissing / $finalizedCount) * 100, 1) : null,
                ],
                'treatment_decision_after_finalization' => [
                    'missing_count' => $decisionMissing,
                    'eligible_count' => $finalizedCount,
                    'missing_pct' => $finalizedCount > 0 ? round(($decisionMissing / $finalizedCount) * 100, 1) : null,
                ],
                'exposure_location' => [
                    'missing_count' => $unknownLocation,
                    'eligible_count' => $total,
                    'missing_pct' => $total > 0 ? round(($unknownLocation / $total) * 100, 1) : null,
                ],
                'patient_age' => [
                    'missing_count' => $unknownAge,
                    'eligible_count' => $total,
                    'missing_pct' => $total > 0 ? round(($unknownAge / $total) * 100, 1) : null,
                ],
                'rig_administration_when_indicated' => [
                    'missing_count' => $rigGap,
                    'eligible_count' => $rigIndicated,
                    'missing_pct' => $rigIndicated > 0 ? round(($rigGap / $rigIndicated) * 100, 1) : null,
                ],
            ],
            'unresolved_review_age_buckets' => $ageBuckets,
        ];
    }

    private function buildReconciliation(
        Collection $items,
        array $rec,
        array $d0Cohort,
        array $servicePeriod,
        array $backlog
    ): array {
        $isNewStartedCat = fn (array $item, string $cat): bool => $item['state']['assessment'] === 'finalized'
            && $item['state']['category'] === $cat
            && $item['state']['pep_decision'] === 'new_course_prescribed'
            && (bool) ($item['state']['administration_evidence']['has_vaccine_administration'] ?? false);

        $isNewCompletedCat = fn (array $item, string $cat): bool => $isNewStartedCat($item, $cat)
            && (bool) ($item['state']['course_outcome']['is_completed'] ?? false)
            && (bool) ($item['state']['course_outcome']['is_mature'] ?? false);

        $isRigVerifiedCat = fn (array $item, string $cat): bool => $item['state']['assessment'] === 'finalized'
            && $item['state']['category'] === $cat
            && (bool) ($item['state']['rig_evidence']['rig_administered'] ?? false);

        $compCat1 = $items->filter(fn (array $i) => $isNewCompletedCat($i, 'I'))->count();
        $compCat2 = $items->filter(fn (array $i) => $isNewCompletedCat($i, 'II'))->count();
        $compCat3 = $items->filter(fn (array $i) => $isNewCompletedCat($i, 'III'))->count();

        $pepCat1 = $items->filter(fn (array $i) => $isNewStartedCat($i, 'I'))->count();
        $pepCat2 = $items->filter(fn (array $i) => $isNewStartedCat($i, 'II'))->count();
        $pepCat3 = $items->filter(fn (array $i) => $isNewStartedCat($i, 'III'))->count();

        $rigCat1 = $items->filter(fn (array $i) => $isRigVerifiedCat($i, 'I'))->count();
        $rigCat2 = $items->filter(fn (array $i) => $isRigVerifiedCat($i, 'II'))->count();
        $rigCat3 = $items->filter(fn (array $i) => $isRigVerifiedCat($i, 'III'))->count();

        return [
            'recorded_episodes_bridge' => $rec['recorded_episodes_bridge'],
            'abtc_monthly_form' => [
                'cases_total' => (int) $rec['recorded_episodes'],
                'given_pep' => (int) $rec['new_course_started'],
                'cat_I' => (int) $rec['cat_I'],
                'cat_II' => (int) $rec['cat_II'],
                'cat_III' => (int) $rec['cat_III'],
                'cat_total' => (int) $rec['categorized_cases_total'],
                'unassessed_or_missing_category' => (int) $rec['unassessed_or_missing_category'],
                'completed_cat_I' => $compCat1,
                'completed_cat_II' => $compCat2,
                'completed_cat_III' => $compCat3,
                'completed_total' => $compCat1 + $compCat2 + $compCat3,
                'given_rig' => $rigCat1 + $rigCat2 + $rigCat3,
            ],
            'cohort_quarterly_form_slice' => [
                'cases_cat_I' => (int) $rec['cat_I'],
                'cases_cat_II' => (int) $rec['cat_II'],
                'cases_cat_III' => (int) $rec['cat_III'],
                'cases_total' => (int) $rec['categorized_cases_total'],
                'excluded_unassessed_or_missing_cat' => (int) $rec['unassessed_or_missing_category'],
                'given_pep_cat_I' => $pepCat1,
                'given_pep_cat_II' => $pepCat2,
                'given_pep_cat_III' => $pepCat3,
                'given_pep_total' => $pepCat1 + $pepCat2 + $pepCat3,
                'completed_cat_I' => $compCat1,
                'completed_cat_II' => $compCat2,
                'completed_cat_III' => $compCat3,
                'completed_total' => $compCat1 + $compCat2 + $compCat3,
                'given_rig_cat_I' => $rigCat1,
                'given_rig_cat_II' => $rigCat2,
                'given_rig_cat_III' => $rigCat3,
                'given_rig_total' => $rigCat1 + $rigCat2 + $rigCat3,
            ],
            'd0_cohort' => $d0Cohort,
            'service_period' => $servicePeriod,
            'backlog_at_cutoff' => $backlog,
        ];
    }

    private function resolvePeriodAndCutoff(array $params): array
    {
        $now = CarbonImmutable::now('Asia/Manila');

        if (!empty($params['from'])) {
            $from = CarbonImmutable::parse($params['from'])->startOfDay();
            $to = !empty($params['to'])
                ? CarbonImmutable::parse($params['to'])->endOfDay()
                : $from->endOfMonth()->endOfDay();
        } elseif (!empty($params['month'])) {
            $monthStart = CarbonImmutable::parse($params['month'] . '-01');
            $from = $monthStart->startOfMonth()->startOfDay();
            $to = $monthStart->endOfMonth()->endOfDay();
        } elseif (!empty($params['quarter']) && !empty($params['year'])) {
            $qMap = ['1' => 1, '1st' => 1, 'Q1' => 1, '2' => 2, '2nd' => 2, 'Q2' => 2, '3' => 3, '3rd' => 3, 'Q3' => 3, '4' => 4, '4th' => 4, 'Q4' => 4];
            $q = $qMap[$params['quarter']] ?? 1;
            $startMonth = (($q - 1) * 3) + 1;
            $from = CarbonImmutable::create((int) $params['year'], $startMonth, 1)->startOfDay();
            $to = $from->addMonths(2)->endOfMonth()->endOfDay();
        } elseif (!empty($params['year'])) {
            $from = CarbonImmutable::create((int) $params['year'], 1, 1)->startOfDay();
            $to = CarbonImmutable::create((int) $params['year'], 12, 31)->endOfDay();
        } else {
            // Default to last completed quarter
            $lastQuarter = $now->subQuarter();
            $from = $lastQuarter->firstOfQuarter()->startOfDay();
            $to = $lastQuarter->lastOfQuarter()->endOfDay();
        }

        if ($from->gt($to)) {
            [$from, $to] = [$to->startOfDay(), $from->endOfDay()];
        }

        $cutoff = !empty($params['cutoff'])
            ? CarbonImmutable::parse($params['cutoff'])->endOfDay()
            : $to->endOfDay();

        $comparison = strtolower(trim((string) ($params['comparison'] ?? 'previous_period')));
        if (!in_array($comparison, ['previous_period', 'same_period_last_year', 'none'], true)) {
            $comparison = 'previous_period';
        }

        return [
            'from' => $from,
            'to' => $to,
            'cutoff' => $cutoff,
            'comparison' => $comparison,
        ];
    }

    private function normalizeFilters(array $params): array
    {
        return [
            'date_basis' => strtolower(trim((string) ($params['date_basis'] ?? 'exposure_date'))),
            'category' => trim((string) ($params['category'] ?? $params['severity'] ?? 'ALL')) ?: 'ALL',
            'status' => strtolower(trim((string) ($params['status'] ?? 'all'))) ?: 'all',
            'animal' => strtolower(trim((string) ($params['animal'] ?? 'all'))) ?: 'all',
            'sex' => strtolower(trim((string) ($params['sex'] ?? 'all'))) ?: 'all',
            'age_group' => strtolower(trim((string) ($params['age_group'] ?? 'all'))) ?: 'all',
            'plan_type' => strtolower(trim((string) ($params['plan_type'] ?? 'all'))) ?: 'all',
            'barangay' => trim((string) ($params['barangay'] ?? '')),
            'geography_basis' => strtolower(trim((string) ($params['geography_basis'] ?? 'exposure'))) ?: 'exposure',
            'search' => trim((string) ($params['search'] ?? '')),
            'buffer_days' => !empty($params['buffer_days']) ? (int) $params['buffer_days'] : 14,
        ];
    }

    private function stripDateAndGeographyComparisonDiffs(array $filters): array
    {
        return $filters;
    }

    private function makeIndicator(
        string $metricId,
        string $label,
        int|float|null $value,
        ?int $numerator,
        ?int $denominator,
        string $unit,
        string $dateBasis,
        ?string $unavailableReason = null,
        array $extra = []
    ): array {
        return array_merge([
            'metric_id' => $metricId,
            'label' => $label,
            'value' => $value,
            'numerator' => $numerator,
            'denominator' => $denominator,
            'unit' => $unit,
            'date_basis' => $dateBasis,
            'rule_version' => self::RULE_VERSION,
            'unavailable_reason' => $unavailableReason,
        ], $extra);
    }

    private function compareValues(int|float $current, int|float $prior): array
    {
        $delta = $current - $prior;

        return [
            'current' => $current,
            'prior' => $prior,
            'delta' => $delta,
            'pct_change' => $prior > 0 ? round(($delta / $prior) * 100, 1) : null,
            'pct_change_reason' => $prior > 0 ? null : ($current === 0 ? 'both_zero' : 'prior_period_zero'),
        ];
    }

    private function compareRateValues(?float $current, ?float $prior): array
    {
        if ($current === null || $prior === null) {
            return [
                'current' => $current,
                'prior' => $prior,
                'delta_percentage_points' => null,
                'reason' => $prior === null ? 'prior_denominator_zero' : 'current_denominator_zero',
            ];
        }

        return [
            'current' => $current,
            'prior' => $prior,
            'delta_percentage_points' => round($current - $prior, 1),
            'reason' => null,
        ];
    }

    private function matchesDrilldownBucket(array $item, string $bucket, CarbonInterface $cutoff): bool
    {
        $state = $item['state'];
        $course = $state['course_outcome'];
        $rig = $state['rig_evidence'];
        $admin = $state['administration_evidence'];
        $stageKey = (string) ($state['stage_summary']['last_completed_stage'] ?? '');

        return match ($bucket) {
            '', 'all', 'unknown_exposure_date' => true,
            'awaiting_assessment' => $state['assessment'] !== 'finalized',
            'finalized_assessments' => $state['assessment'] === 'finalized',
            'pep_prescribed' => in_array($state['pep_decision'], ['new_course_prescribed', 'continue_course'], true),
            'new_course_prescribed' => $state['pep_decision'] === 'new_course_prescribed',
            'new_course_started' => $state['pep_decision'] === 'new_course_prescribed'
                && (bool) ($admin['has_vaccine_administration'] ?? false),
            'verified_vaccine_initiation' => in_array($state['pep_decision'], ['new_course_prescribed', 'continue_course'], true)
                && (bool) ($admin['has_vaccine_administration'] ?? false),
            'no_administration_recorded' => $state['pep_decision'] === 'new_course_prescribed'
                && !($admin['has_vaccine_administration'] ?? false),
            'continuing_episodes' => $state['pep_decision'] === 'continue_course',
            'explicit_no_pep' => $state['pep_decision'] === 'explicit_no_pep',
            'decision_missing' => $state['pep_decision'] === 'missing_after_finalization',
            'assessed_category_missing' => $state['assessment'] === 'finalized'
                && !in_array($state['category'], ['I', 'II', 'III'], true),
            'transferred_referred' => $state['encounter_disposition'] === 'transferred_referred',
            'rig_indicated' => (bool) ($rig['rig_indicated'] ?? false),
            'rig_verified' => (bool) ($rig['rig_administered'] ?? false),
            'overdue' => (bool) ($course['is_overdue'] ?? false),
            'unresolved_review' => (bool) $this->stateResolver()->computeReviewAgeInfo($item['incident'], $state, $cutoff)['is_unresolved_review'],
            'unresolved_review_0_7_days' => $this->stateResolver()->computeReviewAgeInfo($item['incident'], $state, $cutoff)['review_age_bucket'] === '0_7_days',
            'unresolved_review_8_30_days' => $this->stateResolver()->computeReviewAgeInfo($item['incident'], $state, $cutoff)['review_age_bucket'] === '8_30_days',
            'unresolved_review_over_30_days' => $this->stateResolver()->computeReviewAgeInfo($item['incident'], $state, $cutoff)['review_age_bucket'] === 'over_30_days',
            'form_1_registration', 'form_1_registration_only' => $stageKey === 'form_1_registration',
            'form_2_pep_prescribed' => $stageKey === 'form_2_pep_prescribed',
            'form_2_no_pep' => $stageKey === 'form_2_no_pep',
            'form_2_transferred' => $stageKey === 'form_2_transferred',
            'form_3_treatment_recorded' => $stageKey === 'form_3_treatment_recorded',
            default => true,
        };
    }

    private function buildCacheKey(
        int $clinicId,
        string $privacyMode,
        string $from,
        string $to,
        string $cutoff,
        string $comparisonMode,
        array $normalizedFilters
    ): string {
        ksort($normalizedFilters);
        $hash = md5(json_encode($normalizedFilters, JSON_THROW_ON_ERROR));

        return sprintf(
            'reports:bite-summary:%s:clinic:%d:%s:%s:%s:%s:%s:%s',
            self::RULE_VERSION,
            $clinicId,
            $privacyMode,
            $from,
            $to,
            $cutoff,
            $comparisonMode,
            $hash
        );
    }

    private function metricDefinitions(): array
    {
        return [
            'EXP01' => ['label' => 'Recorded exposure episodes', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'EXP02' => ['label' => 'Unique patients', 'unit' => 'patients', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'EXP03' => ['label' => 'Registered episodes with unknown exposure date', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'AS01' => ['label' => 'Finalized assessments', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'AS02' => ['label' => 'Assessment completion', 'unit' => 'percent', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'AS03' => ['label' => 'No finalized assessment recorded', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'CAT01' => ['label' => 'Exposure categories (I, II, III, unassessed, assessed-missing)', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'CAT02' => ['label' => 'Category III share of assessed episodes', 'unit' => 'percent', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'DEC01' => ['label' => 'No PEP required', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'DEC02' => ['label' => 'Treatment decision missing', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'PEP01' => ['label' => 'New-course PEP prescribed', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'PEP02' => ['label' => 'Documented new-course initiation', 'unit' => 'percent', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'PEP03' => ['label' => 'No administration recorded for new course', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'PEP04' => ['label' => 'Continuing-course episodes', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'OUT01' => ['label' => 'Mature started courses', 'unit' => 'courses', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'OUT02' => ['label' => 'Mature-cohort completion', 'unit' => 'percent', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'OUT03' => ['label' => 'Started courses not yet mature', 'unit' => 'courses', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'FU01' => ['label' => 'Overdue episodes / patients / courses / dose slots', 'unit' => 'multiple', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'RIG01' => ['label' => 'Verified RIG receipt among indicated episodes', 'unit' => 'percent', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'REF01' => ['label' => 'Transferred or referred episodes', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'SVC01' => ['label' => 'Local ARV administration events', 'unit' => 'events', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'SVC02' => ['label' => 'Verified external ARV events', 'unit' => 'events', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'PROFILE01' => ['label' => 'Age / sex / animal / geography distributions', 'unit' => 'episodes', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'TREND01' => ['label' => 'Period change', 'unit' => 'delta', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'QUALITY01' => ['label' => 'Field availability', 'unit' => 'percent', 'classification' => 'local_operational', 'rule_version' => self::RULE_VERSION],
            'HR01' => ['label' => 'Human rabies', 'unit' => 'cases', 'classification' => 'provisional_unavailable', 'rule_version' => self::RULE_VERSION],
        ];
    }
}
