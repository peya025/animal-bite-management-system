<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use Carbon\Carbon;
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

    private function intakePayload(): array
    {
        return [
            'bite_date' => now()->toDateString(),
            'bite_place' => 'Home',
            'site_washed' => true,
            'exposure_type' => 'bite',
            'animal_type' => 'dog',
            'animal_status' => 'owned',
            'animal_captured' => true,
            'wound_location' => 'Left hand',
            'patient_description' => 'Small visible puncture.',
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

    public function test_patient_account_can_update_its_profile(): void
    {
        $account = $this->account();
        Sanctum::actingAs($account);

        $this->patchJson('/api/mobile/me', [
            'name' => 'Updated Parent',
            'phone' => '09171234567',
        ])->assertOk()
            ->assertJsonPath('name', 'Updated Parent')
            ->assertJsonPath('phone', '09171234567');

        $this->assertDatabaseHas('patient_accounts', [
            'id' => $account->id,
            'name' => 'Updated Parent',
            'phone' => '09171234567',
        ]);
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

        $response = $this->postJson('/api/mobile/appointments', [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date' => $date,
            'intake' => $this->intakePayload(),
        ])->assertCreated()
            ->assertJsonPath('patient.patient_id', $patient->patient_id);

        $appointmentId = $response->json('appointment_id');

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

        $this->getJson('/api/mobile/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.patient.name', 'Maria Dela Cruz')
            ->assertJsonPath('data.0.status', 'pending');

        $notificationId = $account->notifications()->value('notification_id');
        $this->patchJson("/api/mobile/notifications/{$notificationId}/read")
            ->assertOk()
            ->assertJsonPath('status', 'read');

        $this->patchJson('/api/mobile/notifications/read-all')->assertOk();
        $this->assertDatabaseMissing('notifications', [
            'patient_account_id' => $account->id,
            'status' => 'pending',
        ]);

        $this->patchJson("/api/mobile/appointments/{$appointmentId}/cancel", [
            'reason' => 'Schedule conflict',
        ])->assertOk()
            ->assertJsonPath('status', 'cancelled')
            ->assertJsonPath('cancellation_reason', 'Schedule conflict');

        $this->patchJson("/api/mobile/appointments/{$appointmentId}/cancel")
            ->assertUnprocessable();

        $unrelatedAccount = $this->account();
        Sanctum::actingAs($unrelatedAccount);

        $this->postJson('/api/mobile/appointments', [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date' => $date,
            'intake' => $this->intakePayload(),
        ])->assertNotFound();
    }

    public function test_consultation_booking_requires_and_stores_patient_reported_bite_intake(): void
    {
        $clinic = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, [
            'relationship' => 'self',
            'status' => 'pending',
        ]);
        Sanctum::actingAs($account);

        $booking = [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date' => now()->addDay()->toDateString(),
        ];

        $this->postJson('/api/mobile/appointments', $booking)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('intake');

        $this->postJson('/api/mobile/appointments', [
            ...$booking,
            'intake' => $this->intakePayload(),
        ])->assertCreated()
            ->assertJsonPath('bite_intake.patient_id', $patient->patient_id)
            ->assertJsonPath('bite_intake.status', 'pending');

        $this->assertDatabaseHas('bite_incident_intakes', [
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'patient_account_id' => $account->id,
            'site_washed' => true,
            'status' => 'pending',
        ]);
    }

    public function test_booking_accepts_the_current_manila_date_at_the_utc_day_boundary(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-19 16:30:00', 'UTC'));

        try {
            $this->assertSame('Asia/Manila', config('app.timezone'));

            $clinic = Clinic::create(['name' => 'Test Clinic']);
            $account = $this->account();
            $patient = Patient::create([
                'clinic_id' => $clinic->id,
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'gender' => 'male',
                'registration_source' => 'mobile',
            ]);
            $account->patients()->attach($patient, [
                'relationship' => 'self',
                'status' => 'pending',
            ]);
            Sanctum::actingAs($account);

            $this->postJson('/api/mobile/appointments', [
                'patient_id' => $patient->patient_id,
                'appointment_type' => 'consultation',
                'scheduled_date' => '2026-07-20',
                'intake' => [
                    ...$this->intakePayload(),
                    'bite_date' => '2026-07-20',
                ],
            ])->assertCreated();
        } finally {
            Carbon::setTestNow();
        }
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
