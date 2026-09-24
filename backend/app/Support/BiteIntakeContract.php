<?php

namespace App\Support;

use Illuminate\Support\Arr;

final class BiteIntakeContract
{
    public const VERSION = '1.0';

    public const EXPOSURE_MODES = [
        'nibbling_uncovered_skin' => 'Saliva or licking on intact skin',
        'nibbling_broken_skin' => 'Saliva or licking on broken skin',
        'scratch_abrasion' => 'Scratch or abrasion',
        'transdermal_bite' => 'Transdermal bite',
        'handling_ingestion_raw_meat' => 'Handling or ingestion of raw animal tissue',
        'unsure' => 'Unsure',
    ];

    public const BODY_PART_GROUPS = [
        'head_neck' => 'Head and neck',
        'upper_extremities' => 'Upper extremities (arm or hand)',
        'lower_extremities' => 'Lower extremities (leg or foot)',
        'trunk_torso' => 'Trunk or torso',
        'multiple_sites' => 'Multiple sites',
        'na_ingestion' => 'Not applicable for ingestion or handling',
    ];

    public const ANIMAL_SPECIES = [
        'dog' => 'Dog',
        'cat' => 'Cat',
        'bat' => 'Bat',
        'monkey' => 'Monkey or non-human primate',
        'other' => 'Other',
        'unknown' => 'Unknown',
    ];

    public const ANIMAL_OWNERSHIP = [
        'owned' => 'Owned',
        'stray' => 'Stray',
        'unknown' => 'Unknown',
    ];

    public const ANIMAL_CONDITIONS = [
        'apparently_healthy' => 'Apparently healthy',
        'sick' => 'Sick or behaving unusually',
        'dead' => 'Dead',
        'unknown' => 'Unknown',
    ];

    public const LATERALITY = [
        'left' => 'Left',
        'right' => 'Right',
        'bilateral' => 'Both sides',
        'multiple' => 'Multiple sites',
        'not_applicable' => 'Not applicable',
        'unknown' => 'Unsure',
    ];

    public const WASH_METHODS = [
        'soap_and_water' => 'Soap and running water',
        'water_only' => 'Water only',
        'antiseptic' => 'Antiseptic',
        'other' => 'Other',
        'unknown' => 'Unsure',
    ];

    public const PAST_BITE_HISTORY = [
        'yes' => 'Yes',
        'no' => 'No',
        'unsure' => 'Unsure',
    ];

    public const PRIOR_PEP_STATUSES = [
        'completed' => 'Completed',
        'incomplete' => 'Incomplete',
        'none' => 'None',
        'unsure' => 'Unsure',
    ];

    private const STORAGE_FIELDS = [
        'schema_version',
        'bite_date',
        'incident_time',
        'bite_place',
        'site_washed',
        'wash_method',
        'wash_duration_minutes',
        'exposure_type',
        'animal_type',
        'animal_type_others',
        'animal_status',
        'animal_captured',
        'animal_available',
        'animal_condition_reported',
        'wound_location',
        'body_part_exposed',
        'laterality',
        'patient_description',
        'care_received',
        'referral_facility',
        'past_bite_history',
        'past_bite_dates',
        'prior_pep_status',
        'prior_pep_date',
        'prior_pep_facility',
        // Retained for payloads from supported older mobile clients.
        'prior_rabies_vaccination',
        'prior_vaccination_date',
        'prior_vaccination_facility',
    ];

    public static function schema(): array
    {
        return [
            'version' => self::VERSION,
            'source' => 'web_forms_1_2_3',
            'notice' => 'Patient-reported - clinic verification required',
            'options' => [
                'reported_mode_of_exposure' => self::EXPOSURE_MODES,
                'body_part_group' => self::BODY_PART_GROUPS,
                'animal_species' => self::ANIMAL_SPECIES,
                'animal_ownership' => self::ANIMAL_OWNERSHIP,
                'animal_condition_reported' => self::ANIMAL_CONDITIONS,
                'laterality' => self::LATERALITY,
                'wash_method' => self::WASH_METHODS,
                'past_bite_history' => self::PAST_BITE_HISTORY,
                'prior_pep_status' => self::PRIOR_PEP_STATUSES,
            ],
            'clinical_fields_prohibited' => [
                'who_category',
                'exposure_category',
                'severity',
                'diagnosis',
                'icd10_code',
                'clinical_wound_findings',
                'treatment_plan',
                'vaccine_type',
                'vaccine_brand',
                'vaccine_dose',
                'vaccine_route',
                'rig_type',
                'rig_dose',
                'tetanus_treatment',
                'vital_signs',
                'laboratory_findings',
                'provider_name',
                'signature',
            ],
        ];
    }

    /**
     * Convert the versioned patient-facing contract and supported legacy
     * payloads to the existing persistence column names.
     */
    public static function normalize(array $input): array
    {
        $normalized = $input;
        $alias = static function (array $keys) use ($input) {
            foreach ($keys as $key) {
                if (array_key_exists($key, $input)) {
                    return $input[$key];
                }
            }

            return null;
        };

        $normalized['schema_version'] = $alias(['schema_version']) ?? 'legacy';
        $normalized['bite_date'] = $alias(['date_of_exposure', 'bite_date']);
        $normalized['incident_time'] = $alias(['time_of_exposure', 'incident_time']);
        $normalized['bite_place'] = $alias(['place_of_exposure', 'bite_place']);
        $normalized['patient_description'] = $alias(['incident_narrative', 'patient_description']);
        $bodyDetail = $alias(['body_part_detail', 'wound_location']);
        $bodyGroup = $alias(['body_part_group', 'body_part_exposed']);
        if ($bodyGroup === 'other_parts') {
            $bodyGroup = match ($bodyDetail) {
                'face', 'head', 'neck' => 'head_neck',
                'upper_arm', 'forearm', 'hand' => 'upper_extremities',
                'trunk' => 'trunk_torso',
                'thigh', 'leg', 'foot' => 'lower_extremities',
                'multiple' => 'multiple_sites',
                default => 'other_parts',
            };
        }
        $normalized['body_part_exposed'] = $bodyGroup;
        $normalized['wound_location'] = $bodyDetail;
        $normalized['animal_status'] = $alias(['animal_ownership', 'animal_status']);
        $normalized['animal_available'] = $alias(['animal_available_for_observation', 'animal_available']);
        $normalized['referral_facility'] = $alias(['referral_source', 'referral_facility']);

        $mode = $alias(['reported_mode_of_exposure', 'exposure_type', 'exposure_mode', 'mode_of_exposure']);
        $normalized['exposure_type'] = match ($mode) {
            'bite' => 'transdermal_bite',
            'scratch' => 'scratch_abrasion',
            'lick' => 'nibbling_uncovered_skin',
            'other' => 'nibbling_broken_skin',
            default => $mode,
        };

        $species = strtolower(trim((string) ($alias(['animal_species', 'animal_type']) ?? '')));
        $species = match ($species) {
            'others' => 'other',
            'non-human primate', 'non human primate', 'primate' => 'monkey',
            default => $species,
        };
        if ($species !== '' && !array_key_exists($species, self::ANIMAL_SPECIES)) {
            $normalized['animal_type_others'] = $alias(['animal_species_other', 'animal_type_others']) ?: $species;
            $species = 'other';
        } else {
            $normalized['animal_type_others'] = $alias(['animal_species_other', 'animal_type_others']);
        }
        $normalized['animal_type'] = $species;

        $normalized['prior_pep_status'] = $alias(['prior_pep_status']);
        $normalized['prior_pep_date'] = $alias(['prior_pep_date']);
        $normalized['prior_pep_facility'] = $alias(['prior_pep_facility']);

        return $normalized;
    }

    public static function storagePayload(array $input): array
    {
        return Arr::only(self::normalize($input), self::STORAGE_FIELDS);
    }

    public static function validationRules(string $prefix = 'intake.'): array
    {
        $in = static fn (array $values): string => 'in:'.implode(',', array_keys($values));

        return [
            $prefix.'schema_version' => ['nullable', 'in:'.self::VERSION.',legacy'],
            $prefix.'bite_date' => ['required', 'date', 'before_or_equal:today'],
            $prefix.'incident_time' => ['nullable', 'date_format:H:i'],
            $prefix.'bite_place' => ['nullable', 'string', 'max:255'],
            $prefix.'site_washed' => ['required', 'boolean'],
            $prefix.'wash_method' => ['nullable', $in(self::WASH_METHODS)],
            $prefix.'wash_duration_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            $prefix.'exposure_type' => ['required', $in(self::EXPOSURE_MODES)],
            $prefix.'animal_type' => ['required', $in(self::ANIMAL_SPECIES)],
            $prefix.'animal_type_others' => ['nullable', 'required_if:'.$prefix.'animal_type,other', 'string', 'max:255'],
            $prefix.'animal_status' => ['required', $in(self::ANIMAL_OWNERSHIP)],
            $prefix.'animal_captured' => ['nullable', 'boolean'],
            $prefix.'animal_available' => ['nullable', 'boolean'],
            $prefix.'animal_condition_reported' => ['nullable', $in(self::ANIMAL_CONDITIONS)],
            $prefix.'wound_location' => ['nullable', 'string', 'max:255'],
            // other_parts is accepted only for installed legacy clients. It is
            // omitted from the published v1 schema and flagged by the audit
            // when its detailed site cannot be mapped deterministically.
            $prefix.'body_part_exposed' => [
                'nullable',
                'in:'.implode(',', [...array_keys(self::BODY_PART_GROUPS), 'other_parts']),
            ],
            $prefix.'laterality' => ['nullable', $in(self::LATERALITY)],
            $prefix.'patient_description' => ['nullable', 'string', 'max:2000'],
            $prefix.'care_received' => ['nullable', 'string', 'max:2000'],
            $prefix.'referral_facility' => ['nullable', 'string', 'max:255'],
            $prefix.'past_bite_history' => ['nullable', $in(self::PAST_BITE_HISTORY)],
            $prefix.'past_bite_dates' => ['nullable', 'string', 'max:255'],
            $prefix.'prior_pep_status' => ['nullable', $in(self::PRIOR_PEP_STATUSES)],
            $prefix.'prior_pep_date' => ['nullable', 'date', 'before_or_equal:today'],
            $prefix.'prior_pep_facility' => ['nullable', 'string', 'max:255'],
            $prefix.'prior_rabies_vaccination' => ['nullable', 'in:yes,no,unsure'],
            $prefix.'prior_vaccination_date' => ['nullable', 'date', 'before_or_equal:today'],
            $prefix.'prior_vaccination_facility' => ['nullable', 'string', 'max:255'],
            $prefix.'who_category' => ['prohibited'],
            $prefix.'exposure_category' => ['prohibited'],
            $prefix.'severity' => ['prohibited'],
            $prefix.'clinical_severity' => ['prohibited'],
            $prefix.'diagnosis' => ['prohibited'],
            $prefix.'icd10_code' => ['prohibited'],
            $prefix.'chief_complaints' => ['prohibited'],
            $prefix.'clinical_wound_findings' => ['prohibited'],
            $prefix.'treatment_plan' => ['prohibited'],
            $prefix.'vaccine' => ['prohibited'],
            $prefix.'vaccine_type' => ['prohibited'],
            $prefix.'vaccine_brand' => ['prohibited'],
            $prefix.'vaccine_dose' => ['prohibited'],
            $prefix.'vaccine_route' => ['prohibited'],
            $prefix.'rig' => ['prohibited'],
            $prefix.'rig_type' => ['prohibited'],
            $prefix.'rig_dose' => ['prohibited'],
            $prefix.'tetanus_treatment' => ['prohibited'],
            $prefix.'vital_signs' => ['prohibited'],
            $prefix.'laboratory_findings' => ['prohibited'],
            $prefix.'provider_name' => ['prohibited'],
            $prefix.'signature' => ['prohibited'],
        ];
    }
}
