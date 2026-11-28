<?php

namespace App\Services;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\User;
use App\Services\Reporting\EpisodeReportingStateResolver;
use App\Services\Reporting\ExposureReportingQuery;
use App\Services\Reporting\ReportingMetricService;
use App\Services\Reporting\TreatmentOutcomeResolver;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DohReportService
{
    public function __construct(
        protected ?EpisodeReportingStateResolver $stateResolver = null,
        protected ?TreatmentOutcomeResolver $outcomeResolver = null,
        protected ?ExposureReportingQuery $reportingQuery = null,
        protected ?ReportingMetricService $reportingMetricService = null,
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

    private function reportingMetricService(): ReportingMetricService
    {
        return $this->reportingMetricService ??= new ReportingMetricService(
            $this->reportingQuery(),
            $this->stateResolver(),
            $this->outcomeResolver()
        );
    }

    /**
     * Compute D0-cohort and service-period metrics from a single ARV activity pool.
     */
    private function resolvePeriodSplitMetrics(
        int $clinicId,
        CarbonInterface $from,
        CarbonInterface $to,
        CarbonImmutable $cutoff,
        ?string $category,
        ?Clinic $clinic,
        ?Collection $preloadedArvPool = null
    ): array {
        $arvPool = $preloadedArvPool ?? $this->reportingQuery()->fetchIncidentsWithArvActivityInRange(
            $clinicId,
            $from->toDateString(),
            $to->toDateString()
        );
        $filters = ['category' => $category];

        return [
            'd0_cohort_metrics' => $this->reportingQuery()->computeD0CohortMetrics(
                $clinicId,
                $from,
                $to,
                $cutoff,
                $filters,
                $clinic,
                $arvPool
            ),
            'service_period_metrics' => $this->reportingQuery()->computeServicePeriodMetrics(
                $clinicId,
                $from,
                $to,
                $cutoff,
                $filters,
                $clinic,
                $arvPool
            ),
        ];
    }

    private function isNewCourseStarted(array $state): bool
    {
        return ($state['pep_decision'] ?? '') !== 'continue_course'
            && (bool) ($state['administration_evidence']['has_vaccine_administration'] ?? false);
    }

    private function isNewCourseCompleted(array $state): bool
    {
        return ($state['pep_decision'] ?? '') !== 'continue_course'
            && (bool) ($state['course_outcome']['is_completed'] ?? false);
    }

    private function buildCohortFormSlice(array $bucket, int $excludedUnassessedOrMissingCat): array
    {
        return [
            'cases_cat_I' => (int) ($bucket['cat_I']['cases'] ?? 0),
            'cases_cat_II' => (int) ($bucket['cat_II']['cases'] ?? 0),
            'cases_cat_III' => (int) ($bucket['cat_III']['cases'] ?? 0),
            'cases_total' => (int) ($bucket['total']['cases'] ?? 0),
            'excluded_unassessed_or_missing_cat' => $excludedUnassessedOrMissingCat,
            'given_pep_cat_I' => (int) ($bucket['cat_I']['given_pep'] ?? 0),
            'given_pep_cat_II' => (int) ($bucket['cat_II']['given_pep'] ?? 0),
            'given_pep_cat_III' => (int) ($bucket['cat_III']['given_pep'] ?? 0),
            'given_pep_total' => (int) ($bucket['total']['given_pep'] ?? 0),
            'completed_cat_I' => (int) ($bucket['cat_I']['completed'] ?? 0),
            'completed_cat_II' => (int) ($bucket['cat_II']['completed'] ?? 0),
            'completed_cat_III' => (int) ($bucket['cat_III']['completed'] ?? 0),
            'completed_total' => (int) ($bucket['total']['completed'] ?? 0),
            'given_rig_cat_I' => (int) ($bucket['cat_I']['given_rig'] ?? 0),
            'given_rig_cat_II' => (int) ($bucket['cat_II']['given_rig'] ?? 0),
            'given_rig_cat_III' => (int) ($bucket['cat_III']['given_rig'] ?? 0),
            'given_rig_total' => (int) ($bucket['total']['given_rig'] ?? 0),
        ];
    }
    public const ALLOWED_REPORT_ROLES = [
        'registration',
        'admin',
        'nurse',
        'doctor',
        'triage',
        'treatment',
        'staff',
        'developer',
    ];

    private const ALLOWED_REPORT_ROLE_SLUGS = [
        'registration',
        'registration_clerk',
        'receptionist',
        'admin',
        'clinic_admin',
        'nurse',
        'treatment',
        'intake_nurse',
        'follow_up_nurse',
        'triage',
        'doctor',
        'staff',
        'developer',
    ];

    /**
     * Enforce report/print authentication, active staff role, and strict clinic isolation.
     */
    public function authorizeReportAccess(Request $request, ?User $user, ?int $expectedClinicId = null): int
    {
        if (!$user instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        if (!$user->is_active) {
            abort(403, 'Your account is inactive.');
        }

        if (!$this->userHasReportRole($user)) {
            abort(403, 'Unauthorized role for report access.');
        }

        if (!$user->clinic_id) {
            abort(403, 'A clinic assignment is required.');
        }

        if ($request->filled('clinic_id') && (int) $request->input('clinic_id') !== (int) $user->clinic_id) {
            abort(403, 'Cross-clinic report access is not permitted.');
        }

        if ($expectedClinicId !== null && (int) $expectedClinicId !== (int) $user->clinic_id) {
            abort(403, 'Cross-clinic report access is not permitted.');
        }

        return (int) $user->clinic_id;
    }

    private function userHasReportRole(User $user): bool
    {
        if (
            in_array($user->role, self::ALLOWED_REPORT_ROLES, true)
            || $user->isAdmin()
            || $user->isNursing()
            || $user->isRegistration()
            || $user->isTriage()
            || $user->isDeveloper()
            || $user->isTreatment()
        ) {
            return true;
        }

        $assignedSlugs = $user->relationLoaded('roles')
            ? $user->roles->pluck('slug')->all()
            : $user->roles()->pluck('slug')->all();

        return !empty(array_intersect($assignedSlugs, self::ALLOWED_REPORT_ROLE_SLUGS));
    }

    /**
     * REPORT 1 — Rabies Exposure Registry (Weekly)
     * Matches Image 2 & 4 — DOH Rabies Exposure Registry form
     */
    public function getExposureRegistry(int $clinicId, ?string $fromDate = null, ?string $toDate = null, ?string $quarter = null, ?int $year = null, $user = null, ?string $category = null, ?string $cutoffDate = null, bool $aggregateOnly = false): array
    {
        $clinic = Clinic::find($clinicId);

        $from = $fromDate ? Carbon::parse($fromDate)->startOfDay() : now()->startOfQuarter();
        $to = $toDate ? Carbon::parse($toDate)->endOfDay() : now()->endOfQuarter();

        if ($from->gt($to)) {
            $temp = $from;
            $from = $to->copy()->startOfDay();
            $to = $temp->copy()->endOfDay();
        }

        $cutoff = $cutoffDate
            ? CarbonImmutable::parse($cutoffDate)->endOfDay()
            : CarbonImmutable::instance($to)->endOfDay();

        $weeks = $this->generateWeekRanges($from, $to);
        $population = (int) ($clinic?->population ?? 0);

        $allPeriodCases = $this->fetchVerifiedIncidentsForRange(
            $clinicId,
            $from->toDateString(),
            $to->toDateString(),
            $category
        );
        $resolvedMap = $allPeriodCases->mapWithKeys(
            fn (BiteIncident $c) => [$c->bite_id => $this->stateResolver()->resolve($c, $cutoff)]
        );
        $unknownExposureDateCount = $this->countUnknownExposureDateCases($clinicId, $from, $to, $category);

        $rows = collect($weeks)->map(function ($week) use ($allPeriodCases, $resolvedMap, $population, $to) {
            $cases = $allPeriodCases->filter(function (BiteIncident $c) use ($week) {
                $dateStr = $c->bite_date?->toDateString();
                return $dateStr !== null && $dateStr >= $week['start'] && $dateStr <= $week['end'];
            })->values();

            $total = $cases->count();
            $male = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'male')->count();
            $female = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'female')->count();

            $ages = $cases->map(fn($c) => $c->patient?->ageAtDate($c->bite_date ?? $to));
            $ageBelow15 = $ages->filter(fn($age) => $age !== null && $age < 15)->count();
            $age15Above = $ages->filter(fn($age) => $age !== null && $age >= 15)->count();
            $ageUnknown = $ages->filter(fn($age) => $age === null)->count();

            $cat1 = $cases->filter(fn($c) => $c->bite_category === 'I')->count();
            $cat2 = $cases->filter(fn($c) => $c->bite_category === 'II')->count();
            $cat3 = $cases->filter(fn($c) => $c->bite_category === 'III')->count();
            $catAssessedTotal = $cat1 + $cat2 + $cat3;
            $catUnassessed = $total - $catAssessedTotal;

            $tcv = $cases->filter(fn($c) => (bool) ($resolvedMap[$c->bite_id]['administration_evidence']['has_vaccine_administration'] ?? false))->count();
            $hrig = $cases->filter(fn($c) => ($resolvedMap[$c->bite_id]['rig_evidence']['administered_rig_type'] ?? null) === 'HRIG')->count();
            $erig = $cases->filter(fn($c) => ($resolvedMap[$c->bite_id]['rig_evidence']['administered_rig_type'] ?? null) === 'ERIG')->count();
            $rigIndicated = $cases->filter(fn($c) => (bool) ($resolvedMap[$c->bite_id]['rig_evidence']['rig_indicated'] ?? false))->count();
            $pepPrescribed = $cases->filter(fn($c) => in_array($resolvedMap[$c->bite_id]['pep_decision'] ?? '', ['new_course_prescribed', 'continue_course'], true))->count();

            $dog = $cases->filter(fn($c) => $this->normalizedAnimalType($c) === 'dog')->count();
            $cat = $cases->filter(fn($c) => $this->normalizedAnimalType($c) === 'cat')->count();
            $animalUnknown = $cases->filter(fn($c) => in_array($this->normalizedAnimalType($c), ['', 'unknown', 'unassessed'], true))->count();
            $others = $cases->filter(fn($c) => !in_array($this->normalizedAnimalType($c), ['dog', 'cat', '', 'unknown', 'unassessed'], true))->count();

            return [
                'inclusive_dates' => $week['label'],
                'start_date' => $week['start'],
                'end_date' => $week['end'],
                'human_population' => $population,
                'male' => $male,
                'female' => $female,
                'total' => $total,
                'age_below_15' => $ageBelow15,
                'age_15_above' => $age15Above,
                'age_unknown' => $ageUnknown,
                'age_total' => $ageBelow15 + $age15Above,
                'cat_1' => $cat1,
                'cat_2' => $cat2,
                'cat_3' => $cat3,
                'cat_unassessed' => $catUnassessed,
                'cat_total' => $catAssessedTotal,
                'cat_percentage' => $total > 0 ? round(($catAssessedTotal / $total) * 100) . '%' : '0%',
                'no_hr' => null,
                'no_hr_status' => 'unavailable',
                'no_hr_reason' => 'source_not_verified',
                'pep_prescribed' => $pepPrescribed,
                'tcv' => $tcv,
                'hrig' => $hrig,
                'erig' => $erig,
                'rig_indicated' => $rigIndicated,
                'dog' => $dog,
                'cat' => $cat,
                'others' => $others,
                'animal_unknown' => $animalUnknown,
                'animal_total' => $dog + $cat + $others,
                'pct_tcv' => $total > 0 ? round(($tcv / $total) * 100) . '%' : '0%',
                'pct_erig' => $total > 0 ? round(($erig / $total) * 100) . '%' : '0%',
            ];
        })->toArray();

        // Compute overall totals for table footer
        $totalCases = array_sum(array_column($rows, 'total'));
        $totalMale = array_sum(array_column($rows, 'male'));
        $totalFemale = array_sum(array_column($rows, 'female'));
        $totalAgeBelow15 = array_sum(array_column($rows, 'age_below_15'));
        $totalAge15Above = array_sum(array_column($rows, 'age_15_above'));
        $totalAgeUnknown = array_sum(array_column($rows, 'age_unknown'));
        $totalCat1 = array_sum(array_column($rows, 'cat_1'));
        $totalCat2 = array_sum(array_column($rows, 'cat_2'));
        $totalCat3 = array_sum(array_column($rows, 'cat_3'));
        $totalCatUnassessed = array_sum(array_column($rows, 'cat_unassessed'));
        $totalCatAssessed = $totalCat1 + $totalCat2 + $totalCat3;
        $totalPepPrescribed = array_sum(array_column($rows, 'pep_prescribed'));
        $totalTcv = array_sum(array_column($rows, 'tcv'));
        $totalHrig = array_sum(array_column($rows, 'hrig'));
        $totalErig = array_sum(array_column($rows, 'erig'));
        $totalRigIndicated = array_sum(array_column($rows, 'rig_indicated'));
        $totalDog = array_sum(array_column($rows, 'dog'));
        $totalCat = array_sum(array_column($rows, 'cat'));
        $totalOthers = array_sum(array_column($rows, 'others'));
        $totalAnimalUnknown = array_sum(array_column($rows, 'animal_unknown'));

        $reconciliation = $this->stateResolver()->reconcileCohort($allPeriodCases, $cutoff);

        $totals = [
            'inclusive_dates' => 'TOTAL',
            'human_population' => $population,
            'male' => $totalMale,
            'female' => $totalFemale,
            'total' => $totalCases,
            'age_below_15' => $totalAgeBelow15,
            'age_15_above' => $totalAge15Above,
            'age_unknown' => $totalAgeUnknown,
            'age_total' => $totalAgeBelow15 + $totalAge15Above,
            'cat_1' => $totalCat1,
            'cat_2' => $totalCat2,
            'cat_3' => $totalCat3,
            'cat_unassessed' => $totalCatUnassessed,
            'cat_total' => $totalCatAssessed,
            'cat_percentage' => $totalCases > 0 ? round(($totalCatAssessed / $totalCases) * 100) . '%' : '0%',
            'no_hr' => null,
            'no_hr_status' => 'unavailable',
            'no_hr_reason' => 'source_not_verified',
            'pep_prescribed' => $totalPepPrescribed,
            'tcv' => $totalTcv,
            'hrig' => $totalHrig,
            'erig' => $totalErig,
            'rig_indicated' => $totalRigIndicated,
            'dog' => $totalDog,
            'cat' => $totalCat,
            'others' => $totalOthers,
            'animal_unknown' => $totalAnimalUnknown,
            'animal_total' => $totalDog + $totalCat + $totalOthers,
            'pct_tcv' => $totalCases > 0 ? round(($totalTcv / $totalCases) * 100) . '%' : '0%',
            'pct_erig' => $totalCases > 0 ? round(($totalErig / $totalCases) * 100) . '%' : '0%',
            'unknown_exposure_date_count' => $unknownExposureDateCount,
        ];

        $quarterNumber = ceil($from->month / 3);
        $quarterName = ['1st', '2nd', '3rd', '4th'][$quarterNumber - 1] ?? ($quarterNumber . 'th');
        $splitMetrics = $this->resolvePeriodSplitMetrics($clinicId, $from, $to, $cutoff, $category, $clinic);

        $payload = [
            'report_type' => 'exposure_registry',
            'rule_version' => ReportingMetricService::RULE_VERSION,
            'clinic' => $clinic?->name ?? 'Animal Bite Treatment Center',
            'municipality' => $clinic?->municipality ?? '—',
            'province' => $clinic?->province ?? '—',
            'address' => $clinic?->address ?? '',
            'contact_number' => $clinic?->contact_number ?? $clinic?->phone ?? '',
            'left_print_logo_url' => $clinic?->left_print_logo_url,
            'right_print_logo_url' => $clinic?->right_print_logo_url,
            'quarter' => $quarter ?? $quarterName,
            'year' => $year ?? $from->year,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'cutoff' => $cutoff->toDateString(),
            'category' => $category ?? 'ALL',
            'unknown_exposure_date_count' => $unknownExposureDateCount,
            'journey_reconciliation' => $reconciliation,
            'reconciliation_bridge' => [
                'recorded_episodes_bridge' => $reconciliation['recorded_episodes_bridge'] ?? [],
                'form' => 'rabies_exposure_registry',
                'cases_total' => $totalCases,
                'categorized_cases_total' => $totalCatAssessed,
                'unassessed_or_missing_category' => $totalCases - $totalCatAssessed,
                'unknown_exposure_date_count' => $unknownExposureDateCount,
                'tcv' => $totalTcv,
                'hrig' => $totalHrig,
                'erig' => $totalErig,
            ],
            'd0_cohort_metrics' => $splitMetrics['d0_cohort_metrics'],
            'service_period_metrics' => $splitMetrics['service_period_metrics'],
            'data' => $rows,
            'totals' => $totals,
            'prepared_by' => $user?->name ?: 'Staff',
            'prepared_designation' => $this->getDesignation($user),
            'noted_by' => $clinic?->health_officer_name ?: 'Municipal Health Officer',
            'noted_designation' => 'Municipal Health Officer',
            'date_signed' => now()->format('n/j/Y'),
        ];

        if (!$aggregateOnly) {
            $payload['clinic_model'] = $clinic;
            $payload['patient_cases'] = $this->formatPatientCases($allPeriodCases, $cutoff);
        }

        return $payload;
    }

    /**
     * REPORT 2 — ABTC Monthly Report
     * Matches Image 1 — National Rabies Prevention and Control Program monthly form
     */
    public function getMonthlyReport(int $clinicId, ?string $monthStr = null, $user = null, ?string $category = null, ?string $fromDate = null, ?string $toDate = null, ?string $cutoffDate = null, bool $aggregateOnly = false): array
    {
        $clinic = Clinic::find($clinicId);

        if ($fromDate) {
            $month = Carbon::parse($fromDate);
            $startDate = Carbon::parse($fromDate)->startOfDay();
            $endDate = $toDate ? Carbon::parse($toDate)->endOfDay() : $startDate->copy()->endOfMonth()->endOfDay();

            if ($startDate->gt($endDate)) {
                [$startDate, $endDate] = [$endDate->copy()->startOfDay(), $startDate->copy()->endOfDay()];
                $month = $startDate->copy();
            }
        } elseif ($monthStr) {
            $month = Carbon::parse($monthStr);
            $startDate = $month->copy()->startOfMonth()->startOfDay();
            $endDate = $month->copy()->endOfMonth()->endOfDay();
        } else {
            $month = now();
            $startDate = $month->copy()->startOfMonth()->startOfDay();
            $endDate = $month->copy()->endOfMonth()->endOfDay();
        }

        $cutoff = $cutoffDate
            ? CarbonImmutable::parse($cutoffDate)->endOfDay()
            : CarbonImmutable::instance($endDate)->endOfDay();

        $cases = $this->fetchVerifiedIncidentsForRange(
            $clinicId,
            $startDate->toDateString(),
            $endDate->toDateString(),
            $category
        );
        $resolvedMap = $cases->mapWithKeys(
            fn (BiteIncident $c) => [$c->bite_id => $this->stateResolver()->resolve($c, $cutoff)]
        );
        $reconciliation = $this->stateResolver()->reconcileCohort($cases, $cutoff);
        $unknownExposureDateCount = $this->countUnknownExposureDateCases($clinicId, $startDate, $endDate, $category);

        $male = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'male')->count();
        $female = $cases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'female')->count();
        $givenPep = $cases->filter(fn($c) => $this->isNewCourseStarted($resolvedMap[$c->bite_id]))->count();
        $pepPrescribed = (int) $reconciliation['pep_prescribed'];
        $noAdministrationRecorded = (int) $reconciliation['no_administration_recorded'];

        $cat1 = $cases->filter(fn($c) => $c->bite_category === 'I')->count();
        $cat2 = $cases->filter(fn($c) => $c->bite_category === 'II')->count();
        $cat3 = $cases->filter(fn($c) => $c->bite_category === 'III')->count();
        $catAssessedTotal = $cat1 + $cat2 + $cat3;
        $totalCases = $cases->count();
        $unassessedCases = $totalCases - $catAssessedTotal;

        $completedCat1 = $cases->filter(fn($c) => $c->bite_category === 'I' && $this->isNewCourseCompleted($resolvedMap[$c->bite_id]))->count();
        $completedCat2 = $cases->filter(fn($c) => $c->bite_category === 'II' && $this->isNewCourseCompleted($resolvedMap[$c->bite_id]))->count();
        $completedCat3 = $cases->filter(fn($c) => $c->bite_category === 'III' && $this->isNewCourseCompleted($resolvedMap[$c->bite_id]))->count();
        $totalCompleted = $completedCat1 + $completedCat2 + $completedCat3;

        $givenRig = $cases->filter(fn($c) => (bool) ($resolvedMap[$c->bite_id]['rig_evidence']['rig_administered'] ?? false))->count();
        $rigIndicated = $cases->filter(fn($c) => (bool) ($resolvedMap[$c->bite_id]['rig_evidence']['rig_indicated'] ?? false))->count();

        $completionRate = $pepPrescribed > 0
            ? round(($totalCompleted / $pepPrescribed) * 100) . '%'
            : ($totalCases > 0 ? round(($totalCompleted / $totalCases) * 100) . '%' : '0%');
        $maturedCompletionRate = $reconciliation['matured_courses'] > 0
            ? round(($reconciliation['matured_completed'] / $reconciliation['matured_courses']) * 100) . '%'
            : '0%';

        // Weekly breakdown rows for the period
        $weeks = $this->generateWeekRanges($startDate, $endDate);
        $weeklyRows = collect($weeks)->map(function ($week) use ($cases, $resolvedMap) {
            $wCases = $cases->filter(function (BiteIncident $c) use ($week) {
                $dateStr = $c->bite_date?->toDateString();
                return $dateStr !== null && $dateStr >= $week['start'] && $dateStr <= $week['end'];
            })->values();

            $wMale = $wCases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'male')->count();
            $wFemale = $wCases->filter(fn($c) => strtolower($c->patient?->gender ?? '') === 'female')->count();
            $wPep = $wCases->filter(fn($c) => $this->isNewCourseStarted($resolvedMap[$c->bite_id]))->count();
            $wPepPrescribedCases = $wCases->filter(fn($c) => in_array($resolvedMap[$c->bite_id]['pep_decision'] ?? '', ['new_course_prescribed', 'continue_course'], true));
            $wPepPrescribed = $wPepPrescribedCases->count();
            $wNoAdmin = $wPepPrescribedCases->reject(fn($c) => (bool) ($resolvedMap[$c->bite_id]['administration_evidence']['has_vaccine_administration'] ?? false))->count();

            $wCat1 = $wCases->filter(fn($c) => $c->bite_category === 'I')->count();
            $wCat2 = $wCases->filter(fn($c) => $c->bite_category === 'II')->count();
            $wCat3 = $wCases->filter(fn($c) => $c->bite_category === 'III')->count();
            $wCatTotal = $wCat1 + $wCat2 + $wCat3;
            $wTotal = $wCases->count();

            $wComp1 = $wCases->filter(fn($c) => $c->bite_category === 'I' && $this->isNewCourseCompleted($resolvedMap[$c->bite_id]))->count();
            $wComp2 = $wCases->filter(fn($c) => $c->bite_category === 'II' && $this->isNewCourseCompleted($resolvedMap[$c->bite_id]))->count();
            $wComp3 = $wCases->filter(fn($c) => $c->bite_category === 'III' && $this->isNewCourseCompleted($resolvedMap[$c->bite_id]))->count();

            $wRig = $wCases->filter(fn($c) => (bool) ($resolvedMap[$c->bite_id]['rig_evidence']['rig_administered'] ?? false))->count();
            $wRigIndicated = $wCases->filter(fn($c) => (bool) ($resolvedMap[$c->bite_id]['rig_evidence']['rig_indicated'] ?? false))->count();

            return [
                'inclusive_dates' => $week['label'],
                'male' => $wMale,
                'female' => $wFemale,
                'pep_prescribed' => $wPepPrescribed,
                'given_pep' => $wPep,
                'no_administration_recorded' => $wNoAdmin,
                'cat_1' => $wCat1,
                'cat_2' => $wCat2,
                'cat_3' => $wCat3,
                'cat_total' => $wCatTotal,
                'unassessed_cases' => $wTotal - $wCatTotal,
                'completed_cat_1' => $wComp1,
                'completed_cat_2' => $wComp2,
                'completed_cat_3' => $wComp3,
                'completed_total' => $wComp1 + $wComp2 + $wComp3,
                'given_rig' => $wRig,
                'rig_indicated' => $wRigIndicated,
            ];
        })->toArray();

        $totals = [
            'inclusive_dates' => 'TOTAL',
            'male' => $male,
            'female' => $female,
            'pep_prescribed' => $pepPrescribed,
            'given_pep' => $givenPep,
            'no_administration_recorded' => $noAdministrationRecorded,
            'cat_1' => $cat1,
            'cat_2' => $cat2,
            'cat_3' => $cat3,
            'cat_total' => $catAssessedTotal,
            'unassessed_cases' => $unassessedCases,
            'total_cases' => $totalCases,
            'unknown_exposure_date_count' => $unknownExposureDateCount,
            'completed_cat_1' => $completedCat1,
            'completed_cat_2' => $completedCat2,
            'completed_cat_3' => $completedCat3,
            'completed_total' => $totalCompleted,
            'given_rig' => $givenRig,
            'rig_indicated' => $rigIndicated,
        ];

        $splitMetrics = $this->resolvePeriodSplitMetrics($clinicId, $startDate, $endDate, $cutoff, $category, $clinic);

        $payload = [
            'report_type' => 'monthly',
            'rule_version' => ReportingMetricService::RULE_VERSION,
            'province' => $clinic?->province ?? '—',
            'municipality' => $clinic?->municipality ?? '—',
            'abtc' => $clinic?->name ?? 'Animal Bite Treatment Center',
            'clinic' => $clinic?->name ?? 'Animal Bite Treatment Center',
            'address' => $clinic?->address ?? '',
            'contact_number' => $clinic?->contact_number ?? $clinic?->phone ?? '',
            'left_print_logo_url' => $clinic?->left_print_logo_url,
            'right_print_logo_url' => $clinic?->right_print_logo_url,
            'month' => $month->format('Y-m'),
            'month_label' => $month->format('F Y'),
            'from' => $startDate->toDateString(),
            'to' => $endDate->toDateString(),
            'cutoff' => $cutoff->toDateString(),
            'category' => $category ?? 'ALL',
            'male' => $male,
            'female' => $female,
            'pep_prescribed' => $pepPrescribed,
            'given_pep' => $givenPep,
            'no_administration_recorded' => $noAdministrationRecorded,
            'cat_1' => $cat1,
            'cat_2' => $cat2,
            'cat_3' => $cat3,
            'unassessed_cases' => $unassessedCases,
            'total_cases' => $totalCases,
            'unknown_exposure_date_count' => $unknownExposureDateCount,
            'completed_cat_1' => $completedCat1,
            'completed_cat_2' => $completedCat2,
            'completed_cat_3' => $completedCat3,
            'total_completed' => $totalCompleted,
            'given_rig' => $givenRig,
            'rig_indicated' => $rigIndicated,
            'completion_rate' => $completionRate,
            'matured_completion_rate' => $maturedCompletionRate,
            'journey_reconciliation' => $reconciliation,
            'reconciliation_bridge' => [
                'recorded_episodes_bridge' => $reconciliation['recorded_episodes_bridge'] ?? [],
                'form' => 'abtc_monthly_report',
                'abtc_monthly_form' => [
                    'cases_total' => $totalCases,
                    'given_pep' => $givenPep,
                    'cat_I' => $cat1,
                    'cat_II' => $cat2,
                    'cat_III' => $cat3,
                    'cat_total' => $catAssessedTotal,
                    'unassessed_or_missing_category' => $unassessedCases,
                    'completed_cat_I' => $completedCat1,
                    'completed_cat_II' => $completedCat2,
                    'completed_cat_III' => $completedCat3,
                    'completed_total' => $totalCompleted,
                    'given_rig' => $givenRig,
                ],
            ],
            'd0_cohort_metrics' => $splitMetrics['d0_cohort_metrics'],
            'service_period_metrics' => $splitMetrics['service_period_metrics'],
            'rows' => $weeklyRows,
            'totals' => $totals,
            'prepared_by' => $user?->name ?: 'Staff',
            'prepared_designation' => $this->getDesignation($user),
            'contact_no' => $clinic?->contact_number ?? $clinic?->phone ?? '—',
            'noted_by' => $clinic?->health_officer_name ?: 'Municipal Health Officer',
            'noted_designation' => 'Municipal Health Officer',
            'date_signed' => now()->format('n/j/Y'),
        ];

        if (!$aggregateOnly) {
            $payload['clinic_model'] = $clinic;
            $payload['patient_cases'] = $this->formatPatientCases($cases, $cutoff);
        }

        return $payload;
    }

    /**
     * REPORT 3 — Cohort Report (Quarterly)
     * Matches Image 3 — Quarterly cohort by category with completion rate
     */
    public function getCohortReport(int $clinicId, ?int $yearParam = null, $user = null, ?string $category = null, ?string $cutoffDate = null, bool $aggregateOnly = false): array
    {
        $clinic = Clinic::find($clinicId);

        $year = (int) ($yearParam ?? now()->year);
        $cutoff = $cutoffDate
            ? CarbonImmutable::parse($cutoffDate)->endOfDay()
            : CarbonImmutable::now()->endOfDay();

        $yearStart = Carbon::create($year, 1, 1)->startOfDay();
        $yearEnd = Carbon::create($year, 12, 31)->endOfDay();
        $yearArvPool = $this->reportingQuery()->fetchIncidentsWithArvActivityInRange(
            $clinicId,
            $yearStart->toDateString(),
            $yearEnd->toDateString()
        );

        $quarters = [
            1 => [Carbon::create($year, 1, 1)->startOfDay(), Carbon::create($year, 3, 31)->endOfDay()],
            2 => [Carbon::create($year, 4, 1)->startOfDay(), Carbon::create($year, 6, 30)->endOfDay()],
            3 => [Carbon::create($year, 7, 1)->startOfDay(), Carbon::create($year, 9, 30)->endOfDay()],
            4 => [Carbon::create($year, 10, 1)->startOfDay(), Carbon::create($year, 12, 31)->endOfDay()],
        ];

        $emptyCategoryRow = [
            'cases' => 0,
            'pep_prescribed' => 0,
            'given_pep' => 0,
            'no_administration_recorded' => 0,
            'explicit_no_pep' => 0,
            'transferred_referred' => 0,
            'completed' => 0,
            'given_rig' => 0,
            'rig_indicated' => 0,
            'matured_eligible' => 0,
            'matured_completed' => 0,
        ];

        $result = [];
        $annualTotals = [
            'cat_I' => $emptyCategoryRow,
            'cat_II' => $emptyCategoryRow,
            'cat_III' => $emptyCategoryRow,
            'total' => $emptyCategoryRow,
        ];
        $annualUnknownExposureDate = 0;
        $annualUnassessed = 0;

        $allYearCases = collect();

        foreach ($quarters as $q => [$start, $end]) {
            $cases = $this->fetchVerifiedIncidentsForRange(
                $clinicId,
                $start->toDateString(),
                $end->toDateString(),
                $category
            );
            $qResolvedMap = $cases->mapWithKeys(
                fn (BiteIncident $c) => [$c->bite_id => $this->stateResolver()->resolve($c, $cutoff)]
            );
            $qReconciliation = $this->stateResolver()->reconcileCohort($cases, $cutoff);
            $qUnknownExposureDate = $this->countUnknownExposureDateCases($clinicId, $start, $end, $category);
            $annualUnknownExposureDate += $qUnknownExposureDate;

            $allYearCases = $allYearCases->concat($cases);

            $qTotals = $emptyCategoryRow;

            foreach (['I', 'II', 'III'] as $cat) {
                $catCases = $cases->filter(fn($c) => $c->bite_category === $cat);
                $catCasesCount = $catCases->count();
                $catPrescribed = $catCases->filter(fn($c) => in_array($qResolvedMap[$c->bite_id]['pep_decision'] ?? '', ['new_course_prescribed', 'continue_course'], true));
                $catPrescribedCount = $catPrescribed->count();
                $catPepCount = $catCases->filter(fn($c) => $this->isNewCourseStarted($qResolvedMap[$c->bite_id]))->count();
                $catNoAdminCount = $catPrescribed->reject(fn($c) => (bool) ($qResolvedMap[$c->bite_id]['administration_evidence']['has_vaccine_administration'] ?? false))->count();
                $catExplicitNoPep = $catCases->filter(fn($c) => ($qResolvedMap[$c->bite_id]['pep_decision'] ?? '') === 'explicit_no_pep')->count();
                $catTransferred = $catCases->filter(fn($c) => ($qResolvedMap[$c->bite_id]['encounter_disposition'] ?? '') === 'transferred_referred')->count();
                $catCompCount = $catCases->filter(fn($c) => $this->isNewCourseCompleted($qResolvedMap[$c->bite_id]))->count();
                $catRigCount = $catCases->filter(fn($c) => (bool) ($qResolvedMap[$c->bite_id]['rig_evidence']['rig_administered'] ?? false))->count();
                $catRigIndicated = $catCases->filter(fn($c) => (bool) ($qResolvedMap[$c->bite_id]['rig_evidence']['rig_indicated'] ?? false))->count();
                $catMaturedEligible = $catPrescribed->filter(fn($c) => (bool) ($qResolvedMap[$c->bite_id]['course_outcome']['is_cohort_eligible'] ?? false))->count();
                $catMaturedCompleted = $catPrescribed->filter(
                    fn($c) => (bool) ($qResolvedMap[$c->bite_id]['course_outcome']['is_cohort_eligible'] ?? false)
                        && (bool) ($qResolvedMap[$c->bite_id]['course_outcome']['is_completed'] ?? false)
                )->count();

                $metrics = [
                    'cases' => $catCasesCount,
                    'pep_prescribed' => $catPrescribedCount,
                    'given_pep' => $catPepCount,
                    'no_administration_recorded' => $catNoAdminCount,
                    'explicit_no_pep' => $catExplicitNoPep,
                    'transferred_referred' => $catTransferred,
                    'completed' => $catCompCount,
                    'given_rig' => $catRigCount,
                    'rig_indicated' => $catRigIndicated,
                    'matured_eligible' => $catMaturedEligible,
                    'matured_completed' => $catMaturedCompleted,
                ];

                foreach ($metrics as $metricKey => $metricVal) {
                    $qTotals[$metricKey] += $metricVal;
                    $annualTotals["cat_{$cat}"][$metricKey] += $metricVal;
                    $annualTotals['total'][$metricKey] += $metricVal;
                }

                $denom = $catPrescribedCount > 0 ? $catPrescribedCount : $catCasesCount;
                $result["q{$q}"]["cat_{$cat}"] = array_merge($metrics, [
                    'completion_rate' => $denom > 0 ? round(($catCompCount / $denom) * 100) . '%' : '0%',
                    'prescribed_completion_rate' => $catPrescribedCount > 0 ? round(($catCompCount / $catPrescribedCount) * 100) . '%' : '0%',
                    'matured_completion_rate' => $catMaturedEligible > 0 ? round(($catMaturedCompleted / $catMaturedEligible) * 100) . '%' : '0%',
                ]);
            }

            $qUnassessed = $cases->filter(fn($c) => $c->bite_category === 'Unassessed')->count();
            $annualUnassessed += $qUnassessed;

            $qDenom = $qTotals['pep_prescribed'] > 0 ? $qTotals['pep_prescribed'] : $qTotals['cases'];
            $result["q{$q}"]['total'] = array_merge($qTotals, [
                'completion_rate' => $qDenom > 0 ? round(($qTotals['completed'] / $qDenom) * 100) . '%' : '0%',
                'prescribed_completion_rate' => $qTotals['pep_prescribed'] > 0 ? round(($qTotals['completed'] / $qTotals['pep_prescribed']) * 100) . '%' : '0%',
                'matured_completion_rate' => $qTotals['matured_eligible'] > 0 ? round(($qTotals['matured_completed'] / $qTotals['matured_eligible']) * 100) . '%' : '0%',
            ]);
            $result["q{$q}"]['unassessed_cases'] = $qUnassessed;
            $result["q{$q}"]['unknown_exposure_date_count'] = $qUnknownExposureDate;
            $result["q{$q}"]['journey_reconciliation'] = $qReconciliation;
            $qSplitMetrics = $this->resolvePeriodSplitMetrics($clinicId, $start, $end, $cutoff, $category, $clinic, $yearArvPool);
            $result["q{$q}"]['reconciliation_bridge'] = [
                'recorded_episodes_bridge' => $qReconciliation['recorded_episodes_bridge'] ?? [],
                'form' => 'cohort_quarterly_report',
                'cohort_quarterly_form_slice' => $this->buildCohortFormSlice($result["q{$q}"], $qUnassessed),
            ];
            $result["q{$q}"]['d0_cohort_metrics'] = $qSplitMetrics['d0_cohort_metrics'];
            $result["q{$q}"]['service_period_metrics'] = $qSplitMetrics['service_period_metrics'];
        }

        // Annual completion rates
        foreach (['cat_I', 'cat_II', 'cat_III', 'total'] as $key) {
            $prescribed = $annualTotals[$key]['pep_prescribed'];
            $c = $annualTotals[$key]['cases'];
            $comp = $annualTotals[$key]['completed'];
            $denom = $prescribed > 0 ? $prescribed : $c;
            $annualTotals[$key]['completion_rate'] = $denom > 0 ? round(($comp / $denom) * 100) . '%' : '0%';
            $annualTotals[$key]['prescribed_completion_rate'] = $prescribed > 0 ? round(($comp / $prescribed) * 100) . '%' : '0%';
            $mElig = $annualTotals[$key]['matured_eligible'];
            $mComp = $annualTotals[$key]['matured_completed'];
            $annualTotals[$key]['matured_completion_rate'] = $mElig > 0 ? round(($mComp / $mElig) * 100) . '%' : '0%';
        }
        $annualTotals['unassessed_cases'] = $annualUnassessed;
        $annualTotals['unknown_exposure_date_count'] = $annualUnknownExposureDate;
        $result['annual'] = $annualTotals;

        $annualReconciliation = $this->stateResolver()->reconcileCohort($allYearCases, $cutoff);
        $annualSplitMetrics = $this->resolvePeriodSplitMetrics($clinicId, $yearStart, $yearEnd, $cutoff, $category, $clinic, $yearArvPool);

        $payload = [
            'report_type' => 'cohort',
            'rule_version' => ReportingMetricService::RULE_VERSION,
            'province' => $clinic?->province ?? '—',
            'municipality' => $clinic?->municipality ?? '—',
            'abtc' => $clinic?->name ?? 'Animal Bite Treatment Center',
            'clinic' => $clinic?->name ?? 'Animal Bite Treatment Center',
            'address' => $clinic?->address ?? '',
            'contact_number' => $clinic?->contact_number ?? $clinic?->phone ?? '',
            'left_print_logo_url' => $clinic?->left_print_logo_url,
            'right_print_logo_url' => $clinic?->right_print_logo_url,
            'year' => $year,
            'cutoff' => $cutoff->toDateString(),
            'category' => $category ?? 'ALL',
            'unassessed_cases' => $annualUnassessed,
            'unknown_exposure_date_count' => $annualUnknownExposureDate,
            'journey_reconciliation' => $annualReconciliation,
            'reconciliation_bridge' => [
                'recorded_episodes_bridge' => $annualReconciliation['recorded_episodes_bridge'] ?? [],
                'form' => 'cohort_quarterly_report',
                'cohort_quarterly_form_slice' => $this->buildCohortFormSlice($annualTotals, $annualUnassessed),
            ],
            'd0_cohort_metrics' => $annualSplitMetrics['d0_cohort_metrics'],
            'service_period_metrics' => $annualSplitMetrics['service_period_metrics'],
            'quarters' => $result,
            'prepared_by' => $user?->name ?: 'Staff',
            'prepared_designation' => $this->getDesignation($user),
            'noted_by' => $clinic?->health_officer_name ?: 'Municipal Health Officer',
            'noted_designation' => 'Municipal Health Officer',
            'date_signed' => now()->format('n/j/Y'),
        ];

        if (!$aggregateOnly) {
            $payload['clinic_model'] = $clinic;
            $payload['patient_cases'] = $this->formatPatientCases($allYearCases, $cutoff);
        }

        return $payload;
    }

    public function generateWeekRanges(Carbon $from, Carbon $to): array
    {
        $rangeStart = $from->copy()->startOfDay();
        $rangeEnd = $to->copy()->startOfDay();
        $weeks = [];
        $curr = $rangeStart->copy()->startOfWeek(Carbon::MONDAY);
        $limit = $rangeEnd->copy()->endOfWeek(Carbon::SUNDAY)->startOfDay();

        while ($curr->lte($limit)) {
            $weekStart = $curr->copy();
            $weekEnd = $curr->copy()->endOfWeek(Carbon::SUNDAY)->startOfDay();
            $boundedStart = $weekStart->lt($rangeStart) ? $rangeStart->copy() : $weekStart;
            $boundedEnd = $weekEnd->gt($rangeEnd) ? $rangeEnd->copy() : $weekEnd;

            if ($boundedStart->lte($boundedEnd)) {
                $weeks[] = [
                    'start' => $boundedStart->toDateString(),
                    'end' => $boundedEnd->toDateString(),
                    'label' => $boundedStart->format('n/j/Y'),
                ];
            }

            $curr->addWeek();
        }

        return $weeks;
    }

    private function fetchVerifiedIncidentsForRange(int $clinicId, string $startDate, string $endDate, ?string $category = null): Collection
    {
        return BiteIncident::where('clinic_id', $clinicId)
            ->whereDate('bite_date', '>=', $startDate)
            ->whereDate('bite_date', '<=', $endDate)
            ->with(['patient', 'intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])
            ->get()
            ->reject(fn(BiteIncident $c) => $this->reportingQuery()->isExcludedNonEpisode($c) || $c->hasProvisionalBiteDate())
            ->filter(fn(BiteIncident $c) => $this->matchesCategoryFilter($c, $category))
            ->values();
    }

    private function countUnknownExposureDateCases(int $clinicId, Carbon $start, Carbon $end, ?string $category = null): int
    {
        $rangeStart = $start->copy()->startOfDay();
        $rangeEnd = $end->copy()->endOfDay();

        $hasProvisionalColumn = BiteIncident::supportsProvisionalBiteDateColumn();

        return BiteIncident::where('clinic_id', $clinicId)
            ->where(function ($query) use ($hasProvisionalColumn) {
                $query->whereNull('bite_date')
                    ->when($hasProvisionalColumn, fn ($q) => $q->orWhere('bite_date_is_provisional', true))
                    ->orWhere(function ($legacy) {
                        $legacy->where('episode_type', 'pending_assessment')
                            ->where('status', 'awaiting_assessment');
                    });
            })
            ->with(['intake', 'treatmentRecords'])
            ->get()
            ->reject(fn(BiteIncident $c) => $this->reportingQuery()->isExcludedNonEpisode($c))
            ->filter(fn(BiteIncident $c) => $c->hasProvisionalBiteDate())
            ->filter(fn(BiteIncident $c) => $this->matchesCategoryFilter($c, $category))
            ->filter(function (BiteIncident $c) use ($rangeStart, $rangeEnd) {
                $consultationDate = $c->treatmentRecords
                    ->first(fn($r) => $r->dose_number === null && !empty($r->consultation_date))
                    ?->consultation_date;
                $reference = $consultationDate ?? $c->created_at;
                if (!$reference) {
                    return false;
                }

                $refCarbon = Carbon::parse($reference);
                return $refCarbon->gte($rangeStart) && $refCarbon->lte($rangeEnd);
            })
            ->count();
    }

    private function matchesCategoryFilter(BiteIncident $incident, ?string $category): bool
    {
        if ($category === null || $category === '' || strtoupper(trim($category)) === 'ALL') {
            return true;
        }

        $normalized = strtolower(trim($category)) === 'unassessed'
            ? 'Unassessed'
            : strtoupper(trim($category));

        return $incident->bite_category === $normalized;
    }

    private function normalizedAnimalType(BiteIncident $incident): string
    {
        return strtolower(trim((string) ($incident->animal_type ?? $incident->intake?->animal_type ?? '')));
    }

    protected function formatPatientCases($cases, CarbonInterface|string|null $cutoff = null): array
    {
        return $cases
            ->reject(fn(BiteIncident $c) => $c->hasProvisionalBiteDate())
            ->unique('bite_id')
            ->map(function (BiteIncident $c) use ($cutoff) {
                $state = $this->stateResolver()->resolve($c, $cutoff);
                $stage = $state['stage_summary'];
                $adminEvidence = $state['administration_evidence'];
                $rigEvidence = $state['rig_evidence'];

                $pepGivenDisplay = $adminEvidence['has_vaccine_administration']
                    ? 'Yes'
                    : ($stage['last_completed_stage'] === 'form_3_treatment_recorded'
                        ? 'Treatment started'
                        : $stage['administration_display']);

                return [
                    'bite_id' => $c->bite_id,
                    'case_number' => $c->case_number ?? ('BC-' . $c->bite_id),
                    'patient_name' => $c->patient ? trim($c->patient->first_name . ' ' . $c->patient->last_name) : 'Unknown',
                    'age' => $c->patient?->ageAtDate($c->bite_date) ?? null,
                    'gender' => $c->patient?->gender ? ucfirst($c->patient->gender) : '—',
                    'bite_date' => $c->bite_date ? Carbon::parse($c->bite_date)->format('Y-m-d') : '—',
                    'category' => $stage['category_display'],
                    'animal_type' => ucfirst($c->animal_type ?? $c->intake?->animal_type ?? '—'),
                    'animal_status' => ucfirst($c->intake?->animal_status ?? $c->animal_status ?? '—'),
                    'place_of_exposure' => $c->bite_place ?? $c->intake?->place_of_bite ?? $c->intake?->bite_place ?? '—',
                    'pep_given' => $pepGivenDisplay,
                    'rig_given' => $rigEvidence['administered_rig_type'] ?: 'None',
                    'rig_indicated' => $rigEvidence['indicated_rig_type'] ?: 'None',
                    'last_completed_stage' => $stage['last_completed_stage'],
                    'stage_label' => $stage['stage_label'],
                    'what_can_be_reported' => $stage['what_can_be_reported'],
                    'treatment_decision_display' => $stage['treatment_decision_display'],
                    'administration_display' => $stage['administration_display'],
                    'vaccination_display' => $stage['vaccination_display'],
                    'external_treatment_display' => $stage['external_treatment_display'],
                    'pep_decision' => $state['pep_decision'],
                    'course_outcome' => $state['course_outcome']['outcome'],
                    'encounter_disposition' => $state['encounter_disposition'],
                    'status' => $stage['stage_label'],
                ];
            })
            ->values()
            ->toArray();
    }

    private function hasAdministeredVaccineDose($case, CarbonInterface|string|null $cutoff = null): bool
    {
        return $this->outcomeResolver()->qualifyingVaccineRecords($case, $cutoff)->isNotEmpty();
    }

    protected function getDesignation($user): string
    {
        if (!$user) {
            return 'ABTC Staff';
        }
        return match ($user->role) {
            'registration' => 'Registration Staff',
            'triage' => 'Triage Nurse',
            'treatment' => 'Clinic Nurse',
            'admin' => 'Clinic Administrator',
            default => 'ABTC Staff',
        };
    }

    private function getCompleted($cases, string $category, CarbonInterface|string|null $cutoff = null): int
    {
        return $cases
            ->filter(fn($c) => $c->bite_category === $category)
            ->filter(fn($c) => (bool) ($this->stateResolver()->resolve($c, $cutoff)['course_outcome']['is_completed'] ?? false))
            ->count();
    }

    private function computeCompletionRate($cases, CarbonInterface|string|null $cutoff = null): string
    {
        $reconciliation = $this->stateResolver()->reconcileCohort($cases, $cutoff);
        $prescribed = $reconciliation['pep_prescribed'];
        $completed = $reconciliation['completed_courses'];
        $denom = $prescribed > 0 ? $prescribed : $cases->count();

        if ($denom === 0) {
            return '0%';
        }

        return round(($completed / $denom) * 100) . '%';
    }
}
