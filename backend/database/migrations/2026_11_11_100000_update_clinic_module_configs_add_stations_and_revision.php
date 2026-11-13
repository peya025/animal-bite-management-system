<?php

use App\Models\ClinicModuleConfig;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinic_module_configs', function (Blueprint $table) {
            if (! Schema::hasColumn('clinic_module_configs', 'registration_module_enabled')) {
                $table->boolean('registration_module_enabled')->nullable()->default(true)->after('triage_module_enabled');
            }
            if (! Schema::hasColumn('clinic_module_configs', 'treatment_module_enabled')) {
                $table->boolean('treatment_module_enabled')->nullable()->default(true)->after('registration_module_enabled');
            }
            if (! Schema::hasColumn('clinic_module_configs', 'revision')) {
                $table->unsignedBigInteger('revision')->nullable()->default(1)->after('field_rules');
            }
        });

        // Additive normalization / backfill: normalize existing configurations
        $configService = app(ClinicModuleConfigService::class);
        $configs = ClinicModuleConfig::all();

        foreach ($configs as $config) {
            $updated = false;

            // 1. Station flags
            if (is_null($config->registration_module_enabled)) {
                $config->registration_module_enabled = true;
                $updated = true;
            }
            if (is_null($config->treatment_module_enabled)) {
                $config->treatment_module_enabled = true;
                $updated = true;
            }
            if (is_null($config->triage_module_enabled)) {
                $config->triage_module_enabled = true;
                $updated = true;
            }

            // 2. Section flags (preserve explicit false)
            $sectionFlags = [
                'patient_registration_enabled',
                'address_section_enabled',
                'socioeconomic_section_enabled',
                'gov_programs_section_enabled',
                'bite_intake_section_enabled',
                'triage_section_enabled',
                'treatment_section_enabled',
            ];

            foreach ($sectionFlags as $sectionFlag) {
                if (is_null($config->{$sectionFlag})) {
                    $config->{$sectionFlag} = true;
                    $updated = true;
                }
            }

            // 3. Field rules normalization (preserving explicit choices, mapping aliases)
            $normalizedRules = $configService->normalizeFieldRules($config->field_rules);
            if ($config->field_rules !== $normalizedRules) {
                $config->field_rules = $normalizedRules;
                $updated = true;
            }

            // 4. Revision default
            if (empty($config->revision) || $config->revision < 1) {
                $config->revision = 1;
                $updated = true;
            }

            if ($updated) {
                $config->save();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_module_configs', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('clinic_module_configs', 'registration_module_enabled')) {
                $columnsToDrop[] = 'registration_module_enabled';
            }
            if (Schema::hasColumn('clinic_module_configs', 'treatment_module_enabled')) {
                $columnsToDrop[] = 'treatment_module_enabled';
            }
            if (Schema::hasColumn('clinic_module_configs', 'revision')) {
                $columnsToDrop[] = 'revision';
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
