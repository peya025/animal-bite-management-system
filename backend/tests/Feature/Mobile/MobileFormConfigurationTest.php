<?php

namespace Tests\Feature\Mobile;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileFormConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_projection_is_read_only_and_scoped_to_selected_patient(): void
    {
        $clinicA = Clinic::create(['name' => 'Clinic A']);
        $clinicB = Clinic::create(['name' => 'Clinic B']);
        $account = PatientAccount::create(['name' => 'Test', 'email' => 'patient@example.test', 'password' => 'password']);
        $patient = Patient::create([
            'clinic_id' => $clinicA->id, 'first_name' => 'Sample', 'last_name' => 'Patient',
            'gender' => 'male', 'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient->patient_id, [
            'relationship' => 'self', 'is_primary' => true, 'status' => 'verified',
        ]);
        $service = app(ClinicModuleConfigService::class);
        $configA = $service->getOrCreateConfigForClinic($clinicA->id);
        $rules = $configA->field_rules;
        $rules['blood_type'] = 'hidden';
        $configA->update(['field_rules' => $rules, 'revision' => 2, 'address_section_enabled' => false]);
        $service->getOrCreateConfigForClinic($clinicB->id);

        Sanctum::actingAs($account);
        $url = '/api/mobile/form-configuration?patient_id='.$patient->patient_id;
        $this->getJson($url)->assertOk()
            ->assertJsonPath('clinic_id', $clinicA->id)
            ->assertJsonPath('revision', 2)
            ->assertJsonPath('profile.sections.address_section_enabled', false)
            ->assertJsonPath('profile.field_rules.blood_type', 'hidden')
            ->assertJsonMissingPath('profile.field_rules.exposure_category')
            ->assertJsonMissingPath('profile.field_rules.rig_fee')
            ->assertJsonMissingPath('can_edit');

        $this->getJson($url.'&clinic_id='.$clinicB->id)->assertUnprocessable();
        $this->getJson('/api/mobile/form-configuration?clinic_id='.$clinicB->id)
            ->assertOk()->assertJsonPath('profile.field_rules.blood_type', 'optional');
        $this->putJson('/api/mobile/form-configuration', ['clinic_id' => $clinicA->id])->assertStatus(405);
    }

    public function test_mobile_projection_requires_account_and_ownership(): void
    {
        $clinic = Clinic::create(['name' => 'Clinic A']);
        $patient = Patient::create([
            'clinic_id' => $clinic->id, 'first_name' => 'Private', 'last_name' => 'Patient',
            'gender' => 'female', 'registration_source' => 'mobile',
        ]);
        $url = '/api/mobile/form-configuration?patient_id='.$patient->patient_id;
        $this->getJson($url)->assertUnauthorized();

        Sanctum::actingAs(PatientAccount::create([
            'name' => 'Other', 'email' => 'other@example.test', 'password' => 'password',
        ]));
        $this->getJson($url)->assertNotFound();
        $this->getJson('/api/mobile/form-configuration')->assertUnprocessable();
    }
}
