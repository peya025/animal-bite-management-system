<?php

namespace App\Services\Clinic;

use App\Exceptions\ClinicModuleConfigConflictException;
use App\Models\AuditLog;
use App\Models\ClinicModuleConfig;
use Closure;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ClinicModuleConfigService
{
    /**
     * Controlled failure hook for testing transaction rollback (P1-M10).
     */
    public static ?Closure $auditFailureHook = null;

    /**
     * Schema version identifier.
     */
    public const SCHEMA_VERSION = 1;

    /**
     * Get default field rules for all 41 configurable canonical fields.
     *
     * @return array<string, string>
     */
    public function getDefaultFieldRules(): array
    {
        return [
            // 1. PATIENT REGISTRATION FIELDS
            'blood_type'                    => 'optional',
            'mother_maiden_name'            => 'optional',
            'civil_status'                  => 'optional',
            'spouse_name'                   => 'optional',

            // 2. ADDRESS FIELDS
            'address_municipality'          => 'required',
            'address_barangay'              => 'required',
            'address_purok'                 => 'optional',
            'province'                      => 'required',

            // 3. SOCIOECONOMIC FIELDS
            'educational_attainment'        => 'optional',
            'employment_status'             => 'optional',
            'family_member'                 => 'optional',

            // 4. GOVERNMENT PROGRAMS
            'philhealth_member'             => 'optional',
            'philhealth_status'             => 'optional',
            'philhealth_no'                 => 'optional',
            'philhealth_category'           => 'optional',
            'fourps_member'                 => 'optional',
            'dswd_nhts'                     => 'optional',

            // 5. BITE INCIDENT INTAKE FIELDS
            'bite_date'                     => 'required',
            'bite_place'                    => 'required',
            'site_washed'                   => 'required',
            'exposure_type'                 => 'required',
            'animal_type'                   => 'required',
            'animal_status'                 => 'required',
            'animal_captured'               => 'optional',
            'wound_location'                => 'required',
            'patient_description'           => 'optional',

            // 6. TRIAGE/ASSESSMENT FIELDS
            'exposure_category'             => 'required', // Locked LF1
            'bite_site'                     => 'required',
            'animal_observation_status'     => 'optional',
            'treatment_given'               => 'optional',

            // 7. TREATMENT FIELDS
            'protocol_type'                 => 'required',
            'route'                         => 'optional',
            'injection_site'                => 'optional',
            'dosage_ml'                     => 'optional',
            'vaccine_brand'                 => 'optional',
            'vaccine_generic'               => 'optional',
            'batch_no'                      => 'optional',
            'tt_status'                     => 'optional',
            'medication_given'              => 'optional',
            'adverse_reaction'              => 'optional',
            'cost_recovery'                 => 'optional',
        ];
    }

    /**
     * Default station availability flags.
     *
     * @return array<string, bool>
     */
    public function getDefaultStationFlags(): array
    {
        return [
            'triage_module_enabled'       => true,
            'registration_module_enabled' => true,
            'treatment_module_enabled'    => true,
        ];
    }

    /**
     * Default section visibility flags.
     *
     * @return array<string, bool>
     */
    public function getDefaultSectionFlags(): array
    {
        return [
            'patient_registration_enabled'  => true,
            'address_section_enabled'       => true,
            'socioeconomic_section_enabled' => true,
            'gov_programs_section_enabled'  => true,
            'bite_intake_section_enabled'   => true,
            'triage_section_enabled'        => true,
            'treatment_section_enabled'     => true,
        ];
    }

    /**
     * Locked field rules that cannot be made optional or hidden.
     *
     * @return array<string, string>
     */
    public function getLockedFieldRules(): array
    {
        return [
            'exposure_category' => 'required',
        ];
    }

    /**
     * Deliberate legacy alias mapping.
     *
     * @return array<string, string>
     */
    public function getLegacyFieldAliases(): array
    {
        return [
            'bite_location'   => 'wound_location',
            'wound_washing'   => 'site_washed',
            'philhealth_info' => 'philhealth_status',
            'fourps_info'     => 'fourps_member',
        ];
    }

    /**
     * Normalize field rules: fill in missing defaults, map legacy aliases,
     * preserve valid explicit choices, and enforce locked rules.
     *
     * @param array<string, mixed>|null $rules
     * @return array<string, string>
     */
    public function normalizeFieldRules(?array $rules): array
    {
        $normalized = $this->getDefaultFieldRules();

        if (empty($rules)) {
            return $normalized;
        }

        $validValues = ['required', 'optional', 'hidden'];

        // Map deliberate legacy aliases first if target key is not explicitly provided
        foreach ($this->getLegacyFieldAliases() as $legacyKey => $targetKey) {
            if (isset($rules[$legacyKey]) && in_array($rules[$legacyKey], $validValues, true)) {
                if (! isset($rules[$targetKey])) {
                    $normalized[$targetKey] = $rules[$legacyKey];
                }
                // Also mirror bite_location to bite_site if bite_site was not explicitly customized
                if ($legacyKey === 'bite_location' && ! isset($rules['bite_site'])) {
                    $normalized['bite_site'] = $rules[$legacyKey];
                }
            }
        }

        // Apply provided canonical field rules
        foreach ($normalized as $key => $defaultValue) {
            if (isset($rules[$key]) && in_array($rules[$key], $validValues, true)) {
                $normalized[$key] = $rules[$key];
            }
        }

        // Enforce locked essential fields
        foreach ($this->getLockedFieldRules() as $lockedKey => $lockedValue) {
            $normalized[$lockedKey] = $lockedValue;
        }

        return $normalized;
    }

    /**
     * Get or initialize configuration for a clinic.
     * Strict clinic scoping: requires a valid positive clinic ID.
     */
    public function getOrCreateConfigForClinic(?int $clinicId): ClinicModuleConfig
    {
        if (empty($clinicId) || $clinicId <= 0) {
            throw new InvalidArgumentException('A valid clinic context is required to resolve module configuration.');
        }

        $defaultData = array_merge(
            $this->getDefaultStationFlags(),
            $this->getDefaultSectionFlags(),
            [
                'field_rules' => $this->getDefaultFieldRules(),
                'revision'    => 1,
            ]
        );

        $config = ClinicModuleConfig::firstOrCreate(
            ['clinic_id' => $clinicId],
            $defaultData
        );

        // Normalize if row exists but has partial/null rules or flags
        $needsSave = false;

        if (is_null($config->registration_module_enabled) || is_null($config->treatment_module_enabled)) {
            $config->registration_module_enabled = $config->registration_module_enabled ?? true;
            $config->treatment_module_enabled = $config->treatment_module_enabled ?? true;
            $needsSave = true;
        }

        foreach ($this->getDefaultSectionFlags() as $sectionKey => $defaultVal) {
            if (is_null($config->{$sectionKey})) {
                $config->{$sectionKey} = $defaultVal;
                $needsSave = true;
            }
        }

        $normalizedRules = $this->normalizeFieldRules($config->field_rules);
        if ($config->field_rules !== $normalizedRules) {
            $config->field_rules = $normalizedRules;
            $needsSave = true;
        }

        if (empty($config->revision) || $config->revision < 1) {
            $config->revision = 1;
            $needsSave = true;
        }

        if ($needsSave) {
            $config->save();
        }

        return $config;
    }

    /**
     * Update clinic module configuration atomically with revision pre-check and audit logging.
     *
     * @param int $clinicId
     * @param array<string, mixed> $data
     * @param int|null $userId
     * @return array{changed: bool, message: string, config: ClinicModuleConfig}
     * @throws ClinicModuleConfigConflictException
     * @throws InvalidArgumentException
     */
    public function updateConfigForClinic(?int $clinicId, array $data, ?int $userId = null): array
    {
        if (empty($clinicId) || $clinicId <= 0) {
            throw new InvalidArgumentException('A valid clinic context is required to update module configuration.');
        }

        return DB::transaction(function () use ($clinicId, $data, $userId) {
            /** @var ClinicModuleConfig|null $config */
            $config = ClinicModuleConfig::where('clinic_id', $clinicId)->lockForUpdate()->first();

            if (! $config) {
                $config = $this->getOrCreateConfigForClinic($clinicId);
                $config = ClinicModuleConfig::where('clinic_id', $clinicId)->lockForUpdate()->first();
            }

            // 1. Optimistic Locking / Revision Precondition check
            if (isset($data['revision'])) {
                $suppliedRevision = (int) $data['revision'];
                $currentRevision = (int) ($config->revision ?: 1);

                if ($suppliedRevision !== $currentRevision) {
                    throw new ClinicModuleConfigConflictException(
                        $currentRevision,
                        $suppliedRevision,
                        $config
                    );
                }
            }

            // 2. Normalize field rules
            $existingRules = $config->field_rules ?: $this->getDefaultFieldRules();
            $submittedRules = $data['field_rules'] ?? $existingRules;
            $normalizedRules = $this->normalizeFieldRules($submittedRules);

            // 3. Calculate diff
            $diff = $this->calculateDiff($config, $data, $normalizedRules);

            // 4. No-op detection: if no values changed, do not increment revision or create audit log
            if (! $diff['has_changes']) {
                return [
                    'changed' => false,
                    'message' => 'No configuration changes were detected.',
                    'config'  => $config,
                ];
            }

            $oldRevision = (int) ($config->revision ?: 1);
            $newRevision = $oldRevision + 1;

            // 5. Update configuration model
            $updates = array_merge($diff['updates'], [
                'field_rules' => $normalizedRules,
                'revision'    => $newRevision,
            ]);

            $config->fill($updates);
            $config->save();

            // 6. Test hook for controlled audit failure injection (P1-M10)
            if (static::$auditFailureHook !== null) {
                (static::$auditFailureHook)();
            }

            // 7. Atomic audit log creation
            AuditLog::create([
                'user_id'     => $userId,
                'clinic_id'   => $clinicId,
                'action'      => 'clinic_module_config.updated',
                'model'       => ClinicModuleConfig::class,
                'model_id'    => $config->id,
                'old_values'  => $diff['before'],
                'new_values'  => $diff['after'],
                'description' => "Clinic module configuration updated (revision {$oldRevision} -> {$newRevision})",
                'ip_address'  => request()->ip() ?? '127.0.0.1',
            ]);

            return [
                'changed' => true,
                'message' => 'Module configuration updated successfully',
                'config'  => $config,
            ];
        });
    }

    /**
     * Calculate exact diff between current configuration and proposed updates.
     */
    protected function calculateDiff(ClinicModuleConfig $config, array $data, array $newFieldRules): array
    {
        $before = [];
        $after = [];
        $updates = [];
        $hasChanges = false;

        // Station flags
        $stationKeys = ['triage_module_enabled', 'registration_module_enabled', 'treatment_module_enabled'];
        foreach ($stationKeys as $key) {
            if (array_key_exists($key, $data)) {
                $oldVal = (bool) $config->{$key};
                $newVal = (bool) $data[$key];
                if ($oldVal !== $newVal) {
                    $before[$key] = $oldVal;
                    $after[$key] = $newVal;
                    $updates[$key] = $newVal;
                    $hasChanges = true;
                }
            }
        }

        // Section flags
        $sectionKeys = array_keys($this->getDefaultSectionFlags());
        foreach ($sectionKeys as $key) {
            if (array_key_exists($key, $data)) {
                $oldVal = (bool) $config->{$key};
                $newVal = (bool) $data[$key];
                if ($oldVal !== $newVal) {
                    $before[$key] = $oldVal;
                    $after[$key] = $newVal;
                    $updates[$key] = $newVal;
                    $hasChanges = true;
                }
            }
        }

        // Field rules diff
        $currentRules = $config->field_rules ?: $this->getDefaultFieldRules();
        $fieldRuleDiffBefore = [];
        $fieldRuleDiffAfter = [];

        foreach ($newFieldRules as $fieldKey => $ruleVal) {
            $currentVal = $currentRules[$fieldKey] ?? null;
            if ($currentVal !== $ruleVal) {
                $fieldRuleDiffBefore[$fieldKey] = $currentVal;
                $fieldRuleDiffAfter[$fieldKey] = $ruleVal;
                $hasChanges = true;
            }
        }

        if (! empty($fieldRuleDiffBefore)) {
            $before['field_rules'] = $fieldRuleDiffBefore;
            $after['field_rules'] = $fieldRuleDiffAfter;
        }

        return [
            'has_changes' => $hasChanges,
            'before'      => $before,
            'after'       => $after,
            'updates'     => $updates,
        ];
    }

    /**
     * Format a ClinicModuleConfig instance for standard API response representation.
     */
    public function formatConfigResponse(ClinicModuleConfig $config, bool $canEdit = false): array
    {
        return [
            'schema_version'                => self::SCHEMA_VERSION,
            'revision'                      => (int) ($config->revision ?: 1),
            'clinic_id'                     => (int) $config->clinic_id,
            'can_edit'                      => $canEdit,
            'triage_module_enabled'         => (bool) $config->triage_module_enabled,
            'registration_module_enabled'   => (bool) ($config->registration_module_enabled ?? true),
            'treatment_module_enabled'      => (bool) ($config->treatment_module_enabled ?? true),
            'patient_registration_enabled'  => (bool) ($config->patient_registration_enabled ?? true),
            'address_section_enabled'       => (bool) ($config->address_section_enabled ?? true),
            'socioeconomic_section_enabled' => (bool) ($config->socioeconomic_section_enabled ?? true),
            'gov_programs_section_enabled'  => (bool) ($config->gov_programs_section_enabled ?? true),
            'bite_intake_section_enabled'   => (bool) ($config->bite_intake_section_enabled ?? true),
            'triage_section_enabled'        => (bool) ($config->triage_section_enabled ?? true),
            'treatment_section_enabled'     => (bool) ($config->treatment_section_enabled ?? true),
            'field_rules'                   => $config->field_rules ?: $this->getDefaultFieldRules(),
            'created_at'                    => $config->created_at?->toISOString(),
            'updated_at'                    => $config->updated_at?->toISOString(),
        ];
    }

    /**
     * Get configuration audit history for a clinic.
     *
     * @param int $clinicId
     * @param int $limit
     * @return array<int, array<string, mixed>>
     */
    public function getHistoryForClinic(int $clinicId, int $limit = 50): array
    {
        if (empty($clinicId) || $clinicId <= 0) {
            return [];
        }

        return AuditLog::with('user:id,name,email,role')
            ->where('clinic_id', $clinicId)
            ->where('action', 'clinic_module_config.updated')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($log) {
                return [
                    'id'          => $log->id,
                    'user'        => $log->user ? [
                        'id'    => $log->user->id,
                        'name'  => $log->user->name,
                        'email' => $log->user->email,
                        'role'  => $log->user->role,
                    ] : null,
                    'action'      => $log->action,
                    'description' => $log->description,
                    'old_values'  => $log->old_values,
                    'new_values'  => $log->new_values,
                    'ip_address'  => $log->ip_address,
                    'created_at'  => $log->created_at?->toISOString(),
                ];
            })
            ->toArray();
    }
}
