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

class RegistrationReturningPatientCheckInTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createStaff(Clinic $clinic, string $roleSlug = 'registration'): User
    {
        $user = User::create([
            'name' => 'Registration Staff',
            'email' => "staff_{$roleSlug}@example.com",
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

    public function test_missing_patient_returns_actionable_error_without_creating_queue_entry()
    {
        $staff = $this->createStaff($this->createClinic());
        Sanctum::actingAs($staff);

        $this->postJson('/api/patients/999999/check-in')
            ->assertNotFound()
            ->assertJsonPath('code', 'patient_not_found');

        $this->assertDatabaseCount('queues', 0);
    }

    public function test_patient_from_another_clinic_cannot_be_checked_in()
    {
        $staff = $this->createStaff($this->createClinic());
        $patient = Patient::create([
            'clinic_id' => $this->createClinic()->id,
            'first_name' => 'Other',
            'last_name' => 'Patient',
            'gender' => 'male',
            'age' => 30,
        ]);
        Sanctum::actingAs($staff);

        $this->postJson("/api/patients/{$patient->patient_id}/check-in")
            ->assertNotFound()
            ->assertJsonPath('code', 'patient_not_found');

        $this->assertDatabaseCount('queues', 0);
    }

    public function test_registration_staff_can_check_in_returning_patient_registered_on_past_date()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        // Patient registered 3 days ago
        $pastDate = Carbon::now()->subDays(3);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'age' => 30,
            'date_of_birth' => '1995-01-01',
            'contact_number' => '09123456789',
            'registered_by' => $staff->id,
            'registration_source' => 'staff',
        ]);
        $patient->timestamps = false;
        $patient->created_at = $pastDate;
        $patient->updated_at = $pastDate;
        $patient->save();

        // A prior scheduled stub should stay untouched when a newer one exists.
        $olderTreatmentRecord = TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => null,
            'status' => 'scheduled',
            'consultation_date' => $pastDate->copy()->subDay()->toDateString(),
            'treatment_date' => $pastDate->copy()->subDay()->toDateString(),
            'consultation_time' => '08:00',
        ]);

        // Vitals entered at registration (TreatmentRecord stub)
        $treatmentRecord = TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => null,
            'status' => 'scheduled',
            'consultation_date' => $pastDate->toDateString(),
            'treatment_date' => $pastDate->toDateString(),
            'consultation_time' => '09:00',
            'blood_pressure' => '120/80',
            'temperature' => '36.5',
            'mode_of_transaction' => 'walk-in',
        ]);

        // Pending bite incident stub
        $biteIncident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'episode_number' => 1,
            'episode_type' => 'pending_assessment',
            'status' => 'awaiting_assessment',
            'exposure_type' => 'unassessed',
            'severity' => 'unassessed',
            'bite_date' => $pastDate->toDateString(),
            'created_by' => $staff->id,
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");

        $response->assertStatus(200)
            ->assertJsonPath('queue_number', 1)
            ->assertJsonPath('station', 'Doctor Assessment');

        // Queue ticket created for today in Triage Doctor queue
        $this->assertDatabaseHas('queues', [
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'queue_number' => 1,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'status' => 'waiting',
        ]);

        // TreatmentRecord stub updated with today's date
        $treatmentRecord->refresh();
        $this->assertEquals(Carbon::today()->toDateString(), Carbon::parse($treatmentRecord->consultation_date)->toDateString());
        $this->assertEquals(
            $pastDate->copy()->subDay()->toDateString(),
            Carbon::parse($olderTreatmentRecord->refresh()->consultation_date)->toDateString()
        );
    }

    public function test_check_in_reuses_and_updates_past_consultation_appointment()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $pastDate = Carbon::now()->subDays(2);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'gender' => 'female',
            'age' => 25,
            'date_of_birth' => '2000-05-15',
            'contact_number' => '09187654321',
            'registered_by' => $staff->id,
            'registration_source' => 'staff',
        ]);
        $patient->timestamps = false;
        $patient->created_at = $pastDate;
        $patient->save();

        // Past scheduled appointment
        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'appointment_date' => $pastDate->toDateString(),
            'scheduled_date' => $pastDate->toDateTimeString(),
            'appointment_type' => 'consultation',
            'status' => 'missed',
            'notes' => 'Scheduled consultation',
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");

        $response->assertStatus(200);

        $appointment->refresh();
        $this->assertEquals('confirmed', $appointment->status);
        $this->assertEquals(Carbon::today()->toDateString(), Carbon::parse($appointment->appointment_date)->toDateString());
        $this->assertEquals(1, $appointment->queue_number);
    }

    public function test_check_in_is_idempotent_if_already_active_in_today_queue()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $pastDate = Carbon::now()->subDays(1);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
            'age' => 28,
            'date_of_birth' => '1998-03-20',
            'contact_number' => '09199998888',
            'registered_by' => $staff->id,
            'created_at' => $pastDate,
        ]);

        // Already checked in today
        $queue = Queue::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'queue_number' => 5,
            'queue_date' => Carbon::today()->toDateString(),
            'visit_type' => 'new_case',
            'priority' => 'normal',
            'status' => 'waiting',
            'checked_in_at' => now(),
            'checked_in_by' => $staff->id,
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");

        $response->assertStatus(200)
            ->assertJsonPath('queue_number', 5)
            ->assertJsonPath('already_checked_in', true);

        // No new queue entry created
        $this->assertEquals(1, Queue::where('patient_id', $patient->patient_id)->count());
    }

    public function test_cannot_check_in_if_patient_already_completed_triage()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $pastDate = Carbon::now()->subDays(5);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'gender' => 'female',
            'age' => 40,
            'created_at' => $pastDate,
        ]);

        // Already received Day 0 dose
        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 0,
            'status' => 'completed',
            'treatment_date' => $pastDate->toDateString(),
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'This patient has already proceeded to Doctor Triage or started treatment.');
    }

    public function test_cannot_check_in_if_registered_today_without_past_appointment()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Newly',
            'last_name' => 'Registered',
            'gender' => 'female',
            'age' => 22,
            'created_at' => Carbon::now(),
        ]);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Check In is for returning patients who were previously registered or scheduled and are returning on a later date.');
    }

    public function test_check_in_does_not_create_duplicate_patient_profile()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $pastDate = Carbon::now()->subDays(4);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Original',
            'last_name' => 'Patient',
            'gender' => 'male',
            'age' => 35,
        ]);
        $patient->timestamps = false;
        $patient->created_at = $pastDate;
        $patient->save();

        Sanctum::actingAs($staff);

        $this->assertEquals(1, Patient::where('clinic_id', $clinic->id)->count());

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");
        $response->assertStatus(200);

        // Still exactly 1 patient profile - no duplicate
        $this->assertEquals(1, Patient::where('clinic_id', $clinic->id)->count());
    }

    public function test_unauthorized_roles_cannot_check_in_from_registration()
    {
        $clinic = $this->createClinic();
        $nurse = $this->createStaff($clinic, 'treatment');

        $pastDate = Carbon::now()->subDays(2);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Test',
            'last_name' => 'Patient',
            'gender' => 'male',
            'age' => 35,
        ]);
        $patient->timestamps = false;
        $patient->created_at = $pastDate;
        $patient->save();

        Sanctum::actingAs($nurse);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");
        $response->assertStatus(403);
    }

    public function test_seeder_produces_eligible_returning_patients()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        $this->seed(\Database\Seeders\ReturningPatientTriageCheckInSeeder::class);

        $patient = Patient::where('first_name', 'Lucas Gabriel')->where('last_name', 'Mendoza')->first();
        $this->assertNotNull($patient);

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");
        $response->assertStatus(200)
            ->assertJsonPath('station', 'Doctor Assessment');

        $this->assertDatabaseHas('queues', [
            'patient_id' => $patient->patient_id,
            'visit_type' => 'new_case',
            'status' => 'waiting',
            'queue_date' => Carbon::today()->toDateString(),
        ]);
    }

    public function test_pre_registered_mobile_patient_without_intake_or_appointment_cannot_be_checked_in()
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic, 'registration');

        // Pre-registered patient created on past date from mobile app
        $pastDate = Carbon::now()->subDays(5);
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'gender' => 'female',
            'age' => 24,
            'date_of_birth' => '2000-05-15',
            'contact_number' => '09987654321',
            'registration_source' => 'mobile',
        ]);
        $patient->timestamps = false;
        $patient->created_at = $pastDate;
        $patient->updated_at = $pastDate;
        $patient->save();

        Sanctum::actingAs($staff);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in");
        $response->assertStatus(422)
            ->assertJsonPath('message', 'This patient is only pre-registered from the mobile app and has not booked an appointment or submitted an intake.');

        $this->assertDatabaseCount('queues', 0);
    }
}
