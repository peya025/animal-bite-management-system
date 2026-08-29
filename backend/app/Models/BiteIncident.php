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
        'case_number',
        'bite_date',
        'bite_place',
        'site_washed',
        'exposure_type',
        'victim_of_exposure',
        'severity',
        'animal_type',
        'animal_status',
        'animal_captured',
        'animal_observation_status',
        'site_number',
        'wound_description',
        'photo_path',
        'referred_from',
        'status',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'bite_date' => 'date:Y-m-d',
        'site_washed' => 'boolean',
        'animal_captured' => 'boolean',
    ];

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

    public function vaccinationSchedules()
    {
        return $this->hasMany(VaccinationSchedule::class, 'bite_id', 'bite_id');
    }

    public function queues()
    {
        return $this->hasMany(Queue::class, 'bite_id', 'bite_id');
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
        if ($this->exposure_type === 'lick' && !$this->site_washed) {
            return 'Category I'; // No vaccination needed
        }
        
        if ($this->exposure_type === 'scratch' || 
            ($this->exposure_type === 'bite' && $this->severity === 'minor')) {
            return 'Category II'; // Vaccination + wound treatment
        }
        
        return 'Category III'; // Vaccination + immunoglobulin + wound treatment
    }
}
