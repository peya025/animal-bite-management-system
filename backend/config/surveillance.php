<?php

return [
    'rule_version' => 'community-surveillance-v1',
    'priority_min_incidents' => 3,
    'priority_min_finalized_category_iii' => 2,
    'trend_min_incidents' => 2,
    'trend_ratio' => 2.0,
    // Explicitly confirmed collection coverage, not inferred from the oldest case.
    // Keyed by clinic ID. Without it, ratio-based review is suppressed.
    'coverage_start_by_clinic' => [],
];
