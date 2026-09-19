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

        // Doctor fills Form 2
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
            'new_bite_date' => Carbon::today()->toDateString(),
            'new_exposure_type' => 'bite',
            'new_severity' => 'moderate',
            'new_animal_type' => 'dog',
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
}
