<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientAccessCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $registrationClerk;
    private User $nurse;
    private Patient $patient;
    private PatientAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Access Test Clinic']);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Admin Staff',
            'email' => 'admin@access.test',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->registrationClerk = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Reg Clerk',
            'email' => 'reg@access.test',
            'password' => bcrypt('password123'),
            'role' => 'registration',
            'is_active' => true,
        ]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Nurse Joy',
            'email' => 'nurse@access.test',
            'password' => bcrypt('password123'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-112233',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'date_of_birth' => '1992-05-15',
        ]);

        $this->account = PatientAccount::create([
            'name' => 'Juan Dela Cruz Account',
            'email' => 'juan@portal.test',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        // Attach with pending status
        $this->patient->accounts()->attach($this->account->id, [
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'pending',
        ]);
    }

    public function test_admin_can_verify_patient_account_access(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/patients/{$this->patient->patient_id}/accounts/{$this->account->id}/verify");

        $response->assertStatus(200)
            ->assertExactJson([
                'message' => 'Patient profile access verified.',
            ]);

        $this->assertDatabaseHas('patient_account_patient', [
            'patient_id' => $this->patient->patient_id,
            'patient_account_id' => $this->account->id,
            'status' => 'verified',
            'verified_by' => $this->admin->id,
        ]);
    }

    public function test_registration_clerk_can_verify_patient_account_access(): void
    {
        Sanctum::actingAs($this->registrationClerk);

        $response = $this->postJson("/api/patients/{$this->patient->patient_id}/accounts/{$this->account->id}/verify");

        $response->assertStatus(200)
            ->assertExactJson([
                'message' => 'Patient profile access verified.',
            ]);

        $this->assertDatabaseHas('patient_account_patient', [
            'patient_id' => $this->patient->patient_id,
            'patient_account_id' => $this->account->id,
            'status' => 'verified',
            'verified_by' => $this->registrationClerk->id,
        ]);
    }

    public function test_nurse_cannot_verify_patient_account_access(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->postJson("/api/patients/{$this->patient->patient_id}/accounts/{$this->account->id}/verify");

        $response->assertStatus(403);
    }

    public function test_admin_can_reject_patient_account_access(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/patients/{$this->patient->patient_id}/accounts/{$this->account->id}/reject");

        $response->assertStatus(200)
            ->assertExactJson([
                'message' => 'Patient profile access rejected.',
            ]);

        $this->assertDatabaseHas('patient_account_patient', [
            'patient_id' => $this->patient->patient_id,
            'patient_account_id' => $this->account->id,
            'status' => 'rejected',
            'verified_by' => $this->admin->id,
        ]);
    }

    public function test_verify_returns_404_for_patient_in_different_clinic(): void
    {
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $otherPatient = Patient::create([
            'clinic_id' => $otherClinic->id,
            'patient_number' => 'PAT-888888',
            'first_name' => 'Maria',
            'last_name' => 'Clara',
            'gender' => 'female',
            'date_of_birth' => '1995-02-14',
        ]);
        $otherPatient->accounts()->attach($this->account->id, [
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/patients/{$otherPatient->patient_id}/accounts/{$this->account->id}/verify");

        $response->assertStatus(404);
    }

    public function test_verify_returns_404_if_account_is_not_linked_to_patient(): void
    {
        $unlinkedAccount = PatientAccount::create([
            'name' => 'Unlinked Account',
            'email' => 'unlinked@test.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/patients/{$this->patient->patient_id}/accounts/{$unlinkedAccount->id}/verify");

        $response->assertStatus(404);
    }

    public function test_reject_returns_404_for_patient_in_different_clinic(): void
    {
        $otherClinic = Clinic::create(['name' => 'Other Clinic']);
        $otherPatient = Patient::create([
            'clinic_id' => $otherClinic->id,
            'patient_number' => 'PAT-777777',
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
            'date_of_birth' => '1991-03-20',
        ]);
        $otherPatient->accounts()->attach($this->account->id, [
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/patients/{$otherPatient->patient_id}/accounts/{$this->account->id}/reject");

        $response->assertStatus(404);
    }

    public function test_reject_returns_404_if_account_is_not_linked_to_patient(): void
    {
        $unlinkedAccount = PatientAccount::create([
            'name' => 'Unlinked Account 2',
            'email' => 'unlinked2@test.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson("/api/patients/{$this->patient->patient_id}/accounts/{$unlinkedAccount->id}/reject");

        $response->assertStatus(404);
    }
}
