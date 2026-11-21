<?php

namespace App\Services\Clinic;

use App\Models\ClinicModuleConfig;
use App\Support\BiteIntakeContract;

/** Resolves one clinic policy for mobile validation and write filtering. */
class MobileFormPolicy
{
    private ClinicModuleConfig $config;
    private array $rules;

    public function __construct(ClinicModuleConfigService $service, int $clinicId)
    {
        $this->config = $service->getOrCreateConfigForClinic($clinicId);
        $this->rules = $service->normalizeFieldRules($this->config->field_rules);
    }

    public function visible(string $field): bool
    {
        $section = FormFieldCatalog::sectionFor($field);
        return ($section === null || (bool) ($this->config->{$section} ?? true))
            && ($this->rules[$field] ?? 'optional') !== 'hidden';
    }

    public function required(string $field, array $input = []): bool
    {
        if (! $this->visible($field) || ($this->rules[$field] ?? 'optional') !== 'required') {
            return false;
        }
        if ($field === 'spouse_name' && ($input['civil_status'] ?? null) !== 'married') {
            return false;
        }
        if (in_array($field, ['philhealth_status', 'philhealth_no', 'philhealth_category'], true)
            && ($input['philhealth_member'] ?? null) !== 'yes') {
            return false;
        }
        return true;
    }

    public function filterProfile(array $input): array
    {
        foreach (FormFieldCatalog::PROFILE_FIELDS as $field) {
            if (! $this->visible($field)) {
                unset($input[$field]);
            }
        }
        if (! $this->config->address_section_enabled
            || ! $this->visible('address_municipality')
            || ! $this->visible('address_barangay')
            || ! $this->visible('address_purok')
            || ! $this->visible('province')) {
            // The mobile client derives this string from all address components.
            unset($input['address']);
        }
        if (! $this->config->gov_programs_section_enabled) {
            foreach (['memberships', 'has_membership', 'fourps_category', 'fourps_relationship',
                'registered_fourps_beneficiary', 'other_membership', 'other_membership_name',
                'other_membership_no'] as $key) {
                unset($input[$key]);
            }
        }
        return $input;
    }

    public function profileRules(array $base, array $input, bool $update): array
    {
        foreach (FormFieldCatalog::PROFILE_FIELDS as $field) {
            if (! isset($base[$field])) {
                continue;
            }
            if (! $this->visible($field)) {
                $base[$field] = ['prohibited'];
            } elseif ($this->required($field, $input)) {
                $base[$field] = array_values(array_filter($base[$field], fn ($rule) => $rule !== 'nullable'));
                array_unshift($base[$field], $update ? 'sometimes' : 'required');
                if ($update) {
                    array_splice($base[$field], 1, 0, ['required']);
                }
            }
        }
        return $base;
    }

    public function filterIntake(array $input): array
    {
        if (! $this->config->bite_intake_section_enabled) {
            return [];
        }
        foreach (FormFieldCatalog::INTAKE_FIELDS as $field) {
            if ($this->visible($field)) {
                continue;
            }
            unset($input[$field]);
            if (isset(FormFieldCatalog::MOBILE_INTAKE_ALIASES[$field])) {
                unset($input[FormFieldCatalog::MOBILE_INTAKE_ALIASES[$field]]);
            }
            if ($field === 'site_washed') {
                unset($input['wound_washed'], $input['wash_method'], $input['wash_duration_minutes']);
            }
            if ($field === 'animal_type') {
                unset($input['animal_species_other'], $input['animal_type_others']);
            }
        }
        return $input;
    }

    public function intakeRules(bool $update = false): array
    {
        if (! $this->config->bite_intake_section_enabled) {
            return [];
        }
        $rules = BiteIntakeContract::validationRules();
        foreach (FormFieldCatalog::INTAKE_FIELDS as $field) {
            $key = 'intake.'.$field;
            if (! $this->visible($field)) {
                $rules[$key] = ['prohibited'];
            } elseif ($this->required($field)) {
                $rules[$key] = array_values(array_filter($rules[$key], fn ($rule) => $rule !== 'nullable' && $rule !== 'required'));
                if ($field === 'wound_location') {
                    // The mobile intake supplies a body-part group and treats exact detail as optional.
                    array_unshift($rules[$key], 'nullable');
                    if (! $update) {
                        array_unshift($rules[$key], 'required_without:intake.body_part_exposed');
                    }
                } else {
                    array_unshift($rules[$key], ...($update ? ['sometimes', 'required'] : ['required']));
                }
            } else {
                $rules[$key] = array_values(array_filter($rules[$key], fn ($rule) => $rule !== 'required'));
                array_unshift($rules[$key], 'nullable');
            }
        }
        return $rules;
    }

    public function intakeEnabled(): bool
    {
        return (bool) $this->config->bite_intake_section_enabled;
    }

    public function editableMembershipTypes(): array
    {
        if (! $this->config->gov_programs_section_enabled) {
            return [];
        }
        $types = ['senior_citizen', 'pwd', 'indigenous_member', 'other'];
        foreach (['philhealth' => 'philhealth_member', 'fourps' => 'fourps_member',
            'dswd_nhts' => 'dswd_nhts'] as $type => $field) {
            if ($this->visible($field)) {
                $types[] = $type;
            }
        }
        return $types;
    }
}
