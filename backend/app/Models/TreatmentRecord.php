<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TreatmentRecord extends Model
{
    use HasFactory;

    protected $table = 'treatment_records';
    protected $primaryKey = 'treatment_id';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'bite_id',
        'appointment_id',
        'inventory_id',
        'protocol_type',
        'dose_number',
        'scheduled_date',
        'treatment_date',
        'route',
        'injection_site',
        'dosage_ml',
        'vaccine_brand',
        'vaccine_generic',
        'batch_no',
        'expiration_date',
        'tt_status',
        'medication_given',
        'administered_by',
        'administered_at',
        'adverse_reaction',
        'remarks',
        'administration_notes',
        'cost_recovery',
        'signature',
        'outcome',
        'status',
        'scheduled_by',
    ];

    protected $casts = [
        'dose_number' => 'integer',
        'scheduled_date' => 'date',
        'treatment_date' => 'datetime',
        'expiration_date' => 'date',
        'administered_at' => 'datetime',
        'dosage_ml' => 'decimal:2',
    ];

    /**
     * Relationship: TreatmentRecord belongs to Clinic
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    /**
     * Relationship: TreatmentRecord belongs to Patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    /**
     * Relationship: TreatmentRecord belongs to BiteIncident
     */
    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    /**
     * Relationship: TreatmentRecord belongs to Appointment
     */
    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id', 'appointment_id');
    }

    /**
     * Relationship: TreatmentRecord belongs to VaccineInventory
     */
    public function inventory()
    {
        return $this->belongsTo(VaccineInventory::class, 'inventory_id', 'inventory_id');
    }

    /**
     * Relationship: TreatmentRecord belongs to User (administered_by)
     */
    public function administeredBy()
    {
        return $this->belongsTo(User::class, 'administered_by', 'id');
    }

    /**
     * Relationship: TreatmentRecord belongs to User (scheduled_by)
     */
    public function scheduledBy()
    {
        return $this->belongsTo(User::class, 'scheduled_by', 'id');
    }
}
