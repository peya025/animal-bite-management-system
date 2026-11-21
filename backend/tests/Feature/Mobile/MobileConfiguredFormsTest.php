<?php

namespace Tests\Feature\Mobile;

use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Role;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileConfiguredFormsTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clinic = Clinic::create(['name' => 'Test ABTC']);
        $account = PatientAccount::create(['name' => 'Parent', 'email' => 'parent@example.test', 'password' => 'password']);
        $this->patient = Patient::create([
            'clinic_id' => $this->clinic->id, 'first_name' => 'Test', 'last_name' => 'Patient',
            'gender' => 'male', 'address' => 'Original full address',
        ]);
        $this->patient->details()->create([
            'address_municipality' => 'Tagoloan', 'address_barangay' => 'Poblacion',
            'address_purok' => 'Zone 1', 'province' => 'Misamis Oriental',
            'blood_type' => 'O+', 'philhealth_member' => 'yes', 'philhealth_no' => '12-345678901-2',
        ]);
        $account->patients()->attach($this->patient->patient_id, [
            'relationship' => 'self', 'is_primary' => true, 'status' => 'verified',
        ]);
        Sanctum::actingAs($account);
    }

    private function configure(array $fieldRules = [], array $flags = []): void
    {
        $config = app(ClinicModuleConfigService::class)->getOrCreateConfigForClinic($this->clinic->id);
        $config->update(['field_rules' => array_replace($config->field_rules, $fieldRules), ...$flags]);
    }

    private function booking(array $intake = []): array
    {
        return [
            'patient_id' => $this->patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date' => now()->addDays(5)->toDateString(),
            'intake' => array_replace([
                'bite_date' => now()->toDateString(), 'bite_place' => 'Market',
                'site_washed' => false, 'exposure_type' => 'transdermal_bite',
                'animal_type' => 'dog', 'animal_status' => 'owned',
                'wound_location' => 'Arm',
            ], $intake),
        ];
    }

    public function test_required_profile_field_and_hidden_edit_preserves_existing_details(): void
    {
        $this->configure(['blood_type' => 'required']);
        $this->postJson('/api/mobile/patients', [
            'clinic_id' => $this->clinic->id, 'relationship' => 'child',
            'first_name' => 'New', 'last_name' => 'Patient', 'gender' => 'female',
            'address_municipality' => 'Tagoloan', 'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ])->assertUnprocessable()->assertJsonValidationErrors('blood_type');

        $this->configure(['blood_type' => 'hidden', 'address_purok' => 'hidden'], ['gov_programs_section_enabled' => false]);
        $this->patient->memberships()->create([
            'membership_type' => 'philhealth', 'membership_id_no' => '12-345678901-2',
        ]);
        $this->patchJson('/api/mobile/patients/'.$this->patient->patient_id, [
            'relationship' => 'self', 'first_name' => 'Updated', 'last_name' => 'Patient',
            'gender' => 'male', 'blood_type' => null, 'address' => 'Incomplete address',
            'address_purok' => null, 'memberships' => [], 'philhealth_member' => 'no',
        ])->assertOk();
        $this->assertSame('O+', $this->patient->details()->first()->blood_type);
        $this->assertSame('Zone 1', $this->patient->details()->first()->address_purok);
        $this->assertSame('Original full address', $this->patient->fresh()->address);
        $this->assertSame('12-345678901-2', $this->patient->memberships()->first()->membership_id_no);
    }

    public function test_hidden_intake_field_is_omitted_and_false_washing_answer_is_preserved(): void
    {
        $this->configure(['bite_date' => 'hidden', 'patient_description' => 'hidden']);
        $response = $this->postJson('/api/mobile/appointments', $this->booking([
            'bite_date' => null, 'patient_description' => 'Untrusted hidden text',
        ]))->assertCreated();
        $intake = BiteIncidentIntake::where('appointment_id', $response->json('appointment_id'))->firstOrFail();
        $this->assertNull($intake->bite_date);
        $this->assertNull($intake->patient_description);
        $this->assertFalse($intake->site_washed);

        $this->putJson('/api/mobile/appointments/'.$response->json('appointment_id').'/intake', [
            'intake' => ['bite_place' => 'Updated place', 'patient_description' => null],
        ])->assertOk();
        $this->assertSame('Updated place', $intake->fresh()->bite_place);
        $this->assertFalse($intake->fresh()->site_washed);
    }

    public function test_disabled_intake_section_keeps_check_in_available_without_inventing_answers(): void
    {
        $this->configure([], ['bite_intake_section_enabled' => false]);
        $payload = $this->booking();
        $payload['intake'] = ['exposure_category' => 'III', 'bite_date' => null];
        $payload['scheduled_date'] = now()->toDateString();
        $response = $this->postJson('/api/mobile/appointments', $payload)->assertCreated();
        $this->assertDatabaseCount('bite_incident_intakes', 1);
        $this->assertNull(BiteIncidentIntake::firstOrFail()->bite_date);
        $this->assertNull(BiteIncidentIntake::firstOrFail()->site_washed);
        $this->assertNull(BiteIncidentIntake::firstOrFail()->exposure_type);
        $this->assertSame($response->json('appointment_id'), BiteIncidentIntake::firstOrFail()->appointment_id);

        $staff = User::create([
            'clinic_id' => $this->clinic->id, 'name' => 'Registration Staff',
            'email' => 'staff@example.test', 'password' => 'password',
            'role' => 'registration', 'is_active' => true,
        ]);
        $role = Role::firstOrCreate(['slug' => 'registration'], [
            'name' => 'registration', 'display_name' => 'Registration', 'default_route' => '/patients',
        ]);
        $staff->roles()->attach($role->id, ['assigned_at' => now()]);
        Sanctum::actingAs($staff);
        $this->postJson('/api/bite-intakes/'.BiteIncidentIntake::firstOrFail()->intake_id.'/check-in')
            ->assertCreated();
        $this->assertDatabaseHas('bite_incidents', [
            'patient_id' => $this->patient->patient_id,
            'bite_date_is_provisional' => true,
            'status' => 'awaiting_assessment',
        ]);
    }

    public function test_patient_cannot_submit_clinical_assessment_in_intake(): void
    {
        $this->postJson('/api/mobile/appointments', $this->booking([
            'exposure_category' => 'III',
        ]))->assertUnprocessable()->assertJsonValidationErrors('intake.exposure_category');
    }

    public function test_body_part_group_satisfies_mobile_site_requirement_without_exact_detail(): void
    {
        $payload = $this->booking();
        unset($payload['intake']['wound_location']);
        $payload['intake']['body_part_group'] = 'upper_extremities';
        $this->postJson('/api/mobile/appointments', $payload)->assertCreated();
        $this->assertSame('upper_extremities', BiteIncidentIntake::firstOrFail()->body_part_exposed);
        $this->assertNull(BiteIncidentIntake::firstOrFail()->wound_location);
    }

    public function test_booking_requires_current_profile_fields_but_unrelated_profile_edit_does_not(): void
    {
        $this->configure(['blood_type' => 'required']);
        $this->patient->details()->update(['blood_type' => null]);

        $this->patchJson('/api/mobile/patients/'.$this->patient->patient_id, [
            'relationship' => 'self', 'first_name' => 'Updated',
            'last_name' => 'Patient', 'gender' => 'male',
        ])->assertOk();

        $this->postJson('/api/mobile/appointments', $this->booking())
            ->assertUnprocessable()->assertJsonValidationErrors('profile.blood_type');
    }

    public function test_hidden_membership_detail_cannot_be_replaced_through_collection(): void
    {
        $this->patient->memberships()->create([
            'membership_type' => 'philhealth', 'membership_id_no' => '12-345678901-2',
        ]);
        $this->configure(['philhealth_no' => 'hidden']);

        $this->patchJson('/api/mobile/patients/'.$this->patient->patient_id, [
            'relationship' => 'self', 'first_name' => 'Test',
            'last_name' => 'Patient', 'gender' => 'male',
            'memberships' => [[
                'membership_type' => 'philhealth',
                'membership_id_no' => 'FORGED',
                'status_value' => 'member',
            ]],
            'philhealth_no' => 'FORGED',
        ])->assertOk();
        $this->assertSame('12-345678901-2', $this->patient->memberships()->first()->membership_id_no);
        $this->assertSame('12-345678901-2', $this->patient->details()->first()->philhealth_no);
    }
}
