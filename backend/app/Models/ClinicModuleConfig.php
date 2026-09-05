<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicModuleConfig extends Model
{
    protected $fillable = [
        'clinic_id',
        'triage_module_enabled',
        'patient_registration_enabled',
        'address_section_enabled',
        'socioeconomic_section_enabled',
        'gov_programs_section_enabled',
        'bite_intake_section_enabled',
        'triage_section_enabled',
        'treatment_section_enabled',
        'field_rules',
    ];

    protected $casts = [
        'triage_module_enabled'          => 'boolean',
        'patient_registration_enabled'   => 'boolean',
        'address_section_enabled'        => 'boolean',
        'socioeconomic_section_enabled'  => 'boolean',
        'gov_programs_section_enabled'   => 'boolean',
        'bite_intake_section_enabled'    => 'boolean',
        'triage_section_enabled'         => 'boolean',
        'treatment_section_enabled'      => 'boolean',
        'field_rules'                    => 'array',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class, 'clinic_id', 'id');
    }
}
