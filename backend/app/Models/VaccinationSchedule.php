<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class VaccinationSchedule extends Model
{
    protected $fillable = [
        'clinic_id',
        'bite_incident_id',
        'patient_id',
        'protocol_type',
        'dose_number',
        'scheduled_date',
        'status',
        'administered_at',
        'administered_by',
        'vaccine_brand',
        'vaccine_batch_number',
        'vaccine_expiry_date',
        'injection_site',
        'dosage_ml',
        'adverse_reaction',
        'administration_notes',
        'scheduled_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'administered_at' => 'datetime',
        'vaccine_expiry_date' => 'date',
        'dosage_ml' => 'decimal:2',
    ];

    /**
     * WHO Standard Protocol Schedule Generator
     * Day 0, 3, 7, 14, 28
     */
    public static function generateWhoSchedule(BiteIncident $incident, $protocolType = 'standard')
    {
        $schedules = [];
        $biteDate = Carbon::parse($incident->bite_date);
        
        // Standard WHO PEP Schedule
        $doseDays = [
            0 => $biteDate,                        // Day 0 (same day as bite)
            1 => $biteDate->copy()->addDays(3),    // Day 3
            2 => $biteDate->copy()->addDays(7),    // Day 7
            3 => $biteDate->copy()->addDays(14),   // Day 14
            4 => $biteDate->copy()->addDays(28),   // Day 28
        ];

        foreach ($doseDays as $doseNumber => $scheduledDate) {
            $schedules[] = static::create([
                'clinic_id' => $incident->clinic_id,
                'bite_incident_id' => $incident->bite_id,
                'patient_id' => $incident->patient_id,
                'protocol_type' => $protocolType,
                'dose_number' => $doseNumber,
                'scheduled_date' => $scheduledDate,
                'status' => 'scheduled',
                'scheduled_by' => $incident->created_by,
            ]);
        }

        return $schedules;
    }

    /**
     * Relationships
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_incident_id', 'bite_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function administeredBy()
    {
        return $this->belongsTo(User::class, 'administered_by');
    }

    public function scheduledBy()
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }

    /**
     * Helper: Mark as completed
     */
    public function markAsCompleted(User $user, array $data)
    {
        $this->update([
            'status' => 'completed',
            'administered_at' => now(),
            'administered_by' => $user->id,
            'vaccine_brand' => $data['vaccine_brand'] ?? null,
            'vaccine_batch_number' => $data['vaccine_batch_number'] ?? null,
            'vaccine_expiry_date' => $data['vaccine_expiry_date'] ?? null,
            'injection_site' => $data['injection_site'] ?? null,
            'dosage_ml' => $data['dosage_ml'] ?? null,
            'adverse_reaction' => $data['adverse_reaction'] ?? null,
            'administration_notes' => $data['administration_notes'] ?? null,
        ]);
    }

    /**
     * Helper: Check if overdue
     */
    public function isOverdue(): bool
    {
        return $this->status === 'scheduled' && 
               $this->scheduled_date < now()->toDateString();
    }

    /**
     * Helper: Get dose label
     */
    public function getDoseLabel(): string
    {
        return "Dose " . ($this->dose_number + 1) . " (Day " . 
               [0 => '0', 1 => '3', 2 => '7', 3 => '14', 4 => '28'][$this->dose_number] . ")";
    }
}
