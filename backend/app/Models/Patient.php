<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Patient extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'patient_id';

    protected $fillable = [
        'clinic_id',
        'patient_number',
        'card_token',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'gender',
        'age',
        'date_of_birth',
        'address',
        'contact_number',
        'email',
        'emergency_contact_name',
        'emergency_contact_number',
        'registered_by',
        'registration_source',
        'registration_date',
    ];

    protected $hidden = [
        'card_token',
    ];

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'registration_date' => 'datetime',
        'contact_number' => \App\Casts\LegacyCompatibleEncrypted::class,
        'emergency_contact_number' => \App\Casts\LegacyCompatibleEncrypted::class,
        'address' => \App\Casts\LegacyCompatibleEncrypted::class,
    ];

    protected $appends = [
        'name',
        'age',
        'has_completed_primary',
        'is_category1_no_treatment',
        'case_status',
        'visit_status',
        'treatment_status',
        'queue_status',
        'pending_treatment_summary',
    ];

    protected ?array $cachedEpisodeStatusSummary = null;

    /**
     * Resolve differentiated Case Status, Visit Status, Treatment Status, Queue Status,
     * and Pending Treatment Summary for the patient's latest/active bite case.
     */
    public function resolveEpisodeStatusSummary(): array
    {
        if ($this->cachedEpisodeStatusSummary !== null) {
            return $this->cachedEpisodeStatusSummary;
        }

        $todayStr = now('Asia/Manila')->toDateString();

        $todayQueues = $this->relationLoaded('queues')
            ? $this->queues->sortByDesc('queue_id')->values()
            : $this->queues()->where('queue_date', $todayStr)->orderByDesc('queue_id')->get();

        $activeQueue = $todayQueues->first(fn ($q) => in_array($q->status, [
            'waiting', 'called', 'serving', 'in_consultation', 'second_chance', 'final_recall',
        ], true));
        $latestTodayQueue = $todayQueues->first();
        $queueStatus = $activeQueue ? $activeQueue->status : ($latestTodayQueue ? $latestTodayQueue->status : 'not_in_today_queue');

        $incident = $this->relationLoaded('biteIncidents')
            ? $this->biteIncidents->first()
            : $this->biteIncidents()->with('treatmentPlan')->latest('bite_date')->latest('bite_id')->first();

        if (!$incident) {
            return $this->cachedEpisodeStatusSummary = [
                'case_status' => 'awaiting_assessment',
                'visit_status' => 'awaiting_triage',
                'treatment_status' => 'awaiting_consultation',
                'queue_status' => $queueStatus,
                'pending_treatment_summary' => null,
            ];
        }

        $episodeRecords = $this->relationLoaded('treatmentRecords')
            ? $this->treatmentRecords->where('bite_id', $incident->bite_id)->whereNull('voided_at')->sortBy('treatment_id')->values()
            : $this->treatmentRecords()->where('bite_id', $incident->bite_id)->whereNull('voided_at')->orderBy('treatment_id', 'asc')->get();

        $completedConsultations = $episodeRecords->filter(fn ($r) =>
            $r->dose_number === null &&
            $r->medication_given === null &&
            $r->status === 'completed' &&
            (!empty($r->nature_of_visit) || !empty($r->diagnosis) || !empty($r->chief_complaints))
        )->values();

        $latestConsultation = $completedConsultations->last();

        if (!$latestConsultation) {
            return $this->cachedEpisodeStatusSummary = [
                'case_status' => $incident->status ?: 'awaiting_assessment',
                'visit_status' => 'awaiting_triage',
                'treatment_status' => 'awaiting_consultation',
                'queue_status' => $queueStatus,
                'pending_treatment_summary' => null,
            ];
        }

        $scheduledReassessment = $episodeRecords->first(fn ($r) =>
            $r->dose_number === null &&
            $r->medication_given === null &&
            $r->status === 'scheduled' &&
            (int) $r->treatment_id > (int) $latestConsultation->treatment_id
        );

        $administeredDoses = $episodeRecords->filter(fn ($r) =>
            $r->dose_number !== null &&
            (int) $r->dose_number < 200 &&
            ($r->status === 'completed' || !empty($r->treatment_date)) &&
            !in_array($r->status, ['scheduled', 'cancelled'], true)
        )->values();

        $administeredProphylaxis = $episodeRecords->filter(fn ($r) =>
            (!empty($r->medication_given) || in_array((int) $r->dose_number, [200, 201, 300, 400, 401], true)) &&
            $r->status === 'completed'
        )->values();

        $notAdministeredRecords = $episodeRecords->filter(fn ($r) =>
            $r->status === 'cancelled' &&
            ($r->outcome === 'not_administered' || !empty($r->medication_given) || !empty($r->vaccine_brand))
        )->values();

        $pOrders = is_array($latestConsultation->prophylaxis_orders) ? $latestConsultation->prophylaxis_orders : [];
        $reassessmentDecision = $pOrders['reassessment_decision'] ?? null;
        $consultationCategory = $pOrders['consultation_exposure_category'] ?? $incident->exposure_category ?? $incident->bite_category ?? 'II';
        $plan = $incident->relationLoaded('treatmentPlan') ? $incident->treatmentPlan : $incident->treatmentPlan()->first();
        $planType = $pOrders['consultation_treatment_plan'] ?? $plan?->plan_type ?? ($consultationCategory === 'I' ? 'no_vaccine' : 'full_pep');

        $noInjectionDecision = in_array($reassessmentDecision, ['discontinue', 'no_injection_required'], true)
            || $latestConsultation->outcome === 'completed_without_injection';

        $prescribedPep = (!$noInjectionDecision && $consultationCategory !== 'I' && $planType !== 'no_vaccine' && !empty($latestConsultation->prescribed_vaccine_type) && $latestConsultation->prescribed_vaccine_type !== 'none')
            ? $latestConsultation->prescribed_vaccine_type
            : null;

        $tetCat = strtolower(trim((string) ($pOrders['tetanus_category'] ?? '')));
        $prescribedTt = (!$noInjectionDecision && in_array($tetCat, ['tt', 'ats_tt'], true) && !empty($pOrders['tetanus_vaccine']) && $pOrders['tetanus_vaccine'] !== 'none')
            ? $pOrders['tetanus_vaccine']
            : null;
        $prescribedAts = (!$noInjectionDecision && in_array($tetCat, ['ats', 'ats_tt'], true) && !empty($pOrders['tetanus_passive']) && $pOrders['tetanus_passive'] !== 'none')
            ? $pOrders['tetanus_passive']
            : null;
        $prescribedRig = (!$noInjectionDecision && !empty($pOrders['rig']) && $pOrders['rig'] !== 'none')
            ? $pOrders['rig']
            : null;

        $hasAnyPrescription = (bool) ($prescribedPep || $prescribedTt || $prescribedAts || $prescribedRig);

        if (!$hasAnyPrescription && ($consultationCategory === 'I' || $planType === 'no_vaccine' || $noInjectionDecision) && $administeredDoses->isEmpty() && $administeredProphylaxis->isEmpty()) {
            return $this->cachedEpisodeStatusSummary = [
                'case_status' => 'completed',
                'visit_status' => 'completed',
                'treatment_status' => 'completed_without_injection',
                'queue_status' => $queueStatus,
                'pending_treatment_summary' => null,
            ];
        }

        $hasAdministeredPep = $administeredDoses->isNotEmpty();
        $hasAdministeredTt = $administeredProphylaxis->contains(fn ($r) =>
            \App\Services\ProphylaxisService::isTetanusBrand((string) ($r->medication_given ?? $r->vaccine_brand ?? ''), array_filter([$prescribedTt])) ||
            (int) $r->dose_number === 300
        );
        $hasAdministeredAts = $administeredProphylaxis->contains(fn ($r) =>
            \App\Services\ProphylaxisService::isAtsBrand((string) ($r->medication_given ?? $r->vaccine_brand ?? ''), array_filter([$prescribedAts])) ||
            in_array((int) $r->dose_number, [400, 401], true)
        );
        $hasAdministeredRig = $administeredProphylaxis->contains(fn ($r) =>
            in_array(strtoupper((string) $r->medication_given), ['ERIG', 'HRIG'], true) ||
            in_array((int) $r->dose_number, [200, 201], true)
        );

        $pendingItems = [];
        if ($prescribedPep && !$hasAdministeredPep) {
            $pendingItems[] = "Anti-Rabies PEP ({$prescribedPep})";
        }
        if ($prescribedTt && !$hasAdministeredTt) {
            $pendingItems[] = "TT ({$prescribedTt})";
        }
        if ($prescribedAts && !$hasAdministeredAts) {
            $pendingItems[] = "ATS ({$prescribedAts})";
        }
        if ($prescribedRig && !$hasAdministeredRig) {
            $pendingItems[] = "RIG ({$prescribedRig})";
        }

        if (empty($pendingItems) && ($hasAdministeredPep || $hasAdministeredTt || $hasAdministeredAts || $hasAdministeredRig)) {
            return $this->cachedEpisodeStatusSummary = [
                'case_status' => $incident->status === 'completed' ? 'completed' : 'active',
                'visit_status' => 'completed',
                'treatment_status' => 'administered',
                'queue_status' => $queueStatus,
                'pending_treatment_summary' => null,
            ];
        }

        $isReturnedForReassessment = $scheduledReassessment !== null
            || ($activeQueue && in_array($activeQueue->visit_type, ['new_case', 'consultation'], true));

        $consultationDateStr = $latestConsultation->consultation_date
            ? \Carbon\Carbon::parse($latestConsultation->consultation_date)->toDateString()
            : null;

        $recentNotAdministered = $notAdministeredRecords->filter(function ($r) use ($consultationDateStr) {
            if (!$consultationDateStr || !$r->scheduled_date) {
                return true;
            }
            return \Carbon\Carbon::parse($r->scheduled_date)->toDateString() >= $consultationDateStr;
        })->values();

        $treatmentStatus = $isReturnedForReassessment
            ? 'returned_for_reassessment'
            : ($recentNotAdministered->isNotEmpty() ? 'not_administered' : 'pending_administration');

        $visitStatus = $isReturnedForReassessment ? 'awaiting_reassessment' : 'consultation_completed';

        $isConsultationFromPriorDay = $consultationDateStr && $consultationDateStr < $todayStr;
        $canCheckInForReassessment = !$isReturnedForReassessment && (
            $isConsultationFromPriorDay ||
            $recentNotAdministered->isNotEmpty() ||
            !$activeQueue
        );

        $notAdministeredReasons = $recentNotAdministered
            ->pluck('remarks')
            ->filter()
            ->unique()
            ->values()
            ->all();

        return $this->cachedEpisodeStatusSummary = [
            'case_status' => 'active',
            'visit_status' => $visitStatus,
            'treatment_status' => $treatmentStatus,
            'queue_status' => $queueStatus,
            'pending_treatment_summary' => [
                'has_pending_treatment' => true,
                'can_check_in_for_reassessment' => $canCheckInForReassessment,
                'is_returning_from_prior_visit' => (bool) ($isConsultationFromPriorDay || $recentNotAdministered->isNotEmpty()),
                'bite_id' => $incident->bite_id,
                'case_number' => $incident->case_number,
                'consultation_id' => $latestConsultation->treatment_id,
                'consultation_date' => $consultationDateStr,
                'consultation_time' => $latestConsultation->consultation_time,
                'exposure_category' => $consultationCategory,
                'chief_complaints' => $latestConsultation->chief_complaints,
                'diagnosis' => $latestConsultation->diagnosis,
                'prescribed_vaccine_type' => $prescribedPep,
                'prescribed_tt' => $prescribedTt,
                'prescribed_ats' => $prescribedAts,
                'prescribed_rig' => $prescribedRig,
                'pending_items' => $pendingItems,
                'not_administered_reasons' => $notAdministeredReasons,
                'blood_pressure' => $latestConsultation->blood_pressure,
                'temperature' => $latestConsultation->temperature,
                'weight' => $latestConsultation->weight,
                'height' => $latestConsultation->height,
                'provider_name' => $latestConsultation->provider_name,
                'treatment_status' => $treatmentStatus,
            ],
        ];
    }

    public function getCaseStatusAttribute(): string
    {
        return $this->resolveEpisodeStatusSummary()['case_status'];
    }

    public function getVisitStatusAttribute(): string
    {
        return $this->resolveEpisodeStatusSummary()['visit_status'];
    }

    public function getTreatmentStatusAttribute(): string
    {
        return $this->resolveEpisodeStatusSummary()['treatment_status'];
    }

    public function getQueueStatusAttribute(): string
    {
        return $this->resolveEpisodeStatusSummary()['queue_status'];
    }

    public function getPendingTreatmentSummaryAttribute(): ?array
    {
        return $this->resolveEpisodeStatusSummary()['pending_treatment_summary'];
    }

    /**
     * Determine if patient has completed the primary 3-dose anti-rabies PEP series (Days 0, 3, 7).
     * Required before any booster regimen can be initiated.
     */
    public function getHasCompletedPrimaryAttribute(): bool
    {
        $completedTreatmentDoses = $this->treatmentRecords()
            ->whereIn('dose_number', [0, 3, 7])
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhereNotNull('treatment_date');
            })
            ->pluck('dose_number')
            ->unique()
            ->toArray();

        $completedApptDoses = $this->appointments()
            ->whereIn('dose_number', [0, 3, 7])
            ->where('status', 'completed')
            ->pluck('dose_number')
            ->unique()
            ->toArray();

        $allCompletedDoses = array_unique(array_merge($completedTreatmentDoses, $completedApptDoses));
        return count(array_intersect([0, 3, 7], $allCompletedDoses)) === 3;
    }

    /**
     * Determine if the doctor has finalized the Category I assessment and confirmed
     * that no nurse-administered treatment (PEP vaccine, tetanus prophylaxis, RIG) is required.
     */
    public function getIsCategory1NoTreatmentAttribute(): bool
    {
        $incident = $this->relationLoaded('biteIncidents')
            ? $this->biteIncidents->first()
            : $this->biteIncidents()->latest('bite_date')->latest('bite_id')->first();

        if (!$incident) {
            return false;
        }

        $category = $incident->exposure_category ?? $incident->bite_category;
        $severity = strtolower(trim((string) ($incident->severity ?? '')));
        $isCategory1 = in_array($category, ['I', 'Category I', '1'], true)
            || in_array($severity, ['minor', 'category i', 'i'], true);

        if (!$isCategory1) {
            return false;
        }

        // Doctor assessment must be finalized
        $isIncidentConfirmed = !empty($incident->confirmed_at)
            || in_array($incident->status, ['completed', 'active'], true);
        if (!$isIncidentConfirmed) {
            return false;
        }

        $consultation = $this->relationLoaded('latestConsultationRecord')
            ? $this->latestConsultationRecord
            : $this->latestConsultationRecord()->first();

        if (!$consultation || ($consultation->status !== 'completed' && empty($consultation->nature_of_visit) && empty($consultation->diagnosis))) {
            return false;
        }

        // Must not have a prescribed PEP vaccine
        if (!empty($consultation->prescribed_vaccine_type) && $consultation->prescribed_vaccine_type !== 'none') {
            return false;
        }

        $plan = $incident->relationLoaded('treatmentPlan')
            ? $incident->treatmentPlan
            : $incident->treatmentPlan()->first();

        if ($plan && !empty($plan->plan_type) && $plan->plan_type !== 'no_vaccine') {
            return false;
        }

        // Check prophylaxis orders for any nurse-administered treatments (tetanus, RIG)
        $pOrders = $consultation->prophylaxis_orders ?? [];
        if (is_array($pOrders)) {
            $tetCat = strtolower(trim((string) ($pOrders['tetanus_category'] ?? '')));
            $tetVac = strtolower(trim((string) ($pOrders['tetanus_vaccine'] ?? '')));
            $tetPas = strtolower(trim((string) ($pOrders['tetanus_passive'] ?? '')));

            $hasTetanusOrder = in_array($tetCat, ['ats', 'tt', 'ats_tt'], true) && (
                ($tetVac !== '' && $tetVac !== 'none') ||
                ($tetPas !== '' && $tetPas !== 'none')
            );
            if ($hasTetanusOrder) {
                return false;
            }

            $rig = strtolower(trim((string) ($pOrders['rig'] ?? '')));
            if ($rig !== '' && $rig !== 'none') {
                return false;
            }
        }

        // Must not have administered doses
        $hasDoses = $this->relationLoaded('latestTreatmentRecord')
            ? ($this->latestTreatmentRecord && $this->latestTreatmentRecord->dose_number !== null)
            : $this->treatmentRecords()->whereNotNull('dose_number')->exists();

        if ($hasDoses) {
            return false;
        }

        // Must not have scheduled follow-up appointments
        $hasScheduledAppt = $this->relationLoaded('appointments')
            ? $this->appointments->contains(fn($a) => in_array($a->status, ['scheduled', 'confirmed'], true))
            : $this->appointments()->whereIn('status', ['scheduled', 'confirmed'])->exists();

        if ($hasScheduledAppt) {
            return false;
        }

        return true;
    }

    /**
     * Preserve the legacy API display field without storing duplicate data.
     */
    public function getNameAttribute(): string
    {
        return collect([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
            $this->suffix,
        ])->filter()->implode(' ');
    }

    /**
     * Calculate age from date of birth
     */
    public function getAgeAttribute(): int
    {
        if (!$this->date_of_birth) {
            return $this->attributes['age'] ?? 0;
        }
        return $this->date_of_birth->age;
    }

    /**
     * Search every structured name part while supporting multi-word queries.
     */
    public function scopeSearchName($query, string $search)
    {
        $terms = preg_split('/\s+/', trim($search), -1, PREG_SPLIT_NO_EMPTY);

        foreach ($terms as $term) {
            $query->where(function ($nameQuery) use ($term) {
                $nameQuery->where('first_name', 'like', "%{$term}%")
                    ->orWhere('middle_name', 'like', "%{$term}%")
                    ->orWhere('last_name', 'like', "%{$term}%")
                    ->orWhere('suffix', 'like', "%{$term}%");
            });
        }

        return $query;
    }

    /**
     * Boot method - auto-generate patient number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($patient) {
            if (! $patient->patient_number) {
                $patient->patient_number = static::generatePatientNumber($patient->clinic_id);
            }
            if (! $patient->registration_date) {
                $patient->registration_date = now();
            }
            if (! $patient->card_token) {
                $patient->card_token = (string) Str::uuid();
            }
        });
    }

    /**
     * Generate unique patient number: P-2024-0001
     */
    public static function generatePatientNumber($clinicId)
    {
        $year = date('Y');
        $prefix = "P-{$year}-";

        // Get last patient number for this clinic and year
        $lastPatient = static::where('clinic_id', $clinicId)
            ->where('patient_number', 'like', "{$prefix}%")
            ->orderBy('patient_id', 'desc')
            ->first();

        if ($lastPatient) {
            // Extract number and increment
            $lastNumber = (int) substr($lastPatient->patient_number, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf('%s%04d', $prefix, $nextNumber);
    }

    /**
     * Relationships
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function registeredBy()
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function accounts()
    {
        return $this->belongsToMany(
            PatientAccount::class,
            'patient_account_patient',
            'patient_id',
            'patient_account_id',
        )->using(PatientAccountPatient::class)
            ->withPivot(['relationship', 'is_primary', 'status', 'verified_by', 'verified_at'])
            ->withTimestamps();
    }

    public function patientAccounts()
    {
        return $this->accounts();
    }

    public function biteIncidents()
    {
        return $this->hasMany(BiteIncident::class, 'patient_id', 'patient_id');
    }

    public function biteIntakes()
    {
        return $this->hasMany(BiteIncidentIntake::class, 'patient_id', 'patient_id');
    }

    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'patient_id', 'patient_id');
    }

    public function vaccinationSchedules()
    {
        return $this->hasMany(VaccinationSchedule::class, 'patient_id', 'patient_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'patient_id', 'patient_id');
    }

    public function queues()
    {
        return $this->hasMany(Queue::class, 'patient_id', 'patient_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'patient_id', 'patient_id');
    }

    public function details()
    {
        return $this->hasOne(PatientDetails::class, 'patient_id', 'patient_id');
    }

    public function memberships()
    {
        return $this->hasMany(PatientMembership::class, 'patient_id', 'patient_id');
    }

    /**
     * Helper: Get active bite cases
     */
    public function activeBiteCases()
    {
        return $this->biteIncidents()->where('status', 'active');
    }

    /**
     * Get completed PEP episodes for lifetime re-exposure decision support
     */
    public function completedBiteEpisodes()
    {
        return $this->biteIncidents()
            ->where('status', 'completed')
            ->orderBy('episode_number', 'desc');
    }

    /**
     * Get summary of immunization history for Doctor Triage Form 2 decision matrix
     */
    public function getImmunizationHistorySummary(): array
    {
        // 1. Check for completed past system episodes or >= 4 completed doses
        $totalEpisodes = $this->biteIncidents()->count();
        $maxEpisode = $this->biteIncidents()->max('episode_number') ?? 1;

        $completedPastEpisode = $this->biteIncidents()
            ->where('episode_number', '<', $maxEpisode)
            ->where('status', 'completed')
            ->latest('bite_date')
            ->first();

        // Count completed doses in treatment records
        $completedDoseCount = $this->treatmentRecords()
            ->where('status', 'completed')
            ->whereNotNull('dose_number')
            ->count();

        if ($completedPastEpisode || ($totalEpisodes > 1 && $completedDoseCount >= 3) || $completedDoseCount >= 4) {
            $latestDose = $this->treatmentRecords()
                ->where('status', 'completed')
                ->whereNotNull('dose_number')
                ->latest('treatment_date')
                ->first();

            return [
                'has_history' => true,
                'confidence' => 'system_record',
                'confidence_label' => 'System Record — Verified (Completed Series)',
                'completed_doses' => $completedDoseCount,
                'last_dose_date' => $latestDose ? $latestDose->treatment_date : ($completedPastEpisode ? $completedPastEpisode->bite_date : null),
                'episode_number' => $completedPastEpisode ? $completedPastEpisode->episode_number : 1,
                'can_receive_booster' => true,
                'requires_rig' => false,
            ];
        }

        // 2. Check if details indicate past bite or vaccination
        $details = $this->details;
        if ($details && !empty($details->past_pep_completed)) {
            return [
                'has_history' => true,
                'confidence' => 'patient_self_report_unverified',
                'confidence_label' => 'Patient-Reported History (Unverified External)',
                'completed_doses' => 0,
                'last_dose_date' => null,
                'episode_number' => null,
                'can_receive_booster' => false, // Requires proof review first
                'requires_rig' => true, // Conservative default
            ];
        }

        return [
            'has_history' => false,
            'confidence' => null,
            'confidence_label' => 'No Prior Immunization Record Found',
            'completed_doses' => 0,
            'last_dose_date' => null,
            'episode_number' => null,
            'can_receive_booster' => false,
            'requires_rig' => true,
        ];
    }

    /**
     * Helper: Get pending vaccinations (scheduled treatments)
     */
    public function pendingVaccinations()
    {
        return $this->treatmentRecords()
            ->whereIn('status', ['scheduled', 'missed'])
            ->orderBy('scheduled_date');
    }

    /**
     * Helper: Get latest treatment record (any dose)
     */
    public function latestTreatmentRecord()
    {
        return $this->hasOne(TreatmentRecord::class, 'patient_id', 'patient_id')
            ->whereNotNull('dose_number')
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhereNotNull('treatment_date');
            })
            ->orderBy('dose_number', 'desc')
            ->orderBy('treatment_date', 'desc')
            ->orderBy('treatment_id', 'desc');
    }

    /**
     * Helper: Get latest consultation record (Form 2)
     */
    public function latestConsultationRecord()
    {
        return $this->hasOne(TreatmentRecord::class, 'patient_id', 'patient_id')
            ->whereNull('dose_number')
            ->orderBy('consultation_date', 'desc')
            ->orderBy('treatment_id', 'desc');
    }

    /**
     * Helper: Get upcoming appointment
     */
    public function upcomingAppointment()
    {
        return $this->hasOne(Appointment::class, 'patient_id', 'patient_id')
            ->where(function ($q) {
                $q->whereDate('appointment_date', '>=', now()->toDateString())
                  ->orWhereDate('scheduled_date', '>=', now()->toDateString());
            })
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->orderByRaw('COALESCE(scheduled_date, appointment_date) ASC');
    }

    /**
     * Patient invitations relationship
     */
    public function invitations()
    {
        return $this->hasMany(PatientInvitation::class, 'patient_id', 'patient_id');
    }
}
