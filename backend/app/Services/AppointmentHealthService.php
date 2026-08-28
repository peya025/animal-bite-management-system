<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\TreatmentRecord;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AppointmentHealthService
{
    protected ClinicScheduleService $scheduleService;

    public function __construct(ClinicScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    /**
     * Run full diagnostic scan across appointments, clinical sequences, and role lifecycle states
     */
    public function runFullDiagnostic(int $clinicId = 1): array
    {
        $anomalies = [];
        $today = Carbon::today();

        // 1. Operating Schedule & Closed Days Violations
        $scheduleAnomalies = $this->checkScheduleAndDriftViolations($clinicId, $today);
        $anomalies = array_merge($anomalies, $scheduleAnomalies);

        // 2. Registration Desk Workflow Checks
        $registrationAnomalies = $this->checkRegistrationWorkflow($clinicId, $today);
        $anomalies = array_merge($anomalies, $registrationAnomalies);

        // 3. Doctor / Triage Workflow Checks
        $doctorAnomalies = $this->checkDoctorWorkflow($clinicId, $today);
        $anomalies = array_merge($anomalies, $doctorAnomalies);

        // 4. Treatment / Nurse Desk Workflow Checks
        $treatmentAnomalies = $this->checkTreatmentWorkflow($clinicId, $today);
        $anomalies = array_merge($anomalies, $treatmentAnomalies);

        // 5. PEP Sequence & Sequence Conflicts
        $sequenceAnomalies = $this->checkPepSequenceIntegrity($clinicId);
        $anomalies = array_merge($anomalies, $sequenceAnomalies);

        // Calculate statistics & role breakdown
        $totalAppointments = Appointment::where('clinic_id', $clinicId)->count();
        $criticalCount = count(array_filter($anomalies, fn($a) => $a['severity'] === 'critical'));
        $warningCount = count(array_filter($anomalies, fn($a) => $a['severity'] === 'warning'));
        $infoCount = count(array_filter($anomalies, fn($a) => $a['severity'] === 'info'));
        $fixableCount = count(array_filter($anomalies, fn($a) => !empty($a['can_auto_fix'])));

        $healthScore = $totalAppointments > 0
            ? max(0, min(100, (int) round(100 - (($criticalCount * 15 + $warningCount * 5 + $infoCount * 1) / max(1, $totalAppointments)) * 100)))
            : 100;

        $roleBreakdown = [
            'registration' => [
                'total' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'registration')),
                'label' => 'Registration Desk',
                'status' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'registration' && $a['severity'] === 'critical')) > 0 ? 'critical' : (count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'registration')) > 0 ? 'warning' : 'healthy'),
            ],
            'doctor' => [
                'total' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'doctor')),
                'label' => 'Doctor / Triage',
                'status' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'doctor' && $a['severity'] === 'critical')) > 0 ? 'critical' : (count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'doctor')) > 0 ? 'warning' : 'healthy'),
            ],
            'treatment' => [
                'total' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'treatment')),
                'label' => 'Treatment / Nurse',
                'status' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'treatment' && $a['severity'] === 'critical')) > 0 ? 'critical' : (count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'treatment')) > 0 ? 'warning' : 'healthy'),
            ],
            'schedule_engine' => [
                'total' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'schedule_engine')),
                'label' => 'Operating Schedule Engine',
                'status' => count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'schedule_engine' && $a['severity'] === 'critical')) > 0 ? 'critical' : (count(array_filter($anomalies, fn($a) => $a['role_stage'] === 'schedule_engine')) > 0 ? 'warning' : 'healthy'),
            ],
        ];

        return [
            'clinic_id' => $clinicId,
            'scanned_at' => Carbon::now()->toIso8601String(),
            'health_score' => $healthScore,
            'summary' => [
                'total_appointments' => $totalAppointments,
                'total_anomalies' => count($anomalies),
                'critical_count' => $criticalCount,
                'warning_count' => $warningCount,
                'info_count' => $infoCount,
                'fixable_count' => $fixableCount,
            ],
            'role_breakdown' => $roleBreakdown,
            'anomalies' => $anomalies,
        ];
    }

    /**
     * 1. Check Operating Schedule & Drift Violations
     */
    protected function checkScheduleAndDriftViolations(int $clinicId, Carbon $today): array
    {
        $anomalies = [];
        $appointments = Appointment::with('patient')
            ->where('clinic_id', $clinicId)
            ->where('status', 'scheduled')
            ->where(function ($q) use ($today) {
                $q->whereDate('scheduled_date', '>=', $today)
                  ->orWhereDate('appointment_date', '>=', $today);
            })
            ->get();

        foreach ($appointments as $appt) {
            $scheduledDateStr = $appt->scheduled_date ?? $appt->appointment_date;
            if (!$scheduledDateStr) continue;

            $date = Carbon::parse($scheduledDateStr);
            $pName = $appt->patient ? "{$appt->patient->first_name} {$appt->patient->last_name}" : "Patient #{$appt->patient_id}";

            // A. Check if the scheduled date is currently a closed operating day or holiday exception
            if (!$this->scheduleService->isDateOpen($clinicId, $date)) {
                $closureReason = $this->scheduleService->getClosureReason($clinicId, $date) ?? 'Closed operating day';
                $idealDate = $appt->ideal_date ? Carbon::parse($appt->ideal_date) : $date;
                $resolved = $this->scheduleService->resolveScheduleDate($clinicId, $idealDate, $appt->dose_number);

                $anomalies[] = [
                    'id' => "sched_closed_{$appt->appointment_id}",
                    'appointment_id' => $appt->appointment_id,
                    'patient_id' => $appt->patient_id,
                    'patient_name' => $pName,
                    'role_stage' => 'schedule_engine',
                    'rule_code' => 'CLOSED_OPERATING_DAY_VIOLATION',
                    'severity' => 'critical',
                    'title' => 'Scheduled on Non-Operating Day / Closed Holiday',
                    'description' => "Appointment is set on {$date->format('l, M j, Y')} which is marked CLOSED ({$closureReason}).",
                    'clinical_impact' => 'Patient will arrive when the facility is closed, risking missed rabies dose window.',
                    'current_value' => $date->toDateString(),
                    'recommended_value' => $resolved['scheduled_date']->toDateString(),
                    'can_auto_fix' => true,
                    'auto_fix_action' => 'shift_to_resolved_date',
                ];
            }

            // B. Check if ideal_date is missing
            if (empty($appt->ideal_date)) {
                $anomalies[] = [
                    'id' => "missing_ideal_{$appt->appointment_id}",
                    'appointment_id' => $appt->appointment_id,
                    'patient_id' => $appt->patient_id,
                    'patient_name' => $pName,
                    'role_stage' => 'schedule_engine',
                    'rule_code' => 'MISSING_IDEAL_DATE',
                    'severity' => 'info',
                    'title' => 'Missing Ideal Regimen Date Anchor',
                    'description' => 'Appointment lacks an explicit ideal_date baseline for PEP incubation window tracking.',
                    'clinical_impact' => 'Schedule drift cannot be measured accurately against clinical standards.',
                    'current_value' => 'null',
                    'recommended_value' => $date->toDateString(),
                    'can_auto_fix' => true,
                    'auto_fix_action' => 'backfill_ideal_date',
                ];
            }
        }

        return $anomalies;
    }

    /**
     * 2. Check Registration Desk Workflow Checks
     */
    protected function checkRegistrationWorkflow(int $clinicId, Carbon $today): array
    {
        $anomalies = [];

        // Check mobile bite incident intakes that have no linked patient
        $unlinkedIntakes = BiteIncidentIntake::where('clinic_id', $clinicId)
            ->whereNull('patient_id')
            ->get();

        foreach ($unlinkedIntakes as $intake) {
            $anomalies[] = [
                'id' => "reg_unlinked_intake_{$intake->id}",
                'appointment_id' => $intake->appointment_id,
                'patient_id' => null,
                'patient_name' => 'Unlinked Mobile Submitter',
                'role_stage' => 'registration',
                'rule_code' => 'INTAKE_MISSING_PATIENT_RECORD',
                'severity' => 'warning',
                'title' => 'Mobile Intake Lacks Master Patient Record',
                'description' => "Online booking submitted incident intake #{$intake->id} without an established master patient record.",
                'clinical_impact' => 'Registration desk must link or register patient before nurse triage can proceed.',
                'current_value' => "Intake #{$intake->id}",
                'recommended_value' => 'Assign Patient ID',
                'can_auto_fix' => false,
            ];
        }

        // Check past scheduled appointments that never checked in (Missed / Stale > 14 days)
        $staleAppointments = Appointment::with('patient')
            ->where('clinic_id', $clinicId)
            ->where('status', 'scheduled')
            ->whereDate('appointment_date', '<', $today->copy()->subDays(14))
            ->get();

        foreach ($staleAppointments as $stale) {
            $pName = $stale->patient ? "{$stale->patient->first_name} {$stale->patient->last_name}" : "Patient #{$stale->patient_id}";
            $apptDate = Carbon::parse($stale->appointment_date);

            $anomalies[] = [
                'id' => "reg_stale_appt_{$stale->appointment_id}",
                'appointment_id' => $stale->appointment_id,
                'patient_id' => $stale->patient_id,
                'patient_name' => $pName,
                'role_stage' => 'registration',
                'rule_code' => 'STALE_NO_SHOW_APPOINTMENT',
                'severity' => 'warning',
                'title' => 'Overdue Past Appointment Not Marked as Missed',
                'description' => "Appointment was scheduled for {$apptDate->format('M j, Y')} ({$today->diffInDays($apptDate)} days ago) but remains in 'scheduled' status.",
                'clinical_impact' => 'Distorts daily expected patient queue and vaccination compliance reports.',
                'current_value' => 'scheduled',
                'recommended_value' => 'missed',
                'can_auto_fix' => true,
                'auto_fix_action' => 'mark_as_missed',
            ];
        }

        // Check walk-in patients registered > 1 day ago who never proceeded to Doctor Triage (0 bite incidents & 0 treatments)
        $unassessedWalkins = Patient::where('clinic_id', $clinicId)
            ->whereDate('created_at', '<', $today)
            ->whereDoesntHave('biteIncidents')
            ->whereDoesntHave('treatmentRecords')
            ->get();

        foreach ($unassessedWalkins as $uWalkin) {
            $pName = "{$uWalkin->first_name} {$uWalkin->last_name}";
            $regDate = Carbon::parse($uWalkin->created_at);
            $daysAgo = abs((int) $today->diffInDays($regDate));

            $anomalies[] = [
                'id' => "reg_unassessed_{$uWalkin->patient_id}",
                'appointment_id' => null,
                'patient_id' => $uWalkin->patient_id,
                'patient_name' => $pName,
                'role_stage' => 'registration',
                'rule_code' => 'UNASSESSED_WALKIN_PATIENT',
                'severity' => 'warning',
                'title' => 'Walk-In Registered but Never Proceeded to Doctor Triage',
                'description' => "Patient registered on {$regDate->format('M j, Y')} ({$daysAgo} days ago) but has no Doctor Form 2 assessment or consultation record.",
                'clinical_impact' => 'Potential untreated rabies exposure victim who registered but walked away before doctor triage.',
                'current_value' => 'Registered with 0 Triage Records',
                'recommended_value' => 'Queue for Doctor Triage & Form 2 Assessment',
                'can_auto_fix' => false,
            ];
        }

        return $anomalies;
    }

    /**
     * 3. Check Doctor / Triage Workflow Checks
     */
    protected function checkDoctorWorkflow(int $clinicId, Carbon $today): array
    {
        $anomalies = [];

        // Check bite incidents with Category II or III exposure that have zero follow-up appointments
        $highRiskIncidents = BiteIncident::with('patient')
            ->where('clinic_id', $clinicId)
            ->where(function ($q) {
                $q->whereIn('severity', ['Category II', 'Category III', 'II', 'III', '2', '3'])
                  ->orWhereIn('exposure_type', ['transdermal_bite', 'nibbling_broken_skin', 'scratch_abrasion']);
            })
            ->get();

        foreach ($highRiskIncidents as $bite) {
            $followUpsCount = Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $bite->patient_id)
                ->where('appointment_type', 'follow_up_vaccination')
                ->where('status', '!=', 'cancelled')
                ->count();

            if ($followUpsCount === 0) {
                $pName = $bite->patient ? "{$bite->patient->first_name} {$bite->patient->last_name}" : "Patient #{$bite->patient_id}";
                $expText = $bite->severity ?: ($bite->exposure_type ?: 'Bite Exposure');
                $anomalies[] = [
                    'id' => "doc_missing_regimen_{$bite->bite_id}",
                    'appointment_id' => null,
                    'patient_id' => $bite->patient_id,
                    'patient_name' => $pName,
                    'role_stage' => 'doctor',
                    'rule_code' => 'HIGH_RISK_EXPOSURE_MISSING_FOLLOWUP',
                    'severity' => 'critical',
                    'title' => 'High-Risk Exposure Lacks Follow-Up Vaccination Regimen',
                    'description' => "Patient has {$expText} incident on {$bite->bite_date} with no follow-up vaccination doses scheduled.",
                    'clinical_impact' => 'Life-threatening rabies risk if Post-Exposure Prophylaxis (PEP) regimen is not scheduled.',
                    'current_value' => '0 scheduled follow-ups',
                    'recommended_value' => 'Generate WHO PEP Regimen (Day 3, 7, 28)',
                    'can_auto_fix' => false,
                ];
            }
        }

        // Check Doctor completed triage in Queue, but consultation appointment remained 'scheduled'
        $completedConsultQueues = Queue::where('clinic_id', $clinicId)
            ->where(function ($q) {
                $q->where('visit_type', 'consultation')
                  ->orWhere('queue_category', 'consultation')
                  ->orWhereNull('visit_type');
            })
            ->where(function ($q) {
                $q->whereIn('status', ['completed', 'served'])
                  ->orWhereNotNull('completed_at');
            })
            ->whereNotNull('patient_id')
            ->whereDate('created_at', '>=', $today->copy()->subDays(30))
            ->get();

        foreach ($completedConsultQueues as $qItem) {
            $pendingConsultAppt = Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $qItem->patient_id)
                ->where('appointment_type', 'consultation')
                ->where('status', 'scheduled')
                ->whereDate('appointment_date', '<=', Carbon::parse($qItem->created_at)->toDateString())
                ->first();

            if ($pendingConsultAppt) {
                $pName = $pendingConsultAppt->patient ? "{$pendingConsultAppt->patient->first_name} {$pendingConsultAppt->patient->last_name}" : "Patient #{$qItem->patient_id}";
                $anomalies[] = [
                    'id' => "doc_completed_consult_unsynced_{$pendingConsultAppt->appointment_id}",
                    'appointment_id' => $pendingConsultAppt->appointment_id,
                    'patient_id' => $qItem->patient_id,
                    'patient_name' => $pName,
                    'role_stage' => 'doctor',
                    'rule_code' => 'COMPLETED_CONSULTATION_STATUS_DESYNC',
                    'severity' => 'warning',
                    'title' => 'Doctor Consultation Finished but Appointment Remains Scheduled',
                    'description' => "Doctor completed consultation in Queue #{$qItem->queue_number}, but Appointment #{$pendingConsultAppt->appointment_id} is still marked 'scheduled'.",
                    'clinical_impact' => 'Distorts patient journey tracking and shows duplicate upcoming consultation on mobile app.',
                    'current_value' => 'scheduled',
                    'recommended_value' => 'completed',
                    'can_auto_fix' => true,
                    'auto_fix_action' => 'mark_as_completed',
                ];
            }
        }

        return $anomalies;
    }

    /**
     * 4. Check Treatment / Nurse Desk Workflow Checks
     */
    protected function checkTreatmentWorkflow(int $clinicId, Carbon $today): array
    {
        $anomalies = [];

        // Check doses administered in Form 3 / treatment_records whose appointments are still marked 'scheduled'
        $administeredRecords = TreatmentRecord::where('clinic_id', $clinicId)
            ->whereNotNull('dose_number')
            ->whereNotNull('treatment_date')
            ->get();

        foreach ($administeredRecords as $tRecord) {
            $matchingAppt = Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $tRecord->patient_id)
                ->where('dose_number', $tRecord->dose_number)
                ->where('status', 'scheduled')
                ->first();

            if ($matchingAppt) {
                $p = Patient::find($tRecord->patient_id);
                $pName = $p ? "{$p->first_name} {$p->last_name}" : "Patient #{$tRecord->patient_id}";
                $doseLabel = $tRecord->dose_number === 90 ? 'Booster 1' : ($tRecord->dose_number === 365 ? 'Booster 2' : "Day {$tRecord->dose_number}");

                $anomalies[] = [
                    'id' => "treat_administered_unsynced_{$matchingAppt->appointment_id}",
                    'appointment_id' => $matchingAppt->appointment_id,
                    'patient_id' => $tRecord->patient_id,
                    'patient_name' => $pName,
                    'role_stage' => 'treatment',
                    'rule_code' => 'ADMINISTERED_DOSE_APPOINTMENT_NOT_COMPLETED',
                    'severity' => 'critical',
                    'title' => 'Vaccine Administered in Form 3 but Appointment Still Scheduled',
                    'description' => "Nurse administered {$doseLabel} on {$tRecord->treatment_date}, but the corresponding appointment remains in 'scheduled' status.",
                    'clinical_impact' => 'Mobile calendar and nurse patient list still show the patient as due for vaccination.',
                    'current_value' => 'scheduled',
                    'recommended_value' => 'completed',
                    'can_auto_fix' => true,
                    'auto_fix_action' => 'mark_as_completed',
                ];
            }
        }

        // Check appointments marked 'completed' that have zero vaccination records in treatment_records
        $completedVaccineAppts = Appointment::with('patient')
            ->where('clinic_id', $clinicId)
            ->where('appointment_type', 'follow_up_vaccination')
            ->where('status', 'completed')
            ->whereNotNull('dose_number')
            ->get();

        foreach ($completedVaccineAppts as $cAppt) {
            $hasLog = TreatmentRecord::where('clinic_id', $clinicId)
                ->where('patient_id', $cAppt->patient_id)
                ->where('dose_number', $cAppt->dose_number)
                ->exists();

            if (!$hasLog) {
                $pName = $cAppt->patient ? "{$cAppt->patient->first_name} {$cAppt->patient->last_name}" : "Patient #{$cAppt->patient_id}";
                $doseLabel = $cAppt->dose_number === 90 ? 'Booster 1' : ($cAppt->dose_number === 365 ? 'Booster 2' : "Day {$cAppt->dose_number}");

                $anomalies[] = [
                    'id' => "treat_missing_log_{$cAppt->appointment_id}",
                    'appointment_id' => $cAppt->appointment_id,
                    'patient_id' => $cAppt->patient_id,
                    'patient_name' => $pName,
                    'role_stage' => 'treatment',
                    'rule_code' => 'COMPLETED_APPOINTMENT_MISSING_TREATMENT_LOG',
                    'severity' => 'warning',
                    'title' => 'Completed Appointment Missing Official Dose Administration Log',
                    'description' => "Appointment #{$cAppt->appointment_id} for {$doseLabel} is marked completed, but no clinical Form 3 log exists.",
                    'clinical_impact' => 'DOH Form 3 / PhilHealth e-claims audit failure due to missing batch & nurse signature.',
                    'current_value' => 'completed with 0 treatment records',
                    'recommended_value' => 'Log dose in Form 3',
                    'can_auto_fix' => false,
                ];
            }
        }

        return $anomalies;
    }

    /**
     * 5. Check PEP Sequence & Clinical Chronology Conflicts
     */
    protected function checkPepSequenceIntegrity(int $clinicId): array
    {
        $anomalies = [];
        $activePatients = Appointment::where('clinic_id', $clinicId)
            ->distinct()
            ->pluck('patient_id');

        foreach ($activePatients as $pId) {
            $pAppts = Appointment::where('clinic_id', $clinicId)
                ->where('patient_id', $pId)
                ->whereNotNull('dose_number')
                ->where('status', '!=', 'cancelled')
                ->orderBy('dose_number')
                ->get();

            if ($pAppts->count() < 2) continue;

            $p = Patient::find($pId);
            $pName = $p ? "{$p->first_name} {$p->last_name}" : "Patient #{$pId}";

            // Check chronologically: Day 7 date must be strictly after Day 3 date, Day 28 after Day 7, etc.
            $prevDose = null;
            $prevDate = null;

            foreach ($pAppts as $item) {
                $curDateStr = $item->scheduled_date ?? $item->appointment_date;
                if (!$curDateStr) continue;

                $curDate = Carbon::parse($curDateStr);

                if ($prevDose !== null && $prevDate !== null) {
                    if ($curDate->lt($prevDate)) {
                        $anomalies[] = [
                            'id' => "seq_inversion_{$item->appointment_id}",
                            'appointment_id' => $item->appointment_id,
                            'patient_id' => $pId,
                            'patient_name' => $pName,
                            'role_stage' => 'schedule_engine',
                            'rule_code' => 'DOSE_SEQUENCE_CHRONOLOGY_INVERSION',
                            'severity' => 'critical',
                            'title' => 'PEP Dose Chronology Inverted',
                            'description' => "Day {$item->dose_number} ({$curDate->toDateString()}) is scheduled earlier than Day {$prevDose} ({$prevDate->toDateString()}).",
                            'clinical_impact' => 'Invalid vaccination timeline violates WHO rabies incubation guidelines.',
                            'current_value' => "Day {$item->dose_number} < Day {$prevDose}",
                            'recommended_value' => 'Reschedule sequence',
                            'can_auto_fix' => true,
                            'auto_fix_action' => 'shift_to_resolved_date',
                        ];
                    }
                }

                $prevDose = $item->dose_number;
                $prevDate = $curDate;
            }

            // Check for duplicate dose numbers
            $duplicates = $pAppts->groupBy('dose_number')->filter(fn($g) => $g->count() > 1);
            foreach ($duplicates as $doseNo => $group) {
                $doseLabel = $doseNo === 90 ? 'Booster 1' : ($doseNo === 365 ? 'Booster 2' : "Day {$doseNo}");
                $anomalies[] = [
                    'id' => "seq_duplicate_{$pId}_{$doseNo}",
                    'appointment_id' => $group->first()->appointment_id,
                    'patient_id' => $pId,
                    'patient_name' => $pName,
                    'role_stage' => 'schedule_engine',
                    'rule_code' => 'DUPLICATE_DOSE_APPOINTMENTS',
                    'severity' => 'critical',
                    'title' => "Duplicate Appointments for {$doseLabel}",
                    'description' => "Patient has {$group->count()} active appointments scheduled for the same {$doseLabel} dose.",
                    'clinical_impact' => 'Causes multiple reminder alerts and doubles inventory allocation forecasts.',
                    'current_value' => "{$group->count()} appointments",
                    'recommended_value' => 'Keep 1 valid appointment, cancel duplicates',
                    'can_auto_fix' => true,
                    'auto_fix_action' => 'merge_duplicate_doses',
                ];
            }
        }

        return $anomalies;
    }

    /**
     * Auto-repair all fixable anomalies
     */
    public function repairAll(int $clinicId = 1): array
    {
        $diagnostic = $this->runFullDiagnostic($clinicId);
        $fixable = array_filter($diagnostic['anomalies'], fn($a) => !empty($a['can_auto_fix']));

        $repairedCount = 0;
        $repairedLog = [];

        foreach ($fixable as $anomaly) {
            $success = $this->repairSingleAnomaly($anomaly);
            if ($success) {
                $repairedCount++;
                $repairedLog[] = [
                    'id' => $anomaly['id'],
                    'rule' => $anomaly['rule_code'],
                    'patient' => $anomaly['patient_name'],
                    'action' => $anomaly['auto_fix_action'] ?? 'repaired',
                ];
            }
        }

        return [
            'repaired_count' => $repairedCount,
            'total_fixable' => count($fixable),
            'log' => $repairedLog,
        ];
    }

    /**
     * Repair a single anomaly by its definition
     */
    public function repairSingleAnomaly(array $anomaly): bool
    {
        $action = $anomaly['auto_fix_action'] ?? '';
        $apptId = $anomaly['appointment_id'] ?? null;

        if (!$apptId && $action !== 'merge_duplicate_doses') return false;

        $appt = $apptId ? Appointment::find($apptId) : null;

        try {
            switch ($action) {
                case 'shift_to_resolved_date':
                    if (!$appt) return false;
                    $idealDate = $appt->ideal_date ? Carbon::parse($appt->ideal_date) : Carbon::parse($appt->scheduled_date ?? $appt->appointment_date);
                    $resolution = $this->scheduleService->resolveScheduleDate($appt->clinic_id, $idealDate, $appt->dose_number);
                    $newDate = $resolution['scheduled_date']->toDateString();

                    $appt->update([
                        'appointment_date' => $newDate,
                        'scheduled_date' => $newDate,
                        'ideal_date' => $idealDate->toDateString(),
                        'schedule_drift_days' => $resolution['drift_days'],
                        'schedule_adjustment_reason' => $resolution['adjustment_reason'],
                    ]);
                    return true;

                case 'backfill_ideal_date':
                    if (!$appt) return false;
                    $date = $appt->scheduled_date ?? $appt->appointment_date ?? Carbon::today()->toDateString();
                    $appt->update(['ideal_date' => Carbon::parse($date)->toDateString()]);
                    return true;

                case 'mark_as_completed':
                    if (!$appt) return false;
                    $appt->update(['status' => 'completed']);
                    return true;

                case 'mark_as_missed':
                    if (!$appt) return false;
                    $appt->update(['status' => 'missed', 'cancellation_reason' => 'Automatically flagged: Patient did not attend scheduled visit.']);
                    return true;

                case 'merge_duplicate_doses':
                    $pId = $anomaly['patient_id'];
                    $apptList = Appointment::where('patient_id', $pId)
                        ->where('status', 'scheduled')
                        ->get();
                    $grouped = $apptList->groupBy('dose_number');
                    foreach ($grouped as $doseNo => $group) {
                        if ($group->count() > 1) {
                            $keep = $group->first();
                            foreach ($group->slice(1) as $dup) {
                                $dup->update(['status' => 'cancelled', 'cancellation_reason' => 'Auto-merged duplicate dose booking.']);
                            }
                        }
                    }
                    return true;

                default:
                    return false;
            }
        } catch (\Throwable $e) {
            Log::error("Failed to repair anomaly {$anomaly['id']}: " . $e->getMessage());
            return false;
        }
    }
}
