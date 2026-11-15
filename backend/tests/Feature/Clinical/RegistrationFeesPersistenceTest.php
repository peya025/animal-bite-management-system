<?php

namespace Tests\Feature\Clinical;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\ClinicModuleConfig;
use App\Models\Patient;
use App\Models\RegistrationEncounter;
use App\Models\RegistrationFee;
use App\Models\RegistrationFeeItem;
use App\Models\RegistrationFeePayment;
use App\Models\Role;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\Clinic\ClinicModuleConfigService;
use App\Services\RegistrationFeeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationFeesPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected Clinic $clinicA;
    protected Clinic $clinicB;
    protected User $adminA;
    protected User $regStaffA;
    protected User $nurseA;
    protected User $adminB;
    protected ClinicModuleConfigService $configService;
    protected RegistrationFeeService $feeService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinicA = Clinic::create(['name' => 'Clinic A']);
        $this->clinicB = Clinic::create(['name' => 'Clinic B']);

        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'admin', 'display_name' => 'Administrator', 'default_route' => '/admin']);
        $regRole = Role::firstOrCreate(['slug' => 'registration'], ['name' => 'registration', 'display_name' => 'Registration Staff', 'default_route' => '/registration']);
        $nurseRole = Role::firstOrCreate(['slug' => 'nurse'], ['name' => 'nurse', 'display_name' => 'Nurse', 'default_route' => '/treatment']);

        $this->adminA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'Admin A',
            'email'     => 'adminA@example.com',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->adminA->roles()->attach($adminRole->id);

        $this->regStaffA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'Reg Staff A',
            'email'     => 'regA@example.com',
            'password'  => bcrypt('password'),
            'role'      => 'registration',
            'is_active' => true,
        ]);
        $this->regStaffA->roles()->attach($regRole->id);

        $this->nurseA = User::create([
            'clinic_id' => $this->clinicA->id,
            'name'      => 'Nurse A',
            'email'     => 'nurseA@example.com',
            'password'  => bcrypt('password'),
            'role'      => 'treatment',
            'is_active' => true,
        ]);
        $this->nurseA->roles()->attach($nurseRole->id);

        $this->adminB = User::create([
            'clinic_id' => $this->clinicB->id,
            'name'      => 'Admin B',
            'email'     => 'adminB@example.com',
            'password'  => bcrypt('password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);
        $this->adminB->roles()->attach($adminRole->id);

        $this->configService = app(ClinicModuleConfigService::class);
        $this->feeService = app(RegistrationFeeService::class);
    }

    private function setFeeRules(int $clinicId, string $rig, string $ar, string $add): void
    {
        $config = $this->configService->getOrCreateConfigForClinic($clinicId);
        $fieldRules = $config->field_rules ?: $this->configService->getDefaultFieldRules();
        $fieldRules['rig_fee'] = $rig;
        $fieldRules['anti_rabies_fee'] = $ar;
        $fieldRules['additional_fees'] = $add;

        $config->update([
            'field_rules' => $fieldRules,
            'revision'    => $config->revision + 1,
        ]);
    }

    private function validPatientPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name'               => 'Juan',
            'last_name'                => 'Dela Cruz',
            'gender'                   => 'male',
            'date_of_birth'            => '1995-05-10',
            'address_municipality'     => 'Tagoloan',
            'address_barangay'         => 'Poblacion',
            'province'                 => 'Misamis Oriental',
            'mode_of_transaction'      => 'walk-in',
            'reg_date_of_consultation' => now()->toDateString(),
            'reg_consultation_time'    => '08:30',
            'reg_blood_pressure'       => '120/80',
            'reg_temperature'          => '36.5',
            'reg_weight'               => '65',
            'reg_height'               => '170',
            'reg_attending_provider'   => 'Dr. Smith',
            'animal_type'              => 'dog',
            'animal_status'            => 'owned',
        ], $overrides);
    }

    // RF-01: Default Hidden -> No fee created
    public function test_rf01_default_hidden_registration_succeeds_without_fee(): void
    {
        Sanctum::actingAs($this->regStaffA);

        $response = $this->postJson('/api/patients', $this->validPatientPayload());
        $response->assertStatus(201);

        $patientId = $response->json('patient.patient_id');
        $this->assertDatabaseHas('patients', ['patient_id' => $patientId]);

        // Encounter was created, but no registration fee
        $encounter = RegistrationEncounter::where('patient_id', $patientId)->first();
        $this->assertNotNull($encounter);
        $this->assertDatabaseMissing('registration_fees', ['encounter_id' => $encounter->id]);
    }

    // RF-02: Hidden mode receives forged fee payload -> Rejected 422
    public function test_rf02_hidden_mode_rejects_nonempty_fee_payload(): void
    {
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['amount' => '150.00'],
            ],
        ]);

        $response = $this->postJson('/api/patients', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['registration_fee']);

        $this->assertDatabaseCount('patients', 0);
        $this->assertDatabaseCount('registration_encounters', 0);
    }

    // RF-03: Optional mode submits blank -> Registration succeeds, Not Recorded
    public function test_rf03_optional_mode_submits_blank_succeeds(): void
    {
        $this->setFeeRules($this->clinicA->id, 'optional', 'optional', 'optional');
        Sanctum::actingAs($this->regStaffA);

        $response = $this->postJson('/api/patients', $this->validPatientPayload());
        $response->assertStatus(201);

        $patientId = $response->json('patient.patient_id');
        $encounter = RegistrationEncounter::where('patient_id', $patientId)->first();
        $this->assertNotNull($encounter);
        $this->assertDatabaseMissing('registration_fees', ['encounter_id' => $encounter->id]);
    }

    // RF-04: Required mode submits blank -> 422 Field Error, atomic rollback
    public function test_rf04_required_mode_submits_blank_fails_atomically(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'required', 'required');
        Sanctum::actingAs($this->regStaffA);

        $response = $this->postJson('/api/patients', $this->validPatientPayload());
        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'registration_fee.rig_fee',
                'registration_fee.anti_rabies_fee',
                'registration_fee.additional_fees',
            ]);

        // Atomic rollback
        $this->assertDatabaseCount('patients', 0);
        $this->assertDatabaseCount('registration_encounters', 0);
        $this->assertDatabaseCount('registration_fees', 0);
    }

    // RF-05: Required mode submits zero -> No Fee, zero total
    public function test_rf05_required_mode_submits_zero_fee_succeeds(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'required', 'required');
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee'            => ['disposition' => 'recorded', 'amount' => '0'],
                'anti_rabies_fee'    => ['disposition' => 'recorded', 'amount' => '0.00'],
                'no_additional_fees' => true,
            ],
        ]);

        $response = $this->postJson('/api/patients', $payload);
        $response->assertStatus(201);

        $feeData = $response->json('fee');
        $this->assertEquals('0.00', $feeData['total']);
        $this->assertEquals('no_fee', $feeData['status']);
        $this->assertTrue($feeData['is_complete']);
        $this->assertEquals(0, count($feeData['payments']));
    }

    // RF-06: Fee ₱100, no payment -> Unpaid status
    public function test_rf06_fee_recorded_without_payment_marks_unpaid(): void
    {
        $this->setFeeRules($this->clinicA->id, 'optional', 'required', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'anti_rabies_fee' => ['disposition' => 'recorded', 'amount' => '100.00'],
            ],
        ]);

        $response = $this->postJson('/api/patients', $payload);
        $response->assertStatus(201);

        $feeData = $response->json('fee');
        $this->assertEquals('100.00', $feeData['total']);
        $this->assertEquals('0.00', $feeData['amount_paid']);
        $this->assertEquals('100.00', $feeData['balance']);
        $this->assertEquals('unpaid', $feeData['status']);
    }

    // RF-07: Fee ₱100, partial receipt ₱60, then balance settlement ₱40 -> Paid
    public function test_rf07_partial_payment_and_subsequent_balance_settlement(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '100.00'],
                'payment' => [
                    'amount'         => '60.00',
                    'payment_method' => 'cash',
                ],
            ],
        ]);

        $res1 = $this->postJson('/api/patients', $payload);
        $res1->assertStatus(201);

        $feeId = $res1->json('fee.id');
        $this->assertEquals('100.00', $res1->json('fee.total'));
        $this->assertEquals('60.00', $res1->json('fee.amount_paid'));
        $this->assertEquals('40.00', $res1->json('fee.balance'));
        $this->assertEquals('partially_paid', $res1->json('fee.status'));

        // Subsequent payment of ₱40
        $payRes = $this->postJson("/api/registration-fees/{$feeId}/payments", [
            'amount'         => '40.00',
            'payment_method' => 'cash',
        ]);
        $payRes->assertStatus(201);

        $updatedFee = $payRes->json('fee');
        $this->assertEquals('100.00', $updatedFee['amount_paid']);
        $this->assertEquals('0.00', $updatedFee['balance']);
        $this->assertEquals('paid', $updatedFee['status']);
        $this->assertCount(2, $updatedFee['payments']);
    }

    // RF-08: Negative, excess precision, over-limit, overpayment rejected
    public function test_rf08_numeric_validation_guards(): void
    {
        $this->setFeeRules($this->clinicA->id, 'optional', 'optional', 'optional');
        Sanctum::actingAs($this->regStaffA);

        // Negative
        $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => ['rig_fee' => ['disposition' => 'recorded', 'amount' => '-50']],
        ]))->assertStatus(422);

        // Excess precision (3 decimal places)
        $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => ['rig_fee' => ['disposition' => 'recorded', 'amount' => '50.123']],
        ]))->assertStatus(422);

        // Over limit (> ₱999,999.99)
        $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => ['rig_fee' => ['disposition' => 'recorded', 'amount' => '1000000.00']],
        ]))->assertStatus(422);

        // Overpayment (payment > total)
        $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '100.00'],
                'payment' => ['amount' => '150.00', 'payment_method' => 'cash'],
            ],
        ]))->assertStatus(422);
    }

    // RF-09: Idempotency key replays payment safely, rejects conflicting payload
    public function test_rf09_idempotency_protection_on_payments(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $res1 = $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '200.00'],
            ],
        ]));
        $feeId = $res1->json('fee.id');

        $idemKey = 'unique-key-12345';

        // Payment 1
        $pay1 = $this->postJson("/api/registration-fees/{$feeId}/payments", [
            'amount'          => '50.00',
            'payment_method'  => 'cash',
            'idempotency_key' => $idemKey,
        ]);
        $pay1->assertStatus(201);
        $paymentId1 = $pay1->json('payment.id');

        // Payment 2 (Replay same request) -> returns existing payment
        $pay2 = $this->postJson("/api/registration-fees/{$feeId}/payments", [
            'amount'          => '50.00',
            'payment_method'  => 'cash',
            'idempotency_key' => $idemKey,
        ]);
        $pay2->assertStatus(200);
        $this->assertEquals($paymentId1, $pay2->json('payment.id') ?? $pay2->json('id'));

        // Payment 3 (Same key, different amount) -> 409 Conflict
        $pay3 = $this->postJson("/api/registration-fees/{$feeId}/payments", [
            'amount'          => '75.00',
            'payment_method'  => 'cash',
            'idempotency_key' => $idemKey,
        ]);
        $pay3->assertStatus(409);
    }

    // RF-11: Returning check-in reuses existing fee, does not create duplicate
    public function test_rf11_returning_checkin_reuses_existing_fee(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $regRes = $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '300.00'],
            ],
        ]));
        $patientId = $regRes->json('patient.patient_id');
        $firstEncounterId = $regRes->json('encounter_id');
        $firstFeeId = $regRes->json('fee.id');

        // Backdate patient registration to simulate a returning patient visit on a later date
        $patient = Patient::find($patientId);
        $patient->created_at = now()->subDays(2);
        $patient->registration_date = now()->subDays(2)->toDateString();
        $patient->save();

        // Returning check in
        $checkInRes = $this->postJson("/api/patients/{$patientId}/check-in", [
            'blood_pressure' => '120/80',
            'temperature'    => '36.5',
            'height'         => '170',
            'weight'         => '65',
        ]);
        $checkInRes->assertStatus(200);

        // Still exactly 1 fee in database
        $this->assertDatabaseCount('registration_fees', 1);
        $this->assertEquals($firstFeeId, $checkInRes->json('fee.id'));
    }

    // RF-12: Existing patient registers genuinely new exposure -> Separate fee
    public function test_rf12_new_exposure_creates_separate_fee(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $regRes = $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '150.00'],
            ],
        ]));
        $patientId = $regRes->json('patient.patient_id');

        // Mark primary series completed for eligibility by creating completed doses 0, 3, 7
        $patient = Patient::find($patientId);
        $bite = $patient->biteIncidents()->first();
        foreach ([0, 3, 7] as $dose) {
            TreatmentRecord::create([
                'clinic_id'   => $this->clinicA->id,
                'patient_id'  => $patient->patient_id,
                'bite_id'     => $bite->bite_id,
                'dose_number' => $dose,
                'status'      => 'completed',
            ]);
        }

        // Register new exposure
        $expRes = $this->postJson('/api/cases/new-exposure', [
            'patient_id'       => $patientId,
            'bite_date'        => now()->toDateString(),
            'animal_type'      => 'cat',
            'animal_status'    => 'owned',
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '250.00'],
            ],
        ]);
        $expRes->assertStatus(201);

        $this->assertDatabaseCount('registration_fees', 2);
        $this->assertEquals('250.00', $expRes->json('fee.total'));
    }

    // RF-16: Unauthorized roles cannot post payment or correct fee
    public function test_rf16_unauthorized_roles_forbidden_from_financial_writes(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $regRes = $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '100.00'],
            ],
        ]));
        $feeId = $regRes->json('fee.id');

        // Nurse tries to record payment -> 403
        Sanctum::actingAs($this->nurseA);
        $this->postJson("/api/registration-fees/{$feeId}/payments", [
            'amount'         => '50.00',
            'payment_method' => 'cash',
        ])->assertStatus(403);

        // Staff tries to void or correct fee -> 403 (Admin only)
        Sanctum::actingAs($this->regStaffA);
        $this->putJson("/api/registration-fees/{$feeId}", [
            'reason' => 'Adjustment',
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '200.00'],
            ],
        ])->assertStatus(403);
    }

    // RF-17: Cross-clinic isolation
    public function test_rf17_cross_clinic_access_is_rejected(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $regRes = $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '100.00'],
            ],
        ]));
        $encounterId = $regRes->json('encounter_id');
        $feeId = $regRes->json('fee.id');

        // Admin B from Clinic B cannot view or pay Clinic A fee
        Sanctum::actingAs($this->adminB);
        $this->getJson("/api/registration-fees/{$encounterId}")->assertStatus(404);
        $this->postJson("/api/registration-fees/{$feeId}/payments", [
            'amount'         => '50.00',
            'payment_method' => 'cash',
        ])->assertStatus(404);
    }

    // RF-20: Admin corrects fee and voids payment with audit trail
    public function test_rf20_admin_void_payment_and_correct_fee(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'hidden', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $regRes = $this->postJson('/api/patients', $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '200.00'],
                'payment' => ['amount' => '200.00', 'payment_method' => 'cash'],
            ],
        ]));
        $feeId = $regRes->json('fee.id');
        $paymentId = $regRes->json('fee.payments.0.id');

        Sanctum::actingAs($this->adminA);

        // 1. Void mistaken receipt
        $voidRes = $this->postJson("/api/registration-fees/{$feeId}/payments/{$paymentId}/void", [
            'void_reason' => 'Customer paid using wrong invoice',
        ]);
        $voidRes->assertStatus(200);

        $feeAfterVoid = $voidRes->json('fee');
        $this->assertEquals('0.00', $feeAfterVoid['amount_paid']);
        $this->assertEquals('200.00', $feeAfterVoid['balance']);
        $this->assertEquals('unpaid', $feeAfterVoid['status']);

        // Check AuditLog
        $this->assertDatabaseHas('audit_logs', [
            'action'   => 'registration_fee.payment_voided',
            'model_id' => $paymentId,
        ]);

        // 2. Correct fee from 200 to 150
        $correctRes = $this->putJson("/api/registration-fees/{$feeId}", [
            'reason'           => 'Doctor reduced dosage required',
            'registration_fee' => [
                'rig_fee' => ['disposition' => 'recorded', 'amount' => '150.00'],
            ],
        ]);
        $correctRes->assertStatus(200);

        $feeAfterCorrect = $correctRes->json('fee');
        $this->assertEquals('150.00', $feeAfterCorrect['total']);
        $this->assertEquals('150.00', $feeAfterCorrect['balance']);
    }

    // RF-24: Multiple repeatable additional fee rows
    public function test_rf24_multiple_additional_fee_rows_sum_accurately(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'required', 'required');
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee'         => ['disposition' => 'recorded', 'amount' => '500.00'],
                'anti_rabies_fee' => ['disposition' => 'recorded', 'amount' => '300.00'],
                'additional_fees' => [
                    ['label' => 'Anti-Tetanus Serum', 'disposition' => 'recorded', 'amount' => '75.50'],
                    ['label' => 'Syringes & Needles', 'disposition' => 'recorded', 'amount' => '24.50'],
                ],
            ],
        ]);

        $res = $this->postJson('/api/patients', $payload);
        $res->assertStatus(201);

        $feeData = $res->json('fee');
        // 500 + 300 + 75.50 + 24.50 = 900.00
        $this->assertEquals('900.00', $feeData['total']);
        $this->assertEquals(90000, $feeData['total_cents']);
        $this->assertCount(4, $feeData['items']);
    }

    // RF-26: Pending assessment disposition with reason
    public function test_rf26_pending_assessment_disposition_is_incomplete(): void
    {
        $this->setFeeRules($this->clinicA->id, 'required', 'optional', 'hidden');
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'rig_fee' => [
                    'disposition' => 'pending_assessment',
                    'reason'      => 'Patient weight and category pending doctor assessment',
                ],
            ],
        ]);

        $res = $this->postJson('/api/patients', $payload);
        $res->assertStatus(201);

        $feeData = $res->json('fee');
        $this->assertEquals('0.00', $feeData['total']);
        $this->assertFalse($feeData['is_complete']); // Incomplete because pending
        $this->assertEquals('not_recorded', $feeData['status']);
    }

    // RF-28: Required additional fees with no_additional_fees accepted
    public function test_rf28_no_additional_fees_accepted_in_required_mode(): void
    {
        $this->setFeeRules($this->clinicA->id, 'hidden', 'optional', 'required');
        Sanctum::actingAs($this->regStaffA);

        $payload = $this->validPatientPayload([
            'registration_fee' => [
                'no_additional_fees' => true,
            ],
        ]);

        $res = $this->postJson('/api/patients', $payload);
        $res->assertStatus(201);

        $feeData = $res->json('fee');
        $this->assertTrue($feeData['no_additional_fees']);
        $this->assertEquals('0.00', $feeData['total']);
    }
}
