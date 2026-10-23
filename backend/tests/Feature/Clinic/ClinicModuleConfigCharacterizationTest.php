<?php

namespace Tests\Feature\Clinic;

use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicModuleConfigCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'admin'], [
            'name'          => 'admin',
            'display_name'  => 'Administrator',
            'default_route' => '/admin',
        ]);

        $roleNurse = Role::firstOrCreate(['slug' => 'triage_nurse'], [
            'name'          => 'triage_nurse',
            'display_name'  => 'Triage Nurse',
            'default_route' => '/queue',
        ]);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Admin User',
            'email'     => 'admin@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Nurse User',
            'email'     => 'nurse@clinic.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'triage',
            'is_active' => true,
        ]);
        $this->nurse->roles()->attach($roleNurse->id, ['assigned_at' => now()]);
    }

    private function getSampleFieldRules(string $overrideValue = 'optional'): array
    {
        return [
            // PATIENT REGISTRATION FIELDS
            'blood_type' => $overrideValue,
            'mother_maiden_name' => 'optional',
            'civil_status' => 'optional',
            'spouse_name' => 'optional',

            // ADDRESS FIELDS
            'address_municipality' => 'required',
            'address_barangay' => 'required',
            'address_purok' => 'optional',
            'province' => 'required',

            // SOCIOECONOMIC FIELDS
            'educational_attainment' => 'optional',
            'employment_status' => 'optional',
            'family_member' => 'optional',

            // GOVERNMENT PROGRAMS
            'philhealth_member' => 'optional',
            'philhealth_status' => 'optional',
            'philhealth_no' => 'optional',
            'philhealth_category' => 'optional',
            'fourps_member' => 'optional',
            'dswd_nhts' => 'optional',

            // BITE INCIDENT INTAKE FIELDS
            'bite_date' => 'required',
            'bite_place' => 'required',
            'site_washed' => 'required',
            'exposure_type' => 'required',
            'animal_type' => 'required',
            'animal_status' => 'required',
            'animal_captured' => 'optional',
            'wound_location' => 'required',
            'patient_description' => 'optional',

            // TRIAGE/ASSESSMENT FIELDS
            'exposure_category' => 'required',
            'bite_site' => 'required',
            'animal_observation_status' => 'optional',
            'treatment_given' => 'optional',

            // TREATMENT FIELDS
            'protocol_type' => 'required',
            'route' => 'optional',
            'injection_site' => 'optional',
            'dosage_ml' => 'optional',
            'vaccine_brand' => 'optional',
            'vaccine_generic' => 'optional',
            'batch_no' => 'optional',
            'tt_status' => 'optional',
            'medication_given' => 'optional',
            'adverse_reaction' => 'optional',
            'cost_recovery' => 'optional',
        ];
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/setup/module-config')
            ->assertStatus(401);

        $this->putJson('/api/setup/module-config', [
            'triage_module_enabled' => true,
            'field_rules' => [],
        ])->assertStatus(401);
    }

    public function test_authenticated_staff_can_view_default_module_config(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->getJson('/api/setup/module-config');

        $response->assertStatus(200)
            ->assertJson([
                'clinic_id' => $this->clinic->id,
                'triage_module_enabled' => true,
                'patient_registration_enabled' => true,
                'address_section_enabled' => true,
                'socioeconomic_section_enabled' => true,
                'gov_programs_section_enabled' => true,
                'bite_intake_section_enabled' => true,
                'triage_section_enabled' => true,
                'treatment_section_enabled' => true,
            ]);

        $data = $response->json();
        $this->assertIsArray($data['field_rules']);
        $this->assertCount(41, $data['field_rules']);
        $this->assertEquals('optional', $data['field_rules']['blood_type']);
        $this->assertEquals('required', $data['field_rules']['address_municipality']);
        $this->assertEquals('required', $data['field_rules']['bite_date']);

        $this->assertDatabaseHas('clinic_module_configs', [
            'clinic_id' => $this->clinic->id,
            'triage_module_enabled' => true,
        ]);
    }

    public function test_non_admin_cannot_update_module_config(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->putJson('/api/setup/module-config', [
            'triage_module_enabled' => false,
            'field_rules' => $this->getSampleFieldRules(),
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Unauthorized. Admin access required.',
            ]);
    }

    public function test_admin_cannot_update_with_missing_or_invalid_fields(): void
    {
        Sanctum::actingAs($this->admin);

        // Missing field_rules entirely
        $response = $this->putJson('/api/setup/module-config', [
            'triage_module_enabled' => true,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['field_rules']);

        // Missing triage_module_enabled
        $response = $this->putJson('/api/setup/module-config', [
            'field_rules' => $this->getSampleFieldRules(),
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['triage_module_enabled']);

        // Invalid rule value for a field (not required, optional, or hidden)
        $rules = $this->getSampleFieldRules();
        $rules['blood_type'] = 'disallowed_value';
        $response = $this->putJson('/api/setup/module-config', [
            'triage_module_enabled' => true,
            'field_rules' => $rules,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['field_rules.blood_type']);

        // Missing one of the required keys in field_rules
        $incompleteRules = $this->getSampleFieldRules();
        unset($incompleteRules['spouse_name']);
        $response = $this->putJson('/api/setup/module-config', [
            'triage_module_enabled' => true,
            'field_rules' => $incompleteRules,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['field_rules.spouse_name']);
    }

    public function test_admin_can_update_module_config_successfully(): void
    {
        Sanctum::actingAs($this->admin);

        $sampleRules = $this->getSampleFieldRules();
        $sampleRules['blood_type'] = 'required';
        $sampleRules['spouse_name'] = 'hidden';

        $payload = [
            'triage_module_enabled'         => false,
            'patient_registration_enabled'  => true,
            'address_section_enabled'       => true,
            'socioeconomic_section_enabled' => false,
            'gov_programs_section_enabled'  => false,
            'bite_intake_section_enabled'   => true,
            'triage_section_enabled'        => false,
            'treatment_section_enabled'     => true,
            'field_rules'                   => $sampleRules,
        ];

        $response = $this->putJson('/api/setup/module-config', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Module configuration updated successfully',
                'config' => [
                    'clinic_id'                     => $this->clinic->id,
                    'triage_module_enabled'         => false,
                    'patient_registration_enabled'  => true,
                    'socioeconomic_section_enabled' => false,
                    'gov_programs_section_enabled'  => false,
                    'triage_section_enabled'        => false,
                ],
            ]);

        $responseData = $response->json('config');
        $this->assertEquals('required', $responseData['field_rules']['blood_type']);
        $this->assertEquals('hidden', $responseData['field_rules']['spouse_name']);

        $this->assertDatabaseHas('clinic_module_configs', [
            'clinic_id' => $this->clinic->id,
            'triage_module_enabled' => false,
            'socioeconomic_section_enabled' => false,
        ]);
    }

    public function test_show_returns_persisted_module_config_without_overwriting(): void
    {
        // Pre-create custom config
        $customRules = $this->getSampleFieldRules();
        $customRules['blood_type'] = 'hidden';

        ClinicModuleConfig::create([
            'clinic_id'                     => $this->clinic->id,
            'triage_module_enabled'         => false,
            'patient_registration_enabled'  => false,
            'address_section_enabled'       => true,
            'socioeconomic_section_enabled' => false,
            'gov_programs_section_enabled'  => false,
            'bite_intake_section_enabled'   => false,
            'triage_section_enabled'        => false,
            'treatment_section_enabled'     => false,
            'field_rules'                   => $customRules,
        ]);

        Sanctum::actingAs($this->nurse);

        $response = $this->getJson('/api/setup/module-config');

        $response->assertStatus(200)
            ->assertJson([
                'clinic_id'                     => $this->clinic->id,
                'triage_module_enabled'         => false,
                'patient_registration_enabled'  => false,
                'socioeconomic_section_enabled' => false,
            ]);

        $data = $response->json();
        $this->assertEquals('hidden', $data['field_rules']['blood_type']);
    }
}
