<?php

namespace App\Services\Surveillance;

class SurveillanceThresholdEvaluator
{
    public function evaluate(int $current, int $categoryIII, int $baseline, bool $coverage, array $rules): array
    {
        $weekly = $baseline * 7 / 30;
        $ratio = $coverage && $weekly > 0 ? $current / $weekly : null;
        $priority = null;
        if ($current >= $rules['priority_min_incidents'] || $categoryIII >= $rules['priority_min_finalized_category_iii']) {
            $priority = 'priority_review';
        } elseif ($current >= $rules['trend_min_incidents'] && $ratio !== null && $ratio >= $rules['trend_ratio']) {
            $priority = 'trend_for_review';
        }
        return ['priority' => $priority, 'baseline_weekly_average' => $weekly, 'ratio' => $ratio,
            'baseline_adequate' => $coverage, 'ratio_unavailable_reason' => !$coverage ? 'coverage_not_confirmed' : ($baseline === 0 ? 'zero_baseline' : null)];
    }
}
