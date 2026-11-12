<?php

namespace Tests\Feature;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\Patient;
use App\Models\PatientDetails;
use App\Models\TreatmentPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\Clinic\ClinicModuleConfigService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Form2AndForm3IntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinic;
    protected User $adminUser;
    protected User $doctorUser;
    protected User $treatmentNurse;
    protected User $unauthorizedStaff;
    protected Patient $patient;
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

        $this->doctorUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Dr. Gregory House',
            'email'     => 'doctor@tagoloan.local',
            'password'  => bcrypt('secret123'),
            'role'      => 'triage',
            'is_active' => true,
        ]);

        $this->treatmentNurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Nurse Florence',
            'email'     => 'nurse@tagoloan.local',
            'password'  => bcrypt('secret123'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);

        $this->unauthorizedStaff = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Staff Bob',
            'email'     => 'staff@tagoloan.local',
            'password'  => bcrypt('secret123'),
            'role'      => 'registration',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Jose',
            'last_name'     => 'Rizal',
            'gender'        => 'male',
            'date_of_birth' => '1995-06-19',
        ]);

        PatientDetails::create([
            'patient_id'           => $this->patient->patient_id,
            'address_municipality' => 'Tagoloan',
            'address_barangay'     => 'Poblacion',
            'province'             => 'Misamis Oriental',
        ]);

        VaccineInventory::create([
            'clinic_id'        => $this->clinic->id,
            'vaccine_type'     => 'Verorab',
            'batch_number'     => 'BATCH-VR-01',
            'current_quantity' => 100,
            'expiration_date'  => now()->addYear()->toDateString(),
            'status'           => 'active',
            'open_vial_status' => 'unopened',
        ]);

        VaccineInventory::create([
            'clinic_id'        => $this->clinic->id,
            'vaccine_type'     => 'Rabipur',
            'batch_number'     => 'BATCH-RB-01',
            'current_quantity' => 100,
            'expiration_date'  => now()->addYear()->toDateString(),
            'status'           => 'active',
            'open_vial_status' => 'unopened',
        ]);

        $this->configService = app(ClinicModuleConfigService::class);
    }

    protected function createEpisode(): BiteIncident
    {
        $incident = BiteIncident::create([
            'clinic_id'         => $this->clinic->id,
            'patient_id'        => $this->patient->patient_id,
            'created_by'        => $this->adminUser->id,
            'episode_number'    => 1,
            'episode_type'      => 'primary',
            'bite_date'         => '2026-11-10',
            'bite_place'        => 'Poblacion, Tagoloan',
            'exposure_category' => 'II',
            'status'            => 'active',
        ]);

        TreatmentPlan::create([
            'clinic_id'  => $this->clinic->id,
            'bite_id'    => $incident->bite_id,
            'patient_id' => $this->patient->patient_id,
            'plan_type'  => 'full_pep',
            'status'     => 'approved',
            'decided_by' => $this->doctorUser->id,
            'decided_at' => now(),
        ]);

        return $incident;
    }

    /**
     * P3-M05 & P3-M08: Exposure Category (LF1) is a locked invariant.
     * Missing exposure_category must be rejected with 422.
     * Category I exposures cannot be prescribed Rabies PEP vaccine.
     */
    public function test_form2_locked_exposure_category_invariant_enforced(): void
    {
        $incident = $this->createEpisode();

        $payload = [
            'patient_id'         => $this->patient->patient_id,
            'bite_id'            => $incident->bite_id,
            'place_of_exposure'  => 'Poblacion, Tagoloan',
            'nature_of_visit'    => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints'   => 'Dog bite on right hand',
            'diagnosis'          => 'Animal bite exposure Category II',
            'treatment_plan'     => 'full_pep',
            'medication_treatment' => 'Verorab',
            'exposure_category'  => '',
        ];

        // 1. Empty exposure_category -> 422
        $responseMissing = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $responseMissing->assertStatus(422)
            ->assertJsonValidationErrors(['exposure_category']);

        // 2. Category I with prescribed PEP vaccine -> 422
        $payload['exposure_category'] = 'I';
        $payload['prescribed_vaccine_type'] = 'Verorab';

        $responseCat1Prohibition = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $responseCat1Prohibition->assertStatus(422)
            ->assertJsonValidationErrors(['prescribed_vaccine_type']);
    }

    /**
     * P3-M08: treatment_given (RF2) dynamic enforcement and section suppression.
     */
    public function test_form2_treatment_given_rf2_rules_enforced(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);

        // 1. Set treatment_given to 'required'
        $rules = $config->field_rules;
        $rules['treatment_given'] = 'required';
        $config->field_rules = $rules;
        $config->treatment_section_enabled = true;
        $config->save();

        $incident = $this->createEpisode();

        $payload = [
            'patient_id'         => $this->patient->patient_id,
            'bite_id'            => $incident->bite_id,
            'place_of_exposure'  => 'Poblacion, Tagoloan',
            'exposure_category'  => 'II',
            'nature_of_visit'    => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints'   => 'Dog bite',
            'treatment_plan'     => 'full_pep',
        ];

        // Missing medication_treatment -> 422
        $resMissing = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $resMissing->assertStatus(422)
            ->assertJsonValidationErrors(['treatment_given']);

        // Supply medication_treatment -> 200 or 201
        $payload['medication_treatment'] = 'Verorab 0.1ml ID Day 0';
        $resSuccess = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $this->assertContains($resSuccess->status(), [200, 201]);

        // 2. Set treatment_given to 'optional'
        $rules['treatment_given'] = 'optional';
        $config->field_rules = $rules;
        $config->save();

        $incident2 = $this->createEpisode();
        $payload['bite_id'] = $incident2->bite_id;
        unset($payload['medication_treatment']);
        unset($payload['treatment_given']);
        $resOptional = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $this->assertContains($resOptional->status(), [200, 201]);

        // 3. Section suppression: treatment_given is 'required' but treatment_section_enabled is false
        $rules['treatment_given'] = 'required';
        $config->field_rules = $rules;
        $config->treatment_section_enabled = false;
        $config->save();

        $incident3 = $this->createEpisode();
        $payload['bite_id'] = $incident3->bite_id;
        $resSuppressed = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $this->assertContains($resSuppressed->status(), [200, 201]);
    }

    /**
     * P3-M08: Role authorization on Form 2.
     * Doctor/Admin can submit; unauthorized staff role is rejected with 403.
     */
    public function test_form2_role_authorization_enforced(): void
    {
        $incident = $this->createEpisode();

        $payload = [
            'patient_id'         => $this->patient->patient_id,
            'bite_id'            => $incident->bite_id,
            'place_of_exposure'  => 'Poblacion, Tagoloan',
            'exposure_category'  => 'II',
            'nature_of_visit'    => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints'   => 'Stray cat bite',
            'treatment_plan'     => 'full_pep',
            'medication_treatment' => 'Rabipur',
        ];

        // Unauthorized staff attempting to submit Form 2 -> 403
        $resUnauthorized = $this->actingAs($this->unauthorizedStaff)
            ->postJson('/api/treatment-records', $payload);

        $resUnauthorized->assertStatus(403);

        // Authorized doctor -> success
        $resDoctor = $this->actingAs($this->doctorUser)
            ->postJson('/api/treatment-records', $payload);

        $this->assertContains($resDoctor->status(), [200, 201]);
    }

    /**
     * P3-M09: Form 3 route (RF3) validation, required enforcement, and section suppression.
     */
    public function test_form3_route_rf3_rules_enforced(): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($this->clinic->id);

        // 1. Set route to 'required'
        $rules = $config->field_rules;
        $rules['route'] = 'required';
        $config->field_rules = $rules;
        $config->treatment_section_enabled = true;
        $config->save();

        $incident = $this->createEpisode();

        $dosePayload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id'    => $incident->bite_id,
            'doses'      => [
                [
                    'period'       => 'Day 0',
                    'date'         => '2026-11-12',
                    'vaccine_type' => 'Verorab',
                    // route missing
                ],
            ],
        ];

        // Missing route on dose -> 422
        $resMissing = $this->actingAs($this->treatmentNurse)
            ->postJson('/api/vaccination-records', $dosePayload);

        $resMissing->assertStatus(422)
            ->assertJsonValidationErrors(['doses.0.route']);

        // Supply valid route 'ID' -> 200 or 201
        $dosePayload['doses'][0]['route'] = 'ID';
        $resSuccess = $this->actingAs($this->treatmentNurse)
            ->postJson('/api/vaccination-records', $dosePayload);

        $this->assertContains($resSuccess->status(), [200, 201]);

        // 2. Set route to 'optional'
        $rules['route'] = 'optional';
        $config->field_rules = $rules;
        $config->save();

        $incident2 = $this->createEpisode();
        $dosePayload['bite_id'] = $incident2->bite_id;
        unset($dosePayload['doses'][0]['route']);
        $dosePayload['doses'][0]['period'] = 'Day 0';
        $resOptional = $this->actingAs($this->treatmentNurse)
            ->postJson('/api/vaccination-records', $dosePayload);

        $this->assertContains($resOptional->status(), [200, 201]);

        // 3. Section suppression: route is 'required' but treatment_section_enabled is false
        $rules['route'] = 'required';
        $config->field_rules = $rules;
        $config->treatment_section_enabled = false;
        $config->save();

        $incident3 = $this->createEpisode();
        $dosePayload['bite_id'] = $incident3->bite_id;
        $dosePayload['doses'][0]['period'] = 'Day 0';
        $resSuppressed = $this->actingAs($this->treatmentNurse)
            ->postJson('/api/vaccination-records', $dosePayload);

        $this->assertContains($resSuppressed->status(), [200, 201]);
    }

    /**
     * P3-M09: Role authorization on Form 3.
     * Treatment nurse can record doses; unauthorized staff/triage is rejected with 403.
     */
    public function test_form3_role_authorization_enforced(): void
    {
        $incident = $this->createEpisode();

        $dosePayload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id'    => $incident->bite_id,
            'doses'      => [
                [
                    'period'       => 'Day 0',
                    'route'        => 'IM',
                    'date'         => '2026-11-12',
                    'vaccine_type' => 'Verorab',
                ],
            ],
        ];

        // Unauthorized staff attempting Form 3 -> 403
        $resUnauthorized = $this->actingAs($this->unauthorizedStaff)
            ->postJson('/api/vaccination-records', $dosePayload);

        $resUnauthorized->assertStatus(403);

        // Treatment nurse -> success
        $resNurse = $this->actingAs($this->treatmentNurse)
            ->postJson('/api/vaccination-records', $dosePayload);

        $this->assertContains($resNurse->status(), [200, 201]);
    }
}
