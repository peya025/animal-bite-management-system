<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\Patient;
use App\Models\PatientDetails;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Form1IntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected User $adminUser;
    protected ClinicModuleConfigService $configService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create([
            'name'           => 'Tagoloan Animal Bite Treatment Center',
            'address'        => 'Poblacion, Tagoloan',
            'contact_number' => '09171234567',
            'is_active'      => true,
        ]);

        $this->adminUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dr. Admin',
            'email'     => 'admin@tagoloan.local',
            'password'  => bcrypt('secret123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->configService = app(ClinicModuleConfigService::class);
    }

    /**
     * P3-M01: When blood_type (RF1) is Required, missing value fails validation.
     * When supplied with valid value, registration succeeds.
     */
    public function test_form1_required_blood_type_enforced_in_api(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);
        $rules = $config->field_rules;
        $rules['blood_type'] = 'required';
        $config->field_rules = $rules;
        $config->save();

        $validPayload = [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'contact_number' => '09123456789',
            'emergency_contact_name' => 'Maria Dela Cruz',
            'emergency_contact_number' => '09987654321',
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];

        // 1. Omit blood_type -> Expect 422
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/patients', $validPayload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['blood_type']);

        $this->assertDatabaseMissing('patients', [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
        ]);

        // 2. Supply valid blood_type -> Expect 201
        $validPayload['blood_type'] = 'O+';
        $responseSuccess = $this->actingAs($this->adminUser)
            ->postJson('/api/patients', $validPayload);

        $responseSuccess->assertStatus(201);
        $this->assertDatabaseHas('patient_details', [
            'blood_type' => 'O+',
        ]);
    }

    /**
     * P3-M02: When blood_type is Optional or Hidden, omitting it is accepted.
     */
    public function test_form1_optional_and_hidden_blood_type_accepted_when_omitted(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);

        // Optional test
        $rules = $config->field_rules;
        $rules['blood_type'] = 'optional';
        $config->field_rules = $rules;
        $config->save();

        $payload = [
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
            'date_of_birth' => '1995-05-05',
            'contact_number' => '09123456780',
            'emergency_contact_name' => 'Maria Penduko',
            'emergency_contact_number' => '09987654320',
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];

        $respOpt = $this->actingAs($this->adminUser)->postJson('/api/patients', $payload);
        $respOpt->assertStatus(201);

        // Hidden test
        $rules['blood_type'] = 'hidden';
        $config->field_rules = $rules;
        $config->save();

        $payloadHidden = [
            'first_name' => 'Clara',
            'last_name' => 'Santos',
            'gender' => 'female',
            'date_of_birth' => '1998-08-08',
            'contact_number' => '09123456781',
            'emergency_contact_name' => 'Roberto Santos',
            'emergency_contact_number' => '09987654322',
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];

        $respHidden = $this->actingAs($this->adminUser)->postJson('/api/patients', $payloadHidden);
        $respHidden->assertStatus(201);
    }

    /**
     * P3-M03: Conditional field spouse_name (CF1) is required only when civil_status is married.
     */
    public function test_form1_conditional_spouse_name_enforced_only_when_married(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);
        $rules = $config->field_rules;
        $rules['spouse_name'] = 'required';
        $config->field_rules = $rules;
        $config->save();

        $basePayload = [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'gender' => 'female',
            'date_of_birth' => '1992-02-02',
            'contact_number' => '09123456782',
            'emergency_contact_name' => 'Jose Reyes',
            'emergency_contact_number' => '09987654323',
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];

        // 1. Single without spouse_name -> SUCCEEDS (condition false)
        $singlePayload = array_merge($basePayload, ['civil_status' => 'single']);
        $respSingle = $this->actingAs($this->adminUser)->postJson('/api/patients', $singlePayload);
        $respSingle->assertStatus(201);

        // 2. Married without spouse_name -> FAILS 422 (condition true)
        $marriedPayload = array_merge($basePayload, [
            'first_name' => 'Maria',
            'civil_status' => 'married',
        ]);
        $respMarriedFail = $this->actingAs($this->adminUser)->postJson('/api/patients', $marriedPayload);
        $respMarriedFail->assertStatus(422)
            ->assertJsonValidationErrors(['spouse_name']);

        // 3. Married with spouse_name -> SUCCEEDS
        $marriedPayload['spouse_name'] = 'Jose Reyes';
        $respMarriedSuccess = $this->actingAs($this->adminUser)->postJson('/api/patients', $marriedPayload);
        $respMarriedSuccess->assertStatus(201);
        $this->assertDatabaseHas('patient_details', [
            'spouse_name' => 'Jose Reyes',
        ]);
    }

    /**
     * P3-M04: When an optional section is disabled, its required fields do not block submission.
     */
    public function test_form1_disabled_section_suppresses_required_errors(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);
        $rules = $config->field_rules;
        $rules['educational_attainment'] = 'required';
        $config->field_rules = $rules;
        $config->socioeconomic_section_enabled = false;
        $config->save();

        $payload = [
            'first_name' => 'Lucas',
            'last_name' => 'Rivera',
            'gender' => 'male',
            'date_of_birth' => '2000-01-01',
            'contact_number' => '09123456784',
            'emergency_contact_name' => 'Elena Rivera',
            'emergency_contact_number' => '09987654325',
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];

        $resp = $this->actingAs($this->adminUser)->postJson('/api/patients', $payload);
        $resp->assertStatus(201);
    }

    /**
     * P3-M06: Alias mapping (sex -> gender, emergency_contact_phone -> emergency_contact_number).
     */
    public function test_form1_alias_mapping(): void
    {
        $payload = [
            'first_name' => 'Teresa',
            'last_name' => 'Mendoza',
            'sex' => 'female', // UI alias for gender
            'date_of_birth' => '1993-03-03',
            'contact_number' => '09123456785',
            'emergency_contact_name' => 'Mario Mendoza',
            'emergency_contact_phone' => '09987654326', // UI alias for emergency_contact_number
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];

        $resp = $this->actingAs($this->adminUser)->postJson('/api/patients', $payload);
        $resp->assertStatus(201);

        $patient = Patient::where('first_name', 'Teresa')->firstOrFail();
        $this->assertEquals('female', $patient->gender);
        $this->assertEquals('09987654326', $patient->emergency_contact_number);
    }

    /**
     * P3-M07: Hidden fields preserve existing history on edit.
     */
    public function test_form1_hidden_fields_do_not_wipe_existing_data_on_update(): void
    {
        // 1. Create a patient with blood_type 'AB+'
        $patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-2026-0001',
            'first_name' => 'Mateo',
            'last_name' => 'Cruz',
            'gender' => 'male',
            'registered_by' => $this->adminUser->id,
        ]);
        PatientDetails::create([
            'patient_id' => $patient->patient_id,
            'blood_type' => 'AB+',
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ]);

        // 2. Hide blood_type in clinic configuration
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);
        $rules = $config->field_rules;
        $rules['blood_type'] = 'hidden';
        $config->field_rules = $rules;
        $config->save();

        // 3. Update patient's contact number (blood_type omitted from request because it's hidden)
        $updatePayload = [
            'first_name' => 'Mateo',
            'last_name' => 'Cruz',
            'gender' => 'male',
            'contact_number' => '09170001122',
        ];

        $resp = $this->actingAs($this->adminUser)
            ->putJson("/api/patients/{$patient->patient_id}", $updatePayload);

        $resp->assertStatus(200);

        // 4. Verify blood_type remains 'AB+' and contact_number is updated
        $this->assertDatabaseHas('patient_details', [
            'patient_id' => $patient->patient_id,
            'blood_type' => 'AB+',
        ]);
        $this->assertEquals('09170001122', $patient->fresh()->contact_number);
    }
}
