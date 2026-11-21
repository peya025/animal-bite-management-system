<?php

namespace Tests\Feature\Clinic;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\Role;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use App\Services\Clinic\EffectiveFieldRuleComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationFeesModuleConfigTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected User $adminA;
    protected User $adminB;
    protected User $regStaffA;
    protected ClinicModuleConfigService $configService;
    protected EffectiveFieldRuleComposer $composer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinicA = Clinic::create(['name' => 'Clinic A']);
        $this->clinicB = Clinic::create(['name' => 'Clinic B']);

        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'admin', 'display_name' => 'Administrator', 'default_route' => '/admin']);
        $regRole = Role::firstOrCreate(['slug' => 'registration'], ['name' => 'registration', 'display_name' => 'Registration Staff', 'default_route' => '/registration']);

        $this->adminA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name' => 'Admin A',
            'email' => 'adminA@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->adminA->roles()->attach($adminRole->id);

        $this->adminB = User::create([
            'clinic_id' => $this->clinicB->id,
            'name' => 'Admin B',
            'email' => 'adminB@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->adminB->roles()->attach($adminRole->id);

        $this->regStaffA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name' => 'Reg Staff A',
            'email' => 'regA@example.com',
            'password' => bcrypt('password'),
            'role' => 'registration',
            'is_active' => true,
        ]);
        $this->regStaffA->roles()->attach($regRole->id);

        $this->configService = app(ClinicModuleConfigService::class);
        $this->composer = app(EffectiveFieldRuleComposer::class);
    }

    private function getBasePayload(int $revision, array $overrides = []): array
    {
        $defaultRules = $this->configService->getDefaultFieldRules();

        $payload = [
            'revision' => $revision,
            'triage_module_enabled' => true,
            'registration_module_enabled' => true,
            'treatment_module_enabled' => true,
            'patient_registration_enabled' => true,
            'address_section_enabled' => true,
            'socioeconomic_section_enabled' => true,
            'gov_programs_section_enabled' => true,
            'bite_intake_section_enabled' => true,
            'triage_section_enabled' => true,
            'treatment_section_enabled' => true,
            'field_rules' => $defaultRules,
        ];

        return array_replace_recursive($payload, $overrides);
    }

    public function test_default_configuration_has_all_three_fees_hidden(): void
    {
        Sanctum::actingAs($this->regStaffA);

        $response = $this->getJson('/api/clinic-module-config');
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertEquals('hidden', $data['field_rules']['rig_fee']);
        $this->assertEquals('hidden', $data['field_rules']['anti_rabies_fee']);
        $this->assertEquals('hidden', $data['field_rules']['additional_fees']);

        $this->assertFalse($this->composer->isFieldVisible($this->clinicA->id, 'rig_fee'));
        $this->assertFalse($this->composer->isFieldVisible($this->clinicA->id, 'anti_rabies_fee'));
        $this->assertFalse($this->composer->isFieldVisible($this->clinicA->id, 'additional_fees'));
    }

    public function test_all_27_combinations_of_independent_fee_modes(): void
    {
        Sanctum::actingAs($this->adminA);
        $modes = ['required', 'optional', 'hidden'];

        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $revision = $config->revision;

        $testedCount = 0;

        foreach ($modes as $rig) {
            foreach ($modes as $ar) {
                foreach ($modes as $add) {
                    $payload = $this->getBasePayload($revision, [
                        'field_rules' => [
                            'rig_fee' => $rig,
                            'anti_rabies_fee' => $ar,
                            'additional_fees' => $add,
                        ],
                    ]);

                    $res = $this->putJson('/api/setup/module-config', $payload);
                    $res->assertStatus(200);

                    $data = $res->json();
                    $this->assertEquals($rig, $data['config']['field_rules']['rig_fee']);
                    $this->assertEquals($ar, $data['config']['field_rules']['anti_rabies_fee']);
                    $this->assertEquals($add, $data['config']['field_rules']['additional_fees']);

                    // Verify EffectiveFieldRuleComposer reflects each choice independently
                    $this->assertEquals($rig === 'required', $this->composer->isFieldRequired($this->clinicA->id, 'rig_fee'));
                    $this->assertEquals($ar === 'required', $this->composer->isFieldRequired($this->clinicA->id, 'anti_rabies_fee'));
                    $this->assertEquals($add === 'required', $this->composer->isFieldRequired($this->clinicA->id, 'additional_fees'));

                    $this->assertEquals($rig !== 'hidden', $this->composer->isFieldVisible($this->clinicA->id, 'rig_fee'));
                    $this->assertEquals($ar !== 'hidden', $this->composer->isFieldVisible($this->clinicA->id, 'anti_rabies_fee'));
                    $this->assertEquals($add !== 'hidden', $this->composer->isFieldVisible($this->clinicA->id, 'additional_fees'));

                    $revision = $data['config']['revision'];
                    $testedCount++;
                }
            }
        }

        $this->assertEquals(27, $testedCount);
    }

    public function test_older_client_omitting_new_fee_keys_preserves_existing_saved_values(): void
    {
        Sanctum::actingAs($this->adminA);

        // 1. Enable fee items
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $payload1 = $this->getBasePayload($config->revision, [
            'field_rules' => [
                'rig_fee' => 'required',
                'anti_rabies_fee' => 'optional',
                'additional_fees' => 'required',
            ],
        ]);
        $res1 = $this->putJson('/api/setup/module-config', $payload1);
        $res1->assertStatus(200);
        $newRevision = $res1->json('config.revision');

        // 2. Simulate older client: omit rig_fee, anti_rabies_fee, additional_fees completely
        $payload2 = $this->getBasePayload($newRevision);
        $payload2['field_rules']['blood_type'] = 'required';
        unset(
            $payload2['field_rules']['rig_fee'],
            $payload2['field_rules']['anti_rabies_fee'],
            $payload2['field_rules']['additional_fees']
        );

        $res2 = $this->putJson('/api/setup/module-config', $payload2);
        $res2->assertStatus(200);

        $savedRules = $res2->json('config.field_rules');
        $this->assertEquals('required', $savedRules['blood_type']);
        // Crucial: Preserves previous enabled values, does NOT reset to 'hidden'!
        $this->assertEquals('required', $savedRules['rig_fee']);
        $this->assertEquals('optional', $savedRules['anti_rabies_fee']);
        $this->assertEquals('required', $savedRules['additional_fees']);
    }

    public function test_clinic_isolation_and_audit_history(): void
    {
        Sanctum::actingAs($this->adminA);
        $configA = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        $payloadA = $this->getBasePayload($configA->revision, [
            'field_rules' => [
                'rig_fee' => 'required',
                'anti_rabies_fee' => 'optional',
                'additional_fees' => 'hidden',
            ],
        ]);
        $this->putJson('/api/setup/module-config', $payloadA)->assertStatus(200);

        // Clinic B remains unaffected with default hidden
        $configB = $this->configService->getOrCreateConfigForClinic($this->clinicB->id);
        $this->assertEquals('hidden', $configB->field_rules['rig_fee'] ?? 'hidden');
        $this->assertEquals('hidden', $configB->field_rules['anti_rabies_fee'] ?? 'hidden');
        $this->assertEquals('hidden', $configB->field_rules['additional_fees'] ?? 'hidden');

        // Check AuditLog was recorded for Clinic A
        $audit = AuditLog::where('clinic_id', $this->clinicA->id)
            ->where('model', ClinicModuleConfig::class)
            ->where('action', 'clinic_module_config.updated')
            ->latest('id')
            ->first();

        $this->assertNotNull($audit);
        $newVals = $audit->new_values['field_rules'] ?? [];
        $this->assertEquals('required', $newVals['rig_fee']);
        $this->assertEquals('optional', $newVals['anti_rabies_fee']);
    }

    public function test_fees_independent_of_demographics_but_gated_by_registration_module(): void
    {
        Sanctum::actingAs($this->adminA);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        // Enable fee as required, but disable patient demographics section (Section I)
        $payload = $this->getBasePayload($config->revision, [
            'patient_registration_enabled' => false,
            'field_rules' => [
                'rig_fee' => 'required',
            ],
        ]);
        $this->putJson('/api/setup/module-config', $payload)->assertStatus(200);

        // Demographics field is not required because section is disabled
        $this->assertFalse($this->composer->isFieldRequired($this->clinicA->id, 'blood_type'));

        // Fee requirement remains intact because it is registration-level!
        $this->assertTrue($this->composer->isFieldRequired($this->clinicA->id, 'rig_fee'));
        $this->assertTrue($this->composer->isFieldVisible($this->clinicA->id, 'rig_fee'));

        // When the registration station itself is disabled, fees become inactive
        $payload2 = $this->getBasePayload($config->revision + 1, [
            'registration_module_enabled' => false,
            'triage_module_enabled' => true,
            'treatment_module_enabled' => true,
            'field_rules' => [
                'rig_fee' => 'required',
            ],
        ]);
        $this->putJson('/api/setup/module-config', $payload2)->assertStatus(200);

        $this->assertFalse($this->composer->isFieldRequired($this->clinicA->id, 'rig_fee'));
        $this->assertFalse($this->composer->isFieldVisible($this->clinicA->id, 'rig_fee'));
    }
}
