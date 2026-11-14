<?php

namespace App\Services\Reporting;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\TreatmentRecord;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Shared clinic-scoped reporting query, normalization, and four-basis slicing
 * (exposure date, D0 treatment cohort, service period, and cutoff backlog).
 */
class ExposureReportingQuery
{
    public function __construct(
        protected ?EpisodeReportingStateResolver $stateResolver = null,
        protected ?TreatmentOutcomeResolver $outcomeResolver = null,
    ) {}

    public function outcomeResolver(): TreatmentOutcomeResolver
    {
        return $this->outcomeResolver ??= app(TreatmentOutcomeResolver::class);
    }

    public function stateResolver(): EpisodeReportingStateResolver
    {
        return $this->stateResolver ??= new EpisodeReportingStateResolver($this->outcomeResolver());
    }

    /**
     * Fetch and filter clinic-scoped episodes for the requested period and cutoff.
     */
    public function fetchPeriodDataset(
        int $clinicId,
        CarbonInterface $from,
        CarbonInterface $to,
        CarbonImmutable $cutoff,
        array $filters = [],
        ?Clinic $clinic = null
    ): array {
        $clinic ??= Clinic::find($clinicId);
        $clinicMunicipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $clinicProvince = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $fromDay = CarbonImmutable::instance($from)->startOfDay();
        $toDay = CarbonImmutable::instance($to)->endOfDay();
        if ($fromDay->gt($toDay)) {
            [$fromDay, $toDay] = [$toDay->startOfDay(), $fromDay->endOfDay()];
        }

        $dateBasis = strtolower(trim((string) ($filters['date_basis'] ?? 'exposure_date')));
        if (!in_array($dateBasis, ['exposure_date', 'registration_date'], true)) {
            $dateBasis = 'exposure_date';
        }

        if ($dateBasis === 'registration_date') {
            return $this->fetchByRegistrationDateBasis(
                $clinicId,
                $clinic,
                $clinicMunicipality,
                $clinicProvince,
                $fromDay,
                $toDay,
                $cutoff,
                $filters
            );
        }

        $verifiedIncidents = BiteIncident::where('clinic_id', $clinicId)
            ->whereDate('bite_date', '>=', $fromDay->toDateString())
            ->whereDate('bite_date', '<=', $toDay->toDateString())
            ->with(['patient.details', 'intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])
            ->get()
            ->reject(fn (BiteIncident $c) => $this->isExcludedNonEpisode($c) || $c->hasProvisionalBiteDate())
            ->values();

        $hasProvisionalColumn = BiteIncident::supportsProvisionalBiteDateColumn();
        $provisionalIncidents = BiteIncident::where('clinic_id', $clinicId)
            ->where(function ($query) use ($hasProvisionalColumn) {
                $query->whereNull('bite_date')
                    ->when($hasProvisionalColumn, fn ($q) => $q->orWhere('bite_date_is_provisional', true))
                    ->orWhere(function ($legacy) {
                        $legacy->where('episode_type', 'pending_assessment')
                            ->where('status', 'awaiting_assessment');
                    });
            })
            ->with(['patient.details', 'intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])
            ->get()
            ->reject(fn (BiteIncident $c) => $this->isExcludedNonEpisode($c))
            ->filter(fn (BiteIncident $c) => $c->hasProvisionalBiteDate())
            ->filter(fn (BiteIncident $c) => $this->isWithinRegistrationWindow($c, $fromDay, $toDay))
            ->values();

        $verifiedItems = $this->resolveAndFilterItems(
            $verifiedIncidents,
            $cutoff,
            $toDay,
            $filters,
            $clinicMunicipality,
            $clinicProvince
        );

        $unknownDateItems = $this->resolveAndFilterItems(
            $provisionalIncidents,
            $cutoff,
            $toDay,
            $filters,
            $clinicMunicipality,
            $clinicProvince
        );

        return [
            'clinic' => $clinic,
            'from' => $fromDay->toDateString(),
            'to' => $toDay->toDateString(),
            'cutoff' => $cutoff->toDateString(),
            'date_basis' => 'exposure_date',
            'verified_episodes' => $verifiedItems,
            'unknown_exposure_date_episodes' => $unknownDateItems,
            'all_eligible_episodes' => $verifiedItems,
            'loaded_incidents' => $verifiedIncidents->concat($provisionalIncidents)->keyBy('bite_id'),
        ];
    }

    /**
     * Evaluate D0-cohort metrics (OUT01-OUT03) for started courses whose D0 fell in [from, to].
     */
    public function computeD0CohortMetrics(
        int $clinicId,
        CarbonInterface $from,
        CarbonInterface $to,
        CarbonImmutable $cutoff,
        array $filters = [],
        ?Clinic $clinic = null,
        ?Collection $preloadedIncidents = null
    ): array {
        $clinic ??= Clinic::find($clinicId);
        $clinicMunicipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $clinicProvince = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $fromStr = CarbonImmutable::instance($from)->toDateString();
        $toStr = CarbonImmutable::instance($to)->toDateString();
        $toEnd = CarbonImmutable::instance($to)->endOfDay();

        $incidents = $preloadedIncidents ?? $this->fetchIncidentsWithArvActivityInRange(
            $clinicId,
            $fromStr,
            $toStr
        );

        $seenCourses = [];
        $started = 0;
        $mature = 0;
        $completedMature = 0;
        $ongoingNotMature = 0;
        $discontinuedMature = 0;
        $transferredMature = 0;
        $overdueStates = collect();

        foreach ($incidents as $incident) {
            if ($this->isExcludedNonEpisode($incident)) {
                continue;
            }

            $state = $this->stateResolver()->resolve($incident, $cutoff);
            if ($state['pep_decision'] !== 'new_course_prescribed') {
                continue;
            }

            if (!($state['administration_evidence']['has_vaccine_administration'] ?? false)) {
                continue;
            }

            $d0Date = $state['administration_evidence']['d0_date'] ?? null;
            if ($d0Date === null || $d0Date < $fromStr || $d0Date > $toStr) {
                continue;
            }

            $expGeo = $this->normalizeExposureGeography($incident, $clinicMunicipality, $clinicProvince);
            $resGeo = $this->normalizeResidenceGeography($incident, $clinicMunicipality, $clinicProvince);
            if (!$this->matchesFilters($incident, $state, $expGeo, $resGeo, $filters, $toEnd)) {
                continue;
            }

            $courseKey = (int) ($state['course_key'] ?? $incident->bite_id);
            if (isset($seenCourses[$courseKey])) {
                continue;
            }
            $seenCourses[$courseKey] = true;

            $started++;
            $course = $state['course_outcome'];
            if (!empty($course['is_cohort_eligible'])) {
                $mature++;
                if (!empty($course['is_completed'])) {
                    $completedMature++;
                } elseif (($course['outcome'] ?? '') === 'clinically_discontinued') {
                    $discontinuedMature++;
                } elseif (($state['encounter_disposition'] ?? '') === 'transferred_referred') {
                    $transferredMature++;
                }
            } elseif (empty($course['is_mature']) && ($course['outcome'] ?? '') === 'ongoing_not_due') {
                $ongoingNotMature++;
            }

            if (!empty($course['is_overdue'])) {
                $overdueStates->push($state);
            }
        }

        $overdueSummary = $this->outcomeResolver()->summarizeOverdueMetrics($overdueStates);

        return [
            'cohort_basis' => 'd0_verified_arv_date',
            'from' => $fromStr,
            'to' => $toStr,
            'cutoff' => $cutoff->toDateString(),
            'started_courses' => $started,
            'mature_started_courses' => $mature,
            'completed_mature_courses' => $completedMature,
            'ongoing_not_mature_courses' => $ongoingNotMature,
            'discontinued_mature_courses' => $discontinuedMature,
            'transferred_mature_courses' => $transferredMature,
            'overdue_started_courses' => $overdueSummary['overdue_courses'],
            'outstanding_dose_slots' => $overdueSummary['outstanding_dose_slots'],
            'mature_completion_rate_pct' => $mature > 0 ? round(($completedMature / $mature) * 100, 1) : null,
            'mature_completion_unavailable_reason' => $mature > 0 ? null : 'not_applicable',
        ];
    }

    /**
     * Evaluate service-period local and verified external ARV dose events (SVC01, SVC02).
     */
    public function computeServicePeriodMetrics(
        int $clinicId,
        CarbonInterface $from,
        CarbonInterface $to,
        CarbonImmutable $cutoff,
        array $filters = [],
        ?Clinic $clinic = null,
        ?Collection $preloadedIncidents = null
    ): array {
        $clinic ??= Clinic::find($clinicId);
        $clinicMunicipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $clinicProvince = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $fromStr = CarbonImmutable::instance($from)->toDateString();
        $toStr = CarbonImmutable::instance($to)->toDateString();
        $toEnd = CarbonImmutable::instance($to)->endOfDay();

        $incidents = $preloadedIncidents ?? $this->fetchIncidentsWithArvActivityInRange(
            $clinicId,
            $fromStr,
            $toStr
        );

        $seenEventIds = [];
        $localEvents = 0;
        $externalEvents = 0;

        foreach ($incidents as $incident) {
            if ($this->isExcludedNonEpisode($incident)) {
                continue;
            }

            $state = $this->stateResolver()->resolve($incident, $cutoff);
            $expGeo = $this->normalizeExposureGeography($incident, $clinicMunicipality, $clinicProvince);
            $resGeo = $this->normalizeResidenceGeography($incident, $clinicMunicipality, $clinicProvince);

            if (!$this->matchesFilters($incident, $state, $expGeo, $resGeo, $filters, $toEnd)) {
                continue;
            }

            $qualifying = $this->outcomeResolver()->qualifyingVaccineRecords($incident, $cutoff);
            foreach ($qualifying as $record) {
                $eventDate = $record->treatment_date
                    ? CarbonImmutable::parse($record->treatment_date)->toDateString()
                    : ($record->administered_at ? CarbonImmutable::parse($record->administered_at)->toDateString() : null);

                if ($eventDate === null || $eventDate < $fromStr || $eventDate > $toStr) {
                    continue;
                }

                $eventId = (int) $record->treatment_id;
                if (isset($seenEventIds[$eventId])) {
                    continue;
                }
                $seenEventIds[$eventId] = true;

                if ((bool) ($record->is_external ?? false)) {
                    $externalEvents++;
                } else {
                    $localEvents++;
                }
            }
        }

        return [
            'service_basis' => 'administration_service_date',
            'from' => $fromStr,
            'to' => $toStr,
            'cutoff' => $cutoff->toDateString(),
            'local_arv_events_in_service_period' => $localEvents,
            'external_arv_events_in_service_period' => $externalEvents,
        ];
    }

    /**
     * Evaluate current follow-up backlog at cutoff across clinic episodes with overdue slots (FU01).
     */
    public function computeBacklogAtCutoff(
        int $clinicId,
        CarbonImmutable $cutoff,
        array $filters = [],
        ?Clinic $clinic = null,
        ?Collection $preloadedById = null
    ): array {
        $clinic ??= Clinic::find($clinicId);
        $clinicMunicipality = trim((string) ($clinic?->municipality ?: 'Tagoloan'));
        $clinicProvince = trim((string) ($clinic?->province ?: 'Misamis Oriental'));

        $matchingIds = BiteIncident::where('clinic_id', $clinicId)
            ->where(function ($query) use ($cutoff) {
                $query->whereNull('bite_date')
                    ->orWhereDate('bite_date', '<=', $cutoff->toDateString());
            })
            ->where(function ($query) {
                $query->whereHas('appointments', fn ($q) => $q->whereNotIn('status', ['completed', 'cancelled']))
                    ->orWhereHas('treatmentRecords', fn ($q) => $q->whereNull('voided_at')->whereIn('status', ['scheduled', 'missed', 'rescheduled']))
                    ->orWhereHas('treatmentPlan', fn ($q) => $q->whereIn('plan_type', ['full_pep', 'two_dose_booster', 'single_booster']))
                    ->orWhere(function ($legacy) {
                        $legacy->whereNotIn('status', ['completed', 'completed_no_pep', 'cancelled', 'abandoned', 'transferred_out', 'discontinued', 'void', 'voided', 'duplicate'])
                            ->whereHas('treatmentRecords');
                    });
            })
            ->pluck('bite_id');

        $incidents = $this->loadIncidentsByIdsWithReuse($matchingIds, $preloadedById);

        $matchedStates = collect();
        foreach ($incidents as $incident) {
            $state = $this->stateResolver()->resolve($incident, $cutoff);
            $expGeo = $this->normalizeExposureGeography($incident, $clinicMunicipality, $clinicProvince);
            $resGeo = $this->normalizeResidenceGeography($incident, $clinicMunicipality, $clinicProvince);

            if ($this->matchesFilters($incident, $state, $expGeo, $resGeo, $filters, $cutoff)) {
                $matchedStates->push($state);
            }
        }

        $overdueSummary = $this->outcomeResolver()->summarizeOverdueMetrics($matchedStates);

        return array_merge([
            'backlog_basis' => 'outstanding_required_dose_due_before_cutoff',
            'cutoff' => $cutoff->toDateString(),
        ], $overdueSummary);
    }

    /**
     * Load episodes that have at least one non-voided ARV record touching [from, to].
     */
    public function fetchIncidentsWithArvActivityInRange(
        int $clinicId,
        string $fromDate,
        string $toDate,
        ?Collection $preloadedById = null
    ): Collection {
        $fromStart = CarbonImmutable::parse($fromDate)->startOfDay()->toDateTimeString();
        $toEnd = CarbonImmutable::parse($toDate)->endOfDay()->toDateTimeString();

        $matchingIds = BiteIncident::where('clinic_id', $clinicId)
            ->whereHas('treatmentRecords', function ($query) use ($fromDate, $toDate, $fromStart, $toEnd) {
                $query->whereNull('voided_at')
                    ->whereNotNull('dose_number')
                    ->where('dose_number', '>=', 0)
                    ->where('dose_number', '<', 200)
                    ->where(function ($dates) use ($fromDate, $toDate, $fromStart, $toEnd) {
                        $dates->whereBetween('treatment_date', [$fromDate, $toDate])
                            ->orWhereBetween('administered_at', [$fromStart, $toEnd]);
                    });
            })
            ->pluck('bite_id');

        return $this->loadIncidentsByIdsWithReuse($matchingIds, $preloadedById);
    }

    /**
     * Normalize place of exposure without ever substituting patient residence when exposure place is missing.
     */
    public function normalizeExposureGeography(
        BiteIncident $incident,
        string $clinicMunicipality = 'Tagoloan',
        string $clinicProvince = 'Misamis Oriental'
    ): array {
        $rawPlace = trim((string) (
            $incident->bite_place
            ?: $incident->intake?->place_of_bite
            ?: $incident->intake?->bite_place
            ?: ''
        ));

        if ($rawPlace === '' || strcasecmp($rawPlace, 'Unknown') === 0) {
            return [
                'raw_place' => $rawPlace !== '' ? $rawPlace : null,
                'barangay' => 'Unknown',
                'municipality' => 'Unknown',
                'province' => $clinicProvince,
                'scope' => 'unknown',
            ];
        }

        $parts = array_values(array_filter(
            array_map('trim', explode(',', $rawPlace)),
            fn (string $part) => $part !== ''
        ));

        $province = $clinicProvince;
        if (count($parts) >= 2) {
            $last = end($parts);
            if ($this->looksLikeProvince($last, $clinicProvince)) {
                $province = $last;
                array_pop($parts);
            }
        }

        $barangay = 'Unknown';
        $municipality = $clinicMunicipality;

        if (count($parts) === 1) {
            $cleaned = $this->stripBarangayPrefix($parts[0]);
            if ($this->looksLikeCityOrMunicipality($cleaned) && !$this->isSameMunicipality($cleaned, $clinicMunicipality)) {
                $municipality = $this->canonicalTitleCase($cleaned);
                $barangay = $municipality;
            } else {
                $barangay = $this->canonicalTitleCase($cleaned);
                $municipality = $clinicMunicipality;
            }
        } elseif (count($parts) >= 2) {
            $municipalityToken = $this->stripBarangayPrefix(end($parts));
            $municipality = $this->canonicalTitleCase($municipalityToken);
            $barangayToken = $this->stripBarangayPrefix($parts[count($parts) - 2]);
            $barangay = $barangayToken !== '' ? $this->canonicalTitleCase($barangayToken) : 'Unknown';
        }

        $scope = $barangay === 'Unknown'
            ? 'unknown'
            : ($this->isSameMunicipality($municipality, $clinicMunicipality) ? 'within_municipality' : 'outside_municipality');

        return [
            'raw_place' => $rawPlace,
            'barangay' => $barangay,
            'municipality' => $municipality,
            'province' => $province,
            'scope' => $scope,
        ];
    }

    /**
     * Separately normalize patient residence barangay/municipality for follow-up analysis.
     */
    public function normalizeResidenceGeography(
        BiteIncident $incident,
        string $clinicMunicipality = 'Tagoloan',
        string $clinicProvince = 'Misamis Oriental'
    ): array {
        $patient = $incident->patient;
        $details = $patient?->details;

        $rawBarangay = trim((string) ($details?->address_barangay ?? $patient?->address_barangay ?? ''));
        $rawMunicipality = trim((string) ($details?->address_municipality ?? $patient?->address_municipality ?? ''));
        $province = trim((string) ($details?->province ?? $clinicProvince));

        $barangay = $rawBarangay !== '' ? $this->canonicalTitleCase($this->stripBarangayPrefix($rawBarangay)) : 'Unknown';
        $municipality = $rawMunicipality !== '' ? $this->canonicalTitleCase($rawMunicipality) : ($barangay === 'Unknown' ? 'Unknown' : $clinicMunicipality);

        if ($barangay === 'Unknown' && $municipality === 'Unknown') {
            $scope = 'unknown';
        } elseif ($municipality !== 'Unknown' && !$this->isSameMunicipality($municipality, $clinicMunicipality)) {
            $scope = 'outside_municipality';
        } else {
            $scope = 'clinic_resident';
        }

        return [
            'barangay' => $barangay,
            'municipality' => $municipality,
            'province' => $province ?: $clinicProvince,
            'scope' => $scope,
        ];
    }

    public function normalizedAnimalCategory(BiteIncident $incident): string
    {
        $raw = strtolower(trim((string) ($incident->animal_type ?? $incident->intake?->animal_type ?? '')));
        if ($raw === '' || in_array($raw, ['unknown', 'unassessed', 'unspecified'], true)) {
            return 'unknown';
        }

        if (in_array($raw, ['dog', 'cat'], true)) {
            return $raw;
        }

        return 'other';
    }

    public function matchesFilters(
        BiteIncident $incident,
        array $state,
        array $expGeo,
        array $resGeo,
        array $filters,
        CarbonInterface $refEnd
    ): bool {
        $catFilter = trim((string) ($filters['category'] ?? $filters['severity'] ?? ''));
        if ($catFilter !== '' && strtoupper($catFilter) !== 'ALL') {
            $lowerCat = strtolower($catFilter);
            if ($lowerCat === 'unassessed') {
                if ($incident->bite_category !== 'Unassessed') {
                    return false;
                }
            } elseif ($lowerCat === 'not_yet_assessed') {
                if ($state['assessment'] === 'finalized') {
                    return false;
                }
            } elseif ($lowerCat === 'assessed_category_missing') {
                if ($state['assessment'] !== 'finalized' || in_array($state['category'], ['I', 'II', 'III'], true)) {
                    return false;
                }
            } else {
                $upperCat = strtoupper($catFilter);
                if ($incident->bite_category !== $upperCat && $state['category'] !== $upperCat) {
                    return false;
                }
            }
        }

        $statusFilter = strtolower(trim((string) ($filters['status'] ?? '')));
        if ($statusFilter !== '' && $statusFilter !== 'all') {
            if (in_array($statusFilter, ['transferred_out', 'transferred_referred'], true)) {
                if (!in_array($state['resolved_status'], ['transferred_out', 'transferred_referred'], true)
                    && $state['encounter_disposition'] !== 'transferred_referred'
                ) {
                    return false;
                }
            } elseif ($state['resolved_status'] !== $statusFilter) {
                return false;
            }
        }

        $animalFilter = strtolower(trim((string) ($filters['animal'] ?? '')));
        if ($animalFilter !== '' && $animalFilter !== 'all') {
            if ($this->normalizedAnimalCategory($incident) !== $animalFilter) {
                return false;
            }
        }

        $sexFilter = strtolower(trim((string) ($filters['sex'] ?? '')));
        if ($sexFilter !== '' && $sexFilter !== 'all') {
            $gender = strtolower(trim((string) ($incident->patient?->gender ?? '')));
            $normalizedGender = in_array($gender, ['male', 'female'], true) ? $gender : 'unknown';
            if ($normalizedGender !== $sexFilter) {
                return false;
            }
        }

        $ageGroupFilter = strtolower(trim((string) ($filters['age_group'] ?? '')));
        if ($ageGroupFilter !== '' && $ageGroupFilter !== 'all') {
            $age = $incident->patient?->ageAtDate($incident->bite_date ?? $refEnd);
            $bucket = $age === null ? 'unknown' : ($age < 15 ? 'below_15' : '15_above');
            if ($bucket !== $ageGroupFilter) {
                return false;
            }
        }

        $planFilter = strtolower(trim((string) ($filters['plan_type'] ?? '')));
        if ($planFilter !== '' && $planFilter !== 'all') {
            $actualPlan = strtolower(trim((string) ($state['plan_type'] ?? 'none')));
            if ($actualPlan !== $planFilter) {
                return false;
            }
        }

        $barangayFilter = trim((string) ($filters['barangay'] ?? ''));
        if ($barangayFilter !== '' && strcasecmp($barangayFilter, 'ALL') !== 0) {
            $geoBasis = strtolower(trim((string) ($filters['geography_basis'] ?? 'exposure')));
            $targetGeo = $geoBasis === 'residence' ? $resGeo : $expGeo;
            if (strcasecmp((string) $targetGeo['barangay'], $barangayFilter) !== 0) {
                return false;
            }
        }

        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $haystack = strtolower(implode(' ', array_filter([
                $incident->case_number,
                $incident->bite_place,
                $expGeo['barangay'],
                $resGeo['barangay'],
                $incident->patient?->first_name,
                $incident->patient?->middle_name,
                $incident->patient?->last_name,
            ])));
            if (!str_contains($haystack, strtolower($search))) {
                return false;
            }
        }

        return true;
    }

    private function fetchByRegistrationDateBasis(
        int $clinicId,
        ?Clinic $clinic,
        string $clinicMunicipality,
        string $clinicProvince,
        CarbonImmutable $fromDay,
        CarbonImmutable $toDay,
        CarbonImmutable $cutoff,
        array $filters
    ): array {
        $incidents = BiteIncident::where('clinic_id', $clinicId)
            ->with(['patient.details', 'intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])
            ->get()
            ->reject(fn (BiteIncident $c) => $this->isExcludedNonEpisode($c))
            ->filter(fn (BiteIncident $c) => $this->isWithinRegistrationWindow($c, $fromDay, $toDay))
            ->values();

        $allItems = $this->resolveAndFilterItems(
            $incidents,
            $cutoff,
            $toDay,
            $filters,
            $clinicMunicipality,
            $clinicProvince
        );

        return [
            'clinic' => $clinic,
            'from' => $fromDay->toDateString(),
            'to' => $toDay->toDateString(),
            'cutoff' => $cutoff->toDateString(),
            'date_basis' => 'registration_date',
            'verified_episodes' => $allItems->reject(fn (array $item) => $item['incident']->hasProvisionalBiteDate())->values(),
            'unknown_exposure_date_episodes' => $allItems->filter(fn (array $item) => $item['incident']->hasProvisionalBiteDate())->values(),
            'all_eligible_episodes' => $allItems,
            'loaded_incidents' => $incidents->keyBy('bite_id'),
        ];
    }

    private function resolveAndFilterItems(
        Collection $incidents,
        CarbonImmutable $cutoff,
        CarbonImmutable $refEnd,
        array $filters,
        string $clinicMunicipality,
        string $clinicProvince
    ): Collection {
        $items = collect();

        foreach ($incidents as $incident) {
            $state = $this->stateResolver()->resolve($incident, $cutoff);
            $expGeo = $this->normalizeExposureGeography($incident, $clinicMunicipality, $clinicProvince);
            $resGeo = $this->normalizeResidenceGeography($incident, $clinicMunicipality, $clinicProvince);

            if ($this->matchesFilters($incident, $state, $expGeo, $resGeo, $filters, $refEnd)) {
                $items->push([
                    'incident' => $incident,
                    'state' => $state,
                    'exposure_geo' => $expGeo,
                    'residence_geo' => $resGeo,
                ]);
            }
        }

        return $items->values();
    }

    public function isExcludedNonEpisode(BiteIncident $incident): bool
    {
        return in_array(strtolower(trim((string) $incident->status)), ['void', 'voided', 'duplicate'], true);
    }

    /**
     * Reuse already eager-loaded incidents when possible so period slices avoid duplicate eager loads.
     */
    private function loadIncidentsByIdsWithReuse(Collection $matchingIds, ?Collection $preloadedById = null): Collection
    {
        $ids = $matchingIds->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        $reused = collect();
        if ($preloadedById !== null && $preloadedById->isNotEmpty()) {
            foreach ($ids as $id) {
                if ($preloadedById->has($id)) {
                    $reused->put($id, $preloadedById->get($id));
                }
            }
        }

        $missingIds = $ids->reject(fn ($id) => $reused->has($id))->values();
        $fetched = $missingIds->isNotEmpty()
            ? BiteIncident::whereIn('bite_id', $missingIds)
                ->with(['patient.details', 'intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])
                ->get()
                ->keyBy('bite_id')
            : collect();

        return $ids
            ->map(fn ($id) => $reused->get($id) ?? $fetched->get($id))
            ->filter()
            ->reject(fn (BiteIncident $c) => $this->isExcludedNonEpisode($c))
            ->values();
    }

    private function isWithinRegistrationWindow(BiteIncident $incident, CarbonImmutable $fromDay, CarbonImmutable $toDay): bool
    {
        $consultationDate = $incident->treatmentRecords
            ->first(fn ($r) => $r->dose_number === null && !empty($r->consultation_date))
            ?->consultation_date;
        $reference = $consultationDate ?? $incident->created_at ?? $incident->bite_date;
        if (!$reference) {
            return false;
        }

        $refCarbon = CarbonImmutable::parse($reference);

        return $refCarbon->gte($fromDay) && $refCarbon->lte($toDay);
    }

    private function stripBarangayPrefix(string $value): string
    {
        $trimmed = trim($value);
        $stripped = preg_replace('/^(?:brgy\.?|barangay)\s+/i', '', $trimmed);

        return trim((string) $stripped);
    }

    private function canonicalTitleCase(string $value): string
    {
        $collapsed = preg_replace('/\s+/', ' ', trim($value));
        if ($collapsed === null || $collapsed === '') {
            return 'Unknown';
        }

        $words = explode(' ', strtolower($collapsed));
        $lowercaseConnectors = ['de', 'del', 'la', 'las', 'los', 'ng', 'sa', 'of'];

        $formatted = [];
        foreach ($words as $index => $word) {
            if ($index > 0 && in_array($word, $lowercaseConnectors, true)) {
                $formatted[] = $word;
            } else {
                $formatted[] = ucfirst($word);
            }
        }

        return implode(' ', $formatted);
    }

    private function looksLikeProvince(string $token, string $clinicProvince): bool
    {
        if ($clinicProvince !== '' && strcasecmp($token, $clinicProvince) === 0) {
            return true;
        }

        return stripos($token, 'Misamis') !== false
            || stripos($token, 'Bukidnon') !== false
            || stripos($token, 'Province') !== false;
    }

    private function looksLikeCityOrMunicipality(string $token): bool
    {
        return stripos($token, 'City') !== false
            || stripos($token, 'Municipality') !== false;
    }

    private function isSameMunicipality(string $a, string $b): bool
    {
        return strcasecmp(trim($a), trim($b)) === 0;
    }
}
