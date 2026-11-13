<?php

namespace App\Services\Clinic;

use App\Models\ClinicModuleConfig;
use Illuminate\Validation\Rule;

class EffectiveFieldRuleComposer
{
    public function __construct(
        protected ClinicModuleConfigService $configService
    ) {}

    /**
     * Resolve effective configuration for a clinic context.
     * Fails open to canonical defaults if clinicId is not available.
     */
    public function getConfig(?int $clinicId): ?ClinicModuleConfig
    {
        if (empty($clinicId) || $clinicId <= 0) {
            return null;
        }

        try {
            return $this->configService->getOrCreateConfigForClinic($clinicId);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Check whether a form section is enabled.
     */
    public function isSectionEnabled(?int $clinicId, string $sectionKey): bool
    {
        $config = $this->getConfig($clinicId);
        if ($config) {
            return (bool) ($config->{$sectionKey} ?? true);
        }

        $defaultSections = $this->configService->getDefaultSectionFlags();
        return $defaultSections[$sectionKey] ?? true;
    }

    /**
     * Get effective rule for a field ('required', 'optional', 'hidden').
     */
    public function getFieldRule(?int $clinicId, string $fieldKey): string
    {
        // Locked clinical invariant (LF1)
        if ($fieldKey === 'exposure_category') {
            return 'required';
        }

        $config = $this->getConfig($clinicId);
        if ($config && is_array($config->field_rules) && isset($config->field_rules[$fieldKey])) {
            return $config->field_rules[$fieldKey];
        }

        $defaultRules = $this->configService->getDefaultFieldRules();
        return $defaultRules[$fieldKey] ?? 'optional';
    }

    /**
     * Determine if a field is visible under effective configuration.
     */
    public function isFieldVisible(?int $clinicId, string $fieldKey): bool
    {
        return $this->getFieldRule($clinicId, $fieldKey) !== 'hidden';
    }

    /**
     * Determine whether a field is strictly required, taking into account:
     * 1. Essential locked clinical invariants
     * 2. Enclosing section enabled state
     * 3. Conditional field prerequisites (e.g. spouse_name when married)
     * 4. Configured field rule
     */
    public function isFieldRequired(?int $clinicId, string $fieldKey, array $context = []): bool
    {
        // Essential locked clinical invariant
        if ($fieldKey === 'exposure_category') {
            return true;
        }

        // Section gating
        $section = $this->getEnclosingSection($fieldKey);
        if ($section !== null && ! $this->isSectionEnabled($clinicId, $section)) {
            return false;
        }

        // Conditional applicability
        if ($fieldKey === 'spouse_name') {
            $civilStatus = strtolower(trim((string) ($context['civil_status'] ?? '')));
            if ($civilStatus !== 'married') {
                return false;
            }
        }

        if (in_array($fieldKey, ['animal_type_others', 'animal_type_other', 'new_animal_type_other'], true)) {
            $animalType = strtolower(trim((string) ($context['animal_type'] ?? $context['new_animal_type'] ?? '')));
            if ($animalType !== 'other') {
                return false;
            }
        }

        if (in_array($fieldKey, ['philhealth_status', 'philhealth_no', 'philhealth_category'], true)) {
            $philhealthMember = strtolower(trim((string) ($context['philhealth_member'] ?? '')));
            if ($philhealthMember === 'no') {
                return false;
            }
        }

        return $this->getFieldRule($clinicId, $fieldKey) === 'required';
    }

    /**
     * Map a canonical field to its enclosing section flag.
     */
    public function getEnclosingSection(string $fieldKey): ?string
    {
        return match ($fieldKey) {
            'blood_type',
            'mother_maiden_name',
            'civil_status',
            'spouse_name' => 'patient_registration_enabled',

            'address_municipality',
            'address_barangay',
            'address_purok',
            'province' => 'address_section_enabled',

            'educational_attainment',
            'employment_status',
            'family_member' => 'socioeconomic_section_enabled',

            'philhealth_member',
            'philhealth_status',
            'philhealth_no',
            'philhealth_category',
            'fourps_member',
            'dswd_nhts' => 'gov_programs_section_enabled',

            'bite_date',
            'bite_place',
            'site_washed',
            'exposure_type',
            'animal_type',
            'animal_status',
            'animal_captured',
            'wound_location',
            'patient_description' => 'bite_intake_section_enabled',

            'blood_pressure',
            'temperature',
            'weight',
            'height',
            'bite_site' => 'triage_section_enabled',

            'exposure_category',
            'animal_observation_status',
            'treatment_given',
            'protocol_type',
            'route',
            'injection_site',
            'dosage_ml',
            'vaccine_brand',
            'vaccine_generic',
            'batch_no',
            'tt_status',
            'medication_given',
            'adverse_reaction',
            'cost_recovery' => 'treatment_section_enabled',

            default => null,
        };
    }

    /**
     * Compose dynamic validation rules for Form 1 (Patient Registration & Update).
     *
     * @param int|null $clinicId
     * @param bool $isUpdate
     * @param array $input
     * @param int|null $ignorePatientDetailId
     * @return array<string, mixed>
     */
    public function composePatientRules(?int $clinicId, bool $isUpdate = false, array $input = [], ?int $ignorePatientDetailId = null): array
    {
        $prefix = $isUpdate ? 'sometimes|' : '';

        // Baseline Identity Invariants (NEVER weakened by configuration)
        $rules = [
            'first_name' => $isUpdate ? 'sometimes|required|string|max:255' : 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => $isUpdate ? 'sometimes|required|string|max:255' : 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => $isUpdate ? 'sometimes|required|in:male,female' : 'required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'address' => 'nullable|string',
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'hospital_no' => 'nullable|string|max:100',
        ];

        // 1. Extended Patient Registration fields
        $rules['blood_type'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'blood_type', $input),
            $isUpdate,
            'string|max:10|in:A+,A-,B+,B-,AB+,AB-,O+,O-'
        );

        $rules['mother_maiden_name'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'mother_maiden_name', $input),
            $isUpdate,
            'string|max:255'
        );

        $rules['civil_status'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'civil_status', $input),
            $isUpdate,
            'in:single,married,widowed,separated,annulled,cohabitation'
        );

        $rules['spouse_name'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'spouse_name', $input),
            $isUpdate,
            'string|max:255'
        );

        // 2. Address fields
        $rules['address_municipality'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'address_municipality', $input),
            true,
            'string|max:255'
        );

        $rules['address_barangay'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'address_barangay', $input),
            true,
            'string|max:255'
        );

        $rules['address_purok'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'address_purok', $input),
            $isUpdate,
            'string|max:255'
        );

        $rules['province'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'province', $input),
            true,
            'string|max:100'
        );

        // 3. Socioeconomic fields
        $rules['educational_attainment'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'educational_attainment', $input),
            $isUpdate,
            'string|max:50'
        );

        $rules['employment_status'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'employment_status', $input),
            $isUpdate,
            'string|max:50'
        );

        $rules['family_member'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'family_member', $input),
            $isUpdate,
            'string|max:50'
        );

        // 4. Government programs fields
        $rules['philhealth_member'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'philhealth_member', $input),
            $isUpdate,
            'in:yes,no'
        );

        $rules['philhealth_status'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'philhealth_status', $input),
            $isUpdate,
            'in:member,dependent'
        );

        $philhealthNoRule = [
            $this->isFieldRequired($clinicId, 'philhealth_no', $input) ? ($isUpdate ? 'sometimes' : 'required') : 'nullable',
            'string',
            'max:50',
            $ignorePatientDetailId
                ? Rule::unique('patient_details', 'philhealth_no')->ignore($ignorePatientDetailId)
                : Rule::unique('patient_details', 'philhealth_no'),
        ];
        if ($this->isFieldRequired($clinicId, 'philhealth_no', $input)) {
            array_unshift($philhealthNoRule, 'required');
            $philhealthNoRule = array_unique($philhealthNoRule);
        }
        $rules['philhealth_no'] = $philhealthNoRule;

        $rules['philhealth_category'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'philhealth_category', $input),
            $isUpdate,
            'string|max:50'
        );

        $rules['fourps_member'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'fourps_member', $input),
            $isUpdate,
            'in:yes,no'
        );

        $rules['dswd_nhts'] = $this->buildRule(
            $this->isFieldRequired($clinicId, 'dswd_nhts', $input),
            $isUpdate,
            'in:yes,no'
        );

        $rules['fourps_category'] = 'nullable|string|max:50';
        $rules['fourps_relationship'] = 'nullable|string|max:50';
        $rules['registered_fourps_beneficiary'] = 'nullable|string|max:50';
        $rules['has_membership'] = 'nullable|string|max:10';
        $rules['other_membership'] = 'nullable|string|max:500';
        $rules['other_membership_name'] = 'nullable|string|max:500';
        $rules['other_membership_no'] = 'nullable|string|max:500';

        // Additional registration / vitals fields
        $rules['mode_of_transaction'] = 'nullable|in:walk-in,visited,referral';
        $rules['reg_mode_of_transaction'] = 'nullable|in:walk-in,visited,referral';
        $rules['reg_date_of_consultation'] = 'nullable|date';
        $rules['reg_consultation_time'] = 'nullable|string|max:10';
        $rules['reg_blood_pressure'] = 'nullable|string|max:20';
        $rules['reg_temperature'] = 'nullable|string|max:10';
        $rules['reg_height'] = 'nullable|string|max:10';
        $rules['reg_weight'] = 'nullable|string|max:10';
        $rules['reg_attending_provider'] = 'nullable|string|max:255';
        $rules['reg_referred_by'] = 'nullable|string|max:255';
        $rules['force_create'] = 'nullable|boolean';

        return $rules;
    }

    /**
     * Compose dynamic rules for Form 2 (StoreTreatmentRecordRequest).
     *
     * @param int|null $clinicId
     * @param array $input
     * @return array<string, mixed>
     */
    public function composeTreatmentRecordRules(?int $clinicId, array $input = []): array
    {
        $rules = [];

        // Locked Clinical Invariant: Exposure category is ALWAYS required (LF1)
        // Kept as sometimes|required so older client records do not lose category
        $rules['exposure_category'] = 'sometimes|required|in:I,II,III';

        // Treatment Given (RF2) alias mapping: checks both treatment_given and medication_treatment
        $treatmentGivenRequired = $this->isFieldRequired($clinicId, 'treatment_given', $input);
        if ($treatmentGivenRequired) {
            $rules['treatment_given'] = 'required|string|max:500';
            $rules['medication_treatment'] = 'required|string|max:500';
        } else {
            $rules['treatment_given'] = 'nullable|string|max:500';
            $rules['medication_treatment'] = 'nullable|string|max:500';
        }

        // Treatment plan (only validated format if provided; re-exposure decisions handled in clinical workflow)
        $rules['treatment_plan'] = 'nullable|in:full_pep,single_booster,two_dose_booster,continue_existing_schedule,no_vaccine';

        // Bite site / Place of exposure
        $biteSiteRequired = $this->isFieldRequired($clinicId, 'bite_site', $input);
        if ($biteSiteRequired) {
            $rules['place_of_exposure'] = 'sometimes|required|string|max:255';
        } else {
            $rules['place_of_exposure'] = 'nullable|string|max:255';
        }

        // Bite Incident Intake rules if bite update is present
        if (!empty($input['new_bite_date']) || !empty($input['new_animal_type']) || !empty($input['new_exposure_type'])) {
            if ($this->isFieldRequired($clinicId, 'bite_date', $input)) {
                $rules['new_bite_date'] = 'required|date';
            }
            if ($this->isFieldRequired($clinicId, 'exposure_type', $input)) {
                $rules['new_exposure_type'] = 'required|in:bite,scratch,lick,other';
            }
            if ($this->isFieldRequired($clinicId, 'animal_type', $input)) {
                $rules['new_animal_type'] = ['required', Rule::in(array_keys(\App\Support\BiteIntakeContract::ANIMAL_SPECIES))];
            }
            if ($this->isFieldRequired($clinicId, 'animal_status', $input)) {
                $rules['new_animal_status'] = 'required|in:owned,stray,unknown';
            }
            if ($this->isFieldRequired($clinicId, 'site_washed', $input)) {
                $rules['new_site_washed'] = 'required|boolean';
            }
        }

        return $rules;
    }

    /**
     * Compose dynamic rules for Form 3 (StoreVaccinationRecordRequest).
     *
     * @param int|null $clinicId
     * @param array $input
     * @return array<string, mixed>
     */
    public function composeVaccinationRecordRules(?int $clinicId, array $input = []): array
    {
        $rules = [];

        // Route (RF3) in dose entry: supports both route and doses.*.route
        $routeRequired = $this->isFieldRequired($clinicId, 'route', $input);
        $rules['route'] = $routeRequired ? 'sometimes|required|in:ID,IM,id,im' : 'nullable|in:ID,IM,id,im';
        $rules['doses.*.route'] = $routeRequired ? 'required|in:ID,IM,id,im' : 'nullable|in:ID,IM,id,im';

        // Protocol Type (Station 3 / Form 3)
        if ($this->isFieldRequired($clinicId, 'protocol_type', $input)) {
            $rules['protocol_type'] = 'sometimes|required|string|max:100';
        } else {
            $rules['protocol_type'] = 'nullable|string|max:100';
        }

        // Prophylaxis administrations
        $rules['prophylaxis_administrations.*.route'] = $routeRequired
            ? 'required|in:IM,wound_infiltration,im,wound_infiltration'
            : 'nullable|in:IM,wound_infiltration,im,wound_infiltration';

        if ($this->isFieldRequired($clinicId, 'injection_site', $input)) {
            $rules['prophylaxis_administrations.*.injection_site'] = 'required|string|max:255';
        } else {
            $rules['prophylaxis_administrations.*.injection_site'] = 'nullable|string|max:255';
        }

        if ($this->isFieldRequired($clinicId, 'dosage_ml', $input)) {
            $rules['prophylaxis_administrations.*.dosage_ml'] = 'required|numeric|gt:0|max:999.99';
        } else {
            $rules['prophylaxis_administrations.*.dosage_ml'] = 'nullable|numeric|gt:0|max:999.99';
        }

        return $rules;
    }

    /**
     * Compose dynamic rules for Tagoloan Treatment Card (StoreTagoloanTreatmentCardRequest).
     *
     * @param int|null $clinicId
     * @param array $input
     * @return array<string, mixed>
     */
    public function composeTreatmentCardRules(?int $clinicId, array $input = []): array
    {
        $rules = [];

        if ($this->isFieldRequired($clinicId, 'animal_type', $input)) {
            $rules['animal_type'] = 'sometimes|required|string|max:100';
        } else {
            $rules['animal_type'] = 'nullable|string|max:100';
        }

        if ($this->isFieldRequired($clinicId, 'animal_status', $input)) {
            $rules['animal_status'] = 'sometimes|required|in:owned,stray,unknown';
        } else {
            $rules['animal_status'] = 'nullable|in:owned,stray,unknown';
        }

        return $rules;
    }

    /**
     * Helper to build a validation rule string based on requiredness.
     */
    protected function buildRule(bool $isRequired, bool $isUpdate, string $formatRules): string
    {
        if ($isRequired) {
            return ($isUpdate ? 'sometimes|' : '') . 'required|' . $formatRules;
        }

        return 'nullable|' . $formatRules;
    }
}
