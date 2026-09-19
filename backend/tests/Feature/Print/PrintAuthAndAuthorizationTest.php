<?php

namespace Tests\Feature\Print;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrintAuthAndAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(string $name): Clinic
    {
        return Clinic::create(['name' => $name]);
    }

    private function createPatient(Clinic $clinic, string $firstName = 'Juan'): Patient
    {
        return Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => $firstName,
            'last_name' => 'Dela Cruz',
            'date_of_birth' => '1995-05-10',
            'gender' => 'male',
            'contact_number' => '09123456789',
            'address' => 'Tagoloan, Misamis Oriental',
            'registration_date' => now()->toDateString(),
        ]);
    }

    public function test_unauthenticated_request_cannot_print(): void
    {
        $clinic = $this->createClinic('Clinic A');
        $patient = $this->createPatient($clinic);

        $response = $this->getJson('/api/print/patient/' . $patient->patient_id . '/enrolment');
        $response->assertStatus(401);
    }

    public function test_print_rejects_token_in_query_string_without_auth_header(): void
    {
        $clinic = $this->createClinic('Clinic A');
        $patient = $this->createPatient($clinic);

        $response = $this->getJson('/api/print/patient/' . $patient->patient_id . '/enrolment?token=fake-token');
        $response->assertStatus(401);
    }

    public function test_user_cannot_print_patient_from_another_clinic(): void
    {
        $clinicA = $this->createClinic('Clinic A');
        $clinicB = $this->createClinic('Clinic B');

        $patientB = $this->createPatient($clinicB, 'Maria');

        $nurseA = User::create([
            'name' => 'Nurse Clinic A',
            'email' => 'nurseA@clinica.com',
            'password' => bcrypt('secret123'),
            'clinic_id' => $clinicA->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($nurseA);

        $response = $this->getJson('/api/print/patient/' . $patientB->patient_id . '/enrolment');
        $response->assertStatus(403);
    }

    public function test_authorized_staff_can_print_clinic_patient(): void
    {
        $clinicA = $this->createClinic('Clinic A');
        $patientA = $this->createPatient($clinicA, 'Pedro');

        $nurseA = User::create([
            'name' => 'Nurse Clinic A',
            'email' => 'nurseA@clinica.com',
            'password' => bcrypt('secret123'),
            'clinic_id' => $clinicA->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        Sanctum::actingAs($nurseA);

        $response = $this->get('/api/print/patient/' . $patientA->patient_id . '/enrolment', [
            'Accept' => 'text/html',
        ]);
        $response->assertStatus(200);
    }
}
