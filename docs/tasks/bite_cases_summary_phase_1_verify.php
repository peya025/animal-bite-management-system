<?php

// Phase 1 fixture arithmetic only. Does not bootstrap Laravel or access a database.
// This is not the production reporting algorithm or a replacement for feature tests.
$fixture = json_decode(file_get_contents(__DIR__ . '/bite_cases_summary_phase_1_fixtures.json'), true, 512, JSON_THROW_ON_ERROR);
$courses = array_column($fixture['courses'], null, 'id');
$episodes = array_column($fixture['episodes'], null, 'id');
$failures = [];
$checks = 0;
$check = function (bool $ok, string $message) use (&$failures, &$checks): void {
    $checks++;
    if (!$ok) $failures[] = $message;
};
$check($fixture['synthetic_only'] === true, 'Fixture must be explicitly synthetic');
$check(count($episodes) === count($fixture['episodes']), 'Duplicate episode IDs');
$check(count($courses) === count($fixture['courses']), 'Duplicate course IDs');
$eventIds = [];
foreach ($courses as $course) {
    $check(isset($episodes[$course['episode_id']]), 'Unknown originating episode: ' . $course['id']);
    foreach ($course['events'] as $event) $eventIds[] = $event['id'];
}
$check(count($eventIds) === count(array_unique($eventIds)), 'Duplicate event IDs');
foreach ($episodes as $episode) {
    $check($episode['course_id'] === null || isset($courses[$episode['course_id']]), 'Unknown course: ' . $episode['id']);
    if (isset($episode['continued_from'])) {
        $prior = $episodes[$episode['continued_from']] ?? null;
        $check($prior !== null && $prior['patient_id'] === $episode['patient_id'] && $prior['course_id'] === $episode['course_id'], 'Invalid continuing course link');
    }
}

foreach ($fixture['expected'] as $scope) {
    $within = fn ($date) => $date !== null && $date >= $scope['from'] && $date <= $scope['to'];
    $verified = fn ($event) => $event['status'] === 'administered'
        && $event['verified_at'] !== null && $event['verified_at'] <= $scope['cutoff']
        && $event['date'] <= $scope['cutoff'];
    $arv = fn ($course) => array_values(array_filter($course['events'], fn ($event) => $event['kind'] === 'ARV' && $verified($event)));
    $selected = array_values(array_filter($episodes, fn ($e) => $e['date_quality'] === 'recorded_exposure' && $within($e['exposure_date'])));
    $count = fn ($predicate) => count(array_filter($selected, $predicate));
    $started = fn ($e) => $e['course_id'] !== null && count($arv($courses[$e['course_id']])) > 0;
    $actual = [
        'episodes' => count($selected),
        'unique_patients' => count(array_unique(array_column($selected, 'patient_id'))),
        'unassessed' => $count(fn ($e) => $e['assessment'] !== 'finalized'),
        'assessed' => $count(fn ($e) => $e['assessment'] === 'finalized'),
        'category_I' => $count(fn ($e) => $e['assessment'] === 'finalized' && $e['category'] === 'I'),
        'category_II' => $count(fn ($e) => $e['assessment'] === 'finalized' && $e['category'] === 'II'),
        'category_III' => $count(fn ($e) => $e['assessment'] === 'finalized' && $e['category'] === 'III'),
        'category_unknown_after_assessment' => $count(fn ($e) => $e['assessment'] === 'finalized' && $e['category'] === null),
        'no_pep' => $count(fn ($e) => $e['decision'] === 'no_pep'),
        'decision_missing' => $count(fn ($e) => $e['decision'] === 'missing'),
        'new_course_prescribed' => $count(fn ($e) => $e['decision'] === 'new_course'),
        'new_course_started' => $count(fn ($e) => $e['decision'] === 'new_course' && $started($e)),
        'new_course_no_receipt' => $count(fn ($e) => $e['decision'] === 'new_course' && !$started($e)),
        'continuing_episodes' => $count(fn ($e) => $e['decision'] === 'continue_course'),
        'mature_started_courses' => 0, 'completed_mature_courses' => 0,
        'ongoing_not_mature_courses' => 0, 'overdue_started_courses' => 0, 'outstanding_dose_slots' => 0,
        'rig_indicated' => $count(fn ($e) => ($e['rig_indicated'] ?? false)),
        'rig_verified' => $count(fn ($e) => ($e['rig_indicated'] ?? false) && $e['course_id'] !== null
            && count(array_filter($courses[$e['course_id']]['events'], fn ($event) => $event['kind'] === 'RIG' && $verified($event))) > 0),
        'transferred' => $count(fn ($e) => isset($e['transfer_at']) && $e['transfer_at'] <= $scope['cutoff']),
        'unknown_date_registered' => count(array_filter($episodes, fn ($e) => $e['date_quality'] !== 'recorded_exposure' && $within($e['registered_at']))),
        'local_arv_events_in_service_period' => 0, 'external_arv_events_in_service_period' => 0,
    ];
    foreach ($courses as $course) {
        $doses = $arv($course);
        foreach ($doses as $event) {
            if ($within($event['date'])) $actual[$event['source'] . '_arv_events_in_service_period']++;
        }
        if (!$doses) continue;
        $dates = array_column($doses, 'date');
        if (!$within(min($dates))) continue; // D0 cohort, distinct courses, not exposure cohort.
        $due = $course['required_due_dates'];
        $check(count($due) > 0, 'Started fixture course needs explicit required dates');
        $missing = array_values(array_diff($due, $dates)); // Exact date matching is fixture-only.
        if (max($due) <= $scope['cutoff']) {
            $actual['mature_started_courses']++;
            if (!$missing) $actual['completed_mature_courses']++;
        } else {
            $actual['ongoing_not_mature_courses']++;
        }
        $overdue = array_filter($missing, fn ($date) => $date < $scope['cutoff']);
        if ($overdue) $actual['overdue_started_courses']++;
        $actual['outstanding_dose_slots'] += count($overdue);
    }
    foreach ($scope['counts'] as $metric => $expected) {
        $check(($actual[$metric] ?? null) === $expected, $scope['name'] . ': ' . $metric . ' expected ' . $expected . ', actual ' . ($actual[$metric] ?? 'missing'));
    }
    $check($actual['episodes'] === $actual['assessed'] + $actual['unassessed'], 'Assessment partition does not reconcile');
    $check($actual['assessed'] === $actual['no_pep'] + $actual['decision_missing'] + $actual['new_course_prescribed'] + $actual['continuing_episodes'], 'Decision partition does not reconcile');

    $courseCompletedByCutoff = function (?string $courseId) use ($courses, $arv, $scope): bool {
        if ($courseId === null || !isset($courses[$courseId])) {
            return false;
        }
        $course = $courses[$courseId];
        $due = $course['required_due_dates'];
        if (!$due || max($due) > $scope['cutoff']) {
            return false;
        }
        $dates = array_column($arv($course), 'date');
        return count(array_diff($due, $dates)) === 0;
    };
    $rigVerified = fn ($e): bool => ($e['rig_indicated'] ?? false) && $e['course_id'] !== null
        && count(array_filter($courses[$e['course_id']]['events'], fn ($event) => $event['kind'] === 'RIG' && $verified($event))) > 0;
    $isNewCourseStartedCat = fn ($e, string $cat): bool => $e['assessment'] === 'finalized'
        && $e['category'] === $cat
        && $e['decision'] === 'new_course'
        && $started($e);
    $isNewCourseCompletedCat = fn ($e, string $cat): bool => $isNewCourseStartedCat($e, $cat)
        && $courseCompletedByCutoff($e['course_id']);
    $isRigVerifiedCat = fn ($e, string $cat): bool => $e['assessment'] === 'finalized'
        && $e['category'] === $cat
        && $rigVerified($e);

    $actualBridge = [
        'total_recorded_episodes' => $actual['episodes'],
        'categorized_cases_total' => $actual['category_I'] + $actual['category_II'] + $actual['category_III'],
        'cat_I' => $actual['category_I'],
        'cat_II' => $actual['category_II'],
        'cat_III' => $actual['category_III'],
        'unassessed_episodes' => $actual['unassessed'],
        'assessed_category_missing' => $actual['category_unknown_after_assessment'],
        'continuing_episodes' => $actual['continuing_episodes'],
    ];
    $actualMonthly = [
        'cases_total' => $actual['episodes'],
        'given_pep' => $actual['new_course_started'],
        'cat_I' => $actual['category_I'],
        'cat_II' => $actual['category_II'],
        'cat_III' => $actual['category_III'],
        'cat_total' => $actual['category_I'] + $actual['category_II'] + $actual['category_III'],
        'unassessed_or_missing_category' => $actual['unassessed'] + $actual['category_unknown_after_assessment'],
        'completed_cat_I' => $count(fn ($e) => $isNewCourseCompletedCat($e, 'I')),
        'completed_cat_II' => $count(fn ($e) => $isNewCourseCompletedCat($e, 'II')),
        'completed_cat_III' => $count(fn ($e) => $isNewCourseCompletedCat($e, 'III')),
        'completed_total' => 0,
        'given_rig' => $actual['rig_verified'],
    ];
    $actualMonthly['completed_total'] = $actualMonthly['completed_cat_I'] + $actualMonthly['completed_cat_II'] + $actualMonthly['completed_cat_III'];
    $actualCohort = [
        'cases_cat_I' => $actual['category_I'],
        'cases_cat_II' => $actual['category_II'],
        'cases_cat_III' => $actual['category_III'],
        'cases_total' => $actual['category_I'] + $actual['category_II'] + $actual['category_III'],
        'excluded_unassessed_or_missing_cat' => $actual['unassessed'] + $actual['category_unknown_after_assessment'],
        'given_pep_cat_I' => $count(fn ($e) => $isNewCourseStartedCat($e, 'I')),
        'given_pep_cat_II' => $count(fn ($e) => $isNewCourseStartedCat($e, 'II')),
        'given_pep_cat_III' => $count(fn ($e) => $isNewCourseStartedCat($e, 'III')),
        'given_pep_total' => 0,
        'completed_cat_I' => $actualMonthly['completed_cat_I'],
        'completed_cat_II' => $actualMonthly['completed_cat_II'],
        'completed_cat_III' => $actualMonthly['completed_cat_III'],
        'completed_total' => $actualMonthly['completed_total'],
        'given_rig_cat_I' => $count(fn ($e) => $isRigVerifiedCat($e, 'I')),
        'given_rig_cat_II' => $count(fn ($e) => $isRigVerifiedCat($e, 'II')),
        'given_rig_cat_III' => $count(fn ($e) => $isRigVerifiedCat($e, 'III')),
        'given_rig_total' => 0,
    ];
    $actualCohort['given_pep_total'] = $actualCohort['given_pep_cat_I'] + $actualCohort['given_pep_cat_II'] + $actualCohort['given_pep_cat_III'];
    $actualCohort['given_rig_total'] = $actualCohort['given_rig_cat_I'] + $actualCohort['given_rig_cat_II'] + $actualCohort['given_rig_cat_III'];

    $expectedForms = $scope['baseline_forms'] ?? null;
    $check(is_array($expectedForms), $scope['name'] . ': missing baseline_forms block');
    if (is_array($expectedForms)) {
        $check($actualBridge['categorized_cases_total'] + $actualBridge['unassessed_episodes'] + $actualBridge['assessed_category_missing'] === $actualBridge['total_recorded_episodes'], $scope['name'] . ': bridge total does not reconcile');
        foreach ($expectedForms['recorded_episodes_bridge'] ?? [] as $k => $v) {
            $check(($actualBridge[$k] ?? null) === $v, $scope['name'] . " bridge.{$k} expected {$v}, actual " . ($actualBridge[$k] ?? 'missing'));
        }
        foreach ($expectedForms['abtc_monthly_form'] ?? [] as $k => $v) {
            $check(($actualMonthly[$k] ?? null) === $v, $scope['name'] . " monthly.{$k} expected {$v}, actual " . ($actualMonthly[$k] ?? 'missing'));
        }
        foreach ($expectedForms['cohort_quarterly_form_slice'] ?? [] as $k => $v) {
            $check(($actualCohort[$k] ?? null) === $v, $scope['name'] . " cohort.{$k} expected {$v}, actual " . ($actualCohort[$k] ?? 'missing'));
        }
    }

    echo $scope['name'], ': ', json_encode($actual, JSON_UNESCAPED_SLASHES), PHP_EOL;
}

$appE = $fixture['appendix_e_reconciliation'] ?? null;
$check(is_array($appE), 'Missing appendix_e_reconciliation benchmark block');
if (is_array($appE)) {
    $check($appE['recorded_episodes'] === $appE['finalized_assessments'] + $appE['no_finalized_assessment'], 'Appendix E: assessment partition does not reconcile');
    $check($appE['finalized_assessments'] === $appE['pep_prescribed'] + $appE['explicit_no_pep'] + $appE['decision_missing'], 'Appendix E: decision partition does not reconcile');
    $check($appE['pep_prescribed'] === $appE['verified_vaccine_initiation'] + $appE['no_administration_recorded'], 'Appendix E: initiation partition does not reconcile');
    $check(round(($appE['finalized_assessments'] / $appE['recorded_episodes']) * 100, 1) === (float) $appE['assessment_completion_pct'], 'Appendix E: assessment completion percentage mismatch');
    $check(round(($appE['verified_vaccine_initiation'] / $appE['pep_prescribed']) * 100, 1) === (float) $appE['documented_pep_initiation_pct'], 'Appendix E: PEP initiation percentage mismatch');
    $check($appE['pep_prescribed'] === ($appE['finalized_assessments'] - $appE['explicit_no_pep'] - $appE['decision_missing']) && $appE['no_finalized_assessment'] === ($appE['recorded_episodes'] - $appE['finalized_assessments']), 'Appendix E: unassessed and explicit no-PEP episodes must stay out of prescribed-PEP and initiation denominators');
    echo 'Appendix E reconciliation (100 synthetic episodes): ', json_encode($appE, JSON_UNESCAPED_SLASHES), PHP_EOL;
}

echo $checks, ' fixture integrity/arithmetic checks; ', count($failures), ' failures.', PHP_EOL;
foreach ($failures as $failure) fwrite(STDERR, $failure . PHP_EOL);
exit($failures ? 1 : 0);
