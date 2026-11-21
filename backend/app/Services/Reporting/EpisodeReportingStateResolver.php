<?php

namespace App\Services\Reporting;

use App\Models\BiteIncident;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Services\ProphylaxisService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Classifies every bite exposure episode into 6 independent clinical reporting
 * dimensions and maps incomplete journeys onto explicit visibility states.
 */
class EpisodeReportingStateResolver
{
    public function __construct(
        protected TreatmentOutcomeResolver $outcomeResolver
    ) {}

    /**
     * Resolve all 6 reporting dimensions and stage labels for a single episode as of cutoff.
     */
    public function resolve(BiteIncident $incident, CarbonInterface|string|null $cutoff = null): array
    {
        $cutoffEnd = $this->outcomeResolver->resolveCutoff($cutoff);
        $records = $this->episodeRecords($incident);

        $consultationRows = $records->filter(function (TreatmentRecord $record) use ($cutoffEnd) {
            if ($record->voided_at !== null) {
                return false;
            }

            if ($record->dose_number !== null || !empty($record->medication_given)) {
                return false;
            }

            return $this->isConsultationWithinCutoff($record, $cutoffEnd);
        })->sortBy(fn (TreatmentRecord $r) => sprintf(
            '%s-%010d',
            $this->consultationEventDate($r)?->toDateString() ?? '0000-00-00',
            (int) $r->treatment_id
        ))->values();

        $completedConsultation = $consultationRows->filter(function (TreatmentRecord $record) {
            if (strtolower(trim((string) $record->status)) !== 'completed') {
                return false;
            }

            return !empty($record->nature_of_visit)
                || !empty($record->diagnosis)
                || !empty($record->chief_complaints)
                || !empty($record->prophylaxis_orders)
                || !empty($record->prescribed_vaccine_type)
                || !empty($record->medication_treatment)
                || !empty($record->outcome)
                || !empty($record->referred_to);
        })->last();

        $draftConsultation = $consultationRows->filter(function (TreatmentRecord $record) {
            $status = strtolower(trim((string) $record->status));
            if ($status === 'draft') {
                return true;
            }
            if ($status !== 'scheduled') {
                return false;
            }

            return !empty($record->nature_of_visit)
                || !empty($record->diagnosis)
                || !empty($record->chief_complaints)
                || !empty($record->prophylaxis_orders)
                || !empty($record->prescribed_vaccine_type)
                || !empty($record->medication_treatment)
                || !empty($record->outcome)
                || !empty($record->referred_to);
        })->last();

        $plan = $this->resolveApplicablePlan($incident, $cutoffEnd);
        $category = $incident->bite_category;

        // 1. Assessment dimension
        $isConfirmedBeforeCutoff = $incident->confirmed_at !== null
            && CarbonImmutable::parse($incident->confirmed_at)->lte($cutoffEnd);
        $hasAssessedCategoryWithoutAwaiting = $incident->confirmed_at === null
            && !$incident->isAwaitingAssessment()
            && in_array($category, ['I', 'II', 'III'], true);

        if ($completedConsultation !== null || $isConfirmedBeforeCutoff) {
            $assessment = 'finalized';
        } elseif ($draftConsultation !== null) {
            $assessment = 'draft_in_progress';
        } elseif ($hasAssessedCategoryWithoutAwaiting) {
            $assessment = 'finalized';
        } else {
            $assessment = 'not_recorded';
        }

        // Referral / transfer detection as of cutoff
        $isIncidentTransferred = (
            $incident->status === 'transferred_out'
            && ($incident->transferred_at === null || CarbonImmutable::parse($incident->transferred_at)->lte($cutoffEnd))
        ) || (
            !empty($incident->transferred_to_facility)
            && ($incident->transferred_at === null || CarbonImmutable::parse($incident->transferred_at)->lte($cutoffEnd))
        );

        $isConsultationTransferred = $completedConsultation !== null && (
            $completedConsultation->outcome === 'Transferred/Referred'
            || TreatmentRecord::isExternalReferralDestination($completedConsultation->referred_to)
            || ($completedConsultation->mode_of_transaction === 'referral' && !empty($completedConsultation->referred_to))
            || str_contains(strtolower((string) $completedConsultation->actions_taken), 'transferred/referred')
        );

        $isTransferred = $isIncidentTransferred || $isConsultationTransferred;

        // Pending non-PEP prophylaxis (e.g. ordered TT / ATS on Category I)
        $hasPendingNonPepProphylaxis = $this->hasPendingNonPepProphylaxis(
            $incident,
            $completedConsultation,
            $cutoffEnd
        );

        // 2. PEP prescription decision dimension (before conflict check)
        $orders = is_array($completedConsultation?->prophylaxis_orders)
            ? $completedConsultation->prophylaxis_orders
            : [];
        $planType = $plan?->plan_type ?? ($orders['consultation_treatment_plan'] ?? null);
        $reassessmentDecision = $orders['reassessment_decision'] ?? null;

        if ($assessment !== 'finalized') {
            $pepDecision = 'not_determined';
        } else {
            $isContinuingCourse = $plan?->continued_from_bite_id !== null
                || $planType === 'continue_existing_schedule';

            $isExplicitNoPep = (
                in_array($planType, ['no_vaccine', 'none'], true) && !$isTransferred
            ) || in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true)
              || $incident->status === 'completed_no_pep'
              || $completedConsultation?->outcome === 'completed_without_injection'
              || (
                  $category === 'I'
                  && empty($completedConsultation?->prescribed_vaccine_type)
                  && !in_array($planType, ['full_pep', 'two_dose_booster', 'single_booster', 'continue_existing_schedule'], true)
                  && !$isTransferred
              );

            $isNewCoursePrescribed = !$isExplicitNoPep && (
                in_array($planType, ['full_pep', 'two_dose_booster', 'single_booster'], true)
                || (!empty($completedConsultation?->prescribed_vaccine_type) && strtolower(trim((string) $completedConsultation->prescribed_vaccine_type)) !== 'none')
                || ($plan === null && $completedConsultation === null && in_array($category, ['II', 'III'], true) && !$isTransferred)
            );

            if ($isTransferred && !$isContinuingCourse && !in_array($planType, ['full_pep', 'two_dose_booster', 'single_booster'], true) && empty($completedConsultation?->prescribed_vaccine_type)) {
                $pepDecision = 'transferred_referred';
            } elseif ($isExplicitNoPep) {
                $pepDecision = 'explicit_no_pep';
            } elseif ($isContinuingCourse) {
                $pepDecision = 'continue_course';
            } elseif ($isNewCoursePrescribed) {
                $pepDecision = 'new_course_prescribed';
            } else {
                $pepDecision = 'missing_after_finalization';
            }
        }

        // 3. Administration & RIG evidence (cutoff-bounded)
        $adminEvidence = $this->outcomeResolver->resolveAdministrationEvidence($incident, $pepDecision, $cutoffEnd);
        if ($pepDecision === 'explicit_no_pep' && $adminEvidence['has_vaccine_administration']) {
            $pepDecision = 'conflict_review';
        }

        $rigEvidence = $this->outcomeResolver->resolveRigEvidence($incident, $completedConsultation, $cutoffEnd);

        // 5. Encounter disposition (initial) & 4. Course outcome
        $isClosedWithoutFollowUp = in_array((string) $incident->status, ['cancelled', 'abandoned', 'closed'], true);
        if ($isTransferred) {
            $encounterDisposition = 'transferred_referred';
        } elseif ($assessment !== 'finalized') {
            $encounterDisposition = $isClosedWithoutFollowUp ? 'closed_before_assessment' : 'open';
        } elseif ($pepDecision === 'explicit_no_pep') {
            $encounterDisposition = $hasPendingNonPepProphylaxis ? 'open' : 'closed';
        } elseif (in_array($pepDecision, ['new_course_prescribed', 'continue_course'], true)
            && !$adminEvidence['has_vaccine_administration']
            && !$adminEvidence['has_prophylaxis_administration']
            && $isClosedWithoutFollowUp
        ) {
            $encounterDisposition = 'closed_before_treatment';
        } else {
            $encounterDisposition = 'open';
        }

        $courseOutcome = $this->outcomeResolver->resolveCourseOutcome(
            $incident,
            $plan,
            $pepDecision,
            $encounterDisposition,
            $adminEvidence,
            $cutoffEnd
        );

        if (
            !$isTransferred
            && $encounterDisposition === 'open'
            && $courseOutcome['is_completed']
            && !$hasPendingNonPepProphylaxis
        ) {
            $encounterDisposition = 'closed';
        }

        // 6. Data availability & User's 5-stage classification matrix
        $dataAvailability = $this->resolveDataAvailability(
            $incident,
            $assessment,
            $adminEvidence,
            $rigEvidence,
            $encounterDisposition
        );

        $stageSummary = $this->buildStageSummary(
            $incident,
            $category,
            $assessment,
            $pepDecision,
            $adminEvidence,
            $courseOutcome,
            $encounterDisposition,
            $hasPendingNonPepProphylaxis
        );

        return [
            'bite_id' => $incident->bite_id,
            'patient_id' => $incident->patient_id,
            'course_key' => $plan?->continued_from_bite_id ?: $incident->bite_id,
            'category' => $category,
            'plan_type' => $planType,
            'referred_to' => $incident->transferred_to_facility ?: $completedConsultation?->referred_to,
            'assessment_date' => $this->resolveAssessmentDate($incident, $completedConsultation),
            'treatment_start_date' => $adminEvidence['d0_date'] ?? null,
            'cutoff' => $cutoffEnd->toDateString(),
            'assessment' => $assessment,
            'pep_decision' => $pepDecision,
            'administration_evidence' => $adminEvidence,
            'rig_evidence' => $rigEvidence,
            'course_outcome' => $courseOutcome,
            'encounter_disposition' => $encounterDisposition,
            'has_pending_non_pep_prophylaxis' => $hasPendingNonPepProphylaxis,
            'data_availability' => $dataAvailability,
            'stage_summary' => $stageSummary,
            'resolved_status' => $stageSummary['resolved_status'],
        ];
    }

    /**
     * Summarize incomplete journeys & produce a verifiable cohort reconciliation breakdown.
     */
    public function reconcileCohort(Collection $incidents, CarbonInterface|string|null $cutoff = null): array
    {
        $cutoffEnd = $this->outcomeResolver->resolveCutoff($cutoff);
        $states = $incidents->map(fn (BiteIncident $incident) => $this->resolve($incident, $cutoffEnd))->values();

        return $this->reconcileStates($states, $cutoffEnd);
    }

    /**
     * Summarize already-resolved reporting states without re-running per-episode resolution.
     */
    public function reconcileStates(Collection $states, CarbonInterface|string|null $cutoff = null): array
    {
        $cutoffEnd = $this->outcomeResolver->resolveCutoff($cutoff);

        $recorded = $states->count();
        $finalizedStates = $states->where('assessment', 'finalized');
        $finalized = $finalizedStates->count();
        $awaitingAssessment = $recorded - $finalized;

        $cat1 = $finalizedStates->where('category', 'I')->count();
        $cat2 = $finalizedStates->where('category', 'II')->count();
        $cat3 = $finalizedStates->where('category', 'III')->count();
        $categorizedCasesTotal = $cat1 + $cat2 + $cat3;
        $assessedCategoryMissing = $finalized - $categorizedCasesTotal;
        $unassessedOrMissingCategory = $awaitingAssessment + $assessedCategoryMissing;

        $prescribedStates = $finalizedStates->filter(
            fn (array $s) => in_array($s['pep_decision'], ['new_course_prescribed', 'continue_course'], true)
        );
        $pepPrescribed = $prescribedStates->count();
        $newCourseStates = $prescribedStates->where('pep_decision', 'new_course_prescribed');
        $newCoursePrescribed = $newCourseStates->count();
        $continueCourse = $prescribedStates->where('pep_decision', 'continue_course')->count();

        $explicitNoPep = $finalizedStates->where('pep_decision', 'explicit_no_pep')->count();
        $transferredFinalized = $finalizedStates->where('pep_decision', 'transferred_referred')->count();
        $decisionMissing = $finalizedStates->where('pep_decision', 'missing_after_finalization')->count();
        $conflictReview = $states->filter(
            fn (array $s) => $s['pep_decision'] === 'conflict_review'
                || ($s['administration_evidence']['state'] ?? '') === 'conflict_review'
                || ($s['assessment'] !== 'finalized' && (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false))
        )->count();

        $verifiedVaccineInitiation = $prescribedStates->filter(
            fn (array $s) => (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false)
        )->count();
        $noAdministrationRecorded = $pepPrescribed - $verifiedVaccineInitiation;

        $newCourseStarted = $newCourseStates->filter(
            fn (array $s) => (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false)
        )->count();
        $newCourseNoReceipt = $newCoursePrescribed - $newCourseStarted;

        $completedCourses = $prescribedStates->filter(
            fn (array $s) => (bool) ($s['course_outcome']['is_completed'] ?? false)
        )->count();
        $maturedCourses = $prescribedStates->filter(
            fn (array $s) => (bool) ($s['course_outcome']['is_cohort_eligible'] ?? false)
        )->count();
        $maturedCompleted = $prescribedStates->filter(
            fn (array $s) => (bool) ($s['course_outcome']['is_cohort_eligible'] ?? false)
                && (bool) ($s['course_outcome']['is_completed'] ?? false)
        )->count();
        $immatureCourses = $newCourseStates->filter(
            fn (array $s) => (bool) ($s['administration_evidence']['has_vaccine_administration'] ?? false)
                && !(bool) ($s['course_outcome']['is_mature'] ?? false)
        )->count();

        $transferredReferred = $states->where('encounter_disposition', 'transferred_referred')->count();

        $stageCounts = [
            'form_1_registration' => 0,
            'form_2_pep_prescribed' => 0,
            'form_2_no_pep' => 0,
            'form_2_transferred' => 0,
            'form_2_decision_pending' => 0,
            'form_3_treatment_recorded' => 0,
        ];
        foreach ($states as $state) {
            $stageKey = $state['stage_summary']['last_completed_stage'] ?? 'form_1_registration';
            $stageCounts[$stageKey] = ($stageCounts[$stageKey] ?? 0) + 1;
        }

        $narrative = "Of {$recorded} recorded exposure episodes, {$finalized} had a completed doctor assessment and {$awaitingAssessment} were awaiting assessment. Of {$pepPrescribed} episodes prescribed PEP, {$verifiedVaccineInitiation} had recorded administration and {$noAdministrationRecorded} had no administration recorded as of the reporting cutoff.";

        return [
            'cutoff' => $cutoffEnd->toDateString(),
            'recorded_episodes' => $recorded,
            'finalized_assessments' => $finalized,
            'awaiting_assessment' => $awaitingAssessment,
            'unassessed_episodes' => $awaitingAssessment,
            'cat_I' => $cat1,
            'cat_II' => $cat2,
            'cat_III' => $cat3,
            'categorized_cases_total' => $categorizedCasesTotal,
            'assessed_category_missing' => $assessedCategoryMissing,
            'unassessed_or_missing_category' => $unassessedOrMissingCategory,
            'pep_prescribed' => $pepPrescribed,
            'new_course_prescribed' => $newCoursePrescribed,
            'new_course_started' => $newCourseStarted,
            'new_course_no_receipt' => $newCourseNoReceipt,
            'continue_course' => $continueCourse,
            'continuing_episodes' => $continueCourse,
            'explicit_no_pep' => $explicitNoPep,
            'transferred_finalized' => $transferredFinalized,
            'decision_missing' => $decisionMissing,
            'conflict_review' => $conflictReview,
            'verified_vaccine_initiation' => $verifiedVaccineInitiation,
            'no_administration_recorded' => $noAdministrationRecorded,
            'completed_courses' => $completedCourses,
            'matured_courses' => $maturedCourses,
            'matured_completed' => $maturedCompleted,
            'immature_courses' => $immatureCourses,
            'transferred_referred' => $transferredReferred,
            'stage_counts' => $stageCounts,
            'recorded_episodes_bridge' => [
                'total_recorded_episodes' => $recorded,
                'categorized_cases_total' => $categorizedCasesTotal,
                'cat_I' => $cat1,
                'cat_II' => $cat2,
                'cat_III' => $cat3,
                'unassessed_episodes' => $awaitingAssessment,
                'assessed_category_missing' => $assessedCategoryMissing,
                'continuing_episodes' => $continueCourse,
                'reconciles' => ($categorizedCasesTotal + $awaitingAssessment + $assessedCategoryMissing) === $recorded,
            ],
            'narrative' => $narrative,
        ];
    }

    private function buildStageSummary(
        BiteIncident $incident,
        string $category,
        string $assessment,
        string $pepDecision,
        array $adminEvidence,
        array $courseOutcome,
        string $encounterDisposition,
        bool $hasPendingNonPepProphylaxis
    ): array {
        $assessedCategory = in_array($category, ['I', 'II', 'III'], true)
            ? $category
            : ($assessment === 'finalized' ? 'Category not recorded' : 'Not yet assessed');

        if ($encounterDisposition === 'transferred_referred') {
            $hasExternalOrLocal = (bool) ($adminEvidence['has_vaccine_administration'] ?? false);
            $hasExternal = (bool) ($adminEvidence['has_external_vaccine'] ?? false);

            return [
                'last_completed_stage' => 'form_2_transferred',
                'stage_label' => 'Transferred/Referred',
                'resolved_status' => 'transferred_out',
                'what_can_be_reported' => 'Assessment and referral details',
                'category_display' => $assessment === 'finalized' ? $assessedCategory : 'Not yet assessed',
                'treatment_decision_display' => 'Transferred/Referred',
                'administration_display' => $hasExternalOrLocal ? 'Treatment started' : 'Unknown unless verified',
                'vaccination_display' => $hasExternalOrLocal
                    ? ($courseOutcome['is_completed'] ? 'Completed' : 'Treatment started')
                    : 'Unknown unless verified',
                'external_treatment_display' => $hasExternal ? 'Verified external administration' : 'Unknown unless verified',
            ];
        }

        if ($assessment !== 'finalized') {
            $isDraft = $assessment === 'draft_in_progress';
            $hasAdmin = (bool) ($adminEvidence['has_vaccine_administration'] ?? false);

            return [
                'last_completed_stage' => 'form_1_registration',
                'stage_label' => $isDraft ? 'Assessment in progress' : 'Awaiting Assessment',
                'resolved_status' => 'awaiting_assessment',
                'what_can_be_reported' => $isDraft
                    ? 'Form 1 data and draft assessment availability'
                    : 'Recorded patient details and exposure information',
                'category_display' => 'Not yet assessed',
                'treatment_decision_display' => 'Not yet determined',
                'administration_display' => $hasAdmin ? 'Treatment started' : 'Not yet determined',
                'vaccination_display' => $hasAdmin ? 'Treatment started' : 'Not yet determined',
                'external_treatment_display' => ($adminEvidence['has_external_vaccine'] ?? false)
                    ? 'Verified external administration'
                    : 'Not applicable',
            ];
        }

        if ($pepDecision === 'explicit_no_pep') {
            $stageLabel = $hasPendingNonPepProphylaxis ? 'Awaiting Treatment' : 'Completed – No PEP Required';

            return [
                'last_completed_stage' => 'form_2_no_pep',
                'stage_label' => $stageLabel,
                'resolved_status' => $hasPendingNonPepProphylaxis ? 'awaiting_treatment' : 'completed_no_pep',
                'what_can_be_reported' => 'Assessment and documented decision',
                'category_display' => $assessedCategory,
                'treatment_decision_display' => 'Completed – No PEP Required',
                'administration_display' => $hasPendingNonPepProphylaxis
                    ? 'No administration recorded'
                    : ($adminEvidence['has_prophylaxis_administration'] ? 'Treatment started' : 'Not applicable'),
                'vaccination_display' => 'Not applicable',
                'external_treatment_display' => 'Not applicable',
            ];
        }

        if ($adminEvidence['has_vaccine_administration'] || $adminEvidence['has_prophylaxis_administration']) {
            $decisionLabel = match ($pepDecision) {
                'conflict_review' => 'Conflict review',
                'continue_course' => 'Continuing existing course',
                default => 'PEP prescribed',
            };

            $vaccinationLabel = match ($courseOutcome['outcome']) {
                'completed' => 'Completed',
                'clinically_discontinued' => 'Clinically discontinued',
                'not_applicable' => 'Not applicable',
                default => ($courseOutcome['is_overdue'] ? 'Treatment started (Overdue)' : 'Treatment started'),
            };

            $resolvedStatus = ($courseOutcome['is_completed'] && !$hasPendingNonPepProphylaxis)
                || ($pepDecision === 'explicit_no_pep' && !$hasPendingNonPepProphylaxis)
                ? 'completed'
                : ($adminEvidence['has_vaccine_administration'] || $adminEvidence['has_prophylaxis_administration'] ? 'active' : 'awaiting_treatment');

            return [
                'last_completed_stage' => 'form_3_treatment_recorded',
                'stage_label' => $courseOutcome['is_completed'] ? 'Treatment started – Course Completed' : 'Treatment started',
                'resolved_status' => $resolvedStatus,
                'what_can_be_reported' => 'Actual administered treatment and follow-up schedule',
                'category_display' => $assessedCategory,
                'treatment_decision_display' => $decisionLabel,
                'administration_display' => 'Treatment started',
                'vaccination_display' => $vaccinationLabel,
                'external_treatment_display' => $adminEvidence['has_external_vaccine'] ? 'Verified external administration' : 'Not applicable',
            ];
        }

        if (in_array($pepDecision, ['new_course_prescribed', 'continue_course'], true)) {
            return [
                'last_completed_stage' => 'form_2_pep_prescribed',
                'stage_label' => 'Awaiting Treatment',
                'resolved_status' => 'awaiting_treatment',
                'what_can_be_reported' => 'Doctor-assessed category, diagnosis, exposure location, and prescribed treatment',
                'category_display' => $assessedCategory,
                'treatment_decision_display' => $pepDecision === 'continue_course' ? 'Continuing existing course' : 'PEP prescribed',
                'administration_display' => 'No administration recorded',
                'vaccination_display' => 'No administration recorded',
                'external_treatment_display' => $adminEvidence['has_unverified_external_claim'] ? 'Unknown unless verified' : 'Not applicable',
            ];
        }

        return [
            'last_completed_stage' => 'form_2_decision_pending',
            'stage_label' => 'Awaiting Treatment',
            'resolved_status' => 'awaiting_treatment',
            'what_can_be_reported' => 'Doctor-assessed category, diagnosis, and exposure location',
            'category_display' => $assessedCategory,
            'treatment_decision_display' => 'Not yet determined',
            'administration_display' => 'Not yet determined',
            'vaccination_display' => 'Not yet determined',
            'external_treatment_display' => 'Not applicable',
        ];
    }

    private function resolveDataAvailability(
        BiteIncident $incident,
        string $assessment,
        array $adminEvidence,
        array $rigEvidence,
        string $encounterDisposition
    ): array {
        return [
            'exposure_date' => $incident->hasProvisionalBiteDate() ? 'pending_provisional' : 'known',
            'exposure_category' => $assessment === 'finalized'
                ? (in_array($incident->bite_category, ['I', 'II', 'III'], true) ? 'known' : 'not_yet_recorded')
                : 'not_yet_assessed',
            'external_treatment' => $encounterDisposition === 'transferred_referred'
                ? ($adminEvidence['has_external_vaccine'] ? 'verified_external' : 'unknown_unless_verified')
                : ($adminEvidence['has_external_vaccine'] ? 'verified_external' : ($adminEvidence['has_unverified_external_claim'] ? 'unknown_unless_verified' : 'not_applicable')),
            'rig_administration' => $rigEvidence['rig_administered']
                ? 'verified_administered'
                : ($rigEvidence['rig_indicated'] ? 'indicated_not_recorded' : 'not_applicable'),
            'human_rabies_surveillance' => 'unavailable_source_not_verified',
        ];
    }

    private function resolveApplicablePlan(BiteIncident $incident, CarbonImmutable $cutoffEnd): ?TreatmentPlan
    {
        $plan = $incident->relationLoaded('treatmentPlan')
            ? $incident->treatmentPlan
            : $incident->treatmentPlan()->first();

        if (!$plan) {
            return null;
        }

        if ($plan->decided_at !== null && CarbonImmutable::parse($plan->decided_at)->gt($cutoffEnd)) {
            return null;
        }

        return $plan;
    }

    private function hasPendingNonPepProphylaxis(
        BiteIncident $incident,
        ?TreatmentRecord $consultation,
        CarbonImmutable $cutoffEnd
    ): bool {
        if (!$consultation) {
            return false;
        }

        $orders = is_array($consultation->prophylaxis_orders) ? $consultation->prophylaxis_orders : [];
        $reassessmentDecision = $orders['reassessment_decision'] ?? null;
        if (in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true)
            || $consultation->outcome === 'completed_without_injection'
        ) {
            return false;
        }

        $tetCat = strtolower(trim((string) ($orders['tetanus_category'] ?? '')));
        $ttOrder = in_array($tetCat, ['tt', 'ats_tt'], true)
            && !empty($orders['tetanus_vaccine'])
            && strtolower(trim((string) $orders['tetanus_vaccine'])) !== 'none'
            ? trim((string) $orders['tetanus_vaccine'])
            : null;
        $atsOrder = in_array($tetCat, ['ats', 'ats_tt'], true)
            && !empty($orders['tetanus_passive'])
            && strtolower(trim((string) $orders['tetanus_passive'])) !== 'none'
            ? trim((string) $orders['tetanus_passive'])
            : null;

        if ($ttOrder === null && $atsOrder === null) {
            return false;
        }

        $prophylaxis = $this->outcomeResolver->qualifyingProphylaxisRecords($incident, $cutoffEnd);

        if ($ttOrder !== null) {
            $hasTt = $prophylaxis->contains(fn (TreatmentRecord $r) =>
                ProphylaxisService::isTetanusBrand((string) ($r->medication_given ?? $r->vaccine_brand ?? ''), [$ttOrder])
                || (int) $r->dose_number === 300
            );
            if (!$hasTt) {
                return true;
            }
        }

        if ($atsOrder !== null) {
            $hasAts = $prophylaxis->contains(fn (TreatmentRecord $r) =>
                ProphylaxisService::isAtsBrand((string) ($r->medication_given ?? $r->vaccine_brand ?? ''), [$atsOrder])
                || in_array((int) $r->dose_number, [400, 401], true)
            );
            if (!$hasAts) {
                return true;
            }
        }

        return false;
    }

    private function episodeRecords(BiteIncident $incident): Collection
    {
        $records = $incident->relationLoaded('treatmentRecords')
            ? $incident->treatmentRecords
            : $incident->treatmentRecords()->get();

        return $records->filter(function (TreatmentRecord $record) use ($incident) {
            return $record->patient_id === null
                || $incident->patient_id === null
                || (int) $record->patient_id === (int) $incident->patient_id;
        })->values();
    }

    private function consultationEventDate(TreatmentRecord $record): ?CarbonImmutable
    {
        $raw = $record->consultation_date ?? $record->treatment_date ?? $record->created_at;

        return $raw !== null ? CarbonImmutable::parse($raw)->startOfDay() : null;
    }

    private function isConsultationWithinCutoff(TreatmentRecord $record, CarbonImmutable $cutoffEnd): bool
    {
        if ($record->consultation_date !== null) {
            return CarbonImmutable::parse($record->consultation_date)->startOfDay()->lte($cutoffEnd);
        }

        if ($record->treatment_date !== null) {
            return CarbonImmutable::parse($record->treatment_date)->startOfDay()->lte($cutoffEnd);
        }

        if ($record->created_at !== null) {
            return CarbonImmutable::parse($record->created_at)->lte($cutoffEnd);
        }

        return true;
    }

    /**
     * Compute unresolved assessment/treatment review status and age (in days) as of cutoff,
     * without inventing reasons for non-progression.
     */
    public function computeReviewAgeInfo(BiteIncident $incident, array $state, CarbonInterface $cutoff): array
    {
        $isUnresolved = ($state['assessment'] ?? '') !== 'finalized'
            || (in_array($state['pep_decision'] ?? '', ['new_course_prescribed', 'continue_course'], true)
                && !($state['administration_evidence']['has_vaccine_administration'] ?? false));

        if (!$isUnresolved) {
            return [
                'is_unresolved_review' => false,
                'review_age_days' => null,
                'review_age_bucket' => null,
            ];
        }

        $refDate = $incident->bite_date ?? $incident->created_at;
        $ageDays = $refDate !== null
            ? max(0, (int) CarbonImmutable::parse($refDate)->startOfDay()->diffInDays(CarbonImmutable::instance($cutoff)->startOfDay(), false))
            : null;

        $bucket = match (true) {
            $ageDays === null => null,
            $ageDays <= 7 => '0_7_days',
            $ageDays <= 30 => '8_30_days',
            default => 'over_30_days',
        };

        return [
            'is_unresolved_review' => true,
            'review_age_days' => $ageDays,
            'review_age_bucket' => $bucket,
        ];
    }

    /**
     * Build the 5-stage incomplete patient journey reporting matrix grounded in the 3 DOH forms.
     */
    public function buildStageMatrix(array $stageCounts): array
    {
        return [
            [
                'stage_key' => 'form_1_registration',
                'stage' => 'Form 1: Registration only',
                'what_can_be_reported' => 'Recorded patient details and exposure information',
                'missing_info_display' => 'Awaiting Assessment; category: Not yet assessed; treatment decision: Not yet determined',
                'count' => (int) ($stageCounts['form_1_registration'] ?? 0),
            ],
            [
                'stage_key' => 'form_2_pep_prescribed',
                'stage' => 'Form 2: Doctor assessment; PEP prescribed, but no nurse treatment recorded',
                'what_can_be_reported' => 'Doctor-assessed category, diagnosis, exposure location, and prescribed treatment',
                'missing_info_display' => 'Awaiting Treatment; No administration recorded',
                'count' => (int) ($stageCounts['form_2_pep_prescribed'] ?? 0),
            ],
            [
                'stage_key' => 'form_2_no_pep',
                'stage' => 'Form 2: No PEP required',
                'what_can_be_reported' => 'Assessment and documented decision',
                'missing_info_display' => 'Completed – No PEP Required; vaccination: Not applicable',
                'count' => (int) ($stageCounts['form_2_no_pep'] ?? 0),
            ],
            [
                'stage_key' => 'form_2_transferred',
                'stage' => 'Form 2: Transferred/Referred',
                'what_can_be_reported' => 'Assessment and referral details',
                'missing_info_display' => 'Transferred/Referred; treatment elsewhere: Unknown unless verified',
                'count' => (int) ($stageCounts['form_2_transferred'] ?? 0),
            ],
            [
                'stage_key' => 'form_3_treatment_recorded',
                'stage' => 'Form 3: Nurse treatment recorded',
                'what_can_be_reported' => 'Actual administered treatment and follow-up schedule',
                'missing_info_display' => 'Treatment started, with completion determined from the required course',
                'count' => (int) ($stageCounts['form_3_treatment_recorded'] ?? 0),
            ],
        ];
    }

    private function resolveAssessmentDate(BiteIncident $incident, ?TreatmentRecord $consultation): ?string
    {
        if ($incident->confirmed_at !== null) {
            return CarbonImmutable::parse($incident->confirmed_at)->toDateString();
        }

        if ($consultation !== null) {
            return $this->consultationEventDate($consultation)?->toDateString();
        }

        return null;
    }
}
