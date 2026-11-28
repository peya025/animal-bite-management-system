<?php

namespace App\Services\Clinic;

use App\Models\ClinicModuleConfig;

class FormConfigurationProjector
{
    public function __construct(private ClinicModuleConfigService $configs) {}

    public function forClinic(int $clinicId): array
    {
        $config = $this->configs->getOrCreateConfigForClinic($clinicId);

        return [
            'schema_version' => ClinicModuleConfigService::SCHEMA_VERSION,
            'revision' => (int) $config->revision,
            'clinic_id' => $clinicId,
            'profile' => $this->surface($config, FormFieldCatalog::PROFILE_SECTIONS, FormFieldCatalog::PROFILE_FIELDS),
            'intake' => $this->surface($config, FormFieldCatalog::INTAKE_SECTIONS, FormFieldCatalog::INTAKE_FIELDS)
                + ['payload_aliases' => FormFieldCatalog::MOBILE_INTAKE_ALIASES]
                + ['options' => $this->configs->getEnabledClinicalOptionMaps($config, true)],
            'clinical_options' => $this->configs->normalizeClinicalOptions($config->clinical_options),
        ];
    }

    private function surface(ClinicModuleConfig $config, array $sections, array $fields): array
    {
        $defaults = $this->configs->getDefaultFieldRules();
        $rules = $this->configs->normalizeFieldRules($config->field_rules);
        $result = [];
        foreach ($fields as $field) {
            $result[$field] = $rules[$field] ?? $defaults[$field];
        }
        $flags = [];
        foreach ($sections as $section) {
            $flags[$section] = (bool) ($config->{$section} ?? true);
        }

        return ['sections' => $flags, 'field_rules' => $result];
    }
}
