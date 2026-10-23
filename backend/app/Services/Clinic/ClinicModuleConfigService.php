<?php

namespace App\Services\Clinic;

use App\Models\Clinic;
use App\Models\ClinicModuleConfig;

class ClinicModuleConfigService
{
    /**
     * Get default field rules for all configurable fields.
     *
     * @return array<string, string>
     */
    public function getDefaultFieldRules(): array
    {
        return [
            // PATIENT REGISTRATION FIELDS
            'blood_type' => 'optional',
            'mother_maiden_name' => 'optional',
            'civil_status' => 'optional',
            'spouse_name' => 'optional',

            // ADDRESS FIELDS
            'address_municipality' => 'required',
            'address_barangay' => 'required',
            'address_purok' => 'optional',
            'province' => 'required',

            // SOCIOECONOMIC FIELDS
            'educational_attainment' => 'optional',
            'employment_status' => 'optional',
            'family_member' => 'optional',

            // GOVERNMENT PROGRAMS
            'philhealth_member' => 'optional',
            'philhealth_status' => 'optional',
            'philhealth_no' => 'optional',
            'philhealth_category' => 'optional',
            'fourps_member' => 'optional',
            'dswd_nhts' => 'optional',

            // BITE INCIDENT INTAKE FIELDS
            'bite_date' => 'required',
            'bite_place' => 'required',
            'site_washed' => 'required',
            'exposure_type' => 'required',
            'animal_type' => 'required',
            'animal_status' => 'required',
            'animal_captured' => 'optional',
            'wound_location' => 'required',
            'patient_description' => 'optional',

            // TRIAGE/ASSESSMENT FIELDS
            'exposure_category' => 'required',
            'bite_site' => 'required',
            'animal_observation_status' => 'optional',
            'treatment_given' => 'optional',

            // TREATMENT FIELDS
            'protocol_type' => 'required',
            'route' => 'optional',
            'injection_site' => 'optional',
            'dosage_ml' => 'optional',
            'vaccine_brand' => 'optional',
            'vaccine_generic' => 'optional',
            'batch_no' => 'optional',
            'tt_status' => 'optional',
            'medication_given' => 'optional',
            'adverse_reaction' => 'optional',
            'cost_recovery' => 'optional',
        ];
    }

    /**
     * Get current clinic's module configuration or create default.
     */
    public function getOrCreateConfigForClinic(?int $clinicId): ClinicModuleConfig
    {
        $resolvedClinicId = $clinicId ?? Clinic::first()?->id;

        return ClinicModuleConfig::firstOrCreate(
            ['clinic_id' => $resolvedClinicId],
            [
                'triage_module_enabled'         => true,
                'patient_registration_enabled'  => true,
                'address_section_enabled'       => true,
                'socioeconomic_section_enabled' => true,
                'gov_programs_section_enabled'  => true,
                'bite_intake_section_enabled'   => true,
                'triage_section_enabled'        => true,
                'treatment_section_enabled'     => true,
                'field_rules'                   => $this->getDefaultFieldRules(),
            ]
        );
    }

    /**
     * Update or create clinic module configuration with validated data.
     *
     * @param array<string, mixed> $data
     */
    public function updateConfigForClinic(?int $clinicId, array $data): ClinicModuleConfig
    {
        $resolvedClinicId = $clinicId ?? Clinic::first()?->id;

        return ClinicModuleConfig::updateOrCreate(
            ['clinic_id' => $resolvedClinicId],
            $data
        );
    }
}
