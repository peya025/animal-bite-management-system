<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientMembership extends Model
{
    protected $fillable = [
        'patient_id',
        'membership_type',
        'is_active',
        'status_value',
        'category',
        'relationship_value',
        'registered_beneficiary',
        'membership_id_no',
        'membership_label',
        'extra_value',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }
}
