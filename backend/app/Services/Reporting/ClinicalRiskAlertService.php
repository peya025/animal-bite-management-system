<?php

namespace App\Services\Reporting;

use App\Models\BiteIncident;
use App\Models\Clinic;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Unified clinical risk & surveillance alert engine for Bite Cases Summary,
 * Staff Notifications, and Public Health Advisories.
 *
 * Replaces legacy single-case severity ratio formulas with evidence-based:
 * - Category III / RIG pending urgency (<48h safety net)
 * - Overdue PEP follow-up escalation (1-2d warning vs >=3d critical)
 * - High-risk biting animal conditions (died / sick)
 * - Normalized 7-day rolling barangay cluster & surge detection
 *   (strictly excluding Unknown / Place not recorded & provisional dates)
 * - Stale unassessed (>48h) & data completeness safeguards
 */
class ClinicalRiskAlertService
{
    public const RULE_VERSION = 'bcs-clinical-alerts-v1';

    public const CLUSTER_MIN_7D_CASES = 3;
    public const CLUSTER_MIN_7D_CAT3 = 2;
    public const SURGE_MIN_7D_CASES = 2;
    public const SURGE_RATIO_THRESHOLD = 2.0;

    public const RIG_URGENT_WINDOW_HOURS = 48;
    public const UNASSESSED_STALE_HOURS = 48;

    public const UNKNOWN_LOCATION_WARN_PCT = 20.0;
    public const UNKNOWN_LOCATION_WARN_MIN_COUNT = 3;

    private const UNKNOWN_PLACE_TOKENS = [
        '',
        'unknown',
        'not recorded',
        'unrecorded',
        'place not recorded',
        'n/a',
        'na',
        'none',
    ];

    public function __construct(
        protected ?TreatmentOutcomeResolver $outcomeResolver = null,
        protected ?EpisodeReportingStateResolver $stateResolver = null,
        protected ?ExposureReportingQuery $reportingQuery = null,
    ) {}

    private function outcomeResolver(): TreatmentOutcomeResolver
    {
        return $this->outcomeResolver ??= app(TreatmentOutcomeResolver::class);
    }

    private function stateResolver(): EpisodeReportingStateResolver
    {
        return $this->stateResolver ??= new EpisodeReportingStateResolver($this->outcomeResolver());
    }

    private function reportingQuery(): ExposureReportingQuery
    {
        return $this->reportingQuery ??= new ExposureReportingQuery($this->stateResolver(), $this->outcomeResolver());
    }

    /**
     * Detect genuine 7-day rolling barangay clusters and surges against the prior 30-day weekly baseline.
     *
     * Rules:
     * - Excludes void/voided/duplicate cases and provisional exposure dates.
     * - Strictly excludes Unknown / Place not recorded locations (never falls back to home address).
     * - Includes verified Form 1 awaiting-assessment episodes in total 7-day volume (for early detection),
     *   while only doctor-finalized Category III episodes count toward the Cat III cluster rule.
     * - Cluster (critical): >= 3 verified cases in 7 days OR >= 2 finalized Category III cases in 7 days.
     * - Surge (warning): >= 2 verified cases in 7 days AND 7-day count >= 2.0x prior 30-day weekly average.
     */
    public function detectBarangaySurges(
        int $clinicId,
        CarbonInterface|string|null $asOf = null,
        ?Clinic $clinic = null
    ): array {
        $clinic ??= Clinic::find($clinicId);
        $clinicMunicipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $clinicProvince = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $cutoffEnd = $asOf instanceof CarbonInterface
            ? CarbonImmutable::instance($asOf)->endOfDay()
            : (is_string($asOf) && trim($asOf) !== ''
                ? CarbonImmutable::parse($asOf)->endOfDay()
                : CarbonImmutable::now('Asia/Manila')->endOfDay());

        $window7dEnd = $cutoffEnd->startOfDay();
        $window7dStart = $window7dEnd->subDays(6);
        $baseline30dEnd = $window7dStart->subDay();
        $baseline30dStart = $baseline30dEnd->subDays(29);

        $rawIncidents = BiteIncident::where('clinic_id', $clinicId)
            ->whereNotNull('bite_date')
            ->whereDate('bite_date', '>=', $baseline30dStart->toDateString())
            ->whereDate('bite_date', '<=', $window7dEnd->toDateString())
            ->with(['intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])
            ->get()
            ->reject(fn (BiteIncident $case) => in_array(strtolower(trim((string) $case->status)), ['void', 'voided', 'duplicate'], true))
            ->values();

        $provisionalExcluded7d = 0;
        $totalVerified7d = 0;
        $unknownLocation7d = 0;

        /** @var array<string, array<string, mixed>> $buckets */
        $buckets = [];

        foreach ($rawIncidents as $incident) {
            $biteDate = CarbonImmutable::parse($incident->bite_date)->startOfDay();
            $inCurrent7d = $biteDate->gte($window7dStart) && $biteDate->lte($window7dEnd);

            if ($incident->hasProvisionalBiteDate()) {
                if ($inCurrent7d) {
                    $provisionalExcluded7d++;
                }
                continue;
            }

            $geo = $this->reportingQuery()->normalizeExposureGeography($incident, $clinicMunicipality, $clinicProvince);
            $isUnknownPlace = $this->isUnknownGeography($geo);

            if ($inCurrent7d) {
                $totalVerified7d++;
                if ($isUnknownPlace) {
                    $unknownLocation7d++;
                }
            }

            if ($isUnknownPlace) {
                continue;
            }

            $barangay = $geo['barangay'];
            $bucketKey = self::geographyKey($geo);
            if (!isset($buckets[$bucketKey])) {
                $buckets[$bucketKey] = [
                    'barangay' => $barangay,
                    'municipality' => $geo['municipality'],
                    'province' => $geo['province'],
                    'scope' => $geo['scope'],
                    'total_7d' => 0,
                    'cat_1_7d' => 0,
                    'cat_2_7d' => 0,
                    'cat_3_7d' => 0,
                    'awaiting_assessment_7d' => 0,
                    'baseline_30d_total' => 0,
                    'latest_bite_date' => null,
                ];
            }

            if ($inCurrent7d) {
                $state = $this->stateResolver()->resolve($incident, $cutoffEnd);
                $buckets[$bucketKey]['total_7d']++;

                if ($state['assessment'] !== 'finalized') {
                    $buckets[$bucketKey]['awaiting_assessment_7d']++;
                } elseif ($state['category'] === 'III') {
                    $buckets[$bucketKey]['cat_3_7d']++;
                } elseif ($state['category'] === 'II') {
                    $buckets[$bucketKey]['cat_2_7d']++;
                } elseif ($state['category'] === 'I') {
                    $buckets[$bucketKey]['cat_1_7d']++;
                }

                $biteDateStr = $biteDate->toDateString();
                if ($buckets[$bucketKey]['latest_bite_date'] === null || $biteDateStr > $buckets[$bucketKey]['latest_bite_date']) {
                    $buckets[$bucketKey]['latest_bite_date'] = $biteDateStr;
                }
            } else {
                $buckets[$bucketKey]['baseline_30d_total']++;
            }
        }

        $alerts = [];
        $alertMap = [];

        foreach ($buckets as $bucketKey => $stats) {
            $barangay = $stats['barangay'];
            $total7d = (int) $stats['total_7d'];
            $cat3_7d = (int) $stats['cat_3_7d'];
            $awaiting7d = (int) $stats['awaiting_assessment_7d'];
            $baseline30d = (int) $stats['baseline_30d_total'];
            $baselineWeeklyAvg = $baseline30d * (7 / 30);
            $surgeRatio = $baselineWeeklyAvg > 0 ? $total7d / $baselineWeeklyAvg : null;

            $isCluster = $total7d >= self::CLUSTER_MIN_7D_CASES || $cat3_7d >= self::CLUSTER_MIN_7D_CAT3;
            $isSurge = !$isCluster
                && $total7d >= self::SURGE_MIN_7D_CASES
                && $surgeRatio !== null
                && $surgeRatio >= self::SURGE_RATIO_THRESHOLD;

            if (!$isCluster && !$isSurge) {
                continue;
            }

            $level = $isCluster ? 'cluster' : 'surge';
            $severity = $isCluster ? 'critical' : 'warning';

            $detailParts = [];
            if ($cat3_7d > 0) {
                $detailParts[] = "{$cat3_7d} Category III";
            }
            if ($awaiting7d > 0) {
                $detailParts[] = "{$awaiting7d} awaiting assessment";
            }
            $detailSuffix = !empty($detailParts) ? ' (' . implode(', ', $detailParts) . ')' : '';

            if ($isCluster) {
                $reason = $cat3_7d >= self::CLUSTER_MIN_7D_CAT3 && $total7d < self::CLUSTER_MIN_7D_CASES
                    ? "{$cat3_7d} finalized Category III bite exposures recorded in the last 7 days{$detailSuffix}."
                    : "{$total7d} verified bite exposures recorded in the last 7 days{$detailSuffix}.";
            } else {
                $reason = "{$total7d} verified bite exposures in the last 7 days ({$surgeRatio}x the prior 30-day weekly average of {$baselineWeeklyAvg}){$detailSuffix}.";
            }

            $alertItem = [
                'barangay' => $barangay,
                'municipality' => $stats['municipality'],
                'province' => $stats['province'],
                'geography_key' => $bucketKey,
                'scope' => $stats['scope'],
                'level' => $level,
                'severity' => $severity,
                'total_7d' => $total7d,
                'cat_1_7d' => (int) $stats['cat_1_7d'],
                'cat_2_7d' => (int) $stats['cat_2_7d'],
                'cat_3_7d' => $cat3_7d,
                'awaiting_assessment_7d' => $awaiting7d,
                'baseline_30d_total' => $baseline30d,
                'baseline_weekly_avg' => $baselineWeeklyAvg,
                'surge_ratio' => $surgeRatio,
                'latest_bite_date' => $stats['latest_bite_date'],
                'reason' => $reason,
                'disclaimer' => 'Facility-based surveillance metric measuring recent bite exposure clustering; does not represent confirmed rabies infection.',
            ];

            $alerts[] = $alertItem;
            $alertMap[$bucketKey] = $alertItem;
        }

        usort($alerts, function (array $a, array $b): int {
            $rankA = $a['level'] === 'cluster' ? 2 : 1;
            $rankB = $b['level'] === 'cluster' ? 2 : 1;
            if ($rankA !== $rankB) {
                return $rankB <=> $rankA;
            }
            if ($a['cat_3_7d'] !== $b['cat_3_7d']) {
                return $b['cat_3_7d'] <=> $a['cat_3_7d'];
            }

            return $b['total_7d'] <=> $a['total_7d'];
        });

        return [
            'rule_version' => self::RULE_VERSION,
            'as_of' => $window7dEnd->toDateString(),
            'window_7d_start' => $window7dStart->toDateString(),
            'window_7d_end' => $window7dEnd->toDateString(),
            'baseline_30d_start' => $baseline30dStart->toDateString(),
            'baseline_30d_end' => $baseline30dEnd->toDateString(),
            'total_verified_7d' => $totalVerified7d,
            'unknown_location_7d' => $unknownLocation7d,
            'provisional_date_excluded_7d' => $provisionalExcluded7d,
            'alerts' => $alerts,
            'alert_map' => $alertMap,
        ];
    }

    public static function geographyKey(array $geo): string
    {
        return hash('sha256', json_encode(array_map(fn ($value) => mb_strtolower(trim((string) $value)),
            [$geo['province'] ?? '', $geo['municipality'] ?? '', $geo['barangay'] ?? '']), JSON_THROW_ON_ERROR));
    }

    /**
     * Build the structured Clinical Risk Alerts summary for the Bite Cases Summary dashboard.
     */
    public function summarizeClinicalAlerts(
        Collection $cases,
        array $resolvedMap,
        array $overdueMetrics,
        array $reconciliation,
        int $unknownExposureDateCount,
        CarbonInterface $cutoff,
        ExposureReportingQuery $reportingQuery,
        EpisodeReportingStateResolver $stateResolver,
        string $clinicMunicipality,
        string $clinicProvince,
        array $surgeSummary = []
    ): array {
        $totalRecorded = $cases->count();
        $rigPendingTotal = 0;
        $rigPendingUrgent48h = 0;
        $rigPendingOver48h = 0;

        $overdueCritical3dPlus = 0;
        $overdueWarning1to2d = 0;

        $animalDiedCount = 0;
        $animalSickCount = 0;

        $unassessedOver48h = 0;
        $unresolvedOver30d = 0;
        $unknownLocationCount = 0;

        foreach ($cases as $case) {
            $state = $resolvedMap[$case->bite_id] ?? null;
            if (!$state) {
                continue;
            }

            if ($this->isRigPending($state)) {
                $rigPendingTotal++;
                $hours = $this->rigPendingHours($case, $state, $cutoff);
                if ($hours !== null && $hours <= self::RIG_URGENT_WINDOW_HOURS) {
                    $rigPendingUrgent48h++;
                } else {
                    $rigPendingOver48h++;
                }
            }

            $course = $state['course_outcome'] ?? [];
            if (!empty($course['is_overdue'])) {
                $daysOverdue = (int) ($course['days_overdue'] ?? 0);
                if ($daysOverdue >= 3) {
                    $overdueCritical3dPlus++;
                } elseif ($daysOverdue >= 1) {
                    $overdueWarning1to2d++;
                }
            }

            $animalCondition = $reportingQuery->normalizedAnimalCondition($case);
            if ($animalCondition === 'died') {
                $animalDiedCount++;
            } elseif ($animalCondition === 'sick') {
                $animalSickCount++;
            }

            if ($this->isUnassessedOver48Hours($case, $state, $cutoff)) {
                $unassessedOver48h++;
            }

            $reviewAge = $stateResolver->computeReviewAgeInfo($case, $state, $cutoff);
            if (($reviewAge['review_age_bucket'] ?? null) === 'over_30_days') {
                $unresolvedOver30d++;
            }

            $geo = $reportingQuery->normalizeExposureGeography($case, $clinicMunicipality, $clinicProvince);
            if ($this->isUnknownGeography($geo)) {
                $unknownLocationCount++;
            }
        }

        $unknownLocationPct = $totalRecorded > 0
            ? round(($unknownLocationCount / $totalRecorded) * 100, 1)
            : 0.0;
        $unknownLocationWarning = $unknownLocationCount >= self::UNKNOWN_LOCATION_WARN_MIN_COUNT
            || ($totalRecorded >= 5 && $unknownLocationPct >= self::UNKNOWN_LOCATION_WARN_PCT);

        $barangaySurges = array_values($surgeSummary['alerts'] ?? []);
        $clusterZones = array_values(array_map(
            fn (array $a) => $a['barangay'],
            array_filter($barangaySurges, fn (array $a) => ($a['level'] ?? '') === 'cluster')
        ));
        $surgeZones = array_values(array_map(
            fn (array $a) => $a['barangay'],
            array_filter($barangaySurges, fn (array $a) => ($a['level'] ?? '') === 'surge')
        ));

        $overdueEpisodes = (int) ($overdueMetrics['overdue_episodes'] ?? 0);
        $animalHighRiskTotal = $animalDiedCount + $animalSickCount;

        $hasCriticalAlerts = $rigPendingTotal > 0
            || $overdueCritical3dPlus > 0
            || $animalDiedCount > 0;

        return [
            'rule_version' => self::RULE_VERSION,
            'cutoff' => CarbonImmutable::instance($cutoff)->toDateString(),
            'has_critical_alerts' => $hasCriticalAlerts,
            'rig_pending' => [
                'total' => $rigPendingTotal,
                'urgent_within_48h' => $rigPendingUrgent48h,
                'over_48h' => $rigPendingOver48h,
            ],
            'overdue_pep' => [
                'overdue_episodes' => $overdueEpisodes,
                'critical_3d_plus' => $overdueCritical3dPlus,
                'warning_1_2d' => $overdueWarning1to2d,
                'overdue_patients' => (int) ($overdueMetrics['overdue_patients'] ?? 0),
                'overdue_courses' => (int) ($overdueMetrics['overdue_courses'] ?? 0),
                'outstanding_dose_slots' => (int) ($overdueMetrics['outstanding_dose_slots'] ?? 0),
            ],
            'high_risk_animals' => [
                'died' => $animalDiedCount,
                'sick' => $animalSickCount,
                'total' => $animalHighRiskTotal,
            ],
            'workflow_pending' => [
                'awaiting_assessment' => (int) ($reconciliation['awaiting_assessment'] ?? 0),
                'unassessed_over_48h' => $unassessedOver48h,
                'no_administration_recorded' => (int) ($reconciliation['new_course_no_receipt'] ?? $reconciliation['no_administration_recorded'] ?? 0),
                'unresolved_over_30_days' => $unresolvedOver30d,
                'assessed_category_missing' => (int) ($reconciliation['assessed_category_missing'] ?? 0),
            ],
            'data_completeness' => [
                'unknown_location_count' => $unknownLocationCount,
                'unknown_location_pct' => $unknownLocationPct,
                'unknown_location_warning' => $unknownLocationWarning,
                'provisional_exposure_date_count' => $unknownExposureDateCount,
                'unknown_location_7d' => (int) ($surgeSummary['unknown_location_7d'] ?? 0),
            ],
            'barangay_surges' => $barangaySurges,
            'cluster_zones' => $clusterZones,
            'surge_zones' => $surgeZones,
        ];
    }

    /**
     * True when RIG is clinically indicated (or finalized Category III with active PEP) without verified administration.
     */
    public function isRigPending(array $state): bool
    {
        $rig = $state['rig_evidence'] ?? [];
        if (!empty($rig['rig_administered'])) {
            return false;
        }
        if (($state['encounter_disposition'] ?? '') === 'transferred_referred') {
            return false;
        }

        if (!empty($rig['rig_administration_unverified']) || !empty($rig['rig_indicated'])) {
            return true;
        }

        return ($state['assessment'] ?? '') === 'finalized'
            && ($state['category'] ?? '') === 'III'
            && in_array($state['pep_decision'] ?? '', ['new_course_prescribed', 'continue_course'], true);
    }

    /**
     * Elapsed hours since assessment/registration/exposure as of cutoff for RIG 48h safety window.
     */
    public function rigPendingHours(BiteIncident $incident, array $state, CarbonInterface $cutoff): ?int
    {
        $ref = $incident->confirmed_at
            ?? ($state['assessment_date'] ? CarbonImmutable::parse($state['assessment_date'])->startOfDay() : null)
            ?? $incident->created_at
            ?? $incident->bite_date;

        if ($ref === null) {
            return null;
        }

        $refTime = $ref instanceof CarbonInterface ? CarbonImmutable::instance($ref) : CarbonImmutable::parse($ref);
        $cutoffEnd = CarbonImmutable::instance($cutoff);

        return max(0, (int) $refTime->diffInHours($cutoffEnd, false));
    }

    /**
     * True when a Form 1 registration has remained unassessed for more than 48 hours as of cutoff.
     */
    public function isUnassessedOver48Hours(BiteIncident $incident, array $state, CarbonInterface $cutoff): bool
    {
        if (($state['assessment'] ?? '') === 'finalized') {
            return false;
        }
        if (($state['encounter_disposition'] ?? '') === 'transferred_referred') {
            return false;
        }

        $ref = $incident->created_at ?? $incident->bite_date;
        if ($ref === null) {
            return false;
        }

        $refTime = $ref instanceof CarbonInterface ? CarbonImmutable::instance($ref) : CarbonImmutable::parse($ref);
        $cutoffEnd = CarbonImmutable::instance($cutoff);

        return $refTime->diffInHours($cutoffEnd, false) > self::UNASSESSED_STALE_HOURS;
    }

    public function isUnknownGeography(array $geo): bool
    {
        if (($geo['scope'] ?? 'unknown') === 'unknown') {
            return true;
        }

        $normalized = strtolower(trim((string) ($geo['barangay'] ?? '')));

        return in_array($normalized, self::UNKNOWN_PLACE_TOKENS, true);
    }
}
