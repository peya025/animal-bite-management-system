<?php

namespace Tests\Feature;

use App\Models\{BiteIncident, Clinic, Patient, Queue, Role, TagoloanTreatmentCard, TreatmentPlan, TreatmentRecord, User, VaccineInventory};
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryITreatmentLogicTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $doctor;
    private User $nurse;
    private Patient $patient;
    private BiteIncident $incident;
    private Queue $queue;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::create(2026, 10, 26, 9, 30));

        $this->clinic = Clinic::create(['name' => 'Category I Test Clinic']);
        $this->doctor = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'triage',
            'is_active' => true,
        ]);
        $this->nurse = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        $this->patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'CAT1-001',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'gender' => 'female',
        ]);
        $this->incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_date' => '2026-10-25',
            'severity' => 'minor',
            'exposure_category' => 'I',
            'animal_type' => 'dog',
            'status' => 'active',
            'episode_type' => 'primary',
            'episode_number' => 1,
            'created_by' => $this->doctor->id,
        ]);
        $this->queue = Queue::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_number' => 1,
            'queue_date' => '2026-10-26',
            'visit_type' => 'new_case',
            'status' => 'in_consultation',
            'checked_in_by' => $this->doctor->id,
        ]);

        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Tetanus Toxoid (TT)',
            'batch_number' => 'TT-CAT1-01',
            'current_quantity' => 20,
            'expiration_date' => '2027-12-31',
            'status' => 'active',
        ]);
        VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'SP-CAT1-01',
            'current_quantity' => 20,
            'expiration_date' => '2027-12-31',
            'status' => 'active',
        ]);
    }

    public function test_category_1_with_no_treatment_locks_pep_completes_queue_and_marks_incident_completed(): void
    {
        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Animal licking intact skin',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        // 1. Consultation & record saved
        $record = TreatmentRecord::where('patient_id', $this->patient->patient_id)
            ->where('nature_of_visit', 'new_consultation')
            ->first();
        $this->assertNotNull($record);
        $this->assertNull($record->prescribed_vaccine_type);
        $this->assertSame('No PEP vaccine prescribed', $record->medication_treatment);

        // 2. Bite incident updated to minor and completed
        $this->incident->refresh();
        $this->assertSame('minor', $this->incident->severity);
        $this->assertSame('completed', $this->incident->status);
        $this->assertNotNull($this->incident->confirmed_at);

        // 3. Treatment plan created as no_vaccine and completed
        $plan = TreatmentPlan::where('bite_id', $this->incident->bite_id)->first();
        $this->assertNotNull($plan);
        $this->assertSame('no_vaccine', $plan->plan_type);
        $this->assertSame('completed', $plan->status);

        // 4. Queue ticket completed directly (not transferred to treatment station)
        $this->queue->refresh();
        $this->assertSame('completed', $this->queue->status);
        $this->assertStringContainsString('Doctor decision: Category I — No treatment required.', $this->queue->consultation_notes);
    }

    public function test_category_1_with_no_treatment_blocks_form3_card_data_and_submission(): void
    {
        // Setup finalized Category I record with no treatment indicated
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'nature_of_visit' => 'new_consultation',
            'consultation_date' => '2026-10-26',
            'chief_complaints' => 'Intact skin lick',
            'status' => 'completed',
            'prophylaxis_orders' => ['tetanus_category' => 'not_indicated'],
        ]);
        $this->incident->update(['confirmed_at' => now(), 'status' => 'completed']);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'plan_type' => 'no_vaccine',
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->nurse);

        // 1. Form 3 endpoint reports form3_ready = false
        $cardRes = $this->getJson("/api/tagoloan-treatment-cards/patient/{$this->patient->patient_id}?bite_id={$this->incident->bite_id}");
        $cardRes->assertOk();
        $this->assertFalse($cardRes->json('form3_ready'));
        $this->assertStringContainsString('Category I with no nurse-administered treatment required', $cardRes->json('form3_block_reason'));

        // 2. Direct API submission to store Form 3 card is rejected with 422
        $storeCardRes = $this->postJson('/api/tagoloan-treatment-cards', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'card_date' => '2026-10-26',
            'mode_of_exposure' => 'nibbling_uncovered_skin',
            'body_part_exposed' => 'upper_extremities',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_available' => 'yes',
            'animal_condition' => 'healthy',
            'doses' => [],
        ]);
        $storeCardRes->assertStatus(422);
        $storeCardRes->assertJsonValidationErrors('category');
    }

    public function test_category_1_with_tetanus_prophylaxis_transfers_to_treatment_and_allows_form3(): void
    {
        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Minor abrasion, dog scratch',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'TT',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        // 1. Treatment plan is approved (for nurse prophylaxis administration)
        $plan = TreatmentPlan::where('bite_id', $this->incident->bite_id)->first();
        $this->assertNotNull($plan);
        $this->assertSame('no_vaccine', $plan->plan_type);
        $this->assertSame('approved', $plan->status);

        // 2. Queue ticket transferred to treatment station
        $this->queue->refresh();
        $this->assertSame('waiting', $this->queue->status);
        $this->assertSame('vaccination', $this->queue->visit_type);
        $this->assertStringContainsString('Tetanus prophylaxis prescribed', $this->queue->consultation_notes);

        // 3. Form 3 endpoint reports form3_ready = true
        Sanctum::actingAs($this->nurse);
        $cardRes = $this->getJson("/api/tagoloan-treatment-cards/patient/{$this->patient->patient_id}?bite_id={$this->incident->bite_id}");
        $cardRes->assertOk();
        $this->assertTrue($cardRes->json('form3_ready'));

        // 4. Nurse records TT prophylaxis administration via Form 3
        $inventory = VaccineInventory::where('clinic_id', $this->clinic->id)
            ->where('vaccine_type', 'Tetanus Toxoid (TT)')
            ->first();

        $form3Payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'card_date' => '2026-10-26',
            'mode_of_exposure' => 'scratch_abrasion',
            'body_part_exposed' => 'upper_extremities',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_available' => 'yes',
            'animal_condition' => 'healthy',
            'doses' => [],
            'prophylaxis_administrations' => [
                [
                    'medication' => 'TT',
                    'date' => '2026-10-26',
                    'inventory_id' => (string) $inventory->inventory_id,
                    'inventory_units_used' => '1',
                    'route' => 'IM',
                    'injection_site' => 'Right deltoid',
                    'dosage_ml' => '0.5',
                ],
            ],
        ];

        $saveRes = $this->postJson('/api/tagoloan-treatment-cards', $form3Payload);
        $saveRes->assertOk();

        $saveVacRes = $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'doses' => [],
            'prophylaxis_administrations' => [
                [
                    'medication' => 'TT',
                    'date' => '2026-10-26',
                    'inventory_id' => (string) $inventory->inventory_id,
                    'inventory_units_used' => '1',
                    'route' => 'IM',
                    'injection_site' => 'Right deltoid',
                    'dosage_ml' => '0.5',
                ],
            ],
        ]);
        $saveVacRes->assertCreated();

        // 5. Inventory deducted and queue ticket completed
        $inventory->refresh();
        $this->assertSame(19, $inventory->current_quantity);

        $this->queue->refresh();
        $this->assertSame('completed', $this->queue->status);

        $this->incident->refresh();
        $this->assertSame('completed', $this->incident->status);
    }

    public function test_category_1_rejects_rabies_pep_prescription_in_form2(): void
    {
        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Intact skin contact',
            'consultation_date' => '2026-10-26',
            'prescribed_vaccine_type' => 'Speeda', // Attempting to prescribe rabies vaccine for Cat 1
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors('prescribed_vaccine_type');
    }

    public function test_category_1_rejects_rabies_vaccine_dose_in_form3(): void
    {
        // Doctor saves Category I with TT order
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'nature_of_visit' => 'new_consultation',
            'consultation_date' => '2026-10-26',
            'chief_complaints' => 'Minor abrasion',
            'status' => 'completed',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'TT',
            ],
        ]);
        $this->incident->update(['confirmed_at' => now(), 'status' => 'active']);
        TreatmentPlan::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'plan_type' => 'no_vaccine',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($this->nurse);

        // Attempting to submit a rabies dose (Day 0 Speeda) for Category I
        $form3Payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'card_date' => '2026-10-26',
            'mode_of_exposure' => 'scratch_abrasion',
            'body_part_exposed' => 'upper_extremities',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_available' => 'yes',
            'animal_condition' => 'healthy',
            'doses' => [
                [
                    'period' => 'Day 0',
                    'route' => 'ID',
                    'date' => '2026-10-26',
                    'vaccine_type' => 'Speeda',
                    'inventory_units_used' => 1,
                ],
            ],
        ];

        $saveRes = $this->postJson('/api/tagoloan-treatment-cards', $form3Payload);
        $saveRes->assertStatus(422);
        $saveRes->assertJsonValidationErrors('doses');

        $saveVacRes = $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'doses' => [
                [
                    'period' => 'Day 0',
                    'route' => 'ID',
                    'date' => '2026-10-26',
                    'vaccine_type' => 'Speeda',
                    'inventory_units_used' => 1,
                ],
            ],
        ]);
        $saveVacRes->assertStatus(422);
        $saveVacRes->assertJsonValidationErrors('doses');
    }

    public function test_category_2_and_3_preserve_existing_pep_workflow(): void
    {
        $this->incident->update([
            'severity' => 'moderate',
            'exposure_category' => 'II',
        ]);

        Sanctum::actingAs($this->doctor);

        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'II',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Minor scratch with bleeding',
            'consultation_date' => '2026-10-26',
            'prescribed_vaccine_type' => 'Speeda',
            'treatment_plan' => 'full_pep',
        ];

        $response = $this->postJson('/api/treatment-records', $payload);
        $response->assertCreated();

        // 1. Treatment plan is full_pep approved
        $plan = TreatmentPlan::where('bite_id', $this->incident->bite_id)->first();
        $this->assertSame('full_pep', $plan->plan_type);
        $this->assertSame('approved', $plan->status);

        // 2. Queue ticket transferred to treatment
        $this->queue->refresh();
        $this->assertSame('waiting', $this->queue->status);
        $this->assertSame('vaccination', $this->queue->visit_type);

        // 3. Nurse administers Day 0 Speeda via Form 3
        Sanctum::actingAs($this->nurse);

        $speeda = VaccineInventory::where('clinic_id', $this->clinic->id)
            ->where('vaccine_type', 'Speeda')
            ->first();

        $form3Payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'card_date' => '2026-10-26',
            'mode_of_exposure' => 'scratch_abrasion',
            'body_part_exposed' => 'upper_extremities',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_available' => 'yes',
            'animal_condition' => 'healthy',
            'doses' => [
                [
                    'period' => 'Day 0',
                    'route' => 'ID',
                    'date' => '2026-10-26',
                    'vaccine_type' => 'Speeda',
                    'inventory_units_used' => 1,
                ],
            ],
        ];

        $saveRes = $this->postJson('/api/tagoloan-treatment-cards', $form3Payload);
        $saveRes->assertOk();

        $saveVacRes = $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'doses' => [
                [
                    'period' => 'Day 0',
                    'route' => 'ID',
                    'date' => '2026-10-26',
                    'vaccine_type' => 'Speeda',
                    'inventory_units_used' => 1,
                ],
            ],
        ]);
        $saveVacRes->assertCreated();

        $speeda->refresh();
        $this->assertSame(19, $speeda->current_quantity);
    }

    public function test_category_1_with_no_treatment_prevents_checkin_and_vaccination_queue(): void
    {
        // 1. Doctor completes Category I with no treatment
        Sanctum::actingAs($this->doctor);
        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Animal licking intact skin',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];
        $this->postJson('/api/treatment-records', $payload)->assertCreated();

        // Fresh patient attributes
        $this->patient->refresh();
        $this->assertTrue($this->patient->is_category1_no_treatment);

        // 2. Patient Management list returns is_category1_no_treatment = true
        $regStaff = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);
        $role = Role::firstOrCreate(['slug' => 'registration'], [
            'name' => 'registration',
            'display_name' => 'Registration',
            'default_route' => '/patients',
        ]);
        $regStaff->roles()->attach($role->id, ['assigned_at' => now()]);

        Sanctum::actingAs($regStaff);
        $listRes = $this->getJson('/api/patients');
        $listRes->assertOk();
        $patientData = collect($listRes->json('data'))->firstWhere('patient_id', $this->patient->patient_id);
        $this->assertNotNull($patientData);
        $this->assertTrue($patientData['is_category1_no_treatment']);

        // 3. Check-In endpoint rejects check-in for this patient
        $checkInRes = $this->postJson("/api/patients/{$this->patient->patient_id}/check-in");
        $checkInRes->assertStatus(422);
        $this->assertSame(
            'Doctor assessment is completed (Category I — No Treatment Required). This patient cannot enter the treatment queue.',
            $checkInRes->json('message')
        );

        // 4. QueueService / queue store endpoint rejects vaccination queueing
        $queueRes = $this->postJson('/api/queue', [
            'patient_id' => $this->patient->patient_id,
            'visit_type' => 'vaccination',
            'priority' => 'normal',
            'category' => 'regular',
        ]);
        $queueRes->assertStatus(422);
        $queueRes->assertJsonValidationErrors('visit_type');

        // 5. Patient is not counted as awaiting treatment or overdue
        $matrixResult = app(\App\Services\VaccinationJourneyService::class)
            ->buildMatrix($this->clinic->id, null, null, null, 'all', 'all', 1, 20);
        $this->assertGreaterThanOrEqual(1, $matrixResult['kpi']['completed']);
        $this->assertSame(0, $matrixResult['kpi']['overdue_missed']);
    }

    public function test_category_1_with_prescribed_treatment_allows_checkin_and_treatment_queue(): void
    {
        // 1. Doctor prescribes tetanus prophylaxis for Category I
        Sanctum::actingAs($this->doctor);
        $payload = [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Minor scrape, intact skin licked with minor scrape',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'TT',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ];
        $this->postJson('/api/treatment-records', $payload)->assertCreated();

        $this->patient->refresh();
        $this->assertFalse($this->patient->is_category1_no_treatment);

        // Queue ticket is transferred to treatment queue (visit_type = vaccination, status = waiting)
        $this->queue->refresh();
        $this->assertSame('waiting', $this->queue->status);
        $this->assertSame('vaccination', $this->queue->visit_type);
    }

    public function test_unfinished_doctor_assessment_preserves_pending_workflow(): void
    {
        // Patient registered with awaiting_assessment incident, no consultation completed yet
        $unassessedPatient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PEND-001',
            'first_name' => 'Pending',
            'last_name' => 'Assessment',
            'gender' => 'male',
        ]);
        $unassessedIncident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $unassessedPatient->patient_id,
            'bite_date' => '2026-10-26',
            'severity' => 'unassessed',
            'exposure_category' => 'I',
            'status' => 'awaiting_assessment',
            'confirmed_at' => null,
            'created_by' => $this->doctor->id,
        ]);

        $this->assertFalse($unassessedPatient->fresh()->is_category1_no_treatment);

        // API list returns false for is_category1_no_treatment
        $regStaff = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);
        $role = Role::firstOrCreate(['slug' => 'registration'], [
            'name' => 'registration',
            'display_name' => 'Registration',
            'default_route' => '/patients',
        ]);
        $regStaff->roles()->attach($role->id, ['assigned_at' => now()]);

        Sanctum::actingAs($regStaff);
        $listRes = $this->getJson('/api/patients');
        $listRes->assertOk();
        $patientData = collect($listRes->json('data'))->firstWhere('patient_id', $unassessedPatient->patient_id);
        $this->assertNotNull($patientData);
        $this->assertFalse($patientData['is_category1_no_treatment']);
    }

    public function test_category_2_and_3_with_pep_preserves_checkin_and_treatment_workflow(): void
    {
        $cat2Patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'CAT2-001',
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
        ]);
        $cat2Incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $cat2Patient->patient_id,
            'bite_date' => '2026-10-26',
            'severity' => 'moderate',
            'exposure_category' => 'II',
            'status' => 'active',
            'confirmed_at' => now(),
            'created_by' => $this->doctor->id,
        ]);
        $cat2Queue = Queue::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $cat2Patient->patient_id,
            'bite_id' => $cat2Incident->bite_id,
            'queue_number' => 99,
            'queue_date' => '2026-10-26',
            'visit_type' => 'new_case',
            'status' => 'in_consultation',
            'checked_in_by' => $this->doctor->id,
        ]);

        Sanctum::actingAs($this->doctor);
        $payload = [
            'patient_id' => $cat2Patient->patient_id,
            'bite_id' => $cat2Incident->bite_id,
            'queue_id' => $cat2Queue->queue_id,
            'exposure_category' => 'II',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Minor scratch with bleeding',
            'consultation_date' => '2026-10-26',
            'prescribed_vaccine_type' => 'Speeda',
            'treatment_plan' => 'full_pep',
        ];
        $this->postJson('/api/treatment-records', $payload)->assertCreated();

        $cat2Patient->refresh();
        $this->assertFalse($cat2Patient->is_category1_no_treatment);

        // Queue is routed to vaccination/treatment
        $cat2Queue->refresh();
        $this->assertSame('waiting', $cat2Queue->status);
        $this->assertSame('vaccination', $cat2Queue->visit_type);
    }
}
