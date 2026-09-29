<?php

namespace Tests\Feature;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConsultationDateTimeAutoFillTest extends TestCase
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
            'email' => 'staff@example.com',
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

    private function createDoctor(Clinic $clinic): User
    {
        $user = User::create([
            'name' => 'Dr. Maria Santos',
            'email' => 'doctor@example.com',
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

    public function test_new_patient_registration_saves_consultation_date_and_time(): void
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic);
        Sanctum::actingAs($staff);

        $consultDate = Carbon::now('Asia/Manila')->toDateString();
        $consultTime = Carbon::now('Asia/Manila')->format('H:i');

        $response = $this->postJson('/api/patients', [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'address' => 'Tagoloan, Misamis Oriental',
            'reg_date_of_consultation' => $consultDate,
            'reg_consultation_time' => $consultTime,
            'reg_blood_pressure' => '120/80',
            'reg_temperature' => '36.5',
            'reg_height' => '170',
            'reg_weight' => '70',
            'reg_attending_provider' => 'Dr. Santos',
            'reg_referred_by' => 'Tagoloan RHU',
        ]);

        $response->assertStatus(201);
        $patientId = $response->json('patient.patient_id');

        $this->assertDatabaseHas('treatment_records', [
            'patient_id' => $patientId,
            'consultation_date' => $consultDate,
            'consultation_time' => $consultTime,
            'status' => 'scheduled',
            'blood_pressure' => '120/80',
            'temperature' => '36.5',
        ]);

        // Viewing patient returns latestConsultationRecord with saved date & time
        $viewResponse = $this->getJson("/api/patients/{$patientId}");
        $viewResponse->assertStatus(200);
        $this->assertNotNull($viewResponse->json('latest_consultation_record'));
        $this->assertEquals($consultDate, $viewResponse->json('latest_consultation_record.consultation_date'));
        $this->assertStringStartsWith($consultTime, $viewResponse->json('latest_consultation_record.consultation_time'));
    }

    public function test_form_2_preserves_existing_consultation_date_and_time(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createDoctor($clinic);
        $staff = $this->createStaff($clinic);

        // Saved earlier consultation on a specific past time
        $originalDate = '2026-09-28';
        $originalTime = '09:15';

        Sanctum::actingAs($staff);
        $regResponse = $this->postJson('/api/patients', [
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'gender' => 'female',
            'date_of_birth' => '1995-05-15',
            'address' => 'Tagoloan, Misamis Oriental',
            'reg_date_of_consultation' => $originalDate,
            'reg_consultation_time' => $originalTime,
        ]);
        $regResponse->assertStatus(201);
        $patientId = $regResponse->json('patient.patient_id');

        $incident = BiteIncident::where('patient_id', $patientId)->first();

        // Doctor opens Form 2 and completes the consultation, submitting the existing date and time
        Sanctum::actingAs($doctor);
        $form2Response = $this->postJson('/api/treatment-records', [
            'patient_id' => $patientId,
            'bite_id' => $incident->bite_id,
            'consultation_date' => $originalDate,
            'consultation_time' => $originalTime,
            'nature_of_visit' => 'new_consultation',
            'consultation_types' => ['general'],
            'chief_complaints' => 'Dog bite on left hand',
            'diagnosis' => 'Category II Dog Bite',
            'treatment_plan' => 'full_pep',
        ]);
        $form2Response->assertStatus(201);

        // Verify the completed record preserved the original consultation date & time
        $this->assertDatabaseHas('treatment_records', [
            'patient_id' => $patientId,
            'consultation_date' => $originalDate,
            'consultation_time' => $originalTime,
            'status' => 'completed',
            'chief_complaints' => 'Dog bite on left hand',
        ]);
    }

    public function test_consultation_date_and_time_fallback_to_manila_time(): void
    {
        $clinic = $this->createClinic();
        $staff = $this->createStaff($clinic);
        Sanctum::actingAs($staff);

        $nowManila = Carbon::now('Asia/Manila');

        $response = $this->postJson('/api/patients', [
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
            'date_of_birth' => '1985-03-20',
            'address' => 'Tagoloan, Misamis Oriental',
            'reg_blood_pressure' => '110/70', // triggers vitals record creation without manual date/time
        ]);

        $response->assertStatus(201);
        $patientId = $response->json('patient.patient_id');

        $this->assertDatabaseHas('treatment_records', [
            'patient_id' => $patientId,
            'consultation_date' => $nowManila->toDateString(),
            'status' => 'scheduled',
            'blood_pressure' => '110/70',
        ]);
    }
}
