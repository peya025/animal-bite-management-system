<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentReminder extends Model
{
    use HasFactory;

    protected $table = 'appointment_reminders';

    protected $fillable = [
        'clinic_id',
        'appointment_id',
        'patient_id',
        'channel',
        'recipient',
        'subject',
        'message',
        'status',
        'error_details',
        'sent_by_user_id',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id', 'appointment_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by_user_id', 'id');
    }

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }
}
