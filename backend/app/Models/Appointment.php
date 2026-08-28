<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $table = 'appointments';

    protected $primaryKey = 'appointment_id';

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'bite_id',
        'appointment_date',
        'appointment_time',
        'appointment_type',
        'dose_number',
        'status',
        'notes',
        'created_by',
        'ideal_date',
        'schedule_drift_days',
        'schedule_adjustment_reason',
        // Legacy fields for mobile compatibility
        'booked_by_account_id',
        'staff_id',
        'scheduled_date',
        'cancellation_reason',
        'cancelled_at',
        'queue_number',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'scheduled_date' => 'datetime',
        'ideal_date' => 'date',
        'schedule_drift_days' => 'integer',
        'appointment_time' => 'datetime:H:i',
        'queue_number' => 'integer',
        'dose_number' => 'integer',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Relationship: Appointment belongs to Clinic
     */
    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }

    /**
     * Relationship: Appointment belongs to Patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    /**
     * Relationship: Appointment belongs to Bite Incident (optional)
     */
    public function biteIncident()
    {
        return $this->belongsTo(BiteIncident::class, 'bite_id', 'bite_id');
    }

    /**
     * Relationship: Appointment created by User
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    /**
     * Relationship: Appointment belongs to Staff (User)
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id', 'id');
    }

    public function bookedByAccount()
    {
        return $this->belongsTo(PatientAccount::class, 'booked_by_account_id');
    }

    /**
     * Relationship: Appointment has one Queue
     */
    public function queue()
    {
        return $this->hasOne(Queue::class, 'appointment_id', 'appointment_id');
    }

    /**
     * Relationship: Appointment has many Notifications
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'appointment_id', 'appointment_id');
    }

    /**
     * Relationship: Appointment has many TreatmentRecords
     */
    public function treatmentRecords()
    {
        return $this->hasMany(TreatmentRecord::class, 'appointment_id', 'appointment_id');
    }

    public function biteIntake()
    {
        return $this->hasOne(BiteIncidentIntake::class, 'appointment_id', 'appointment_id');
    }
}
