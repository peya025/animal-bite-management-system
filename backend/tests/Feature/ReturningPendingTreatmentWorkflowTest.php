<?php

namespace Tests\Feature;

use App\Models\{Appointment, BiteIncident, Clinic, Patient, Queue, TagoloanTreatmentCard, TreatmentPlan, TreatmentRecord, User, VaccineInventory};
use App\Services\DohReportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReturningPendingTreatmentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $registrationStaff;
    private User $doctor;
    private User $nurse;
    private Patient $patient;
    private BiteIncident $incident;
    private Queue $day1Queue;
    private VaccineInventory $ttStock;
    private VaccineInventory $atsStock;
    private VaccineInventory $speedaStock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::create(2026, 10, 26, 9, 0));

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC Test Clinic']);
        $this->registrationStaff = User::factory()->create([
            'clinic_id' => $this->clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);
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
            'patient_number' => 'RET-2026-001',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'date_of_birth' => '1990-05-15',
            'age' => 36,
        ]);
        $this->incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_date' => '2026-10-26',
            'bite_place' => 'Poblacion, Tagoloan',
            'severity' => 'minor',
            'exposure_category' => 'I',
            'animal_type' => 'dog',
            'status' => 'active',
            'episode_type' => 'primary',
            'episode_number' => 1,
            'created_by' => $this->registrationStaff->id,
        ]);
        $this->day1Queue = Queue::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_number' => 1,
            'queue_date' => '2026-10-26',
            'visit_type' => 'new_case',
            'status' => 'in_consultation',
            'checked_in_by' => $this->registrationStaff->id,
        ]);

        $this->ttStock = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Tetanus Toxoid (TT)',
            'batch_number' => 'TT-BATCH-01',
            'current_quantity' => 20,
            'expiration_date' => '2027-12-31',
            'status' => 'active',
        ]);
        $this->atsStock = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Anti-Tetanus Serum (ATS)',
            'batch_number' => 'ATS-BATCH-01',
            'current_quantity' => 20,
            'expiration_date' => '2027-12-31',
            'status' => 'active',
        ]);
        $this->speedaStock = VaccineInventory::create([
            'clinic_id' => $this->clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'SP-BATCH-01',
            'current_quantity' => 20,
            'expiration_date' => '2027-12-31',
            'status' => 'active',
        ]);
    }

    /**
     * Scenario 1 & 10:
     * Patient completes Form 2 with TT prescribed on Oct 26, leaves before Nurse Form 3,
     * returns on Oct 27, checks in with updated vitals, is reassessed by Doctor (continue),
     * receives TT in Form 3, and Official Animal Bite Treatment Form distinguishes both consultations.
     */
    public function test_scenario_1_and_10_tt_prescribed_leaves_returns_reassessed_and_administered(): void
    {
        // Day 1 (Oct 26): Doctor completes Form 2 prescribing TT
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->day1Queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Minor abrasion on hand',
            'diagnosis' => 'Category I Dog Scratch',
            'consultation_date' => '2026-10-26',
            'blood_pressure' => '120/80',
            'temperature' => '36.6',
            'weight' => '65',
            'height' => '168',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'Tetanus Toxoid (TT)',
                'tetanus_passive' => 'none',
                'rig' => 'none',
                'notes' => 'Give 0.5mL TT IM',
            ],
        ])->assertCreated();

        // Patient leaves before Nurse Form 3. Verify stock was NOT deducted and DOH report does NOT count as vaccinated.
        $this->assertSame(20, $this->ttStock->fresh()->current_quantity);
        $dohReport = app(DohReportService::class)->getExposureRegistry($this->clinic->id, '2026-10-01', '2026-12-31');
        $this->assertSame(0, $dohReport['totals']['tcv']);

        // Day 2 (Oct 27): Patient returns
        $this->travelTo(Carbon::create(2026, 10, 27, 8, 30));
        $statusSummary = $this->patient->fresh()->resolveEpisodeStatusSummary();
        $this->assertSame('pending_administration', $statusSummary['treatment_status']);
        $this->assertTrue($statusSummary['pending_treatment_summary']['is_returning_from_prior_visit']);
        $this->assertTrue($statusSummary['pending_treatment_summary']['can_check_in_for_reassessment']);

        // Registration Staff checks in returning patient WITHOUT vitals -> must fail 422
        Sanctum::actingAs($this->registrationStaff);
        $this->postJson("/api/patients/{$this->patient->patient_id}/check-in", [])
            ->assertStatus(422);

        // Registration Staff checks in returning patient WITH updated vitals
        $checkInRes = $this->postJson("/api/patients/{$this->patient->patient_id}/check-in", [
            'blood_pressure' => '118/78',
            'temperature' => '36.7',
            'weight' => '65',
            'height' => '168',
            'consultation_date' => '2026-10-27',
            'consultation_time' => '08:30',
        ]);
        $checkInRes->assertOk()
            ->assertJsonPath('is_pending_treatment_reassessment', true);

        // Verify NO duplicate BiteIncident was created
        $this->assertSame(1, BiteIncident::where('patient_id', $this->patient->patient_id)->count());
        $this->assertSame('returned_for_reassessment', $this->patient->fresh()->treatment_status);

        $day2QueueId = $checkInRes->json('queue.queue_id');

        // Doctor opens Form 2 details -> sees previous consultation read-only and reassessment flag
        Sanctum::actingAs($this->doctor);
        $detailsRes = $this->getJson("/api/treatment-records/patient/{$this->patient->patient_id}?bite_id={$this->incident->bite_id}");
        $detailsRes->assertOk()
            ->assertJsonPath('is_pending_treatment_reassessment', true)
            ->assertJsonCount(1, 'previous_consultations');

        // Doctor saves Reassessment (Continue Previous Prescription)
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $day2QueueId,
            'exposure_category' => 'I',
            'reassessment_decision' => 'continue',
            'reassessment_notes' => 'Patient returned stable; continue TT order.',
            'nature_of_visit' => 'follow_up',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Returned for pending TT administration',
            'diagnosis' => 'Category I Dog Scratch — Reassessed',
            'consultation_date' => '2026-10-27',
            'blood_pressure' => '118/78',
            'temperature' => '36.7',
            'weight' => '65',
            'height' => '168',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'Tetanus Toxoid (TT)',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ])->assertCreated();

        // Both Day 1 and Day 2 completed consultation records must exist
        $completedConsults = TreatmentRecord::where('patient_id', $this->patient->patient_id)
            ->whereNull('dose_number')
            ->whereNull('medication_given')
            ->where('status', 'completed')
            ->get();
        $this->assertCount(2, $completedConsults);

        // Nurse administers TT in Form 3 on Oct 27
        Sanctum::actingAs($this->nurse);
        $nurseQueue = Queue::where('patient_id', $this->patient->patient_id)
            ->where('visit_type', 'vaccination')
            ->where('queue_date', '2026-10-27')
            ->first();
        $this->assertNotNull($nurseQueue);

        $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $nurseQueue->queue_id,
            'place_of_exposure' => 'Poblacion, Tagoloan',
            'mode_of_exposure' => ['scratch_abrasion'],
            'body_part_affected' => ['upper_extremities'],
            'animal_type' => 'dog',
            'doses' => [],
            'prophylaxis_administrations' => [
                [
                    'type' => 'tetanus',
                    'medication' => 'Tetanus Toxoid (TT)',
                    'status' => 'administered',
                    'date' => '2026-10-27',
                    'route' => 'IM',
                    'site' => 'Left Deltoid',
                    'dose' => '0.5 mL',
                    'inventory_id' => $this->ttStock->inventory_id,
                    'inventory_units_used' => 1,
                ],
            ],
        ])->assertCreated();

        // Stock deducted only once on Oct 27
        $this->assertSame(19, $this->ttStock->fresh()->current_quantity);
        $this->assertSame('administered', $this->patient->fresh()->treatment_status);

        // Official Animal Bite Treatment Form data distinguishes Previous Consultation (Oct 26) and Returning Consultation (Oct 27)
        $cardRes = $this->getJson("/api/tagoloan-treatment-cards/patient/{$this->patient->patient_id}?bite_id={$this->incident->bite_id}");
        $cardRes->assertOk()
            ->assertJsonCount(2, 'consultation_history')
            ->assertJsonPath('consultation_history.0.consultation_date', '2026-10-26')
            ->assertJsonPath('consultation_history.0.administration_status', 'Not Administered')
            ->assertJsonPath('consultation_history.1.consultation_date', '2026-10-27')
            ->assertJsonPath('consultation_history.1.is_returning_reassessment', true)
            ->assertJsonPath('consultation_history.1.reassessment_decision', 'continue')
            ->assertJsonPath('consultation_history.1.administration_status', 'Administered');
    }

    /**
     * Scenario 2:
     * Patient completes Form 2 with ATS prescribed, leaves before Nurse Form 3,
     * returns the next day, is reassessed, and receives ATS in Form 3.
     */
    public function test_scenario_2_ats_prescribed_leaves_returns_reassessed_and_administered(): void
    {
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->day1Queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Skin abrasion',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'ats',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'Anti-Tetanus Serum (ATS)',
                'rig' => 'none',
                'notes' => 'Give 1500 IU ATS after skin test',
            ],
        ])->assertCreated();

        $this->travelTo(Carbon::create(2026, 10, 27, 9, 0));

        Sanctum::actingAs($this->registrationStaff);
        $checkInRes = $this->postJson("/api/patients/{$this->patient->patient_id}/check-in", [
            'blood_pressure' => '122/80',
            'temperature' => '36.8',
            'weight' => '65',
            'height' => '168',
        ])->assertOk();

        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $checkInRes->json('queue.queue_id'),
            'exposure_category' => 'I',
            'reassessment_decision' => 'continue',
            'nature_of_visit' => 'follow_up',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Returned for ATS',
            'consultation_date' => '2026-10-27',
            'blood_pressure' => '122/80',
            'temperature' => '36.8',
            'weight' => '65',
            'height' => '168',
            'prophylaxis_orders' => [
                'tetanus_category' => 'ats',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'Anti-Tetanus Serum (ATS)',
                'rig' => 'none',
                'notes' => 'Continue 1500 IU ATS order',
            ],
        ])->assertCreated();

        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'place_of_exposure' => 'Poblacion, Tagoloan',
            'mode_of_exposure' => ['scratch_abrasion'],
            'body_part_affected' => ['upper_extremities'],
            'animal_type' => 'dog',
            'doses' => [],
            'prophylaxis_administrations' => [
                [
                    'type' => 'tetanus_passive',
                    'medication' => 'Anti-Tetanus Serum (ATS)',
                    'status' => 'administered',
                    'date' => '2026-10-27',
                    'route' => 'IM',
                    'site' => 'Right Deltoid',
                    'dose' => '1500 IU',
                    'dose_iu' => 1500,
                    'inventory_id' => $this->atsStock->inventory_id,
                    'inventory_units_used' => 1,
                ],
            ],
        ])->assertCreated();

        $this->assertSame(19, $this->atsStock->fresh()->current_quantity);
        $this->assertSame('administered', $this->patient->fresh()->treatment_status);
    }

    /**
     * Scenario 3 & 9:
     * Category II anti-rabies PEP prescribed on Oct 26, patient leaves before Nurse Form 3,
     * returns on Oct 27, is reassessed, and receives Day 0 on Oct 27.
     * Follow-up schedules (Day 3 = Oct 30, Day 7 = Nov 3) MUST be calculated from actual Day 0 administration date (Oct 27),
     * NOT from the earlier consultation date (Oct 26).
     */
    public function test_scenario_3_and_9_category_2_pep_day0_administered_on_return_calculates_followups_from_actual_day0_date(): void
    {
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->day1Queue->queue_id,
            'exposure_category' => 'II',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Dog scratch with bleeding',
            'diagnosis' => 'Category II Dog Scratch',
            'prescribed_vaccine_type' => 'Speeda',
            'medication_treatment' => 'Speeda',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ])->assertCreated();

        // Patient leaves on Oct 26 without Day 0; returns on Oct 27
        $this->travelTo(Carbon::create(2026, 10, 27, 10, 0));

        Sanctum::actingAs($this->registrationStaff);
        $checkInRes = $this->postJson("/api/patients/{$this->patient->patient_id}/check-in", [
            'blood_pressure' => '120/78',
            'temperature' => '36.5',
            'weight' => '65',
            'height' => '168',
        ])->assertOk();

        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $checkInRes->json('queue.queue_id'),
            'exposure_category' => 'II',
            'reassessment_decision' => 'continue',
            'nature_of_visit' => 'follow_up',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Returned for Day 0 PEP',
            'diagnosis' => 'Category II Dog Scratch',
            'prescribed_vaccine_type' => 'Speeda',
            'medication_treatment' => 'Speeda',
            'consultation_date' => '2026-10-27',
            'prophylaxis_orders' => [
                'tetanus_category' => 'not_indicated',
                'tetanus_vaccine' => 'none',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ])->assertCreated();

        // Nurse administers Day 0 on Oct 27 (even if frontend accidentally sends stale Day 3/Day 7 dates from Oct 26)
        Sanctum::actingAs($this->nurse);
        $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'place_of_exposure' => 'Poblacion, Tagoloan',
            'mode_of_exposure' => ['scratch_abrasion'],
            'body_part_affected' => ['upper_extremities'],
            'animal_type' => 'dog',
            'date_treatment_started' => '2026-10-27',
            'doses' => [
                [
                    'period' => 'Day 0',
                    'route' => 'ID',
                    'date' => '2026-10-27',
                    'vaccine_type' => 'Speeda',
                    'inventory_units_used' => 1,
                ],
            ],
            'prophylaxis_administrations' => [],
        ])->assertCreated();

        $day3Appt = Appointment::where('patient_id', $this->patient->patient_id)->where('dose_number', 3)->first();
        $day7Appt = Appointment::where('patient_id', $this->patient->patient_id)->where('dose_number', 7)->first();

        $this->assertNotNull($day3Appt);
        $this->assertNotNull($day7Appt);
        $this->assertSame('2026-10-30', Carbon::parse($day3Appt->scheduled_date)->toDateString());
        $this->assertSame('2026-11-03', Carbon::parse($day7Appt->scheduled_date)->toDateString());
    }

    /**
     * Scenario 4 & 8:
     * Patient completes Form 2, leaves before Form 3, returns the next day,
     * and the doctor decides no injection is required (no_injection_required).
     */
    public function test_scenario_4_and_8_reassessment_determines_no_injection_required(): void
    {
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->day1Queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Superficial contact',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'Tetanus Toxoid (TT)',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ])->assertCreated();

        $this->travelTo(Carbon::create(2026, 10, 27, 9, 30));

        Sanctum::actingAs($this->registrationStaff);
        $checkInRes = $this->postJson("/api/patients/{$this->patient->patient_id}/check-in", [
            'blood_pressure' => '118/76',
            'temperature' => '36.6',
            'weight' => '65',
            'height' => '168',
        ])->assertOk();

        Sanctum::actingAs($this->doctor);
        // Must require reassessment_notes when reassessment_decision is no_injection_required
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $checkInRes->json('queue.queue_id'),
            'exposure_category' => 'I',
            'reassessment_decision' => 'no_injection_required',
            'reassessment_notes' => '',
            'nature_of_visit' => 'follow_up',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Returned with tetanus card showing booster 2 years ago',
            'consultation_date' => '2026-10-27',
            'prophylaxis_orders' => ['tetanus_category' => 'not_indicated'],
        ])->assertStatus(422);

        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $checkInRes->json('queue.queue_id'),
            'exposure_category' => 'I',
            'reassessment_decision' => 'no_injection_required',
            'reassessment_notes' => 'Patient presented verified immunization card showing recent TT booster; no injection required.',
            'nature_of_visit' => 'follow_up',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Returned with tetanus card',
            'consultation_date' => '2026-10-27',
            'prophylaxis_orders' => ['tetanus_category' => 'not_indicated'],
        ])->assertCreated();

        $this->assertSame('completed_without_injection', $this->patient->fresh()->treatment_status);
        $this->assertSame('completed', $this->incident->fresh()->status);

        // No vaccination queue created on Oct 27
        $vacQueueOnDay2 = Queue::where('patient_id', $this->patient->patient_id)
            ->where('queue_date', '2026-10-27')
            ->where('visit_type', 'vaccination')
            ->exists();
        $this->assertFalse($vacQueueOnDay2);
    }

    /**
     * Scenario 5 & 6 & 7:
     * Doctor modifies prescription on reassessment (Scenario 5),
     * OR patient leaves again without receiving an injection (Scenario 6).
     */
    public function test_scenario_5_and_6_modify_prescription_and_unadministered_return_visit_outcome(): void
    {
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $this->day1Queue->queue_id,
            'exposure_category' => 'I',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Minor scratch',
            'consultation_date' => '2026-10-26',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'Tetanus Toxoid (TT)',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ])->assertCreated();

        $this->travelTo(Carbon::create(2026, 10, 27, 11, 0));

        Sanctum::actingAs($this->registrationStaff);
        $checkInRes = $this->postJson("/api/patients/{$this->patient->patient_id}/check-in", [
            'blood_pressure' => '130/85',
            'temperature' => '36.9',
            'weight' => '65',
            'height' => '168',
        ])->assertOk();

        // Scenario 5: Doctor modifies prescription to Category II + Speeda + TT
        Sanctum::actingAs($this->doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $checkInRes->json('queue.queue_id'),
            'exposure_category' => 'II',
            'reassessment_decision' => 'modify',
            'reassessment_notes' => 'Upon reassessment, skin barrier was broken; upgraded to Category II with PEP.',
            'nature_of_visit' => 'follow_up',
            'consultation_types' => ['injury'],
            'chief_complaints' => 'Reassessed wound shows broken skin',
            'prescribed_vaccine_type' => 'Speeda',
            'medication_treatment' => 'Speeda',
            'consultation_date' => '2026-10-27',
            'prophylaxis_orders' => [
                'tetanus_category' => 'tt',
                'tetanus_vaccine' => 'Tetanus Toxoid (TT)',
                'tetanus_passive' => 'none',
                'rig' => 'none',
            ],
        ])->assertCreated();

        // Scenario 6: Patient reaches Nurse Form 3 on Oct 27 but leaves/defers again without receiving injection
        Sanctum::actingAs($this->nurse);
        $nurseQueue = Queue::where('patient_id', $this->patient->patient_id)
            ->where('visit_type', 'vaccination')
            ->where('queue_date', '2026-10-27')
            ->first();

        $this->postJson('/api/vaccination-records', [
            'patient_id' => $this->patient->patient_id,
            'bite_id' => $this->incident->bite_id,
            'queue_id' => $nurseQueue->queue_id,
            'place_of_exposure' => 'Poblacion, Tagoloan',
            'mode_of_exposure' => ['scratch_abrasion'],
            'body_part_affected' => ['upper_extremities'],
            'animal_type' => 'dog',
            'doses' => [],
            'prophylaxis_administrations' => [],
            'visit_outcome' => 'not_administered',
            'not_administered_reason' => 'Patient deferred injection and left clinic before administration.',
        ])->assertCreated();

        // Verify inventory untouched, visit outcome preserved as not_administered
        $this->assertSame(20, $this->speedaStock->fresh()->current_quantity);
        $this->assertSame(20, $this->ttStock->fresh()->current_quantity);
        $this->assertSame('not_administered', $this->patient->fresh()->treatment_status);
        $this->assertSame('completed', $nurseQueue->fresh()->status);
        $notAdminRecord = TreatmentRecord::where('patient_id', $this->patient->patient_id)
            ->where('outcome', 'not_administered')
            ->first();
        $this->assertNotNull($notAdminRecord);
        $this->assertSame('not_administered', $notAdminRecord->outcome);
    }
}
