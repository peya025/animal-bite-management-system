<?php

namespace App\Services\Reporting;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Services\ProphylaxisService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Resolves cutoff-bounded treatment administration evidence, RIG verification,
 * course completion outcomes, cohort maturity, and distinct overdue metrics.
 */
class TreatmentOutcomeResolver
{
    public const PROPHYLAXIS_DOSE_MARKERS = [200, 201, 300, 400, 401];

    public function resolveCutoff(CarbonInterface|string|null $cutoff = null): CarbonImmutable
    {
        if ($cutoff instanceof CarbonInterface) {
            return CarbonImmutable::instance($cutoff)->endOfDay();
        }

        if (is_string($cutoff) && trim($cutoff) !== '') {
            return CarbonImmutable::parse($cutoff)->endOfDay();
        }

        return CarbonImmutable::now()->endOfDay();
    }

    /**
     * Collect rabies vaccine doses that count as verified administration on or before the cutoff.
     */
    public function qualifyingVaccineRecords(BiteIncident $incident, CarbonInterface|string|null $cutoff = null): Collection
    {
        $cutoffEnd = $this->resolveCutoff($cutoff);
        $records = $this->episodeRecords($incident);

        return $records->filter(function (TreatmentRecord $record) use ($incident, $cutoffEnd) {
            if ($record->voided_at !== null) {
                return false;
            }

            if ($record->dose_number === null || (int) $record->dose_number < 0 || (int) $record->dose_number >= 200) {
                return false;
            }

            $status = strtolower(trim((string) ($record->status ?? '')));
            if (in_array($status, ['scheduled', 'cancelled', 'missed', 'rescheduled'], true)) {
                return false;
            }

            $outcome = strtolower(trim((string) ($record->outcome ?? '')));
            if ($outcome === 'not_administered') {
                return false;
            }

            $hasEvidence = in_array($status, ['completed', 'administered'], true)
                || $record->treatment_date !== null
                || $record->administered_at !== null;
            if (!$hasEvidence) {
                return false;
            }

            if (!$this->isRecordWithinCutoff($record, $cutoffEnd)) {
                return false;
            }

            if ((bool) ($record->is_external ?? false)) {
                return $this->isVerifiedExternalRecord($incident, $record, $cutoffEnd);
            }

            return true;
        })->values();
    }

    /**
     * Collect non-ARV prophylaxis records (RIG, TT, ATS) administered on or before the cutoff.
     */
    public function qualifyingProphylaxisRecords(BiteIncident $incident, CarbonInterface|string|null $cutoff = null): Collection
    {
        $cutoffEnd = $this->resolveCutoff($cutoff);
        $records = $this->episodeRecords($incident);

        return $records->filter(function (TreatmentRecord $record) use ($incident, $cutoffEnd) {
            if ($record->voided_at !== null) {
                return false;
            }

            $status = strtolower(trim((string) ($record->status ?? '')));
            if (!in_array($status, ['completed', 'administered'], true)) {
                return false;
            }

            $outcome = strtolower(trim((string) ($record->outcome ?? '')));
            if ($outcome === 'not_administered') {
                return false;
            }

            $isProphylaxisRow = ($record->dose_number === null && !empty($record->medication_given))
                || in_array((int) ($record->dose_number ?? -1), self::PROPHYLAXIS_DOSE_MARKERS, true);
            if (!$isProphylaxisRow) {
                return false;
            }

            if (!$this->isRecordWithinCutoff($record, $cutoffEnd)) {
                return false;
            }

            if ((bool) ($record->is_external ?? false)) {
                return $this->isVerifiedExternalRecord($incident, $record, $cutoffEnd);
            }

            return true;
        })->values();
    }

    /**
     * Resolve dimension 3 (administration evidence) for an episode as of the cutoff.
     */
    public function resolveAdministrationEvidence(
        BiteIncident $incident,
        string $pepDecision,
        CarbonInterface|string|null $cutoff = null
    ): array {
        $cutoffEnd = $this->resolveCutoff($cutoff);
        $qualifyingVaccines = $this->qualifyingVaccineRecords($incident, $cutoffEnd);
        $qualifyingProphylaxis = $this->qualifyingProphylaxisRecords($incident, $cutoffEnd);

        $localVaccines = $qualifyingVaccines->reject(fn (TreatmentRecord $r) => (bool) ($r->is_external ?? false))->values();
        $externalVaccines = $qualifyingVaccines->filter(fn (TreatmentRecord $r) => (bool) ($r->is_external ?? false))->values();

        $allExternalDoseRows = $this->episodeRecords($incident)->filter(function (TreatmentRecord $record) {
            return $record->voided_at === null
                && $record->dose_number !== null
                && (int) $record->dose_number >= 0
                && (int) $record->dose_number < 200
                && (bool) ($record->is_external ?? false);
        });

        $hasUnverifiedExternalClaim = ($incident->verification_source === 'patient_self_report_unverified')
            || ($allExternalDoseRows->count() > $externalVaccines->count());

        if ($pepDecision === 'explicit_no_pep' && $qualifyingVaccines->isNotEmpty()) {
            $state = 'conflict_review';
        } elseif ($localVaccines->isNotEmpty() && $externalVaccines->isNotEmpty()) {
            $state = 'both_local_and_external';
        } elseif ($localVaccines->isNotEmpty()) {
            $state = 'verified_local';
        } elseif ($externalVaccines->isNotEmpty()) {
            $state = 'verified_external';
        } else {
            $state = 'no_qualifying_administration';
        }

        $administeredDoseNumbers = $qualifyingVaccines
            ->pluck('dose_number')
            ->filter(fn ($n) => $n !== null)
            ->map(fn ($n) => (int) $n)
            ->unique()
            ->sort()
            ->values()
            ->all();

        $d0Record = $qualifyingVaccines->firstWhere('dose_number', 0)
            ?? $qualifyingVaccines->sortBy(fn (TreatmentRecord $r) => $this->recordEventDate($r)?->timestamp ?? PHP_INT_MAX)->first();

        $d0Date = $d0Record ? $this->recordEventDate($d0Record)?->toDateString() : null;
        $lastDoseDate = $qualifyingVaccines
            ->map(fn (TreatmentRecord $r) => $this->recordEventDate($r))
            ->filter()
            ->sortByDesc(fn (CarbonImmutable $d) => $d->timestamp)
            ->first()?->toDateString();

        return [
            'state' => $state,
            'has_vaccine_administration' => $qualifyingVaccines->isNotEmpty(),
            'has_local_vaccine' => $localVaccines->isNotEmpty(),
            'has_external_vaccine' => $externalVaccines->isNotEmpty(),
            'has_unverified_external_claim' => $hasUnverifiedExternalClaim,
            'has_prophylaxis_administration' => $qualifyingProphylaxis->isNotEmpty(),
            'administered_dose_numbers' => $administeredDoseNumbers,
            'd0_date' => $d0Date,
            'last_dose_date' => $lastDoseDate,
        ];
    }

    /**
     * Separate RIG clinical indication from verified RIG administration (Audit A05).
     */
    public function resolveRigEvidence(
        BiteIncident $incident,
        ?TreatmentRecord $consultation = null,
        CarbonInterface|string|null $cutoff = null
    ): array {
        $cutoffEnd = $this->resolveCutoff($cutoff);
        $records = $this->episodeRecords($incident);

        if ($consultation === null) {
            $consultation = $records->filter(function (TreatmentRecord $r) use ($cutoffEnd) {
                if ($r->voided_at !== null || $r->dose_number !== null || !empty($r->medication_given)) {
                    return false;
                }
                if (strtolower(trim((string) $r->status)) !== 'completed') {
                    return false;
                }
                $date = $r->consultation_date ?? $r->treatment_date ?? $r->created_at;
                return $date === null || CarbonImmutable::parse($date)->startOfDay()->lte($cutoffEnd);
            })->last();
        }

        $indicatedType = null;
        $orders = is_array($consultation?->prophylaxis_orders) ? $consultation->prophylaxis_orders : [];
        $orderedRig = trim((string) ($orders['rig'] ?? ''));
        if ($orderedRig !== '' && strtolower($orderedRig) !== 'none') {
            $indicatedType = $this->classifyRigType($orderedRig) ?? 'ERIG';
        }

        if ($indicatedType === null) {
            $intake = $incident->relationLoaded('intake') ? $incident->intake : $incident->intake()->first();
            $intakeRig = trim((string) ($intake?->rig_type ?? ''));
            if ($intakeRig !== '' && strtolower($intakeRig) !== 'none') {
                $indicatedType = $this->classifyRigType($intakeRig) ?? strtoupper($intakeRig);
            }
        }

        if ($indicatedType === null && !empty($incident->rig_decision_reason)) {
            $indicatedType = $this->classifyRigType((string) $incident->rig_decision_reason);
        }

        $verifiedRigRecord = $records->first(function (TreatmentRecord $record) use ($incident, $cutoffEnd) {
            if ($record->voided_at !== null) {
                return false;
            }

            $status = strtolower(trim((string) ($record->status ?? '')));
            if (!in_array($status, ['completed', 'administered'], true)) {
                return false;
            }

            if (strtolower(trim((string) ($record->outcome ?? ''))) === 'not_administered') {
                return false;
            }

            if (!$this->isRecordWithinCutoff($record, $cutoffEnd)) {
                return false;
            }

            if ((bool) ($record->is_external ?? false) && !$this->isVerifiedExternalRecord($incident, $record, $cutoffEnd)) {
                return false;
            }

            return $this->extractAdministeredRigType($record) !== null;
        });

        $administeredRigType = $verifiedRigRecord ? $this->extractAdministeredRigType($verifiedRigRecord) : null;

        return [
            'rig_indicated' => $indicatedType !== null,
            'indicated_rig_type' => $indicatedType,
            'rig_administered' => $administeredRigType !== null,
            'administered_rig_type' => $administeredRigType,
            'rig_administration_unverified' => $indicatedType !== null && $administeredRigType === null,
        ];
    }

    /**
     * Resolve dimension 4 (course completion outcome, maturity, and overdue slots).
     */
    public function resolveCourseOutcome(
        BiteIncident $incident,
        ?TreatmentPlan $plan,
        string $pepDecision,
        string $encounterDisposition,
        array $adminEvidence,
        CarbonInterface|string|null $cutoff = null
    ): array {
        $cutoffEnd = $this->resolveCutoff($cutoff);
        $cutoffDate = $cutoffEnd->startOfDay();

        $administeredDoses = $adminEvidence['administered_dose_numbers'] ?? [];
        $hasVaccineAdmin = (bool) ($adminEvidence['has_vaccine_administration'] ?? false);
        $d0Date = $adminEvidence['d0_date'] ?? null;

        $records = $this->episodeRecords($incident);
        $appointments = $this->episodeAppointments($incident);

        $isPlanApplicable = $plan !== null
            && ($plan->decided_at === null || CarbonImmutable::parse($plan->decided_at)->lte($cutoffEnd));

        $pendingScheduledDoses = $records->filter(function (TreatmentRecord $record) {
            return $record->voided_at === null
                && $record->dose_number !== null
                && (int) $record->dose_number >= 0
                && (int) $record->dose_number < 200
                && in_array(strtolower((string) $record->status), ['scheduled', 'missed', 'rescheduled'], true);
        });

        $pendingAppointments = $appointments->filter(function (Appointment $appointment) {
            return !in_array(strtolower((string) $appointment->status), ['completed', 'cancelled'], true);
        });

        $isLegacyCompletedWithoutPlan = !$isPlanApplicable
            && $incident->status === 'completed'
            && $hasVaccineAdmin
            && $pendingScheduledDoses->isEmpty()
            && $pendingAppointments->isEmpty();

        $requiredDoses = [];
        if ($isPlanApplicable) {
            $requiredDoses = collect($plan->ordered_dose_days ?? [])
                ->filter(fn ($d) => is_numeric($d) && (int) $d >= 0)
                ->map(fn ($d) => (int) $d)
                ->unique()
                ->sort()
                ->values()
                ->all();

            if (empty($requiredDoses)) {
                $requiredDoses = match ($plan->plan_type) {
                    'full_pep' => [0, 3, 7],
                    'two_dose_booster' => [0, 3],
                    'single_booster' => [0],
                    default => [],
                };
            }
        } elseif (in_array($pepDecision, ['new_course_prescribed', 'continue_course'], true)) {
            $requiredDoses = $isLegacyCompletedWithoutPlan
                ? $administeredDoses
                : ($incident->isReExposure() ? [0, 3] : [0, 3, 7]);
        }

        $isDiscontinued = in_array((string) $incident->status, ['cancelled', 'discontinued'], true)
            || ($isPlanApplicable && in_array((string) $plan->status, ['cancelled', 'discontinued'], true));
        $isTransferred = $encounterDisposition === 'transferred_referred';
        $isPepCourse = in_array($pepDecision, ['new_course_prescribed', 'continue_course'], true);

        $overdueSlots = [];
        $finalDueDate = null;

        if ($isPepCourse) {
            foreach ($requiredDoses as $day) {
                $slotAppointments = $appointments->filter(fn (Appointment $a) => $a->dose_number !== null && (int) $a->dose_number === $day)
                    ->sortByDesc('appointment_id');
                $latestAppointment = $slotAppointments->first();

                $activeAppointment = $slotAppointments->first(
                    fn (Appointment $a) => !in_array(strtolower((string) $a->status), ['completed', 'cancelled'], true)
                );

                $scheduledRecord = $records->filter(
                    fn (TreatmentRecord $r) => $r->voided_at === null
                        && $r->dose_number !== null
                        && (int) $r->dose_number === $day
                        && in_array(strtolower((string) $r->status), ['scheduled', 'missed', 'rescheduled'], true)
                )->sortByDesc('treatment_id')->first();

                $rawDue = $activeAppointment?->scheduled_date
                    ?? $activeAppointment?->appointment_date
                    ?? $scheduledRecord?->scheduled_date
                    ?? ($d0Date ? CarbonImmutable::parse($d0Date)->addDays($day) : null);

                if ($rawDue !== null) {
                    $dueDate = CarbonImmutable::parse($rawDue)->startOfDay();
                    if ($finalDueDate === null || $dueDate->gt($finalDueDate)) {
                        $finalDueDate = $dueDate;
                    }

                    $isCancelledSlot = $latestAppointment !== null
                        && strtolower((string) $latestAppointment->status) === 'cancelled'
                        && $activeAppointment === null
                        && $scheduledRecord === null;

                    if (
                        !$isDiscontinued
                        && !$isTransferred
                        && !$isCancelledSlot
                        && !in_array($day, $administeredDoses, true)
                        && $dueDate->lt($cutoffDate)
                    ) {
                        $overdueSlots[] = [
                            'dose_number' => $day,
                            'label' => $day === 0 ? 'Day 0' : "Dose {$day}",
                            'due_date' => $dueDate->toDateString(),
                            'days_overdue' => max(1, (int) $dueDate->diffInDays($cutoffDate)),
                        ];
                    }
                }
            }

            // Include any pending dose appointment not already covered by requiredDoses (when course is incomplete)
            $allRequiredAdministered = !empty($requiredDoses) && count(array_diff($requiredDoses, $administeredDoses)) === 0;
            if (!$allRequiredAdministered && !$isDiscontinued && !$isTransferred) {
                $coveredDays = array_values(array_unique(array_merge($requiredDoses, $administeredDoses)));
                $extraAppointments = $pendingAppointments->filter(function (Appointment $appointment) use ($coveredDays) {
                    if ($appointment->dose_number === null) {
                        return false;
                    }
                    return !in_array((int) $appointment->dose_number, $coveredDays, true);
                });

                foreach ($extraAppointments->groupBy(fn (Appointment $a) => (int) $a->dose_number) as $doseNum => $group) {
                    $firstAppt = $group->sortBy(fn (Appointment $a) => $a->scheduled_date ?? $a->appointment_date)->first();
                    $rawDue = $firstAppt->scheduled_date ?? $firstAppt->appointment_date;
                    if ($rawDue === null) {
                        continue;
                    }
                    $dueDate = CarbonImmutable::parse($rawDue)->startOfDay();
                    if ($dueDate->lt($cutoffDate)) {
                        $overdueSlots[] = [
                            'dose_number' => (int) $doseNum,
                            'label' => (int) $doseNum === 0 ? 'Day 0' : "Dose {$doseNum}",
                            'due_date' => $dueDate->toDateString(),
                            'days_overdue' => max(1, (int) $dueDate->diffInDays($cutoffDate)),
                        ];
                    }
                }
            }
        }

        usort($overdueSlots, fn (array $a, array $b) => $a['due_date'] <=> $b['due_date']);

        $allRequiredCompleted = $isPepCourse
            && $hasVaccineAdmin
            && !empty($requiredDoses)
            && count(array_diff($requiredDoses, $administeredDoses)) === 0;

        if (!$isPepCourse) {
            $outcome = ($isTransferred && $hasVaccineAdmin) ? 'outcome_unknown' : 'not_applicable';
        } elseif ($allRequiredCompleted) {
            $outcome = 'completed';
        } elseif ($isDiscontinued) {
            $outcome = 'clinically_discontinued';
        } elseif ($isTransferred) {
            $outcome = 'outcome_unknown';
        } elseif (!$hasVaccineAdmin) {
            $outcome = 'not_started';
        } else {
            $outcome = 'ongoing_not_due';
        }

        $isMature = $finalDueDate !== null && $finalDueDate->lte($cutoffDate);
        $isNewCourse = $pepDecision === 'new_course_prescribed';
        $isCohortEligible = $isNewCourse
            && $hasVaccineAdmin
            && $isMature;

        $earliestOverdue = $overdueSlots[0] ?? null;

        return [
            'outcome' => $outcome,
            'is_completed' => $outcome === 'completed',
            'is_overdue' => !empty($overdueSlots),
            'days_overdue' => $earliestOverdue ? (int) $earliestOverdue['days_overdue'] : 0,
            'overdue_dose' => $earliestOverdue ? $earliestOverdue['label'] : null,
            'overdue_dose_slots' => $overdueSlots,
            'outstanding_dose_slot_count' => count($overdueSlots),
            'required_doses' => $requiredDoses,
            'received_doses' => $administeredDoses,
            'final_due_date' => $finalDueDate?->toDateString(),
            'is_mature' => $isMature,
            'is_cohort_eligible' => $isCohortEligible,
        ];
    }

    /**
     * Separate overdue counting units across resolved episodes (Audit A09).
     */
    public function summarizeOverdueMetrics(Collection $resolvedStates): array
    {
        $overdueStates = $resolvedStates->filter(fn (array $state) => (bool) ($state['course_outcome']['is_overdue'] ?? false));

        $overduePatients = $overdueStates
            ->pluck('patient_id')
            ->filter(fn ($id) => $id !== null)
            ->unique()
            ->count();

        $overdueCourses = $overdueStates
            ->map(fn (array $state) => $state['course_key'] ?? $state['bite_id'])
            ->filter(fn ($id) => $id !== null)
            ->unique()
            ->count();

        $outstandingDoseSlots = $overdueStates->sum(
            fn (array $state) => (int) ($state['course_outcome']['outstanding_dose_slot_count'] ?? 0)
        );

        return [
            'overdue_episodes' => $overdueStates->count(),
            'overdue_patients' => $overduePatients,
            'overdue_courses' => $overdueCourses,
            'outstanding_dose_slots' => $outstandingDoseSlots,
        ];
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

    private function episodeAppointments(BiteIncident $incident): Collection
    {
        $appointments = $incident->relationLoaded('appointments')
            ? $incident->appointments
            : $incident->appointments()->get();

        return $appointments->filter(function (Appointment $appointment) use ($incident) {
            return $appointment->patient_id === null
                || $incident->patient_id === null
                || (int) $appointment->patient_id === (int) $incident->patient_id;
        })->values();
    }

    private function recordEventDate(TreatmentRecord $record): ?CarbonImmutable
    {
        $raw = $record->treatment_date ?? $record->administered_at ?? $record->scheduled_date;

        return $raw !== null ? CarbonImmutable::parse($raw)->startOfDay() : null;
    }

    private function isRecordWithinCutoff(TreatmentRecord $record, CarbonImmutable $cutoffEnd): bool
    {
        if ($record->treatment_date !== null) {
            return CarbonImmutable::parse($record->treatment_date)->startOfDay()->lte($cutoffEnd);
        }

        if ($record->administered_at !== null) {
            return CarbonImmutable::parse($record->administered_at)->lte($cutoffEnd);
        }

        if ($record->scheduled_date !== null) {
            return CarbonImmutable::parse($record->scheduled_date)->startOfDay()->lte($cutoffEnd);
        }

        return true;
    }

    private function isVerifiedExternalRecord(BiteIncident $incident, TreatmentRecord $record, CarbonImmutable $cutoffEnd): bool
    {
        if ($incident->verification_source === 'patient_self_report_unverified') {
            return false;
        }

        $status = strtolower(trim((string) ($record->status ?? '')));
        if (!in_array($status, ['completed', 'administered'], true)) {
            return false;
        }

        if ($incident->external_proof_reviewed_at !== null) {
            return CarbonImmutable::parse($incident->external_proof_reviewed_at)->lte($cutoffEnd);
        }

        return true;
    }

    private function classifyRigType(string $text): ?string
    {
        $trimmed = trim($text);
        if ($trimmed === '' || strtolower($trimmed) === 'none') {
            return null;
        }

        if (stripos($trimmed, 'hrig') !== false) {
            return 'HRIG';
        }

        if (stripos($trimmed, 'erig') !== false || ProphylaxisService::isRigBrand($trimmed)) {
            return 'ERIG';
        }

        return null;
    }

    private function extractAdministeredRigType(TreatmentRecord $record): ?string
    {
        $doseNum = $record->dose_number !== null ? (int) $record->dose_number : null;
        if ($doseNum === 200) {
            return 'HRIG';
        }
        if ($doseNum === 201) {
            return 'ERIG';
        }

        $med = trim((string) ($record->medication_given ?? ''));
        $brand = trim((string) ($record->vaccine_brand ?? ''));
        $proto = trim((string) ($record->protocol_type ?? ''));

        foreach ([$med, $brand, $proto] as $candidate) {
            if ($candidate !== '' && ($classified = $this->classifyRigType($candidate)) !== null) {
                return $classified;
            }
        }

        return null;
    }
}
