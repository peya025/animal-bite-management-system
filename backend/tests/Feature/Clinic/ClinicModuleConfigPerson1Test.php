<?php

namespace Tests\Feature\Clinic;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\Role;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use App\Services\Clinic\ClinicSetupService;
use Database\Seeders\DefaultClinicConfigSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicModuleConfigPerson1Test extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinicA;
    private Clinic $clinicB;
    private User $adminA1;
    private User $adminA2;
    private User $adminB;
    private User $doctorA;
    private User $nurseA;
    private User $treatmentA;
    private User $developerA;
    private User $inactiveA;
    private User $noClinicAdmin;
    private ClinicModuleConfigService $configService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->configService = app(ClinicModuleConfigService::class);

        // Clinics
        $this->clinicA = Clinic::create(['name' => 'Clinic A Tagoloan']);
        $this->clinicB = Clinic::create(['name' => 'Clinic B Villanueva']);

        // Roles
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'admin', 'display_name' => 'Administrator', 'default_route' => '/admin']);
        $doctorRole = Role::firstOrCreate(['slug' => 'doctor'], ['name' => 'doctor', 'display_name' => 'Doctor', 'default_route' => '/consultation']);
        $nurseRole = Role::firstOrCreate(['slug' => 'triage_nurse'], ['name' => 'triage_nurse', 'display_name' => 'Triage Nurse', 'default_route' => '/queue']);
        $treatmentRole = Role::firstOrCreate(['slug' => 'treatment_nurse'], ['name' => 'treatment_nurse', 'display_name' => 'Treatment Nurse', 'default_route' => '/treatment']);
        $devRole = Role::firstOrCreate(['slug' => 'developer'], ['name' => 'developer', 'display_name' => 'Developer', 'default_route' => '/developer']);

        // Users
        $this->adminA1 = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Admin-1',
            'email'     => 'admin1@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->adminA1->roles()->attach($adminRole->id);

        $this->adminA2 = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Admin-2',
            'email'     => 'admin2@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->adminA2->roles()->attach($adminRole->id);

        $this->adminB = User::create([
            'clinic_id' => $this->clinicB->id,
            'name'      => 'B-Admin',
            'email'     => 'admin@clinicb.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->adminB->roles()->attach($adminRole->id);

        $this->doctorA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Doctor',
            'email'     => 'doctor@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'triage',
            'is_active' => true,
        ]);
        $this->doctorA->roles()->attach($doctorRole->id);

        $this->nurseA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Registration',
            'email'     => 'registration@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'registration',
            'is_active' => true,
        ]);

        $this->treatmentA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Treatment',
            'email'     => 'treatment@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
        $this->treatmentA->roles()->attach($treatmentRole->id);

        $this->developerA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Developer',
            'email'     => 'dev@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'developer',
            'is_active' => true,
        ]);
        $this->developerA->roles()->attach($devRole->id);

        $this->inactiveA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'A-Inactive',
            'email'     => 'inactive@clinica.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'admin',
            'is_active' => false,
        ]);
        $this->inactiveA->roles()->attach($adminRole->id);

        $this->noClinicAdmin = User::create([
            'clinic_id' => null,
            'name'      => 'NoClinic-Admin',
            'email'     => 'noclinic@admin.gov.ph',
            'password'  => bcrypt('secret123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->noClinicAdmin->roles()->attach($adminRole->id);
    }

    private function getValidPayload(int $revision = 1, array $overrides = []): array
    {
        $baseRules = $this->configService->getDefaultFieldRules();

        $payload = [
            'revision'                      => $revision,
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
            'field_rules'                   => $baseRules,
        ];

        return array_merge($payload, $overrides);
    }

    // =========================================================================
    // P1-M01: Authentication & Role Matrix
    // =========================================================================
    public function test_p1_m01_authentication_and_role_matrix(): void
    {
        // 1. Anonymous requests return 401
        $this->getJson('/api/clinic-module-config')->assertStatus(401);
        $this->putJson('/api/clinic-module-config', $this->getValidPayload())->assertStatus(401);

        // 2. Active non-admin staff may read (GET returns 200 with can_edit: false), but cannot PUT (403)
        $nonAdminStaff = [$this->nurseA, $this->doctorA, $this->treatmentA, $this->developerA];
        foreach ($nonAdminStaff as $staff) {
            Sanctum::actingAs($staff);

            $getResponse = $this->getJson('/api/clinic-module-config');
            $getResponse->assertStatus(200)
                ->assertJson([
                    'clinic_id' => $this->clinicA->id,
                    'can_edit'  => false,
                ]);

            $putResponse = $this->putJson('/api/clinic-module-config', $this->getValidPayload());
            $putResponse->assertStatus(403)
                ->assertJson(['message' => 'Unauthorized. Admin access required.']);
        }

        // 3. Inactive staff request is denied by active.user middleware (403)
        Sanctum::actingAs($this->inactiveA);
        $this->getJson('/api/clinic-module-config')->assertStatus(403);
        $this->putJson('/api/clinic-module-config', $this->getValidPayload())->assertStatus(403);

        // 4. Admin write succeeds and creates audit event
        Sanctum::actingAs($this->adminA1);
        $configA = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        $rules = $configA->field_rules;
        $rules['blood_type'] = 'required'; // Approved RF1 change

        $payload = $this->getValidPayload($configA->revision, ['field_rules' => $rules]);
        $response = $this->putJson('/api/clinic-module-config', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Module configuration updated successfully',
                'config'  => [
                    'clinic_id'   => $this->clinicA->id,
                    'can_edit'    => true,
                    'revision'    => 2,
                    'field_rules' => ['blood_type' => 'required'],
                ],
            ]);

        // Audit event was created
        $this->assertDatabaseHas('audit_logs', [
            'clinic_id' => $this->clinicA->id,
            'user_id'   => $this->adminA1->id,
            'action'    => 'clinic_module_config.updated',
        ]);
    }

    // =========================================================================
    // P1-M02: Clinic Isolation & Missing Association
    // =========================================================================
    public function test_p1_m02_clinic_isolation_and_missing_association(): void
    {
        // 1. Give Clinic A and B visibly different RF1 (blood_type) values
        $configA = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $rulesA = $configA->field_rules;
        $rulesA['blood_type'] = 'required';
        $this->configService->updateConfigForClinic($this->clinicA->id, ['field_rules' => $rulesA, 'revision' => $configA->revision]);

        $configB = $this->configService->getOrCreateConfigForClinic($this->clinicB->id);
        $rulesB = $configB->field_rules;
        $rulesB['blood_type'] = 'hidden';
        $this->configService->updateConfigForClinic($this->clinicB->id, ['field_rules' => $rulesB, 'revision' => $configB->revision]);

        // 2. As A-Admin-1, send a writable body containing Clinic B's ID
        Sanctum::actingAs($this->adminA1);
        $freshA = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $payloadWithBId = $this->getValidPayload($freshA->revision, [
            'clinic_id'   => $this->clinicB->id,
            'field_rules' => array_merge($rulesA, ['blood_type' => 'optional']),
        ]);

        $response = $this->putJson('/api/clinic-module-config', $payloadWithBId);
        $response->assertStatus(200);

        // 3. GET as both admins: Clinic A updated, Clinic B UNCHANGED
        $getA = $this->getJson('/api/clinic-module-config');
        $getA->assertJson(['clinic_id' => $this->clinicA->id, 'field_rules' => ['blood_type' => 'optional']]);

        Sanctum::actingAs($this->adminB);
        $getB = $this->getJson('/api/clinic-module-config');
        $getB->assertJson(['clinic_id' => $this->clinicB->id, 'field_rules' => ['blood_type' => 'hidden']]);

        // 4. As NoClinic-Admin, attempt GET and PUT
        $configCountBefore = ClinicModuleConfig::count();
        Sanctum::actingAs($this->noClinicAdmin);

        $noClinicGet = $this->getJson('/api/clinic-module-config');
        $noClinicGet->assertStatus(422)
            ->assertJson(['message' => 'User is not associated with any clinic.']);

        $noClinicPut = $this->putJson('/api/clinic-module-config', $this->getValidPayload());
        $noClinicPut->assertStatus(422)
            ->assertJson(['message' => 'User is not associated with any clinic.']);

        // Assert no new rows were created and no fallback occurred
        $this->assertEquals($configCountBefore, ClinicModuleConfig::count());
    }

    // =========================================================================
    // P1-M03: Supported Keys Round-Trip Without Silent Loss
    // =========================================================================
    public function test_p1_m03_supported_keys_round_trip_without_silent_loss(): void
    {
        Sanctum::actingAs($this->adminA1);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        // Toggle supported station combinations to false without hitting unsupported 000/101/100 gates:
        // Step 1: 001 (registration=false, triage=false, treatment=true) + all 7 sections false
        // Set RF1 (blood_type) to required, RF2 (treatment_given) to required, RF3 (route) to required
        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $rules['treatment_given'] = 'required';
        $rules['route'] = 'required';
        $rules['spouse_name'] = 'hidden';

        $payload = [
            'revision'                      => $config->revision,
            'triage_module_enabled'         => false,
            'registration_module_enabled'   => false,
            'treatment_module_enabled'      => true,
            'patient_registration_enabled'  => false,
            'address_section_enabled'       => false,
            'socioeconomic_section_enabled' => false,
            'gov_programs_section_enabled'  => false,
            'bite_intake_section_enabled'   => false,
            'triage_section_enabled'        => false,
            'treatment_section_enabled'     => false,
            'field_rules'                   => $rules,
        ];

        $putResponse = $this->putJson('/api/clinic-module-config', $payload);
        $putResponse->assertStatus(200);

        // GET again and assert false flags and custom rules survived round-trip
        $getResponse = $this->getJson('/api/clinic-module-config');
        $getResponse->assertStatus(200)
            ->assertJson([
                'triage_module_enabled'         => false,
                'registration_module_enabled'   => false,
                'treatment_module_enabled'      => true,
                'patient_registration_enabled'  => false,
                'address_section_enabled'       => false,
                'socioeconomic_section_enabled' => false,
                'gov_programs_section_enabled'  => false,
                'bite_intake_section_enabled'   => false,
                'triage_section_enabled'        => false,
                'treatment_section_enabled'     => false,
                'field_rules'                   => [
                    'blood_type'      => 'required',
                    'treatment_given' => 'required',
                    'route'           => 'required',
                    'spouse_name'     => 'hidden',
                ],
            ]);

        // Step 2: 010 (treatment_module_enabled=false, triage_module_enabled=true) round-trip
        $rev2 = $getResponse->json('revision');
        $this->putJson('/api/clinic-module-config', array_merge($payload, [
            'revision'                 => $rev2,
            'triage_module_enabled'    => true,
            'treatment_module_enabled' => false,
        ]))->assertStatus(200);

        $this->getJson('/api/clinic-module-config')
            ->assertStatus(200)
            ->assertJson([
                'registration_module_enabled' => false,
                'triage_module_enabled'       => true,
                'treatment_module_enabled'    => false,
            ]);
    }

    // =========================================================================
    // P1-M04: Invalid Payload Matrix (MC-08, unknown keys, locked LF1)
    // =========================================================================
    public function test_p1_m04_invalid_payload_matrix(): void
    {
        Sanctum::actingAs($this->adminA1);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        // 1. Null section flag -> 422 (Prevents MC-08 HTTP 500 error!)
        $payloadNull = $this->getValidPayload($config->revision, ['socioeconomic_section_enabled' => null]);
        $this->putJson('/api/clinic-module-config', $payloadNull)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['socioeconomic_section_enabled']);

        // 2. String 'invalid' instead of boolean -> 422
        $payloadInvalidBool = $this->getValidPayload($config->revision, ['triage_module_enabled' => 'invalid']);
        $this->putJson('/api/clinic-module-config', $payloadInvalidBool)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['triage_module_enabled']);

        // 3. Unknown top-level station/section/property -> 422
        $payloadUnknownTop = $this->getValidPayload($config->revision, ['unknown_station' => true]);
        $this->putJson('/api/clinic-module-config', $payloadUnknownTop)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['unknown_station']);

        // 4. Unknown field-rule key -> 422
        $rulesWithUnknown = $config->field_rules;
        $rulesWithUnknown['first_name'] = 'optional';
        $payloadUnknownField = $this->getValidPayload($config->revision, ['field_rules' => $rulesWithUnknown]);
        $this->putJson('/api/clinic-module-config', $payloadUnknownField)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['field_rules.first_name']);

        // 5. Invalid rule value -> 422
        $rulesWithBadVal = $config->field_rules;
        $rulesWithBadVal['blood_type'] = 'disallowed_value';
        $payloadBadRule = $this->getValidPayload($config->revision, ['field_rules' => $rulesWithBadVal]);
        $this->putJson('/api/clinic-module-config', $payloadBadRule)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['field_rules.blood_type']);

        // 6. Missing required top-level data (e.g. triage_module_enabled) -> 422
        $payloadNoTriage = $this->getValidPayload($config->revision);
        unset($payloadNoTriage['triage_module_enabled']);
        $this->putJson('/api/clinic-module-config', $payloadNoTriage)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['triage_module_enabled']);

        // 7. Forbidden rule on LF1 (exposure_category locked to 'required') -> 422
        $rulesWithForbiddenLF1 = $config->field_rules;
        $rulesWithForbiddenLF1['exposure_category'] = 'optional';
        $payloadForbiddenLF1 = $this->getValidPayload($config->revision, ['field_rules' => $rulesWithForbiddenLF1]);
        $this->putJson('/api/clinic-module-config', $payloadForbiddenLF1)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['field_rules.exposure_category']);
    }

    // =========================================================================
    // P1-M05: Fresh Setup to First Configuration Save
    // =========================================================================
    public function test_p1_m05_fresh_setup_to_first_configuration_save(): void
    {
        // 1. Restore dedicated fresh dataset (no existing clinics)
        User::query()->delete();
        ClinicModuleConfig::query()->delete();
        Clinic::query()->delete();

        /** @var ClinicSetupService $setupService */
        $setupService = app(ClinicSetupService::class);
        $result = $setupService->initialize([
            'clinic_name'    => 'Fresh Setup Clinic',
            'admin_name'     => 'Fresh Admin',
            'admin_email'    => 'fresh@clinic.gov.ph',
            'admin_password' => 'FreshPassword123!',
        ]);

        $this->assertEquals(201, $result['status']);
        $newClinicId = $result['payload']['clinic']->id;

        // 2. Fetch created config and verify all 41 rules and sections are present immediately
        $config = ClinicModuleConfig::where('clinic_id', $newClinicId)->first();
        $this->assertNotNull($config);
        $this->assertCount(41, $config->field_rules);
        $this->assertTrue($config->triage_module_enabled);
        $this->assertTrue($config->registration_module_enabled);
        $this->assertTrue($config->treatment_module_enabled);

        // 3. User logs in, loads config, modifies RF1, saves without 422 errors
        $admin = $result['payload']['user'];
        Sanctum::actingAs($admin);

        $getResponse = $this->getJson('/api/clinic-module-config');
        $getResponse->assertStatus(200);

        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $payload = $this->getValidPayload($config->revision, ['field_rules' => $rules]);

        $putResponse = $this->putJson('/api/clinic-module-config', $payload);
        $putResponse->assertStatus(200);

        $this->assertDatabaseHas('clinic_module_configs', [
            'clinic_id' => $newClinicId,
            'revision'  => 2,
        ]);
    }

    // =========================================================================
    // P1-M06: Legacy Normalization and Repeatability
    // =========================================================================
    public function test_p1_m06_legacy_normalization_and_repeatability(): void
    {
        // Create a legacy clinic config with only 6 legacy rules and null station flags
        $legacyConfig = ClinicModuleConfig::create([
            'clinic_id'                     => $this->clinicA->id,
            'triage_module_enabled'         => false, // Explicit false
            'registration_module_enabled'   => null,  // Legacy null
            'treatment_module_enabled'      => null,  // Legacy null
            'socioeconomic_section_enabled' => false, // Explicit false
            'google_sso_enabled'            => true,  // Unrelated SSO field
            'field_rules'                   => [
                'bite_location'     => 'required',
                'exposure_category' => 'required',
                'animal_status'     => 'optional',
                'philhealth_info'   => 'optional',
                'fourps_info'       => 'optional',
                'wound_washing'     => 'optional',
            ],
            'revision'                      => 1,
        ]);

        // Resolving through service normalizes it
        $resolved = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        // 1. Preserves explicit false on triage_module_enabled and socioeconomic_section_enabled
        $this->assertFalse($resolved->triage_module_enabled);
        $this->assertFalse($resolved->socioeconomic_section_enabled);

        // 2. Fills null stations with true
        $this->assertTrue($resolved->registration_module_enabled);
        $this->assertTrue($resolved->treatment_module_enabled);

        // 3. Normalizes 6 rules to 41 rules, mapping legacy aliases
        $this->assertCount(41, $resolved->field_rules);
        $this->assertEquals('required', $resolved->field_rules['wound_location']); // Mapped from bite_location
        $this->assertEquals('optional', $resolved->field_rules['site_washed']);    // Mapped from wound_washing
        $this->assertEquals('optional', $resolved->field_rules['philhealth_status']); // Mapped from philhealth_info

        // 4. Preserves unrelated SSO field
        $this->assertTrue($resolved->google_sso_enabled);

        // 5. Repeat normalization is idempotent
        $resolvedAgain = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $this->assertEquals($resolved->field_rules, $resolvedAgain->field_rules);
        $this->assertEquals(1, ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->count());
    }

    // =========================================================================
    // P1-M07: Reseeding Preserves Customization
    // =========================================================================
    public function test_p1_m07_reseeding_preserves_customization(): void
    {
        // 1. Set custom RF1 and explicit false section
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';

        $this->configService->updateConfigForClinic($this->clinicA->id, [
            'revision'                      => $config->revision,
            'socioeconomic_section_enabled' => false,
            'field_rules'                   => $rules,
        ]);

        $customized = ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->first();
        $this->assertEquals('required', $customized->field_rules['blood_type']);
        $this->assertFalse($customized->socioeconomic_section_enabled);
        $this->assertEquals(2, $customized->revision);

        // 2. Run DefaultClinicConfigSeeder
        $seeder = new DefaultClinicConfigSeeder();
        $seeder->run();

        // 3. Assert custom values were preserved and no duplicate row was created
        $afterSeed = ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->first();
        $this->assertEquals('required', $afterSeed->field_rules['blood_type']);
        $this->assertFalse($afterSeed->socioeconomic_section_enabled);
        $this->assertEquals(2, $afterSeed->revision);
        $this->assertEquals(1, ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->count());

        // 4. Run again: still identical
        $seeder->run();
        $afterSecondSeed = ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->first();
        $this->assertEquals('required', $afterSecondSeed->field_rules['blood_type']);
        $this->assertFalse($afterSecondSeed->socioeconomic_section_enabled);
    }

    // =========================================================================
    // P1-M08: Stale Write and Concurrency / Conflict Detection
    // =========================================================================
    public function test_p1_m08_stale_write_and_simultaneous_write(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $initialRevision = $config->revision;

        // Admin 1 reads initial revision and prepares change A (RF1 = required)
        $rulesA = $config->field_rules;
        $rulesA['blood_type'] = 'required';
        $payloadA = $this->getValidPayload($initialRevision, ['field_rules' => $rulesA]);

        // Admin 2 reads same initial revision and prepares change B (RF3 = required)
        $rulesB = $config->field_rules;
        $rulesB['route'] = 'required';
        $payloadB = $this->getValidPayload($initialRevision, ['field_rules' => $rulesB]);

        // Admin 1 saves first -> 200 OK
        Sanctum::actingAs($this->adminA1);
        $resA = $this->putJson('/api/clinic-module-config', $payloadA);
        $resA->assertStatus(200)
            ->assertJson(['config' => ['revision' => $initialRevision + 1]]);

        // Admin 2 attempts to save with stale revision -> 409 Conflict
        Sanctum::actingAs($this->adminA2);
        $resB = $this->putJson('/api/clinic-module-config', $payloadB);
        $resB->assertStatus(409)
            ->assertJson([
                'message'           => 'Configuration conflict. The configuration has been modified by another user.',
                'current_revision'  => $initialRevision + 1,
                'supplied_revision' => $initialRevision,
            ]);

        // Admin 2 reconciles draft with current revision (2) and saves -> 200 OK
        $payloadBReconciled = $this->getValidPayload($initialRevision + 1, ['field_rules' => $rulesB]);
        $resB2 = $this->putJson('/api/clinic-module-config', $payloadBReconciled);
        $resB2->assertStatus(200)
            ->assertJson(['config' => ['revision' => $initialRevision + 2]]);
    }

    // =========================================================================
    // P1-M09: Audit Diff, No-Op, and Failed Saves
    // =========================================================================
    public function test_p1_m09_audit_diff_noop_and_failed_saves(): void
    {
        Sanctum::actingAs($this->adminA1);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        $auditCountBefore = AuditLog::count();

        // 1. Save two approved changes: RF1 (blood_type) and CF1 (spouse_name)
        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $rules['spouse_name'] = 'hidden';

        $payload = $this->getValidPayload($config->revision, ['field_rules' => $rules]);
        $response = $this->putJson('/api/clinic-module-config', $payload);
        $response->assertStatus(200);

        // Audit log created with exact diff
        $latestLog = AuditLog::orderBy('id', 'desc')->first();
        $this->assertEquals($auditCountBefore + 1, AuditLog::count());
        $this->assertEquals($this->clinicA->id, $latestLog->clinic_id);
        $this->assertEquals($this->adminA1->id, $latestLog->user_id);
        $this->assertArrayHasKey('blood_type', $latestLog->new_values['field_rules']);
        $this->assertArrayHasKey('spouse_name', $latestLog->new_values['field_rules']);
        // Unchanged fields are NOT in diff
        $this->assertArrayNotHasKey('bite_date', $latestLog->new_values['field_rules'] ?? []);

        // 2. No-op save: submit identical values with new revision
        $currentConfig = ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->first();
        $noopPayload = $this->getValidPayload($currentConfig->revision, ['field_rules' => $rules]);

        $noopResponse = $this->putJson('/api/clinic-module-config', $noopPayload);
        $noopResponse->assertStatus(200)
            ->assertJson(['message' => 'No configuration changes were detected.']);

        // Assert NO audit log created and revision not incremented
        $this->assertEquals($auditCountBefore + 1, AuditLog::count());
        $this->assertEquals($currentConfig->revision, ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->value('revision'));

        // 3. Failed/forbidden/conflict saves do not create audit events
        $this->putJson('/api/clinic-module-config', $this->getValidPayload(999))->assertStatus(409);
        Sanctum::actingAs($this->nurseA);
        $this->putJson('/api/clinic-module-config', $this->getValidPayload(2))->assertStatus(403);
        $this->assertEquals($auditCountBefore + 1, AuditLog::count());
    }

    // =========================================================================
    // P1-M10: Configuration and Audit Roll Back Together
    // =========================================================================
    public function test_p1_m10_configuration_and_audit_roll_back_together(): void
    {
        Sanctum::actingAs($this->adminA1);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $baselineRevision = $config->revision;
        $baselineAuditCount = AuditLog::count();

        // 1. Enable controlled audit-write failure hook
        ClinicModuleConfigService::$auditFailureHook = function () {
            throw new \RuntimeException('Simulated audit write failure for atomicity test');
        };

        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $payload = $this->getValidPayload($baselineRevision, ['field_rules' => $rules]);

        try {
            $this->putJson('/api/clinic-module-config', $payload);
        } catch (\Throwable $e) {
            // Simulated failure caught
        }

        // 2. Disable hook
        ClinicModuleConfigService::$auditFailureHook = null;

        // 3. Assert BOTH configuration and audit history rolled back
        $rolledBackConfig = ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->first();
        $this->assertEquals($baselineRevision, $rolledBackConfig->revision);
        $this->assertEquals('optional', $rolledBackConfig->field_rules['blood_type']);
        $this->assertEquals($baselineAuditCount, AuditLog::count());

        // 4. Normal retry succeeds
        $retryResponse = $this->putJson('/api/clinic-module-config', $payload);
        $retryResponse->assertStatus(200);

        $finalConfig = ClinicModuleConfig::where('clinic_id', $this->clinicA->id)->first();
        $this->assertEquals($baselineRevision + 1, $finalConfig->revision);
        $this->assertEquals('required', $finalConfig->field_rules['blood_type']);
        $this->assertEquals($baselineAuditCount + 1, AuditLog::count());
    }

    // =========================================================================
    // P1-M11: Existing Client Compatibility
    // =========================================================================
    public function test_p1_m11_existing_client_compatibility(): void
    {
        Sanctum::actingAs($this->adminA1);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        // 1. Legacy endpoint /api/setup/module-config works for GET and PUT
        $getResponse = $this->getJson('/api/setup/module-config');
        $getResponse->assertStatus(200)
            ->assertJson(['clinic_id' => $this->clinicA->id]);

        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $payload = $this->getValidPayload($config->revision, ['field_rules' => $rules]);

        $putResponse = $this->putJson('/api/setup/module-config', $payload);
        $putResponse->assertStatus(200)
            ->assertJson(['message' => 'Module configuration updated successfully']);

        // 2. Incompatible old payload with deliberately unsupported key receives actionable 422
        $incompatiblePayload = $this->getValidPayload($config->revision + 1, [
            'deliberately_unsupported_key' => true,
        ]);
        $this->putJson('/api/setup/module-config', $incompatiblePayload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['deliberately_unsupported_key']);
    }

    // =========================================================================
    // P1-M12: Deployment Engine Migration and Recovery Rehearsal
    // =========================================================================
    public function test_p1_m12_migration_and_recovery_rehearsal(): void
    {
        // 1. Verify columns exist on migrated database
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumns('clinic_module_configs', [
            'registration_module_enabled',
            'treatment_module_enabled',
            'revision',
        ]));

        // 2. Perform rollback of the latest migration
        $exitCodeRollback = Artisan::call('migrate:rollback', ['--step' => 1]);
        $this->assertEquals(0, $exitCodeRollback);

        $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('clinic_module_configs', 'registration_module_enabled'));
        $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('clinic_module_configs', 'treatment_module_enabled'));
        $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('clinic_module_configs', 'revision'));

        // 3. Re-run migration forward
        $exitCodeMigrate = Artisan::call('migrate');
        $this->assertEquals(0, $exitCodeMigrate);

        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumns('clinic_module_configs', [
            'registration_module_enabled',
            'treatment_module_enabled',
            'revision',
        ]));
    }

    // =========================================================================
    // History endpoint
    // =========================================================================
    public function test_configuration_history_endpoint(): void
    {
        Sanctum::actingAs($this->adminA1);
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);

        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $this->putJson('/api/clinic-module-config', $this->getValidPayload($config->revision, ['field_rules' => $rules]))
            ->assertStatus(200);

        $historyResponse = $this->getJson('/api/clinic-module-config/history');
        $historyResponse->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'user' => ['id', 'name', 'email', 'role'],
                    'action',
                    'description',
                    'old_values',
                    'new_values',
                    'created_at',
                ],
            ]);
    }
}
