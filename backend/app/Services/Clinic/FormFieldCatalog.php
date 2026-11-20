<?php

namespace App\Services\Clinic;

final class FormFieldCatalog
{
    public const PROFILE_SECTIONS = [
        'patient_registration_enabled', 'address_section_enabled',
        'socioeconomic_section_enabled', 'gov_programs_section_enabled',
    ];

    public const INTAKE_SECTIONS = ['bite_intake_section_enabled'];

    public const PROFILE_FIELDS = [
        'blood_type', 'mother_maiden_name', 'civil_status', 'spouse_name',
        'address_municipality', 'address_barangay', 'address_purok', 'province',
        'educational_attainment', 'employment_status', 'family_member',
        'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
        'fourps_member', 'dswd_nhts',
    ];

    public const INTAKE_FIELDS = [
        'bite_date', 'bite_place', 'site_washed', 'exposure_type', 'animal_type',
        'animal_status', 'animal_captured', 'wound_location', 'patient_description',
    ];

    public const MOBILE_INTAKE_ALIASES = [
        'bite_date' => 'date_of_exposure',
        'bite_place' => 'place_of_exposure',
        'exposure_type' => 'reported_mode_of_exposure',
        'animal_type' => 'animal_species',
        'animal_status' => 'animal_ownership',
        'wound_location' => 'body_part_detail',
        'patient_description' => 'incident_narrative',
    ];

    public static function sectionFor(string $field): ?string
    {
        return match (true) {
            in_array($field, self::PROFILE_FIELDS, true) => match (true) {
                in_array($field, array_slice(self::PROFILE_FIELDS, 0, 4), true) => 'patient_registration_enabled',
                in_array($field, array_slice(self::PROFILE_FIELDS, 4, 4), true) => 'address_section_enabled',
                in_array($field, array_slice(self::PROFILE_FIELDS, 8, 3), true) => 'socioeconomic_section_enabled',
                default => 'gov_programs_section_enabled',
            },
            in_array($field, self::INTAKE_FIELDS, true) => 'bite_intake_section_enabled',
            in_array($field, ['blood_pressure', 'temperature', 'weight', 'height',
                'bite_site', 'exposure_category', 'animal_observation_status', 'treatment_given'], true)
                => 'triage_section_enabled',
            in_array($field, ['protocol_type', 'route', 'injection_site', 'dosage_ml',
                'vaccine_brand', 'vaccine_generic', 'batch_no', 'tt_status',
                'medication_given', 'adverse_reaction', 'cost_recovery'], true)
                => 'treatment_section_enabled',
            default => null,
        };
    }
}
