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
        'patient_id',
        'booked_by_account_id',
        'staff_id',
        'appointment_type',
        'scheduled_date',
        'status',
        'queue_number',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'queue_number' => 'integer',
    ];

    /**
     * Relationship: Appointment belongs to Patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
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
}
