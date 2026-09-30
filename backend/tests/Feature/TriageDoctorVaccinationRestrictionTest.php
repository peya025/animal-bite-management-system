<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\BiteIncident;
use App\Models\User;
use App\Models\VaccinationSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TriageDoctorVaccinationRestrictionTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan ABTC']);
    }

    private function createTriageDoctor(Clinic $clinic): User
    {
        return User::create([
            'name' => 'Dr. Triage',
            'email' => 'doctor@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'triage',
            'is_active' => true,
        ]);
    }

    private function createTreatmentNurse(Clinic $clinic): User
    {
        return User::create([
            'name' => 'Nurse Joy',
            'email' => 'nurse@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
    }

    public function test_triage_doctor_cannot_record_form3_vaccine_dose_via_direct_post(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createTriageDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'P-2026-0001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_date' => now()->toDateString(),
            'animal_type' => 'dog',
            'severity' => 'moderate',
            'created_by' => $doctor->id,
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->postJson('/api/vaccination-records', [
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'doses' => [
                [
                    'period' => 'Day 0',
                    'vaccine_type' => 'Rabipur',
                    'route' => 'ID',
                    'date' => now()->toDateString(),
                ],
            ],
        ]);

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'Unauthorized. This action requires admin or treatment or nurse role.',
        ]);
    }

    public function test_triage_doctor_cannot_administer_dose_via_direct_post(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createTriageDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'P-2026-0002',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'gender' => 'female',
            'date_of_birth' => '1995-05-05',
        ]);

        $schedule = VaccinationSchedule::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 0,
            'scheduled_date' => now()->toDateString(),
            'status' => 'scheduled',
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->postJson("/api/vaccinations/{$schedule->treatment_id}/administer", [
            'vaccine_brand' => 'Rabipur',
            'vaccine_batch_number' => 'BATCH-001',
            'injection_site' => 'Right Deltoid',
        ]);

        $response->assertStatus(403);
    }

    public function test_triage_doctor_cannot_save_treatment_card_via_direct_post(): void
    {
        $clinic = $this->createClinic();
        $doctor = $this->createTriageDoctor($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'patient_number' => 'P-2026-0003',
            'first_name' => 'Bob',
            'last_name' => 'Smith',
            'gender' => 'male',
            'date_of_birth' => '1985-08-08',
        ]);

        $incident = BiteIncident::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_date' => now()->toDateString(),
            'animal_type' => 'dog',
            'severity' => 'moderate',
            'created_by' => $doctor->id,
        ]);

        Sanctum::actingAs($doctor);

        $response = $this->postJson('/api/tagoloan-treatment-cards', [
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'card_date' => now()->toDateString(),
        ]);

        $response->assertStatus(403);
    }

    public function test_treatment_nurse_is_not_blocked_by_triage_restriction(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createTreatmentNurse($clinic);

        Sanctum::actingAs($nurse);

        // A nurse sending request hits validation (422) instead of 403 Forbidden
        $response = $this->postJson('/api/vaccination-records', []);
        $this->assertNotEquals(403, $response->getStatusCode());
    }
}
