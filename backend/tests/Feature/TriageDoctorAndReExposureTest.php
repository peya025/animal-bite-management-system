<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TriageDoctorAndReExposureTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createDoctor(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Dr. Maria Santos',
            'email' => 'dr.santos@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'triage',
            'is_active' => true,
            'professional_license_no' => 'MD-123456',
        ]);

        $role = Role::firstOrCreate(['slug' => 'triage'], [
            'name' => 'triage',
            'display_name' => 'Triage Doctor',
            'default_route' => '/doctor/patients',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    private function createStaff(Clinic $clinic, string $roleSlug = 'registration'): User
    {
        $user = User::create([
            'name' => 'Clerk John',
            'email' => 'clerk@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => $roleSlug,
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => $roleSlug], [
            'name' => $roleSlug,
            'display_name' => ucfirst($roleSlug),
            'default_route' => '/patients',
        ]);

        $user->roles()->attach($role->id, ['assigned_at' => now()]);
        return $user;
    }

    public function test_newly_registered_patient_today_appears_in_doctor_patients_list()
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-1001',
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'birthdate' => '1995-05-15',
            'gender' => 'Male',
            'created_at' => Carbon::today(),
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->getJson('/api/doctor/patients?tab=today');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals('Pedro', $data[0]['first_name']);
    }

    public function test_re_exposure_awaiting_assessment_is_recognized_in_treatment_record()
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-2002',
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'birthdate' => '1992-03-20',
            'gender' => 'Female',
        ]);

        // Prior episode with completed primary series (Day 0, 3, 7)
        $priorIncident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => Carbon::now()->subMonths(6)->toDateString(),
            'status' => 'completed',
            'created_by' => $doctor->id,
        ]);

        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $priorIncident->bite_id,
                'dose_number' => $dose,
                'status' => 'completed',
                'treatment_date' => Carbon::now()->subMonths(6)->toDateString(),
            ]);
        }

        // New re-exposure registered
        $newIncident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 2,
            'episode_type' => 'pending_assessment',
            'bite_date' => Carbon::today()->toDateString(),
            'status' => 'awaiting_assessment',
            'created_by' => $doctor->id,
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->getJson("/api/treatment-records/patient/{$patient->patient_id}");
        $response->assertStatus(200);

        // Active incident must be the new re-exposure, not the completed prior incident
        $this->assertEquals($newIncident->bite_id, $response->json('active_bite_incident.bite_id'));
        $this->assertTrue($response->json('requires_re_exposure_decision'));
    }

    public function test_form_2_saves_and_transitions_null_bite_id_queue_ticket()
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-3003',
            'first_name' => 'Andres',
            'last_name' => 'Bonifacio',
            'birthdate' => '1990-11-30',
            'gender' => 'Male',
        ]);

        // Auto-queued from registration with bite_id = null
        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => null,
            'queue_number' => 1,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'priority' => 'normal',
            'queue_category' => 'regular',
            'checked_in_by' => $doctor->id,
        ]);

        Sanctum::actingAs($doctor);

        // Doctor fills Form 2 without duplicating the nurse-owned exposure assessment.
        $response = $this->postJson('/api/treatment-records', [
            'patient_id' => $patient->patient_id,
            'queue_id' => $queue->queue_id,
            'consultation_date' => Carbon::today()->toDateString(),
            'consultation_time' => '09:00:00',
            'mode_of_transaction' => 'walk-in',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['consultation'],
            'chief_complaints' => 'Dog bite on left arm',
            'diagnosis' => 'Category III dog bite',
        ]);

        $response->assertStatus(201);

        // Verify that the existing queue ticket was updated (bite_id linked and transferred to vaccination)
        $queue->refresh();
        $this->assertNotNull($queue->bite_id);
        $this->assertEquals('vaccination', $queue->visit_type);
        $this->assertEquals('waiting', $queue->status);

        // Verify there is only 1 queue ticket for this patient today (no duplicate created)
        $queueCount = Queue::where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->patient_id)
            ->where('queue_date', Carbon::today()->toDateString())
            ->count();
        $this->assertEquals(1, $queueCount);

        // Verify that Form 2 approved standard full_pep TreatmentPlan
        $plan = \App\Models\TreatmentPlan::where('clinic_id', $clinic->id)
            ->where('bite_id', $queue->bite_id)
            ->first();
        $this->assertNotNull($plan);
        $this->assertEquals('full_pep', $plan->plan_type);
        $this->assertEquals('approved', $plan->status);

        $incident = BiteIncident::findOrFail($queue->bite_id);
        $this->assertNotNull($incident->confirmed_at);
        $this->assertSame($doctor->id, $incident->confirmed_by);
        $this->assertNull($incident->exposure_mode);
        $this->assertSame('unassessed', $incident->severity);

        $this->getJson("/api/tagoloan-treatment-cards/patient/{$patient->patient_id}?bite_id={$incident->bite_id}")
            ->assertOk()
            ->assertJsonPath('form3_ready', true)
            ->assertJsonPath('bite_incident.mode_of_exposure', null)
            ->assertJsonPath('bite_incident.exposure_category', null);

        $nurse = $this->createStaff($clinic, 'treatment');
        Sanctum::actingAs($nurse);
        $this->postJson('/api/tagoloan-treatment-cards', [
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'card_date' => Carbon::today()->toDateString(),
            // The nurse owns these Form 3 exposure values.
            'exposure_category' => 'III',
            'date_of_exposure' => Carbon::today()->subDay()->toDateString(),
            'place_of_exposure' => 'Matangad, Gitagum',
            'mode_of_exposure' => 'scratch_abrasion',
            'body_part_exposed' => 'right foot',
            'body_part_detail' => 'Right ankle',
            'animal_type' => 'cat',
            'past_bite_history' => false,
            'past_pep_completed' => false,
        ])->assertOk();

        $this->assertDatabaseHas('tagoloan_treatment_cards', [
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'exposure_category' => 'III',
            'mode_of_exposure' => 'scratch_abrasion',
            'body_part_exposed' => 'right foot',
            'animal_type' => 'cat',
        ]);
        $this->assertDatabaseHas('bite_incidents', [
            'bite_id' => $incident->bite_id,
            'severity' => 'severe',
            'exposure_mode' => 'scratch_abrasion',
            'exposure_type' => 'scratch',
            'body_part_exposed' => 'right foot',
            'site_number' => 'Right ankle',
            'bite_place' => 'Matangad, Gitagum',
            'animal_type' => 'cat',
        ]);
    }

    public function test_incoming_form_1_referral_moves_from_triage_to_treatment_after_form_2(): void
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic);
        $doctor = $this->createDoctor($clinic);

        Sanctum::actingAs($staff);
        $registration = $this->postJson('/api/patients', [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'gender' => 'female',
            'date_of_birth' => '1990-01-01',
            'address' => 'Tagoloan, Misamis Oriental',
            'mode_of_transaction' => 'referral',
            'reg_date_of_consultation' => Carbon::today()->toDateString(),
            'reg_referred_by' => 'Barangay Health Station',
        ])->assertCreated();

        $patientId = $registration->json('patient.patient_id');
        $incident = BiteIncident::where('patient_id', $patientId)->firstOrFail();
        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patientId,
            'bite_id' => $incident->bite_id,
            'queue_number' => 1,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'priority' => 'normal',
            'queue_category' => 'regular',
            'checked_in_by' => $staff->id,
        ]);

        Sanctum::actingAs($doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $patientId,
            'queue_id' => $queue->queue_id,
            'bite_id' => $incident->bite_id,
            'consultation_date' => Carbon::today()->toDateString(),
            'mode_of_transaction' => 'referral',
            'referred_by' => 'Barangay Health Station',
            'referred_to' => 'Tagoloan Rural Health Unit (RHU) / ABTC',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['consultation'],
            'chief_complaints' => 'Dog bite on left arm',
        ])->assertCreated();

        $queue->refresh();
        $this->assertSame('vaccination', $queue->visit_type);
        $this->assertSame('waiting', $queue->status);
        $this->assertDatabaseHas('treatment_plans', [
            'bite_id' => $incident->bite_id,
            'plan_type' => 'full_pep',
        ]);

        $this->getJson('/api/queue/next?station=treatment')
            ->assertOk()
            ->assertJsonPath('next_patient.queue_id', $queue->queue_id);
    }

    public function test_explicit_external_referral_completes_the_triage_queue_ticket(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-EXT-REF',
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'birthdate' => '1990-01-01',
            'gender' => 'Female',
        ]);
        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => null,
            'queue_number' => 1,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'priority' => 'normal',
            'queue_category' => 'regular',
            'checked_in_by' => $doctor->id,
        ]);

        Sanctum::actingAs($doctor);
        $this->postJson('/api/treatment-records', [
            'patient_id' => $patient->patient_id,
            'queue_id' => $queue->queue_id,
            'consultation_date' => Carbon::today()->toDateString(),
            'mode_of_transaction' => 'referral',
            'referred_to' => 'External Medical Center',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['consultation'],
            'chief_complaints' => 'Needs external care',
        ])->assertCreated();

        $queue->refresh();
        $this->assertSame('new_case', $queue->visit_type);
        $this->assertSame('completed', $queue->status);
        $this->getJson('/api/queue/next?station=treatment')
            ->assertOk()
            ->assertJsonPath('next_patient', null);
    }

    public function test_doctor_can_save_re_exposure_decision_and_refer_to_treatment()
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-4004',
            'first_name' => 'Jose',
            'last_name' => 'Rizal',
            'birthdate' => '1985-06-19',
            'gender' => 'Male',
        ]);

        // Prior episode completed
        $priorIncident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => Carbon::now()->subMonths(12)->toDateString(),
            'status' => 'completed',
            'created_by' => $doctor->id,
        ]);

        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $priorIncident->bite_id,
                'dose_number' => $dose,
                'status' => 'completed',
                'treatment_date' => Carbon::now()->subMonths(12)->toDateString(),
            ]);
        }

        // Re-exposure registered
        $newIncident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 2,
            'episode_type' => 'pending_assessment',
            'bite_date' => Carbon::today()->toDateString(),
            'status' => 'awaiting_assessment',
            'created_by' => $doctor->id,
        ]);

        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $newIncident->bite_id,
            'queue_number' => 2,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'priority' => 'normal',
            'queue_category' => 'regular',
            'checked_in_by' => $doctor->id,
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->postJson('/api/treatment-records', [
            'patient_id' => $patient->patient_id,
            'queue_id' => $queue->queue_id,
            'bite_id' => $newIncident->bite_id,
            'treatment_plan' => 'two_dose_booster',
            'consultation_date' => Carbon::today()->toDateString(),
            'consultation_time' => '10:00:00',
            'mode_of_transaction' => 'walk-in',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['consultation'],
            'chief_complaints' => 'Cat scratch on right hand',
            'diagnosis' => 'Category II re-exposure',
            'new_bite_date' => Carbon::today()->toDateString(),
            'new_exposure_type' => 'scratch',
            'new_exposure_mode' => 'scratch_abrasion',
            'new_severity' => 'moderate',
            'new_animal_type' => 'cat',
            'new_animal_status' => 'owned',
            'new_site_washed' => true,
            'new_body_part_group' => 'upper_extremities',
            'new_body_part_detail' => 'Right hand',
            'new_laterality' => 'right',
            'clinical_assessment_confirmed' => true,
        ]);

        $response->assertStatus(201);

        $newIncident->refresh();
        $this->assertEquals('re_exposure', $newIncident->episode_type);
        $this->assertEquals('active', $newIncident->status);

        $queue->refresh();
        $this->assertEquals('vaccination', $queue->visit_type);
        $this->assertEquals('waiting', $queue->status);
    }

    public function test_patient_with_follow_up_beyond_seven_days_appears_in_upcoming_tab(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createStaff($clinic, 'treatment');

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'P-2026-0008',
            'first_name' => 'Pia',
            'last_name' => 'Pia',
            'gender' => 'female',
            'date_of_birth' => '2003-01-01',
            'age' => 23,
            'contact_number' => '09123456789',
            'address' => 'Tagoloan, Misamis Oriental',
            'status' => 'active',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_date' => Carbon::today()->subDays(3)->toDateString(),
            'exposure_date' => Carbon::today()->subDays(3)->toDateString(),
            'animal_type' => 'dog',
            'exposure_type' => 'bite',
            'category' => 'category_3',
            'body_part' => 'right hand',
            'is_re_exposure' => false,
            'episode_type' => 'initial',
            'status' => 'active',
            'created_by' => $nurse->id,
        ]);

        // Day 3 administered today
        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'treatment_date' => Carbon::today()->toDateString(),
            'dose_number' => 3,
            'status' => 'completed',
            'brand_name' => 'Speeda',
            'administered_by' => $nurse->id,
        ]);

        // Day 7 scheduled 9 days in the future (pushed past weekend)
        $futureDate = Carbon::today()->addDays(9)->toDateString();
        Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'appointment_date' => $futureDate,
            'scheduled_date' => $futureDate,
            'appointment_type' => 'follow_up_vaccination',
            'dose_number' => 7,
            'status' => 'scheduled',
            'created_by' => $nurse->id,
        ]);

        Sanctum::actingAs($nurse);

        $response = $this->getJson('/api/nurse/patients?tab=upcoming');
        $response->assertOk();
        $response->assertJson([
            'upcoming_count' => 1,
        ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($patient->patient_id, $data[0]['patient_id']);
        $this->assertCount(1, $data[0]['appointments']);
        $this->assertEquals(7, $data[0]['appointments'][0]['dose_number']);

        // Check general upcoming appointments endpoint as well
        $upcomingResponse = $this->getJson('/api/appointments/upcoming');
        $upcomingResponse->assertOk();
        $upcomingResponse->assertJson([
            'count' => 1,
        ]);
    }

    public function test_re_exposure_registration_records_consultation_vitals_for_doctor()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');
        $doctor = $this->createDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-8888',
            'first_name' => 'Jose',
            'last_name' => 'Rizal',
            'birthdate' => '1985-06-19',
            'gender' => 'Male',
        ]);

        // Prior episode completed
        $priorIncident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => Carbon::now()->subMonths(10)->toDateString(),
            'status' => 'completed',
            'created_by' => $staff->id,
        ]);

        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $priorIncident->bite_id,
                'dose_number' => $dose,
                'status' => 'completed',
                'treatment_date' => Carbon::now()->subMonths(10)->toDateString(),
            ]);
        }

        Sanctum::actingAs($staff);

        // Registration staff registers re-exposure with Section III vitals
        $response = $this->postJson('/api/cases/new-exposure', [
            'patient_id' => $patient->patient_id,
            'bite_date' => Carbon::today()->subDay()->toDateString(),
            'consultation_date' => Carbon::today()->toDateString(),
            'consultation_time' => '10:30',
            'blood_pressure' => '120/80',
            'temperature' => '36.5',
            'height' => '170',
            'weight' => '65',
            'attending_provider' => 'Dr. Jose',
            'referred_by' => 'Tagoloan RHU',
        ]);

        $response->assertStatus(201);
        $incidentId = $response->json('incident.bite_id');
        $this->assertNotNull($incidentId);

        // Verify TreatmentRecord with scheduled status and vitals was created
        $treatmentRecord = TreatmentRecord::where('bite_id', $incidentId)
            ->whereNull('dose_number')
            ->first();
        $this->assertNotNull($treatmentRecord);
        $this->assertEquals('scheduled', $treatmentRecord->status);
        $this->assertEquals('120/80', $treatmentRecord->blood_pressure);
        $this->assertEquals('36.5', $treatmentRecord->temperature);
        $this->assertEquals('170', $treatmentRecord->height);
        $this->assertEquals('65', $treatmentRecord->weight);
        $this->assertEquals('Tagoloan RHU', $treatmentRecord->referred_by);

        // Doctor loads patient treatment record for this episode
        Sanctum::actingAs($doctor);
        $doctorResponse = $this->getJson("/api/treatment-records/patient/{$patient->patient_id}?bite_id={$incidentId}");
        $doctorResponse->assertStatus(200);
        $this->assertEquals('120/80', $doctorResponse->json('latest_treatment.blood_pressure'));
        $this->assertEquals('36.5', $doctorResponse->json('latest_treatment.temperature'));
        $this->assertEquals('170', $doctorResponse->json('latest_treatment.height'));
        $this->assertEquals('65', $doctorResponse->json('latest_treatment.weight'));
        $this->assertEquals('Dr. Jose', $doctorResponse->json('latest_treatment.attending_provider'));

        // Doctor submits Form 2 to finalize assessment
        $form2Response = $this->postJson('/api/treatment-records', [
            'patient_id' => $patient->patient_id,
            'bite_id' => $incidentId,
            'consultation_date' => Carbon::today()->toDateString(),
            'consultation_time' => '10:30',
            'mode_of_transaction' => 'walk-in',
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['consultation'],
            'chief_complaints' => 'Patient had a new bite from an unknown dog.',
            'diagnosis' => 'Possible Rabies Exposure Category II',
            'treatment_plan' => 'two_dose_booster',
            'blood_pressure' => '120/80',
            'temperature' => '36.5',
            'height' => '170',
            'weight' => '65',
        ]);
        $form2Response->assertStatus(201);

        // Verify there is only 1 consultation record for this episode and it was updated to completed
        $this->assertEquals(1, TreatmentRecord::where('bite_id', $incidentId)->whereNull('dose_number')->count());
        $this->assertEquals('completed', TreatmentRecord::where('bite_id', $incidentId)->whereNull('dose_number')->first()->status);
    }

    public function test_re_exposure_registration_rejected_if_primary_series_not_completed()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-INCOMPLETE-1',
            'first_name' => 'Incomplete',
            'last_name' => 'Patient',
            'birthdate' => '2000-01-01',
            'gender' => 'Male',
        ]);

        // Patient only has Day 0, Day 7 is NOT completed
        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => Carbon::now()->subMonths(1)->toDateString(),
            'status' => 'active',
            'created_by' => $staff->id,
        ]);

        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 0,
            'status' => 'completed',
            'treatment_date' => Carbon::now()->subMonths(1)->toDateString(),
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson('/api/cases/new-exposure', [
            'patient_id' => $patient->patient_id,
            'bite_date' => Carbon::today()->toDateString(),
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Patient is not eligible for re-exposure registration. The primary anti-rabies series (Days 0, 3, 7) must be completed first.',
        ]);
    }

    public function test_re_exposure_registration_rejected_if_treatment_appointment_is_still_scheduled()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'PAT-SCHEDULED-1',
            'first_name' => 'Scheduled',
            'last_name' => 'Patient',
            'birthdate' => '2000-01-01',
            'gender' => 'Male',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'primary',
            'bite_date' => Carbon::now()->subMonths(1)->toDateString(),
            'status' => 'completed',
            'created_by' => $staff->id,
        ]);

        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->patient_id,
                'bite_id' => $incident->bite_id,
                'dose_number' => $dose,
                'status' => 'completed',
                'treatment_date' => Carbon::now()->subMonths(1)->toDateString(),
            ]);
        }

        // Active booster appointment scheduled (in-progress booster regimen)
        Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'appointment_date' => Carbon::tomorrow()->toDateString(),
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
            'status' => 'scheduled',
            'appointment_type' => 'booster',
            'dose_number' => 3,
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson('/api/cases/new-exposure', [
            'patient_id' => $patient->patient_id,
            'bite_date' => Carbon::today()->toDateString(),
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Patient cannot register a new exposure while an active treatment appointment is still scheduled.',
        ]);
    }
}

