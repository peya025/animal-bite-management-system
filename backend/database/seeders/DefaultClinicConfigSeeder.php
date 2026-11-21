<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Database\Seeder;

class DefaultClinicConfigSeeder extends Seeder
{
    /**
     * Run the database seeds non-destructively.
     */
    public function run(): void
    {
        /** @var ClinicModuleConfigService $configService */
        $configService = app(ClinicModuleConfigService::class);
        $clinics = Clinic::all();

        foreach ($clinics as $clinic) {
            $existing = ClinicModuleConfig::where('clinic_id', $clinic->id)->first();

            if (! $existing) {
                // Initialize fresh default configuration for new clinic
                $configService->getOrCreateConfigForClinic($clinic->id);
            } else {
                // Non-destructive backfill: preserve custom values while filling missing canonical gaps
                $needsSave = false;

                // Stations: only supply defaults if column is null
                if (is_null($existing->triage_module_enabled)) {
                    $existing->triage_module_enabled = true;
                    $needsSave = true;
                }
                if (is_null($existing->registration_module_enabled)) {
                    $existing->registration_module_enabled = true;
                    $needsSave = true;
                }
                if (is_null($existing->treatment_module_enabled)) {
                    $existing->treatment_module_enabled = true;
                    $needsSave = true;
                }

                // Sections: only supply defaults if column is null
                foreach ($configService->getDefaultSectionFlags() as $sectionKey => $defaultVal) {
                    if (is_null($existing->{$sectionKey})) {
                        $existing->{$sectionKey} = $defaultVal;
                        $needsSave = true;
                    }
                }

                // Field rules: merge missing canonical rules while preserving explicit choices
                $normalizedRules = $configService->normalizeFieldRules($existing->field_rules);
                if ($existing->field_rules !== $normalizedRules) {
                    $existing->field_rules = $normalizedRules;
                    $needsSave = true;
                }

                if (empty($existing->revision) || $existing->revision < 1) {
                    $existing->revision = 1;
                    $needsSave = true;
                }

                if ($needsSave) {
                    $existing->save();
                }
            }
        }
    }
}
