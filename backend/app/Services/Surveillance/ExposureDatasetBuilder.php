<?php

namespace App\Services\Surveillance;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Services\Reporting\EpisodeReportingStateResolver;
use App\Services\Reporting\ExposureReportingQuery;
use Carbon\CarbonImmutable;

class ExposureDatasetBuilder
{
    public function __construct(private ExposureGeographyResolver $geography, private EpisodeReportingStateResolver $states,
        private ExposureReportingQuery $reporting, private SurveillanceThresholdEvaluator $thresholds) {}

    public function build(Clinic $clinic, CarbonImmutable $cutoff): array
    {
        $start = $cutoff->subDays(6);
        $baselineStart = $cutoff->subDays(36);
        $rules = config('surveillance');
        $coverageStart = $rules['coverage_start_by_clinic'][$clinic->id] ?? null;
        $coverage = $coverageStart !== null && $coverageStart <= $baselineStart->toDateString();
        $catalog = $this->geography->catalog();
        $exclusions = array_fill_keys(['void_or_duplicate', 'uncertain_date', 'after_cutoff', 'unknown_or_ambiguous_location'], 0);
        $buckets = [];
        $quality = [];
        $source = [];
        $dateEligible = 0;
        $unknownCurrent = 0;
        $possibleDuplicates = [];
        $incidents = BiteIncident::where('clinic_id', $clinic->id)
            ->where(function ($query) use ($baselineStart, $cutoff) {
                $query->whereBetween('bite_date', [$baselineStart->toDateString(), $cutoff->toDateString()])
                    ->orWhereBetween('created_at', [$baselineStart->startOfDay(), $cutoff->endOfDay()]);
            })->with(['intake', 'treatmentRecords', 'treatmentPlan', 'appointments'])->orderBy('bite_id')->get();
        foreach ($incidents as $incident) {
            $date = $incident->bite_date?->toDateString();
            $reason = null;
            if ($this->reporting->isExcludedNonEpisode($incident)) {
                $reason = 'void_or_duplicate';
            } elseif ($incident->hasProvisionalBiteDate()) {
                $reason = 'uncertain_date';
            } elseif ($date > $cutoff->toDateString()) {
                $reason = 'after_cutoff';
            } elseif ($date < $baselineStart->toDateString()) {
                continue;
            }
            $current = !$reason && $date >= $start->toDateString();
            if ($current) { $dateEligible++; }
            $geo = null;
            if (!$reason) {
                $place = $incident->bite_place ?: ($incident->intake?->place_of_bite ?: $incident->intake?->bite_place ?: '');
                $geo = $this->geography->resolve($place, $clinic, $catalog);
                if (!$geo) {
                    $reason = 'unknown_or_ambiguous_location';
                    if ($current) { $unknownCurrent++; }
                }
            }
            if ($reason) {
                $exclusions[$reason]++;
                $quality[] = ['bite_id' => $incident->bite_id, 'reason' => $reason];
                $source[] = [$incident->bite_id, $date, $reason];
                continue;
            }
            $key = $geo['key'];
            $buckets[$key] ??= [
                'geography_key' => $key, 'barangay' => $geo['barangay'], 'municipality' => $geo['municipality'], 'province' => $geo['province'],
                'current_count' => 0, 'baseline_count' => 0, 'finalized_category_iii' => 0, 'awaiting_assessment' => 0,
                'current_incident_ids' => [], 'baseline_incident_ids' => [],
            ];
            $state = $current ? $this->states->resolve($incident, $cutoff->endOfDay()) : null;
            if ($current) {
                $buckets[$key]['current_count']++;
                $buckets[$key]['current_incident_ids'][] = $incident->bite_id;
                if ($state['assessment'] !== 'finalized') { $buckets[$key]['awaiting_assessment']++; }
                elseif ($state['category'] === 'III') { $buckets[$key]['finalized_category_iii']++; }
                $possibleDuplicates[$incident->patient_id.'|'.$date.'|'.$key][] = $incident->bite_id;
            } else {
                $buckets[$key]['baseline_count']++;
                $buckets[$key]['baseline_incident_ids'][] = $incident->bite_id;
            }
            $source[] = [$incident->bite_id, $date, $key, $state['assessment'] ?? null, $state['category'] ?? null];
        }
        $coverage = $coverage && $exclusions['uncertain_date'] === 0 && $exclusions['unknown_or_ambiguous_location'] === 0;
        foreach ($buckets as &$bucket) {
            $bucket += $this->thresholds->evaluate($bucket['current_count'], $bucket['finalized_category_iii'], $bucket['baseline_count'], $coverage, $rules);
        }
        unset($bucket);
        ksort($buckets);
        return [
            'rule_version' => $rules['rule_version'],
            'rules' => array_diff_key($rules, ['coverage_start_by_clinic' => true]),
            'coverage_start' => $coverageStart,
            'fingerprint' => hash('sha256', json_encode([$source, $rules, $buckets, $exclusions, $possibleDuplicates], JSON_THROW_ON_ERROR)),
            'period' => ['start' => $start->toDateString(), 'end' => $cutoff->toDateString(), 'baseline_start' => $baselineStart->toDateString(), 'baseline_end' => $start->subDay()->toDateString()],
            'baseline_adequate' => $coverage, 'exclusions' => $exclusions,
            'date_eligible_current' => $dateEligible, 'unknown_location_current' => $unknownCurrent,
            'unknown_location_pct' => $dateEligible ? round(100 * $unknownCurrent / $dateEligible, 1) : null,
            'possible_duplicate_groups' => array_values(array_filter($possibleDuplicates, fn ($ids) => count($ids) > 1)),
            'quality_evidence' => $quality, 'buckets' => array_values($buckets),
        ];
    }
}
