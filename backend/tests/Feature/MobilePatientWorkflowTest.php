<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BiteIncidentIntake;
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

    private function clinic(): Clinic
    {
        return Clinic::firstOrCreate(['name' => 'Main Clinic']);
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
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ];
    }

    private function completeBookingProfile(Patient $patient): void
    {
        $patient->details()->updateOrCreate([], [
            'address_municipality' => 'Tagoloan',
            'address_barangay' => 'Poblacion',
            'province' => 'Misamis Oriental',
        ]);
    }

    private function intakePayload(): array
    {
        return [
            'bite_date'           => now()->toDateString(),
            'bite_place'          => 'Home',
            'site_washed'         => true,
            'exposure_type'       => 'transdermal_bite',
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
        $this->completeBookingProfile($patient);
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

    public function test_mobile_intake_uses_the_versioned_patient_safe_contract_and_rejects_clinical_fields(): void
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
        $this->completeBookingProfile($patient);
        $account->patients()->attach($patient, ['relationship' => 'self', 'status' => 'verified']);
        Sanctum::actingAs($account);

        $this->getJson('/api/mobile/bite-intake-schema')
            ->assertOk()
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('source', 'web_forms_1_2_3')
            ->assertJsonPath('options.body_part_group.upper_extremities', 'Upper extremities (arm or hand)')
            ->assertJsonPath('options.animal_species.bat', 'Bat');

        $booking = [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date' => now()->addDay()->toDateString(),
        ];
        $intake = [
            'schema_version' => '1.0',
            'date_of_exposure' => now()->toDateString(),
            'time_of_exposure' => '08:30',
            'place_of_exposure' => 'Poblacion, Tagoloan',
            'reported_mode_of_exposure' => 'transdermal_bite',
            'body_part_group' => 'upper_extremities',
            'body_part_detail' => 'Left index finger',
            'laterality' => 'left',
            'animal_species' => 'bat',
            'animal_ownership' => 'unknown',
            'animal_available_for_observation' => false,
            'animal_condition_reported' => 'unknown',
            'site_washed' => true,
            'wash_method' => 'soap_and_water',
            'wash_duration_minutes' => 15,
            'incident_narrative' => 'Patient saw a small puncture.',
            'past_bite_history' => 'yes',
            'past_bite_dates' => 'June 2024',
            'prior_pep_status' => 'completed',
            'prior_pep_date' => now()->subYear()->toDateString(),
            'prior_pep_facility' => 'Tagoloan ABTC',
        ];

        $response = $this->postJson('/api/mobile/appointments', [
            ...$booking,
            'intake' => $intake,
        ])->assertCreated()
            ->assertJsonPath('bite_intake.schema_version', '1.0')
            ->assertJsonPath('bite_intake.reported_mode_of_exposure', 'transdermal_bite')
            ->assertJsonPath('bite_intake.body_part_group', 'upper_extremities')
            ->assertJsonPath('bite_intake.body_part_detail', 'Left index finger')
            ->assertJsonPath('bite_intake.animal_species', 'bat')
            ->assertJsonPath('bite_intake.prior_pep_status', 'completed');

        $this->assertDatabaseHas('bite_incident_intakes', [
            'intake_id' => $response->json('bite_intake.intake_id'),
            'bite_date' => now()->toDateString(),
            'exposure_type' => 'transdermal_bite',
            'body_part_exposed' => 'upper_extremities',
            'wound_location' => 'Left index finger',
            'animal_type' => 'bat',
            'animal_status' => 'unknown',
            'past_bite_history' => 'yes',
            'prior_pep_status' => 'completed',
        ]);

        $this->postJson('/api/mobile/appointments', [
            ...$booking,
            'intake' => [...$intake, 'diagnosis' => 'Rabies exposure'],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('intake.diagnosis');
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
        $this->completeBookingProfile($patient);
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
            'exposure_type' => 'transdermal_bite',
            'checked_in_by' => $staff->id,
        ]);
        $this->assertDatabaseHas('bite_incidents', [
            'patient_id' => $patient->patient_id,
            'exposure_type' => 'unassessed',
            'severity' => 'unassessed',
            'animal_status' => 'unassessed',
            'is_previously_vaccinated' => null,
            'status' => 'awaiting_assessment',
        ]);
        $this->assertDatabaseHas('queues', [
            'appointment_id' => $appointmentId,
            'patient_id' => $patient->patient_id,
            'visit_type' => 'new_case',
            'status' => 'waiting',
        ]);
        $this->assertDatabaseHas('treatment_records', [
            'patient_id' => $patient->patient_id,
            'dose_number' => null,
            'status' => 'scheduled',
        ]);

        $this->getJson("/api/tagoloan-treatment-cards/patient/{$patient->patient_id}")
            ->assertOk()
            ->assertJsonPath('form3_ready', false)
            ->assertJsonPath('bite_incident.mode_of_exposure', null);

        // Repeating the action is safe and does not create a ghost duplicate.
        $this->postJson("/api/bite-intakes/{$intakeId}/check-in")
            ->assertOk()
            ->assertJsonPath('already_checked_in', true);
        $this->assertDatabaseCount('queues', 1);
    }

    public function test_mobile_bite_intake_check_in_stores_clinic_measured_vitals_and_referral_payload(): void
    {
        $clinic = Clinic::create(['name' => 'Vitals Test Clinic']);
        $account = $this->account();
        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'birth_date' => '1995-05-15',
            'gender' => 'Female',
            'contact_number' => '09123456789',
        ]);
        $this->completeBookingProfile($patient);
        $patient->accounts()->attach($account->id, ['relationship' => 'self', 'status' => 'verified']);

        $staff = $this->registrationStaff($clinic);

        Sanctum::actingAs($account);
        $booking = $this->postJson('/api/mobile/appointments', [
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'scheduled_date' => Carbon::today('Asia/Manila')->toDateString(),
            'intake' => array_merge($this->intakePayload(), [
                'referral_facility' => 'Tagoloan Health Station',
                'referral_provider_name' => 'Nurse Joy',
                'referral_blood_pressure' => '110/70',
            ]),
        ])->assertCreated();

        $intakeId = $booking->json('bite_intake.intake_id');

        // Check in with updated clinic measured vitals
        Sanctum::actingAs($staff);
        $this->postJson("/api/bite-intakes/{$intakeId}/check-in", [
            'blood_pressure' => '120/80',
            'temperature' => 36.6,
            'height' => 165,
            'weight' => 58,
            'attending_provider' => 'Dr. Garcia',
            'referred_by' => 'Tagoloan Health Station (Verified)',
            'mode_of_transaction' => 'referral',
        ])
        ->assertCreated()
        ->assertJsonPath('consultation_record.blood_pressure', '120/80')
        ->assertJsonPath('consultation_record.temperature', 36.6)
        ->assertJsonPath('consultation_record.weight', 58)
        ->assertJsonPath('consultation_record.attending_provider', 'Dr. Garcia');

        $this->assertDatabaseHas('treatment_records', [
            'patient_id' => $patient->patient_id,
            'blood_pressure' => '120/80',
            'temperature' => '36.6',
            'weight' => '58',
            'attending_provider' => 'Dr. Garcia',
            'referred_by' => 'Tagoloan Health Station (Verified)',
            'mode_of_transaction' => 'referral',
        ]);
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
            $this->completeBookingProfile($patient);
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

    public function test_changing_password_revokes_other_active_tokens(): void
    {
        $account = $this->account();
        $token1 = $account->createToken('device-1')->plainTextToken;
        $token2 = $account->createToken('device-2')->plainTextToken;

        // Device 1 changes password
        $this->withHeader('Authorization', "Bearer {$token1}")
            ->postJson('/api/mobile/change-password', [
                'current_password'      => 'password123',
                'password'              => 'newpassword456',
                'password_confirmation' => 'newpassword456',
            ])->assertOk()
            ->assertJsonPath('message', 'Password has been changed successfully.');

        // Device 1 remains authenticated
        $this->withHeader('Authorization', "Bearer {$token1}")
            ->getJson('/api/mobile/me')
            ->assertOk();

        $this->assertDatabaseHas('personal_access_tokens', [
            'name' => 'device-1',
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'name' => 'device-2',
        ]);

        $this->app['auth']->forgetGuards();

        // Device 2 token has been revoked
        $this->withHeader('Authorization', "Bearer {$token2}")
            ->getJson('/api/mobile/me')
            ->assertUnauthorized();
    }

    public function test_mobile_find_existing_chart_by_patient_number_or_demographics(): void
    {
        $clinic = $this->clinic();
        $account = $this->account();

        $walkinPatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Hazel Ann',
            'last_name'           => 'Nandong',
            'date_of_birth'       => '1995-05-20',
            'gender'              => 'female',
            'registration_source' => 'staff',
        ]);

        $token = $account->createToken('test')->plainTextToken;

        // 1. Search by patient number
        $res1 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/mobile/patients/find-existing', [
                'patient_number' => $walkinPatient->patient_number,
            ]);
        $res1->assertOk()
            ->assertJsonPath('found', true)
            ->assertJsonPath('patient.patient_id', $walkinPatient->patient_id)
            ->assertJsonPath('patient.patient_number', $walkinPatient->patient_number);

        // 2. Search by demographics (first_name, last_name, date_of_birth)
        $res2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/mobile/patients/find-existing', [
                'first_name'    => 'hazel ann',
                'last_name'     => 'nandong',
                'date_of_birth' => '1995-05-20',
            ]);
        $res2->assertOk()
            ->assertJsonPath('found', true)
            ->assertJsonPath('patient.patient_id', $walkinPatient->patient_id);

        // 3. Search non-existent
        $res3 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/mobile/patients/find-existing', [
                'patient_number' => 'NON-EXISTENT-9999',
            ]);
        $res3->assertOk()
            ->assertJsonPath('found', false);
    }

    public function test_mobile_profile_creation_links_to_existing_walkin_chart_preventing_duplicate(): void
    {
        $clinic = $this->clinic();
        $account = $this->account();

        $walkinPatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Hazel Ann',
            'last_name'           => 'Nandong',
            'date_of_birth'       => '1995-05-20',
            'gender'              => 'female',
            'registration_source' => 'staff',
        ]);

        $initialPatientCount = Patient::count();
        $token = $account->createToken('test')->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/mobile/patients', [
                'clinic_id'      => $clinic->id,
                'relationship'   => 'self',
                'first_name'     => 'Hazel Ann',
                'last_name'      => 'Nandong',
                'date_of_birth'  => '1995-05-20',
                'gender'         => 'female',
                'contact_number' => '09171234567',
                'address_municipality' => 'Tagoloan',
                'address_barangay' => 'Poblacion',
                'province' => 'Misamis Oriental',
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('patient_id', $walkinPatient->patient_id)
            ->assertJsonPath('patient_number', $walkinPatient->patient_number);

        // Verify NO duplicate row was created
        $this->assertEquals($initialPatientCount, Patient::count());

        // Verify account is linked to existing patient
        $this->assertDatabaseHas('patient_account_patient', [
            'patient_account_id' => $account->id,
            'patient_id'         => $walkinPatient->patient_id,
            'status'             => 'verified',
        ]);
    }

    public function test_mobile_profile_creation_rejects_if_chart_already_claimed_by_verified_account(): void
    {
        $clinic = $this->clinic();
        $account1 = $this->account();
        $account2 = PatientAccount::create([
            'name'      => 'Other User',
            'email'     => 'other@example.com',
            'phone'     => '09181112233',
            'password'  => bcrypt('password123'),
            'is_active' => true,
        ]);

        $walkinPatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Hazel Ann',
            'last_name'           => 'Nandong',
            'date_of_birth'       => '1995-05-20',
            'gender'              => 'female',
            'registration_source' => 'staff',
        ]);

        // Account 1 has verified claim
        $account1->patients()->attach($walkinPatient->patient_id, [
            'relationship' => 'self',
            'status'       => 'verified',
        ]);

        $token2 = $account2->createToken('test')->plainTextToken;

        // Account 2 attempts to claim
        $res = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/api/mobile/patients', [
                'clinic_id'      => $clinic->id,
                'relationship'   => 'self',
                'first_name'     => 'Hazel Ann',
                'last_name'      => 'Nandong',
                'date_of_birth'  => '1995-05-20',
                'gender'         => 'female',
                'address_municipality' => 'Tagoloan',
                'address_barangay' => 'Poblacion',
                'province' => 'Misamis Oriental',
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['first_name']);
    }

    public function test_staff_can_merge_online_booking_into_existing_walkin_chart_and_check_in(): void
    {
        $clinic = $this->clinic();
        $staff = $this->registrationStaff($clinic);
        $account = $this->account();

        // 1. Existing walk-in canonical patient record with prior history
        $canonicalPatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Hazel Ann',
            'last_name'           => 'Nandong',
            'date_of_birth'       => '1995-05-20',
            'gender'              => 'female',
            'registration_source' => 'staff',
        ]);

        // 2. Mobile patient registers separately (detached placeholder)
        $mobilePatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Hazel Ann',
            'last_name'           => 'Nandong',
            'date_of_birth'       => '1995-05-20',
            'gender'              => 'female',
            'registration_source' => 'mobile',
        ]);
        $account->patients()->attach($mobilePatient->patient_id, [
            'relationship' => 'self',
            'status'       => 'pending',
        ]);

        // 3. Mobile patient books consultation appointment with bite intake
        $appointment = Appointment::create([
            'clinic_id'            => $clinic->id,
            'patient_id'           => $mobilePatient->patient_id,
            'appointment_type'     => 'consultation',
            'scheduled_date'       => now()->toDateString(),
            'appointment_date'     => now()->toDateString(),
            'status'               => 'scheduled',
            'booked_by_account_id' => $account->id,
        ]);

        $intake = BiteIncidentIntake::create([
            'clinic_id'          => $clinic->id,
            'patient_id'         => $mobilePatient->patient_id,
            'patient_account_id' => $account->id,
            'appointment_id'     => $appointment->appointment_id,
            'status'             => 'pending',
            'submitted_at'       => now(),
            'site_washed'        => true,
            'exposure_type'      => 'transdermal_bite',
            'animal_type'        => 'dog',
            'animal_status'      => 'owned',
            'bite_date'          => now()->toDateString(),
            'bite_place'         => 'Poblacion',
        ]);

        // 4. Staff at reception merges mobile booking into canonical chart & checks in with vitals
        Sanctum::actingAs($staff);

        $res = $this->postJson("/api/patients/{$mobilePatient->patient_id}/merge-online-booking", [
            'canonical_patient_id' => $canonicalPatient->patient_id,
            'consultation_date'    => now()->toDateString(),
            'consultation_time'    => '09:30',
            'blood_pressure'       => '120/80',
            'temperature'          => 36.6,
            'weight'               => 55.0,
            'height'               => 160.0,
            'attending_provider'   => 'Dr. Santos',
            'mode_of_transaction'  => 'online',
        ]);

        $res->assertOk()
            ->assertJsonPath('patient.patient_id', $canonicalPatient->patient_id)
            ->assertJsonPath('check_in.queue.patient_id', $canonicalPatient->patient_id);

        // Mobile placeholder patient row was safely soft-deleted/archived
        $this->assertSoftDeleted('patients', ['patient_id' => $mobilePatient->patient_id]);

        // Appointment and Intake reassigned to canonical patient
        $this->assertDatabaseHas('appointments', [
            'appointment_id' => $appointment->appointment_id,
            'patient_id'     => $canonicalPatient->patient_id,
        ]);
        $this->assertDatabaseHas('bite_incident_intakes', [
            'intake_id'   => $intake->intake_id,
            'patient_id'  => $canonicalPatient->patient_id,
            'status'      => 'converted',
        ]);

        // Patient account linked to canonical chart with verified status
        $this->assertDatabaseHas('patient_account_patient', [
            'patient_account_id' => $account->id,
            'patient_id'         => $canonicalPatient->patient_id,
            'status'             => 'verified',
        ]);

        // Treatment record created with vitals for canonical patient
        $this->assertDatabaseHas('treatment_records', [
            'patient_id'     => $canonicalPatient->patient_id,
            'blood_pressure' => '120/80',
            'temperature'    => 36.6,
        ]);

        // Doctor queue ticket created for canonical patient
        $this->assertDatabaseHas('queues', [
            'patient_id' => $canonicalPatient->patient_id,
            'status'     => 'waiting',
        ]);
    }

    public function test_patient_number_generation_skips_soft_deleted_numbers_without_collision(): void
    {
        $clinic = Clinic::create(['name' => 'Number Gen Clinic']);

        $p1 = Patient::create([
            'clinic_id'  => $clinic->id,
            'first_name' => 'First',
            'last_name'  => 'Patient',
            'gender'     => 'Male',
        ]);

        $firstNum = $p1->patient_number;

        // Soft delete the first patient
        $p1->delete();

        // Create a second patient: must not collide with the soft-deleted patient's number
        $p2 = Patient::create([
            'clinic_id'  => $clinic->id,
            'first_name' => 'Second',
            'last_name'  => 'Patient',
            'gender'     => 'Female',
        ]);

        $this->assertNotEquals($firstNum, $p2->patient_number);
        $this->assertDatabaseHas('patients', [
            'patient_id'     => $p2->patient_id,
            'patient_number' => $p2->patient_number,
            'deleted_at'     => null,
        ]);
    }
}
