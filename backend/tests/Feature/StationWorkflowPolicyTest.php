<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\BiteIncidentIntake;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientDetails;
use App\Models\Queue;
use App\Models\TreatmentPlan;
use App\Models\User;
use App\Models\VaccinationSchedule;
use App\Models\VaccineInventory;
use App\Services\Clinic\ClinicModuleConfigService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationWorkflowPolicyTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinicA;
    private Clinic $clinicB;
    private User $adminA;
    private User $adminB;
    private User $regUserA;
    private User $triageUserA;
    private User $treatmentUserA;
    private ClinicModuleConfigService $configService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->configService = app(ClinicModuleConfigService::class);

        $this->clinicA = Clinic::create([
            'name'      => 'Clinic A Tagoloan',
            'is_active' => true,
        ]);
        $this->clinicB = Clinic::create([
            'name'      => 'Clinic B Villanueva',
            'is_active' => true,
        ]);

        $this->adminA = User::create([
            'clinic_id'       => $this->clinicA->id,
            'name'            => 'Admin A',
            'email'           => 'admin-a@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'admin',
            'is_active'       => true,
        ]);

        $this->adminB = User::create([
            'clinic_id'       => $this->clinicB->id,
            'name'            => 'Admin B',
            'email'           => 'admin-b@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'admin',
            'is_active'       => true,
        ]);

        $this->regUserA = User::create([
            'clinic_id'       => $this->clinicA->id,
            'name'            => 'Reg Clerk A',
            'email'           => 'reg-a@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'registration',
            'assigned_module' => 'registration',
            'is_active'       => true,
        ]);

        $this->triageUserA = User::create([
            'clinic_id'       => $this->clinicA->id,
            'name'            => 'Dr. Triage A',
            'email'           => 'triage-a@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'triage',
            'assigned_module' => 'triage',
            'is_active'       => true,
        ]);

        $this->treatmentUserA = User::create([
            'clinic_id'       => $this->clinicA->id,
            'name'            => 'Nurse Treatment A',
            'email'           => 'treatment-a@abtc.local',
            'password'        => bcrypt('secret123'),
            'role'            => 'treatment',
            'assigned_module' => 'treatment',
            'is_active'       => true,
        ]);

        VaccineInventory::create([
            'clinic_id'        => $this->clinicA->id,
            'vaccine_type'     => 'Verorab',
            'batch_number'     => 'BATCH-VR-P4',
            'current_quantity' => 50,
            'expiration_date'  => now()->addYear()->toDateString(),
            'status'           => 'active',
            'open_vial_status' => 'unopened',
        ]);
    }

    private function setClinicStations(int $clinicId, bool $reg, bool $tri, bool $treat): \Illuminate\Testing\TestResponse
    {
        $config = $this->configService->getOrCreateConfigForClinic($clinicId);
        $actor = $clinicId === $this->clinicA->id ? $this->adminA : $this->adminB;

        return $this->actingAs($actor)->putJson('/api/clinic-module-config', [
            'revision'                      => $config->revision,
            'registration_module_enabled'   => $reg,
            'triage_module_enabled'         => $tri,
            'treatment_module_enabled'      => $treat,
            'patient_registration_enabled'  => $config->patient_registration_enabled,
            'address_section_enabled'       => $config->address_section_enabled,
            'socioeconomic_section_enabled' => $config->socioeconomic_section_enabled,
            'gov_programs_section_enabled'  => $config->gov_programs_section_enabled,
            'bite_intake_section_enabled'   => $config->bite_intake_section_enabled,
            'triage_section_enabled'        => $config->triage_section_enabled,
            'treatment_section_enabled'     => $config->treatment_section_enabled,
            'field_rules'                   => $config->field_rules,
        ]);
    }

    private function createPatientWithEpisode(bool $withApprovedPlan = true): array
    {
        $patient = Patient::create([
            'clinic_id'                => $this->clinicA->id,
            'first_name'               => 'Maria',
            'last_name'                => 'Clara',
            'gender'                   => 'female',
            'date_of_birth'            => '1992-05-15',
            'contact_number'           => '09171112233',
            'emergency_contact_name'   => 'Juan Clara',
            'emergency_contact_number' => '09174445566',
            'status'                   => 'active',
        ]);

        PatientDetails::create([
            'patient_id'           => $patient->patient_id,
            'address_municipality' => 'Tagoloan',
            'address_barangay'     => 'Poblacion',
            'province'             => 'Misamis Oriental',
        ]);

        $incident = BiteIncident::create([
            'clinic_id'         => $this->clinicA->id,
            'patient_id'        => $patient->patient_id,
            'created_by'        => $this->regUserA->id,
            'episode_number'    => 1,
            'episode_type'      => 'primary',
            'bite_date'         => Carbon::today()->toDateString(),
            'bite_place'        => 'Tagoloan',
            'exposure_category' => 'II',
            'status'            => 'active',
        ]);

        if ($withApprovedPlan) {
            TreatmentPlan::create([
                'clinic_id'  => $this->clinicA->id,
                'bite_id'    => $incident->bite_id,
                'patient_id' => $patient->patient_id,
                'plan_type'  => 'full_pep',
                'status'     => 'approved',
                'decided_by' => $this->triageUserA->id,
                'decided_at' => now(),
            ]);
        }

        return [$patient, $incident];
    }

    private function createTodayQueue(Patient $patient, ?BiteIncident $incident, string $visitType = 'new_case', string $status = 'waiting', int $num = 1): Queue
    {
        return Queue::create([
            'clinic_id'      => $patient->clinic_id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $incident?->bite_id,
            'queue_number'   => $num,
            'queue_date'     => Carbon::today()->toDateString(),
            'visit_type'     => $visitType,
            'priority'       => 'normal',
            'queue_category' => 'regular',
            'status'         => $status,
            'checked_in_at'  => now(),
            'checked_in_by'  => $this->regUserA->id,
            'call_count'     => 0,
        ]);
    }

    public function test_p4_m01_station_combination_matrix_enforced(): void
    {
        // Supported combinations: 111, 110, 011, 010, 001 (with empty triage queue)
        $this->setClinicStations($this->clinicA->id, true, true, true)->assertStatus(200);
        $this->setClinicStations($this->clinicA->id, true, true, false)->assertStatus(200);
        $this->setClinicStations($this->clinicA->id, false, true, true)->assertStatus(200);
        $this->setClinicStations($this->clinicA->id, false, true, false)->assertStatus(200);
        $this->setClinicStations($this->clinicA->id, false, false, true)->assertStatus(200);

        // Forbidden combinations: 101, 100, 000
        $this->setClinicStations($this->clinicA->id, true, false, true)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['triage_module_enabled']);

        $this->setClinicStations($this->clinicA->id, true, false, false)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['triage_module_enabled']);

        $this->setClinicStations($this->clinicA->id, false, false, false)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['registration_module_enabled']);
    }

    public function test_p4_m02_cannot_disable_triage_while_active_triage_queue_exists_today(): void
    {
        [$patient, $incident] = $this->createPatientWithEpisode(false);
        $ticket = $this->createTodayQueue($patient, $incident, 'new_case', 'waiting', 10);

        $beforeRevision = $this->configService->getOrCreateConfigForClinic($this->clinicA->id)->revision;

        // Switching directly to Treatment-only (001) while triage ticket exists must fail
        $this->setClinicStations($this->clinicA->id, false, false, true)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['triage_module_enabled']);

        $this->assertSame($beforeRevision, $this->configService->getOrCreateConfigForClinic($this->clinicA->id)->revision);

        // Once the triage ticket is completed, switching to 001 succeeds
        $ticket->update(['status' => 'completed', 'completed_at' => now()]);
        $this->setClinicStations($this->clinicA->id, false, false, true)->assertStatus(200);
    }

    public function test_p4_m03_registration_disabled_blocks_registration_but_keeps_read_and_followup_open(): void
    {
        [$patient, $incident] = $this->createPatientWithEpisode(true);

        $followUpAppt = Appointment::create([
            'clinic_id'        => $this->clinicA->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $incident->bite_id,
            'appointment_date' => Carbon::today()->toDateString(),
            'scheduled_date'   => Carbon::today(),
            'appointment_type' => 'vaccination',
            'dose_number'      => 3,
            'status'           => 'scheduled',
            'notes'            => 'Day 3 follow-up dose',
        ]);

        $account = PatientAccount::create([
            'name'     => 'Mobile Patient',
            'email'    => 'mobile-p4@abtc.local',
            'password' => bcrypt('secret123'),
        ]);

        $intake = BiteIncidentIntake::create([
            'clinic_id'          => $this->clinicA->id,
            'patient_id'         => $patient->patient_id,
            'patient_account_id' => $account->id,
            'bite_date'          => Carbon::today()->toDateString(),
            'bite_place'         => 'Tagoloan',
            'site_washed'        => true,
            'exposure_type'      => 'bite',
            'animal_type'        => 'dog',
            'animal_status'      => 'owned',
            'wound_location'     => 'hand',
            'status'             => 'submitted',
            'submitted_at'       => now(),
        ]);

        $this->setClinicStations($this->clinicA->id, false, true, true)->assertStatus(200);

        // Read-only history remains open
        $this->actingAs($this->regUserA)->getJson('/api/patients')->assertStatus(200);

        // New registration & registration check-ins blocked with 422 station_disabled
        $this->actingAs($this->regUserA)->postJson('/api/patients', [
            'first_name'               => 'Blocked',
            'last_name'                => 'Walkin',
            'gender'                   => 'male',
            'date_of_birth'            => '1999-01-01',
            'contact_number'           => '09170001122',
            'emergency_contact_name'   => 'Test Guardian',
            'emergency_contact_number' => '09179998877',
            'address_municipality'     => 'Tagoloan',
            'address_barangay'         => 'Poblacion',
            'province'                 => 'Misamis Oriental',
        ])->assertStatus(422)
          ->assertJson(['code' => 'station_disabled', 'station' => 'registration']);

        $this->actingAs($this->regUserA)->postJson("/api/patients/{$patient->patient_id}/check-in")
            ->assertStatus(422)
            ->assertJson(['code' => 'station_disabled', 'station' => 'registration']);

        $this->actingAs($this->regUserA)->postJson("/api/patients/{$patient->patient_id}/check-in-nurse")
            ->assertStatus(422)
            ->assertJson(['code' => 'station_disabled', 'station' => 'registration']);

        $this->actingAs($this->regUserA)->postJson("/api/bite-intakes/{$intake->intake_id}/check-in")
            ->assertStatus(422)
            ->assertJson(['code' => 'station_disabled', 'station' => 'registration']);

        // Follow-up nurse check-in at Treatment desk still succeeds when Registration=false & Treatment=true
        $this->actingAs($this->treatmentUserA)
            ->postJson("/api/appointments/{$followUpAppt->appointment_id}/check-in")
            ->assertStatus(200);
    }

    public function test_p4_m04_triage_disabled_001_blocks_triage_actions_while_treatment_followup_works(): void
    {
        [$patient, $incident] = $this->createPatientWithEpisode(true);

        $schedule = VaccinationSchedule::create([
            'clinic_id'      => $this->clinicA->id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $incident->bite_id,
            'protocol_type'  => 'standard',
            'dose_number'    => 3,
            'scheduled_date' => Carbon::today()->toDateString(),
            'status'         => 'scheduled',
            'scheduled_by'   => $this->triageUserA->id,
        ]);

        // Set 001 (Treatment-only mode)
        $this->setClinicStations($this->clinicA->id, false, false, true)->assertStatus(200);

        // Triage case / Form 2 / schedule updates blocked 422 station_disabled
        $this->actingAs($this->triageUserA)->postJson('/api/cases', [
            'patient_id'        => $patient->patient_id,
            'bite_date'         => Carbon::today()->toDateString(),
            'bite_place'        => 'Tagoloan',
            'site_washed'       => true,
            'exposure_type'     => 'bite',
            'severity'          => 'moderate',
            'animal_type'       => 'dog',
            'animal_status'     => 'owned',
            'exposure_category' => 'II',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->putJson("/api/cases/{$incident->bite_id}", [
            'bite_place' => 'Updated Place',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->postJson("/api/cases/{$incident->bite_id}/transfer-out", [
            'transferred_to_facility' => 'NMMC',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->postJson('/api/cases/new-exposure', [
            'patient_id' => $patient->patient_id,
            'bite_date'  => Carbon::today()->toDateString(),
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->postJson('/api/treatment-records', [
            'patient_id'           => $patient->patient_id,
            'bite_id'              => $incident->bite_id,
            'place_of_exposure'    => 'Tagoloan',
            'nature_of_visit'      => 'new_consultation',
            'consultation_types'   => ['injury'],
            'chief_complaints'     => 'Dog bite',
            'diagnosis'            => 'Cat II',
            'treatment_plan'       => 'full_pep',
            'medication_treatment' => 'Verorab',
            'exposure_category'    => 'II',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->postJson("/api/treatment-records/patient/{$patient->patient_id}/addendum", [
            'bite_id'        => $incident->bite_id,
            'addendum_notes' => 'Follow-up note',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->putJson("/api/vaccinations/{$schedule->treatment_id}", [
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->postJson("/api/vaccinations/{$schedule->treatment_id}/reschedule", [
            'new_date' => Carbon::tomorrow()->toDateString(),
            'reason'   => 'Clinic schedule',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        $this->actingAs($this->triageUserA)->postJson('/api/queue', [
            'patient_id' => $patient->patient_id,
            'visit_type' => 'consultation',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'triage']);

        // Read-only lookups still work
        $this->actingAs($this->triageUserA)->getJson('/api/treatment-records')->assertStatus(200);
        $this->actingAs($this->triageUserA)->getJson('/api/queue')->assertStatus(200);

        // Treatment actions (direct nurse follow-up check-in & Form 3 dose) still work!
        $followUpAppt = Appointment::create([
            'clinic_id'        => $this->clinicA->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $incident->bite_id,
            'appointment_date' => Carbon::today()->toDateString(),
            'scheduled_date'   => Carbon::today(),
            'appointment_type' => 'vaccination',
            'dose_number'      => 3,
            'status'           => 'scheduled',
        ]);
        $this->actingAs($this->treatmentUserA)
            ->postJson("/api/appointments/{$followUpAppt->appointment_id}/check-in")
            ->assertStatus(200);
    }

    public function test_p4_m05_m06_treatment_disabled_blocks_treatment_and_form2_completes_without_stranding(): void
    {
        [$patient, $incident] = $this->createPatientWithEpisode(true);
        $triageTicket = $this->createTodayQueue($patient, $incident, 'new_case', 'serving', 1);

        $followUpAppt = Appointment::create([
            'clinic_id'        => $this->clinicA->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $incident->bite_id,
            'appointment_date' => Carbon::today()->toDateString(),
            'scheduled_date'   => Carbon::today(),
            'appointment_type' => 'vaccination',
            'dose_number'      => 3,
            'status'           => 'scheduled',
        ]);

        $schedule = VaccinationSchedule::create([
            'clinic_id'      => $this->clinicA->id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $incident->bite_id,
            'protocol_type'  => 'standard',
            'dose_number'    => 3,
            'scheduled_date' => Carbon::today()->toDateString(),
            'status'         => 'scheduled',
            'scheduled_by'   => $this->triageUserA->id,
        ]);

        // Set 110 (Registration + Triage enabled, Treatment disabled)
        $this->setClinicStations($this->clinicA->id, true, true, false)->assertStatus(200);

        // Treatment actions blocked 422 station_disabled
        $this->actingAs($this->treatmentUserA)->postJson('/api/vaccination-records', [
            'patient_id'        => $patient->patient_id,
            'bite_id'           => $incident->bite_id,
            'protocol_type'     => 'Intradermal (ID)',
            'bite_site'         => 'Right hand',
            'exposure_category' => 'II',
            'doses'             => [[
                'period'         => 'Day 0',
                'dose_number'    => 0,
                'vaccine_type'   => 'Verorab',
                'route'          => 'ID',
                'injection_site' => 'Left Deltoid',
                'dosage'         => 0.1,
            ]],
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->treatmentUserA)->postJson('/api/tagoloan-treatment-cards', [
            'patient_id' => $patient->patient_id,
            'bite_id'    => $incident->bite_id,
            'card_date'  => Carbon::today()->toDateString(),
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->treatmentUserA)->postJson("/api/vaccinations/{$schedule->treatment_id}/administer", [
            'vaccine_brand'        => 'Verorab',
            'vaccine_batch_number' => 'BATCH-VR-P4',
            'injection_site'       => 'Left Deltoid',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->treatmentUserA)->postJson("/api/vaccinations/{$schedule->treatment_id}/missed")
            ->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->treatmentUserA)->postJson("/api/appointments/{$followUpAppt->appointment_id}/check-in")
            ->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->adminA)->postJson("/api/patients/{$patient->patient_id}/check-in-nurse")
            ->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->adminA)->postJson('/api/queue', [
            'patient_id' => $patient->patient_id,
            'visit_type' => 'vaccination',
        ])->assertStatus(422)->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        // Form 2 consultation while Treatment is disabled completes the triage ticket cleanly (NOT transferred to disabled Treatment queue!)
        $this->actingAs($this->triageUserA)->postJson('/api/treatment-records', [
            'patient_id'           => $patient->patient_id,
            'bite_id'              => $incident->bite_id,
            'queue_id'             => $triageTicket->queue_id,
            'place_of_exposure'    => 'Tagoloan',
            'nature_of_visit'      => 'new_consultation',
            'consultation_types'   => ['injury'],
            'chief_complaints'     => 'Dog bite',
            'diagnosis'            => 'Category II bite exposure',
            'treatment_plan'       => 'full_pep',
            'medication_treatment' => 'Verorab',
            'exposure_category'    => 'II',
        ])->assertStatus(201);

        $triageTicket->refresh();
        $this->assertSame('completed', $triageTicket->status);
        $this->assertSame('new_case', $triageTicket->visit_type);

        // Scheduled future follow-up appointment was NOT corrupted or deleted
        $followUpAppt->refresh();
        $this->assertSame('scheduled', $followUpAppt->status);

        // Also verify QueueController::complete does not strand triage tickets in Treatment
        [$patient2, $incident2] = $this->createPatientWithEpisode(true);
        $ticket2 = $this->createTodayQueue($patient2, $incident2, 'consultation', 'serving', 2);
        $this->actingAs($this->triageUserA)->postJson("/api/queue/{$ticket2->queue_id}/complete")
            ->assertStatus(200);
        $ticket2->refresh();
        $this->assertSame('completed', $ticket2->status);
        $this->assertSame('consultation', $ticket2->visit_type);
    }

    public function test_p4_m07_anti_triage_bypass_blocks_day0_direct_treatment(): void
    {
        [$patient, $incident] = $this->createPatientWithEpisode(false); // NO approved treatment plan

        $day0Appt = Appointment::create([
            'clinic_id'        => $this->clinicA->id,
            'patient_id'       => $patient->patient_id,
            'bite_id'          => $incident->bite_id,
            'appointment_date' => Carbon::today()->toDateString(),
            'scheduled_date'   => Carbon::today(),
            'appointment_type' => 'vaccination',
            'dose_number'      => 0,
            'status'           => 'scheduled',
        ]);

        // Day 0 cannot check in directly to Treatment
        $this->actingAs($this->treatmentUserA)
            ->postJson("/api/appointments/{$day0Appt->appointment_id}/check-in")
            ->assertStatus(422);

        // Form 3 vaccine recording cannot bypass missing doctor approval
        $this->actingAs($this->treatmentUserA)->postJson('/api/vaccination-records', [
            'patient_id'        => $patient->patient_id,
            'bite_id'           => $incident->bite_id,
            'protocol_type'     => 'Intradermal (ID)',
            'bite_site'         => 'Left arm',
            'exposure_category' => 'II',
            'doses'             => [[
                'period'         => 'Day 0',
                'dose_number'    => 0,
                'vaccine_type'   => 'Verorab',
                'route'          => 'ID',
                'injection_site' => 'Left Deltoid',
                'dosage'         => 0.1,
            ]],
        ])->assertStatus(422);
    }

    public function test_p4_m08_role_403_precedes_station_422_and_assigned_module_does_not_escalate(): void
    {
        [$patient, $incident] = $this->createPatientWithEpisode(true);
        $schedule = VaccinationSchedule::create([
            'clinic_id'      => $this->clinicA->id,
            'patient_id'     => $patient->patient_id,
            'bite_id'        => $incident->bite_id,
            'protocol_type'  => 'standard',
            'dose_number'    => 3,
            'scheduled_date' => Carbon::today()->toDateString(),
            'status'         => 'scheduled',
            'scheduled_by'   => $this->triageUserA->id,
        ]);

        // Disable Treatment (110)
        $this->setClinicStations($this->clinicA->id, true, true, false)->assertStatus(200);

        // Unauthorized roles MUST receive 403, not 422 station_disabled
        $this->actingAs($this->regUserA)->postJson('/api/vaccination-records', [])
            ->assertStatus(403);

        $this->actingAs($this->triageUserA)->postJson("/api/vaccinations/{$schedule->treatment_id}/administer", [
            'vaccine_brand'        => 'Verorab',
            'vaccine_batch_number' => 'BATCH-VR-P4',
            'injection_site'       => 'Left Deltoid',
        ])->assertStatus(403);

        // Even with assigned_module = 'treatment', non-admin staff cannot edit clinic config (403)
        $config = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $this->actingAs($this->treatmentUserA)->putJson('/api/clinic-module-config', [
            'revision'                    => $config->revision,
            'registration_module_enabled' => true,
            'triage_module_enabled'       => true,
            'treatment_module_enabled'    => true,
        ])->assertStatus(403);
    }

    public function test_p4_m09_stale_session_and_queue_call_next_respect_live_station_toggle(): void
    {
        [$patient1, $incident1] = $this->createPatientWithEpisode(true);
        [$patient2, $incident2] = $this->createPatientWithEpisode(true);

        // Create a waiting vaccination ticket (#1) and a waiting new_case triage ticket (#2)
        $treatTicket  = $this->createTodayQueue($patient1, $incident1, 'vaccination', 'waiting', 1);
        $triageTicket = $this->createTodayQueue($patient2, $incident2, 'new_case', 'waiting', 2);

        // Admin disables Treatment (110) while nurse still thinks station is active
        $this->setClinicStations($this->clinicA->id, true, true, false)->assertStatus(200);

        // Nurse call-next / call / serve / recall on vaccination ticket is blocked with 422 station_disabled
        $this->actingAs($this->treatmentUserA)->postJson('/api/queue/call-next')
            ->assertStatus(422)
            ->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->treatmentUserA)->postJson("/api/queue/{$treatTicket->queue_id}/call")
            ->assertStatus(422)
            ->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        $this->actingAs($this->treatmentUserA)->postJson("/api/queue/{$treatTicket->queue_id}/serve")
            ->assertStatus(422)
            ->assertJson(['code' => 'station_disabled', 'station' => 'treatment']);

        // Admin call-next without station filter skips disabled treatment ticket (#1) and calls triage ticket (#2)!
        $this->actingAs($this->adminA)->postJson('/api/queue/call-next')
            ->assertStatus(200)
            ->assertJsonPath('queue.queue_id', $triageTicket->queue_id);
    }

    public function test_p4_m10_multi_clinic_isolation_and_full_workflow_round_trip(): void
    {
        // Clinic B disables Treatment (110); Clinic A stays 111
        $this->setClinicStations($this->clinicB->id, true, true, false)->assertStatus(200);

        $configA = $this->configService->getOrCreateConfigForClinic($this->clinicA->id);
        $this->assertTrue($configA->registration_module_enabled);
        $this->assertTrue($configA->triage_module_enabled);
        $this->assertTrue($configA->treatment_module_enabled);

        // Full Form 1 -> Check-in -> Form 2 -> Form 3 flow succeeds in Clinic A under 111
        $form1Response = $this->actingAs($this->regUserA)->postJson('/api/patients', [
            'first_name'               => 'Andres',
            'last_name'                => 'Bonifacio',
            'gender'                   => 'male',
            'date_of_birth'            => '1993-11-30',
            'contact_number'           => '09175551234',
            'emergency_contact_name'   => 'Gregoria de Jesus',
            'emergency_contact_number' => '09175559876',
            'address_municipality'     => 'Tagoloan',
            'address_barangay'         => 'Poblacion',
            'province'                 => 'Misamis Oriental',
            'bite_date'                => Carbon::today()->toDateString(),
            'bite_place'               => 'Poblacion, Tagoloan',
            'site_washed'              => true,
            'exposure_type'            => 'bite',
            'animal_type'              => 'dog',
            'animal_status'            => 'owned',
            'wound_location'           => 'Right leg',
        ])->assertStatus(201);

        $patientId = $form1Response->json('patient.patient_id');
        $this->assertNotNull($patientId);

        $biteId = BiteIncident::where('clinic_id', $this->clinicA->id)
            ->where('patient_id', $patientId)
            ->value('bite_id');
        $this->assertNotNull($biteId);

        $checkInResponse = $this->actingAs($this->regUserA)
            ->postJson('/api/queue', [
                'patient_id'       => $patientId,
                'bite_incident_id' => $biteId,
                'visit_type'       => 'new_case',
            ])
            ->assertStatus(201);

        $queueId = $checkInResponse->json('queue.queue_id');
        $this->assertNotNull($queueId);

        // Form 2 consultation approves plan and transfers ticket to Treatment queue
        $this->actingAs($this->triageUserA)->postJson('/api/treatment-records', [
            'patient_id'           => $patientId,
            'bite_id'              => $biteId,
            'queue_id'             => $queueId,
            'place_of_exposure'    => 'Poblacion, Tagoloan',
            'nature_of_visit'      => 'new_consultation',
            'consultation_types'   => ['injury'],
            'chief_complaints'     => 'Dog bite',
            'diagnosis'            => 'Category II exposure',
            'treatment_plan'       => 'full_pep',
            'medication_treatment' => 'Verorab',
            'exposure_category'    => 'II',
        ])->assertStatus(201);

        $queue = Queue::findOrFail($queueId);
        $this->assertSame('vaccination', $queue->visit_type);
        $this->assertSame('waiting', $queue->status);

        // Form 3 vaccine dose succeeds because Clinic A Treatment is enabled
        $form3Response = $this->actingAs($this->treatmentUserA)->postJson('/api/vaccination-records', [
            'patient_id'        => $patientId,
            'bite_id'           => $biteId,
            'queue_id'          => $queueId,
            'protocol_type'     => 'Intradermal (ID)',
            'bite_site'         => 'Right leg',
            'exposure_category' => 'II',
            'doses'             => [[
                'period'         => 'Day 0',
                'date'           => Carbon::today()->toDateString(),
                'dose_number'    => 0,
                'vaccine_type'   => 'Verorab',
                'route'          => 'ID',
                'injection_site' => 'Left Deltoid',
                'dosage'         => 0.1,
            ]],
        ]);
        $this->assertContains($form3Response->status(), [200, 201]);
    }
}
