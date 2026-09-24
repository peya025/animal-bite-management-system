<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BiteIncident extends Model
{
    use SoftDeletes;

    protected $table = 'bite_incidents';
    protected $primaryKey = 'bite_id';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'episode_number',
        'episode_type',
        'is_previously_vaccinated',
        'verification_source',
        'external_vaccine_proof_path',
        'external_proof_reviewed_by',
        'external_proof_reviewed_at',
        'rig_decision_reason',
        'case_number',
        'bite_date',
        'bite_place',
        'site_washed',
        'exposure_type',
        'exposure_mode',
        'victim_of_exposure',
        'severity',
        'animal_type',
        'animal_type_others',
        'animal_status',
        'animal_captured',
        'animal_available',
        'animal_observation_status',
        'site_number',
        'body_part_exposed',
        'laterality',
        'wound_description',
        'wound_condition',
        'photo_path',
        'referred_from',
        'status',
        'transferred_to_facility',
        'transferred_at',
        'transfer_reason',
        'remarks',
        'confirmed_by',
        'confirmed_at',
        'created_by',
    ];

    protected $casts = [
        'bite_date' => 'date:Y-m-d',
        'site_washed' => 'boolean',
        'animal_captured' => 'boolean',
        'animal_available' => 'boolean',
        'is_previously_vaccinated' => 'boolean',
        'external_proof_reviewed_at' => 'datetime',
        'transferred_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function isReExposure(): bool
    {
        return $this->episode_type === 're_exposure';
    }

    public function isPrimary(): bool
    {
        return $this->episode_type === 'primary';
    }

    public function isAwaitingAssessment(): bool
    {
        return $this->episode_type === 'pending_assessment'
            || $this->status === 'awaiting_assessment';
    }

    public function isTransferredOut(): bool
    {
        return $this->status === 'transferred_out' || !empty($this->transferred_to_facility);
    }

    public function externalProofReviewer()
    {
        return $this->belongsTo(User::class, 'external_proof_reviewed_by');
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    /**
     * Boot method - auto-generate case number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($incident) {
            if (!$incident->case_number) {
                $incident->case_number = static::generateCaseNumber($incident->clinic_id);
            }
        });
    }

    /**
     * Generate unique case number: BC-2024-0001
     */
    public static function generateCaseNumber($clinicId)
    {
        $year = date('Y');
        $prefix = "BC-{$year}-";
        
        $lastCase = static::where('clinic_id', $clinicId)
            ->where('case_number', 'like', "{$prefix}%")
            ->orderBy('bite_id', 'desc')
            ->first();

        if ($lastCase) {
            $lastNumber = (int) substr($lastCase->case_number, -4);
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

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function location()
    {
        return $this->hasOne(BiteLocation::class, 'bite_id', 'bite_id');
    }

    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'bite_id', 'bite_id');
    }

    /**
     * Doctor/Form 2 records for this episode.  Form 2 and Form 3 share the
     * treatment_records table, so a null dose_number is the existing Form 2
     * discriminator.
     */
    public function consultationRecords()
    {
        return $this->treatmentRecords()->whereNull('dose_number');
    }

    /** Vaccine administrations and scheduled doses for this episode. */
    public function vaccinationRecords()
    {
        return $this->treatmentRecords()->whereNotNull('dose_number');
    }

    public function vaccinationSchedules()
    {
        return $this->hasMany(VaccinationSchedule::class, 'bite_id', 'bite_id');
    }

    public function queues()
    {
        return $this->hasMany(Queue::class, 'bite_id', 'bite_id');
    }

    public function treatmentPlan()
    {
        return $this->hasOne(TreatmentPlan::class, 'bite_id', 'bite_id');
    }

    public function intake()
    {
        return $this->hasOne(BiteIncidentIntake::class, 'bite_id', 'bite_id');
    }

    public function getIncidentDateAttribute()
    {
        return $this->bite_date;
    }

    public function getBiteCategoryAttribute(): string
    {
        $sev = strtolower(trim((string) ($this->severity ?? '')));
        if (in_array($sev, ['severe', 'category iii', 'iii', '3'], true)) {
            return 'III';
        }
        if (in_array($sev, ['minor', 'category i', 'i', '1'], true)) {
            return 'I';
        }
        if (in_array($sev, ['moderate', 'category ii', 'ii', '2'], true)) {
            return 'II';
        }
        // Legacy clinic-entered intakes may already contain a category. New
        // mobile submissions cannot set this field.
        if ($this->relationLoaded('intake') && $this->intake && !empty($this->intake->bite_category)) {
            return (string) $this->intake->bite_category;
        }
        return 'Unassessed';
    }

    public function getRigTypeAttribute(): ?string
    {
        if ($this->relationLoaded('intake') && $this->intake && !empty($this->intake->rig_type)) {
            return (string) $this->intake->rig_type;
        }
        if ($this->relationLoaded('treatmentRecords')) {
            $hasHrig = $this->treatmentRecords->contains(fn($r) => strtoupper((string) ($r->medication_given ?? '')) === 'HRIG');
            if ($hasHrig) return 'HRIG';
            $hasErig = $this->treatmentRecords->contains(fn($r) => strtoupper((string) ($r->medication_given ?? '')) === 'ERIG');
            if ($hasErig) return 'ERIG';
        }
        if (!empty($this->rig_decision_reason)) {
            if (stripos($this->rig_decision_reason, 'hrig') !== false) return 'HRIG';
            if (stripos($this->rig_decision_reason, 'erig') !== false) return 'ERIG';
        }
        return null;
    }

    /**
     * Helper: Check if WHO protocol requires vaccination
     */
    public function requiresVaccination(): bool
    {
        // Category II (minor) and Category III (severe) exposures need vaccination
        return in_array($this->exposure_type, ['bite', 'scratch']) || 
               in_array($this->severity, ['moderate', 'severe']);
    }

    /**
     * Helper: Get WHO exposure category
     */
    public function getWhoCategory(): string
    {
        return match ($this->severity) {
            'minor' => 'Category I',
            'moderate' => 'Category II',
            'severe' => 'Category III',
            default => 'Unassessed',
        };
    }
}
