<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\Role;
use App\Models\User;
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
            'name'     => 'Parent Account',
            'email'    => fake()->unique()->safeEmail(),
            'password' => 'password123',
        ]);
    }

    private function patientPayload(Clinic $clinic, string $relationship = 'self'): array
    {
        return [
            'clinic_id'    => $clinic->id,
            'relationship' => $relationship,
            'first_name'   => $relationship === 'self' ? 'Juan' : 'Maria',
            'last_name'    => 'Dela Cruz',
            'gender'       => 'male',
            'date_of_birth' => '2010-01-10',
        ];
    }

    private function intakePayload(): array
    {
        return [
            'bite_date'           => now()->toDateString(),
            'bite_place'          => 'Home',
            'site_washed'         => true,
            'exposure_type'       => 'bite',
            'animal_type'         => 'dog',
            'animal_status'       => 'owned',
            'animal_captured'     => true,
            'wound_location'      => 'Left hand',
            'patient_description' => 'Small visible puncture.',
        ];
    }

    private function registrationStaff(Clinic $clinic): User
    {
        $staff = User::create([
            'name' => 'Registration Clerk',
            'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'registration'], [
            'name' => 'registration',
            'display_name' => 'Registration',
            'default_route' => '/patients',
        ]);
        $staff->roles()->attach($role->id, ['assigned_at' => now()]);

        return $staff;
    }

    public function test_account_can_create_one_self_profile_and_dependents(): void
    {
        $clinic  = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        Sanctum::actingAs($account);

        $this->postJson('/api/mobile/patients', $this->patientPayload($clinic))
            ->assertCreated()
            ->assertJsonPath('pivot.relationship', 'self')
            ->assertJsonPath('pivot.is_primary', true);

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
            'name'  => 'Updated Parent',
            'phone' => '09171234567',
        ])->assertOk()
            ->assertJsonPath('name', 'Updated Parent')
            ->assertJsonPath('phone', '09171234567');

        $this->assertDatabaseHas('patient_accounts', [
            'id'    => $account->id,
            'name'  => 'Updated Parent',
            'phone' => '09171234567',
        ]);
    }

    public function test_booking_is_scoped_to_an_authorized_patient_and_creates_a_recipient_notification(): void
    {
        $clinic  = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Maria',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'female',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, ['relationship' => 'child', 'status' => 'pending']);

        Sanctum::actingAs($account);
        $date = now()->addDay()->toDateString();

        $response = $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date'   => $date,
            'intake'           => $this->intakePayload(),
        ])->assertCreated()
            ->assertJsonPath('patient.patient_id', $patient->patient_id);

        $appointmentId = $response->json('appointment_id');

        $this->assertDatabaseHas('appointments', [
            'patient_id'          => $patient->patient_id,
            'booked_by_account_id' => $account->id,
            'appointment_type'    => 'vaccination',
        ]);
        $this->assertDatabaseHas('notifications', [
            'patient_id'         => $patient->patient_id,
            'patient_account_id' => $account->id,
            'type'               => 'booking_confirmation',
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
            'status'             => 'pending',
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
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'vaccination',
            'scheduled_date'   => $date,
            'intake'           => $this->intakePayload(),
        ])->assertNotFound();
    }

    public function test_consultation_booking_requires_and_stores_patient_reported_bite_intake(): void
    {
        $clinic  = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Juan',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, ['relationship' => 'self', 'status' => 'pending']);
        Sanctum::actingAs($account);

        $booking = [
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date'   => now()->addDay()->toDateString(),
        ];

        $this->postJson('/api/mobile/appointments', $booking)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('intake');

        $this->postJson('/api/mobile/appointments', [...$booking, 'intake' => $this->intakePayload()])
            ->assertCreated()
            ->assertJsonPath('bite_intake.patient_id', $patient->patient_id)
            ->assertJsonPath('bite_intake.status', 'pending');

        $this->assertDatabaseHas('bite_incident_intakes', [
            'clinic_id'          => $clinic->id,
            'patient_id'         => $patient->patient_id,
            'patient_account_id' => $account->id,
            'site_washed'        => true,
            'status'             => 'pending',
        ]);
    }

    public function test_mobile_bite_intake_requires_registration_check_in_before_it_reaches_doctor_queue(): void
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
        $account->patients()->attach($patient, ['relationship' => 'self', 'status' => 'verified']);

        Sanctum::actingAs($account);
        $booking = $this->postJson('/api/mobile/appointments', [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date' => now()->toDateString(),
            'intake' => $this->intakePayload(),
        ])->assertCreated();

        $appointmentId = $booking->json('appointment_id');
        $intakeId = $booking->json('bite_intake.intake_id');

        // Booking data by itself is not a live queue ticket.
        $this->assertDatabaseMissing('queues', ['appointment_id' => $appointmentId]);
        $this->assertDatabaseHas('bite_incident_intakes', ['intake_id' => $intakeId, 'status' => 'pending']);

        $staff = $this->registrationStaff($clinic);
        Sanctum::actingAs($staff);

        // The generic appointment endpoint cannot bypass intake confirmation.
        $this->postJson("/api/appointments/{$appointmentId}/check-in")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Mobile bite consultations must be checked in from Registration using the submitted bite intake before they enter the Doctor queue.');
        $this->assertDatabaseMissing('queues', ['appointment_id' => $appointmentId]);

        $this->postJson("/api/bite-intakes/{$intakeId}/check-in")
            ->assertCreated()
            ->assertJsonPath('queue.appointment_id', $appointmentId)
            ->assertJsonPath('queue.visit_type', 'new_case')
            ->assertJsonPath('incident.status', 'awaiting_assessment');

        $this->assertDatabaseHas('appointments', [
            'appointment_id' => $appointmentId,
            'status' => 'confirmed',
        ]);
        $this->assertDatabaseHas('bite_incident_intakes', [
            'intake_id' => $intakeId,
            'status' => 'converted',
        ]);
        $this->assertDatabaseHas('queues', [
            'appointment_id' => $appointmentId,
            'patient_id' => $patient->patient_id,
            'visit_type' => 'new_case',
            'status' => 'waiting',
        ]);

        // Repeating the action is safe and does not create a ghost duplicate.
        $this->postJson("/api/bite-intakes/{$intakeId}/check-in")
            ->assertOk()
            ->assertJsonPath('already_checked_in', true);
        $this->assertDatabaseCount('queues', 1);
    }

    public function test_booking_accepts_the_current_manila_date_at_the_utc_day_boundary(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-19 16:30:00', 'UTC'));

        try {
            $this->assertSame('Asia/Manila', config('app.timezone'));

            $clinic  = Clinic::create(['name' => 'Test Clinic']);
            $account = $this->account();
            $patient = Patient::create([
                'clinic_id'           => $clinic->id,
                'first_name'          => 'Juan',
                'last_name'           => 'Dela Cruz',
                'gender'              => 'male',
                'registration_source' => 'mobile',
            ]);
            $account->patients()->attach($patient, ['relationship' => 'self', 'status' => 'pending']);
            Sanctum::actingAs($account);

            $this->postJson('/api/mobile/appointments', [
                'patient_id'       => $patient->patient_id,
                'appointment_type' => 'consultation',
                'scheduled_date'   => '2026-07-20',
                'intake'           => [...$this->intakePayload(), 'bite_date' => '2026-07-20'],
            ])->assertCreated();
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_vaccination_card_requires_verified_patient_access(): void
    {
        $clinic  = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Maria',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'female',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, ['relationship' => 'child', 'status' => 'pending']);

        Sanctum::actingAs($account);
        $url = "/api/mobile/patients/{$patient->patient_id}/vaccination-card";

        $this->getJson($url)->assertNotFound();

        $account->patients()->updateExistingPivot($patient->patient_id, [
            'status'      => 'verified',
            'verified_at' => now(),
        ]);

        $this->getJson($url)
            ->assertOk()
            ->assertJsonPath('patient.patient_id', $patient->patient_id)
            ->assertJsonPath('card_token', $patient->card_token);
    }

    public function test_booster_booking_requires_primary_series_completion(): void
    {
        $clinic  = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Maria',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'female',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, [
            'relationship' => 'self',
            'status'       => 'verified',
            'verified_at'  => now(),
        ]);
        Sanctum::actingAs($account);

        foreach ([0, 3] as $dose) {
            \App\Models\TreatmentRecord::create([
                'clinic_id'      => $clinic->id,
                'patient_id'     => $patient->patient_id,
                'dose_number'    => $dose,
                'status'         => 'completed',
                'treatment_date' => now()->subDays(7 - $dose),
            ]);
        }

        $this->assertFalse($patient->fresh()->has_completed_primary);

        $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'booster',
            'scheduled_date'   => now()->addDay()->toDateString(),
        ])->assertUnprocessable()
            ->assertJsonPath('has_completed_primary', false);

        \App\Models\TreatmentRecord::create([
            'clinic_id'      => $clinic->id,
            'patient_id'     => $patient->patient_id,
            'dose_number'    => 7,
            'status'         => 'completed',
            'treatment_date' => now()->subDay(),
        ]);

        $this->assertTrue($patient->fresh()->has_completed_primary);

        $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'booster',
            'scheduled_date'   => now()->addDay()->toDateString(),
        ])->assertCreated()
            ->assertJsonPath('appointment_type', 'booster');

        $this->assertDatabaseHas('appointments', ['patient_id' => $patient->patient_id, 'appointment_type' => 'booster', 'dose_number' => 90]);
        $this->assertDatabaseHas('appointments', ['patient_id' => $patient->patient_id, 'appointment_type' => 'booster', 'dose_number' => 365]);
    }

    public function test_vaccination_card_hides_boosters_until_booster_is_active(): void
    {
        $clinic  = Clinic::create(['name' => 'Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Juan',
            'last_name'           => 'Dela Cruz',
            'gender'              => 'male',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($patient, [
            'relationship' => 'self',
            'status'       => 'verified',
            'verified_at'  => now(),
        ]);
        Sanctum::actingAs($account);

        foreach ([0, 3, 7] as $dose) {
            \App\Models\TreatmentRecord::create([
                'clinic_id'      => $clinic->id,
                'patient_id'     => $patient->patient_id,
                'dose_number'    => $dose,
                'status'         => 'completed',
                'treatment_date' => now()->subDays(10 - $dose),
            ]);
        }

        $response = $this->getJson("/api/mobile/patients/{$patient->patient_id}/vaccination-card")
            ->assertOk()
            ->assertJsonPath('has_booster', false)
            ->assertJsonPath('progress.total_doses', 3)
            ->assertJsonPath('status', 'COMPLETED');

        $doses = $response->json('doses');
        $this->assertCount(3, $doses);
        foreach ($doses as $dose) {
            $this->assertStringNotContainsStringIgnoringCase('booster', $dose['period']);
        }

        $this->postJson('/api/mobile/appointments', [
            'patient_id'       => $patient->patient_id,
            'appointment_type' => 'booster',
            'scheduled_date'   => now()->addDay()->toDateString(),
        ])->assertCreated();

        $responseAfter = $this->getJson("/api/mobile/patients/{$patient->patient_id}/vaccination-card")
            ->assertOk()
            ->assertJsonPath('has_booster', true)
            ->assertJsonPath('progress.has_booster', true)
            ->assertJsonPath('status', 'ACTIVE');

        $dosesAfter = $responseAfter->json('doses');
        $this->assertCount(5, $dosesAfter);
        $boosterNames = array_column($dosesAfter, 'period');
        $this->assertContains('Booster 1', $boosterNames);
        $this->assertContains('Booster 2', $boosterNames);
    }
}
