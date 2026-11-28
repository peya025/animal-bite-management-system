<?php

namespace Tests\Feature\Clinic;

use App\Models\Clinic;
use App\Models\PatientAccount;
use App\Models\Role;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicClinicalOptionsConfigTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(Clinic $clinic): User
    {
        $roleAdmin = Role::firstOrCreate(['slug' => 'admin'], [
            'name'          => 'admin',
            'display_name'  => 'Administrator',
            'default_route' => '/admin',
        ]);

        $admin = User::factory()->create([
            'clinic_id' => $clinic->id,
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        return $admin;
    }

    public function test_module_config_returns_canonical_default_clinical_options(): void
    {
        $clinic = Clinic::create(['name' => 'Clinic Defaults']);
        $admin = $this->createAdmin($clinic);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/clinic-module-config')
            ->assertOk()
            ->assertJsonCount(5, 'clinical_options.exposure_modes')
            ->assertJsonCount(6, 'clinical_options.body_part_groups')
            ->assertJsonPath('clinical_options.exposure_modes.0.key', 'nibbling_uncovered_skin')
            ->assertJsonPath('clinical_options.exposure_modes.0.label', 'Saliva or licking on intact skin')
            ->assertJsonPath('clinical_options.exposure_modes.0.enabled', true)
            ->assertJsonPath('clinical_options.body_part_groups.1.key', 'upper_extremities')
            ->assertJsonPath('clinical_options.body_part_groups.1.label', 'Upper extremities (arm or hand)')
            ->assertJsonPath('clinical_options.body_part_groups.1.enabled', true);

        $this->assertSame(1, $response->json('revision'));
    }

    public function test_admin_can_customize_clinical_options_and_sync_to_mobile_endpoints(): void
    {
        $clinic = Clinic::create(['name' => 'Clinic Sync']);
        $admin = $this->createAdmin($clinic);
        $service = app(ClinicModuleConfigService::class);
        $initial = $service->getOrCreateConfigForClinic($clinic->id);

        $customOptions = $service->getDefaultClinicalOptions();
        $customOptions['exposure_modes'][3]['label'] = 'Deep Transdermal Bite';
        $customOptions['exposure_modes'][4]['enabled'] = false; // disable handling_ingestion_raw_meat
        $customOptions['body_part_groups'][1]['label'] = 'Arm / Hand (Upper Extremities)';
        $customOptions['body_part_groups'][5]['enabled'] = false; // disable na_ingestion

        Sanctum::actingAs($admin);

        $this->putJson('/api/clinic-module-config', [
            'revision'                      => $initial->revision,
            'triage_module_enabled'         => true,
            'registration_module_enabled'   => true,
            'treatment_module_enabled'      => true,
            'patient_registration_enabled'  => true,
            'address_section_enabled'       => true,
            'socioeconomic_section_enabled' => true,
            'gov_programs_section_enabled'  => true,
            'bite_intake_section_enabled'   => true,
            'triage_section_enabled'        => true,
            'treatment_section_enabled'     => true,
            'field_rules'                   => $initial->field_rules,
            'clinical_options'              => $customOptions,
        ])
            ->assertOk()
            ->assertJsonPath('config.revision', 2)
            ->assertJsonPath('config.clinical_options.exposure_modes.3.label', 'Deep Transdermal Bite')
            ->assertJsonPath('config.clinical_options.exposure_modes.4.enabled', false)
            ->assertJsonPath('config.clinical_options.body_part_groups.1.label', 'Arm / Hand (Upper Extremities)')
            ->assertJsonPath('config.clinical_options.body_part_groups.5.enabled', false);

        // Verify mobile /form-configuration projection reflects clinic customizations
        $account = PatientAccount::create([
            'name'     => 'Mobile Patient',
            'email'    => 'mobile-sync@example.test',
            'password' => 'password',
        ]);
        Sanctum::actingAs($account);

        $mobileConfig = $this->getJson('/api/mobile/form-configuration?clinic_id=' . $clinic->id)
            ->assertOk()
            ->assertJsonPath('revision', 2)
            ->assertJsonPath('intake.options.reported_mode_of_exposure.transdermal_bite', 'Deep Transdermal Bite')
            ->assertJsonPath('intake.options.reported_mode_of_exposure.unsure', 'Unsure')
            ->assertJsonMissingPath('intake.options.reported_mode_of_exposure.handling_ingestion_raw_meat')
            ->assertJsonPath('intake.options.body_part_group.upper_extremities', 'Arm / Hand (Upper Extremities)')
            ->assertJsonMissingPath('intake.options.body_part_group.na_ingestion');

        $this->assertCount(5, $mobileConfig->json('intake.options.reported_mode_of_exposure')); // 4 enabled + unsure
        $this->assertCount(5, $mobileConfig->json('intake.options.body_part_group')); // 5 enabled

        // Verify /api/mobile/bite-intake-schema also reflects clinic customizations
        $this->getJson('/api/mobile/bite-intake-schema?clinic_id=' . $clinic->id)
            ->assertOk()
            ->assertJsonPath('options.reported_mode_of_exposure.transdermal_bite', 'Deep Transdermal Bite')
            ->assertJsonMissingPath('options.reported_mode_of_exposure.handling_ingestion_raw_meat')
            ->assertJsonPath('options.body_part_group.upper_extremities', 'Arm / Hand (Upper Extremities)')
            ->assertJsonMissingPath('options.body_part_group.na_ingestion');
    }

    public function test_validation_rejects_disabling_all_options_or_unknown_keys(): void
    {
        $clinic = Clinic::create(['name' => 'Clinic Validation']);
        $admin = $this->createAdmin($clinic);
        $service = app(ClinicModuleConfigService::class);
        $initial = $service->getOrCreateConfigForClinic($clinic->id);

        $allDisabled = $service->getDefaultClinicalOptions();
        foreach ($allDisabled['exposure_modes'] as &$item) {
            $item['enabled'] = false;
        }
        unset($item);

        Sanctum::actingAs($admin);

        $this->putJson('/api/clinic-module-config', [
            'revision'              => $initial->revision,
            'triage_module_enabled' => true,
            'field_rules'           => $initial->field_rules,
            'clinical_options'      => $allDisabled,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['clinical_options.exposure_modes']);

        $invalidKey = $service->getDefaultClinicalOptions();
        $invalidKey['body_part_groups'][] = [
            'key'     => 'Invalid Key!',
            'label'   => 'Invalid',
            'enabled' => true,
        ];

        $this->putJson('/api/clinic-module-config', [
            'revision'              => $initial->revision,
            'triage_module_enabled' => true,
            'field_rules'           => $initial->field_rules,
            'clinical_options'      => $invalidKey,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['clinical_options.body_part_groups.6.key']);
    }

    public function test_admin_can_create_and_delete_custom_exposure_and_body_part_options(): void
    {
        $clinic = Clinic::create(['name' => 'Clinic Custom Options']);
        $admin = $this->createAdmin($clinic);
        $service = app(ClinicModuleConfigService::class);
        $initial = $service->getOrCreateConfigForClinic($clinic->id);

        $withCustom = $service->getDefaultClinicalOptions();
        $withCustom['exposure_modes'][] = [
            'key'       => 'mucous_membrane_splash',
            'label'     => 'Mucous membrane splash',
            'enabled'   => true,
            'is_custom' => true,
        ];
        $withCustom['body_part_groups'][] = [
            'key'       => 'eye_or_face',
            'label'     => 'Eye or facial area',
            'enabled'   => true,
            'is_custom' => true,
        ];

        Sanctum::actingAs($admin);

        // 1. Create custom options
        $this->putJson('/api/clinic-module-config', [
            'revision'              => $initial->revision,
            'triage_module_enabled' => true,
            'field_rules'           => $initial->field_rules,
            'clinical_options'      => $withCustom,
        ])
            ->assertOk()
            ->assertJsonPath('config.revision', 2)
            ->assertJsonCount(6, 'config.clinical_options.exposure_modes')
            ->assertJsonPath('config.clinical_options.exposure_modes.5.key', 'mucous_membrane_splash')
            ->assertJsonPath('config.clinical_options.exposure_modes.5.label', 'Mucous membrane splash')
            ->assertJsonPath('config.clinical_options.exposure_modes.5.is_custom', true)
            ->assertJsonCount(7, 'config.clinical_options.body_part_groups')
            ->assertJsonPath('config.clinical_options.body_part_groups.6.key', 'eye_or_face')
            ->assertJsonPath('config.clinical_options.body_part_groups.6.is_custom', true);

        // 2. Verify mobile endpoints expose the new custom options
        $account = PatientAccount::create([
            'name'     => 'Custom Mobile Patient',
            'email'    => 'custom-mobile@example.test',
            'password' => 'password',
        ]);
        Sanctum::actingAs($account);

        $this->getJson('/api/mobile/form-configuration?clinic_id=' . $clinic->id)
            ->assertOk()
            ->assertJsonPath('intake.options.reported_mode_of_exposure.mucous_membrane_splash', 'Mucous membrane splash')
            ->assertJsonPath('intake.options.body_part_group.eye_or_face', 'Eye or facial area');

        $this->getJson('/api/mobile/bite-intake-schema?clinic_id=' . $clinic->id)
            ->assertOk()
            ->assertJsonPath('options.reported_mode_of_exposure.mucous_membrane_splash', 'Mucous membrane splash')
            ->assertJsonPath('options.body_part_group.eye_or_face', 'Eye or facial area');

        // 3. Verify MobileFormPolicy accepts the custom keys in validation rules
        $policy = new \App\Services\Clinic\MobileFormPolicy($service, $clinic->id);
        $intakeRules = $policy->intakeRules();
        $this->assertStringContainsString('mucous_membrane_splash', implode('|', $intakeRules['intake.exposure_type']));
        $this->assertStringContainsString('eye_or_face', implode('|', $intakeRules['intake.body_part_exposed']));

        // 4. Delete the custom options by omitting them in the next update
        Sanctum::actingAs($admin);
        $this->putJson('/api/clinic-module-config', [
            'revision'              => 2,
            'triage_module_enabled' => true,
            'field_rules'           => $initial->field_rules,
            'clinical_options'      => $service->getDefaultClinicalOptions(),
        ])
            ->assertOk()
            ->assertJsonPath('config.revision', 3)
            ->assertJsonCount(5, 'config.clinical_options.exposure_modes')
            ->assertJsonCount(6, 'config.clinical_options.body_part_groups');
    }
}
