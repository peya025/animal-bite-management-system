<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobilePatientWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function account(): PatientAccount
    {
        return PatientAccount::create([
            'name' => 'Parent Account',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
        ]);
    }

    private function patientPayload(Clinic $clinic, string $relationship = 'self'): array
    {
        return [
            'clinic_id' => $clinic->id,
            'relationship' => $relationship,
            'first_name' => $relationship === 'self' ? 'Juan' : 'Maria',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'date_of_birth' => '2010-01-10',
        ];
    }

    public function test_account_can_create_one_self_profile_and_dependents(): void
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        Sanctum::actingAs($account);

        $this->postJson('/api/mobile/patients', $this->patientPayload($clinic))
            ->assertCreated()
            ->assertJsonPath('pivot.relationship', 'self')
            ->assertJsonPath('pivot.is_primary', 1);

        $this->postJson('/api/mobile/patients', $this->patientPayload($clinic))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('relationship');

        $this->postJson('/api/mobile/patients', $this->patientPayload($clinic, 'child'))
            ->assertCreated()
            ->assertJsonPath('pivot.relationship', 'child');

        $this->assertDatabaseCount('patients', 2);
        $this->assertDatabaseCount('patient_account_patient', 2);
    }

    public function test_booking_is_scoped_to_an_authorized_patient_and_creates_a_recipient_notification(): void
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Dela Cruz',
            'gender' => 'female',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, [
            'relationship' => 'child',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($account);
        $date = now()->addDay()->toDateString();

        $this->postJson('/api/mobile/appointments', [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date' => $date,
        ])->assertCreated()
            ->assertJsonPath('patient.patient_id', $patient->patient_id);

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->patient_id,
            'booked_by_account_id' => $account->id,
            'appointment_type' => 'vaccination',
        ]);
        $this->assertDatabaseHas('notifications', [
            'patient_id' => $patient->patient_id,
            'patient_account_id' => $account->id,
            'type' => 'booking_confirmation',
        ]);

        $unrelatedAccount = $this->account();
        Sanctum::actingAs($unrelatedAccount);

        $this->postJson('/api/mobile/appointments', [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date' => $date,
        ])->assertNotFound();
    }

    public function test_vaccination_card_requires_verified_patient_access(): void
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Dela Cruz',
            'gender' => 'female',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, [
            'relationship' => 'child',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($account);
        $url = "/api/mobile/patients/{$patient->patient_id}/vaccination-card";

        $this->getJson($url)->assertNotFound();

        $account->patients()->updateExistingPivot($patient->patient_id, [
            'status' => 'verified',
            'verified_at' => now(),
        ]);

        $this->getJson($url)
            ->assertOk()
            ->assertJsonPath('patient.patient_id', $patient->patient_id)
            ->assertJsonPath('card_token', $patient->card_token);
    }
}
