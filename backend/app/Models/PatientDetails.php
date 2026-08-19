<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientDetails extends Model
{
    protected $fillable = [
        'patient_id',
        'blood_type',
        'mother_maiden_name',
        'civil_status',
        'spouse_name',
        'address_municipality',
        'address_barangay',
        'address_purok',
        'province',
        'educational_attainment',
        'employment_status',
        'family_member',
        'philhealth_member',
        'philhealth_status',
        'philhealth_no',
        'philhealth_category',
        'fourps_member',
        'fourps_category',
        'fourps_relationship',
        'registered_fourps_beneficiary',
        'dswd_nhts',
        'has_membership',
        'other_membership',
        'other_membership_name',
        'other_membership_no',
    ];

    protected $casts = [
        'philhealth_member' => 'string',
        'philhealth_status' => 'string',
        'fourps_member' => 'string',
        'dswd_nhts' => 'string',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }
}
