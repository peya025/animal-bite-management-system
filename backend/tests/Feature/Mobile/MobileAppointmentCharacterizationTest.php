<?php

namespace Tests\Feature\Mobile;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\TreatmentRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileAppointmentCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private PatientAccount $patientAccount;
    private User $staffUser;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->clinic = Clinic::create([
            'name' => 'Tagoloan Animal Bite Treatment Center',
        ]);

        $this->patientAccount = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria@example.com',
            'phone'     => '09171234567',
            'password'  => Hash::make('Password123!'),
            'is_active' => true,
        ]);

        $this->staffUser = User::create([
            'clinic_id' => $this->clinic->id,
            'name'      => 'Staff Nurse',
            'email'     => 'nurse@clinic.gov.ph',
            'password'  => Hash::make('Password123!'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id'     => $this->clinic->id,
            'first_name'    => 'Baby',
            'last_name'     => 'Santos',
            'date_of_birth' => '2024-01-01',
            'gender'        => 'Female',
        ]);

        $this->patientAccount->patients()->attach($this->patient->patient_id, [
            'relationship' => 'child',
            'status'       => 'verified',
        ]);
    }

    private function validIntakePayload(): array
    {
        return [
            'bite_date'           => Carbon::today()->toDateString(),
            'bite_place'          => 'Poblacion',
            'animal_type'         => 'dog',
            'animal_status'       => 'owned',
            'wound_location'      => 'Right Leg',
            'exposure_type'       => 'transdermal_bite',
            'site_washed'         => true,
            'animal_captured'     => true,
            'patient_description' => 'Small scratch',
        ];
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/mobile/appointments')->assertStatus(401);
        $this->postJson('/api/mobile/appointments', [])->assertStatus(401);
        $this->patchJson('/api/mobile/appointments/1/cancel')->assertStatus(401);
    }

    public function test_staff_users_are_forbidden(): void
    {
        Sanctum::actingAs($this->staffUser);

        $this->getJson('/api/mobile/appointments')
            ->assertStatus(403)
            ->assertJson(['message' => 'Patient account authentication is required.']);
    }

    public function test_index_returns_formatted_appointments(): void
    {
        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'appointment_type'     => 'vaccination',
            'dose_number'          => 3,
            'scheduled_date'       => Carbon::today()->addDays(3)->toDateString(),
            'appointment_date'     => Carbon::today()->addDays(3)->toDateString(),
            'time_slot'            => 'morning',
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->patientAccount->id,
        ]);

        Sanctum::actingAs($this->patientAccount);

        $response = $this->getJson('/api/mobile/appointments');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.appointment_id', $appointment->appointment_id)
            ->assertJsonPath('0.patient_id', $this->patient->patient_id)
            ->assertJsonPath('0.patient_name', 'Baby Santos')
            ->assertJsonPath('0.relationship', 'child')
            ->assertJsonPath('0.dose_name', 'Day 3')
            ->assertJsonPath('0.type_label', 'Anti-rabies vaccine · Day 3');
    }

    public function test_store_vaccination_appointment_success(): void
    {
        Sanctum::actingAs($this->patientAccount);

        $futureDate = Carbon::today()->addDays(5)->toDateString();

        $response = $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date'   => $futureDate,
            'time_slot'        => 'morning',
            'notes'            => 'Scheduled follow-up dose',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('patient_id', $this->patient->patient_id)
            ->assertJsonPath('appointment_type', 'vaccination')
            ->assertJsonPath('status', 'scheduled');

        $this->assertDatabaseHas('appointments', [
            'patient_id'           => $this->patient->patient_id,
            'appointment_type'     => 'vaccination',
            'booked_by_account_id' => $this->patientAccount->id,
            'status'               => 'scheduled',
        ]);
    }

    public function test_store_consultation_requires_and_normalizes_intake(): void
    {
        Sanctum::actingAs($this->patientAccount);

        // Missing intake fails validation
        $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date'   => Carbon::today()->toDateString(),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['intake']);

        // With valid intake
        $response = $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date'   => Carbon::today()->toDateString(),
            'intake'           => $this->validIntakePayload(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('appointment_type', 'consultation');

        $this->assertDatabaseHas('bite_incident_intakes', [
            'patient_id'         => $this->patient->patient_id,
            'patient_account_id' => $this->patientAccount->id,
            'animal_type'        => 'dog',
            'status'             => 'pending',
        ]);
    }

    public function test_store_booster_requires_completed_primary_series(): void
    {
        Sanctum::actingAs($this->patientAccount);

        // Primary series incomplete
        $response = $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'booster',
            'scheduled_date'   => Carbon::today()->addDays(1)->toDateString(),
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'has_completed_primary' => false,
            ]);

        // Complete primary 3-dose series
        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id'      => $this->clinic->id,
                'patient_id'     => $this->patient->patient_id,
                'dose_number'    => $dose,
                'treatment_date' => Carbon::today()->subDays(30 - $dose)->toDateString(),
                'status'         => 'completed',
            ]);
        }

        // Booster booking now succeeds and generates both Day 0 and Day 3 booster appointments
        $successResponse = $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'booster',
            'scheduled_date'   => Carbon::today()->addDays(1)->toDateString(),
        ]);

        $successResponse->assertStatus(201);

        $this->assertDatabaseHas('appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'booster',
            'dose_number'      => 90,
        ]);

        $this->assertDatabaseHas('appointments', [
            'patient_id'       => $this->patient->patient_id,
            'appointment_type' => 'booster',
            'dose_number'      => 365,
        ]);
    }

    public function test_cancel_scheduled_appointment(): void
    {
        $appointment = Appointment::create([
            'clinic_id'            => $this->clinic->id,
            'patient_id'           => $this->patient->patient_id,
            'appointment_type'     => 'vaccination',
            'scheduled_date'       => Carbon::today()->addDays(2)->toDateString(),
            'appointment_date'     => Carbon::today()->addDays(2)->toDateString(),
            'status'               => 'scheduled',
            'booked_by_account_id' => $this->patientAccount->id,
        ]);

        Sanctum::actingAs($this->patientAccount);

        $response = $this->patchJson("/api/mobile/appointments/{$appointment->appointment_id}/cancel", [
            'reason' => 'Schedule conflict',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'cancelled')
            ->assertJsonPath('cancellation_reason', 'Schedule conflict');

        $appointment->refresh();
        $this->assertEquals('cancelled', $appointment->status);
        $this->assertNotNull($appointment->cancelled_at);

        // Attempting to cancel already cancelled appointment returns 422
        $this->patchJson("/api/mobile/appointments/{$appointment->appointment_id}/cancel")
            ->assertStatus(422);
    }
}
