<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientAccountPatient;
use App\Models\PatientInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientInvitationCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('raw')->andReturnNull();

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC']);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Admin Staff',
            'email' => 'admin@tagoloan.gov.ph',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-112233',
            'first_name' => 'Pedro',
            'last_name' => 'Penduko',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'email' => 'pedro@patient.test',
            'contact_number' => '09123456789',
        ]);
    }

    public function test_staff_can_send_patient_invitation(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patient-invitations', [
            'patient_id' => $this->patient->patient_id,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'invitation' => [
                    'id',
                    'clinic_id',
                    'patient_id',
                    'token',
                    'status',
                    'expires_at',
                ],
            ]);

        $this->assertDatabaseHas('patient_invitations', [
            'patient_id' => $this->patient->patient_id,
            'status' => 'pending',
            'phone' => '09123456789',
        ]);
    }

    public function test_cannot_send_invitation_to_patient_without_email(): void
    {
        $noEmailPatient = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-000000',
            'first_name' => 'No',
            'last_name' => 'Email',
            'gender' => 'female',
            'date_of_birth' => '1995-01-01',
            'email' => null,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patient-invitations', [
            'patient_id' => $noEmailPatient->patient_id,
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Patient does not have a valid email address on record. Please update the patient email first.',
            ]);
    }

    public function test_cannot_send_invitation_if_patient_already_verified(): void
    {
        $account = PatientAccount::create([
            'name' => 'Pedro Account',
            'email' => 'pedro@patient.test',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        PatientAccountPatient::create([
            'patient_account_id' => $account->id,
            'patient_id' => $this->patient->patient_id,
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'verified',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patient-invitations', [
            'patient_id' => $this->patient->patient_id,
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Patient already has an active verified portal account.',
            ]);
    }

    public function test_bulk_invitations_dispatches_and_reports_counts(): void
    {
        $patient2 = Patient::create([
            'clinic_id' => $this->clinic->id,
            'patient_number' => 'PAT-223344',
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'gender' => 'female',
            'date_of_birth' => '1998-03-03',
            'email' => 'ana@patient.test',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patient-invitations/bulk', [
            'patient_ids' => [$this->patient->patient_id, $patient2->patient_id],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'sent_count' => 2,
                'skipped_count' => 0,
            ]);
    }

    public function test_activate_creates_patient_account_links_patient_and_issues_token(): void
    {
        $token = \Illuminate\Support\Str::random(64);
        $invitation = PatientInvitation::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'invited_by' => $this->admin->id,
            'phone' => '09123456789',
            'token' => $token,
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->postJson('/api/patient-invitations/activate', [
            'token' => $token,
            'email' => 'pedro@patient.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'account' => [
                    'id',
                    'name',
                    'email',
                ],
                'patient',
                'linkage',
            ]);

        $this->assertDatabaseHas('patient_accounts', [
            'email' => 'pedro@patient.test',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('patient_account_patient', [
            'patient_id' => $this->patient->patient_id,
            'relationship' => 'self',
            'status' => 'verified',
        ]);

        $this->assertDatabaseHas('patient_invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
        ]);
    }

    public function test_activate_rejects_invalid_token(): void
    {
        $response = $this->postJson('/api/patient-invitations/activate', [
            'token' => \Illuminate\Support\Str::random(64), // valid 64-char length, but nonexistent
            'email' => 'pedro@patient.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid or expired code. Please contact the clinic for a new invite.',
            ]);
    }

    public function test_activate_rejects_expired_token(): void
    {
        $token = \Illuminate\Support\Str::random(64);
        $invitation = PatientInvitation::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'invited_by' => $this->admin->id,
            'phone' => '09123456789',
            'token' => $token,
            'status' => 'pending',
            'expires_at' => now()->subDay(),
        ]);

        $response = $this->postJson('/api/patient-invitations/activate', [
            'token' => $token,
            'email' => 'pedro@patient.test',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid or expired code. Please contact the clinic for a new invite.',
            ]);
    }

    public function test_resend_generates_new_token_and_resends_email(): void
    {
        $invitation = PatientInvitation::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'invited_by' => $this->admin->id,
            'phone' => '09123456789',
            'token' => 'old-token-12345678901234567890123456789012345678901234567890123456',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patient-invitations/' . $invitation->id . '/resend');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Invitation code resent successfully via email.',
            ]);

        $this->assertNotEquals('old-token-12345678901234567890123456789012345678901234567890123456', $invitation->fresh()->token);
    }

    public function test_resend_rejects_already_accepted_invitation(): void
    {
        $invitation = PatientInvitation::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $this->patient->patient_id,
            'invited_by' => $this->admin->id,
            'phone' => '09123456789',
            'token' => 'accepted-token-1234567890123456789012345678901234567890123456789012',
            'status' => 'accepted',
            'expires_at' => now()->addDays(7),
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patient-invitations/' . $invitation->id . '/resend');

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'This invitation has already been accepted.',
            ]);
    }

    public function test_staff_can_manually_link_patient_account(): void
    {
        $account = PatientAccount::create([
            'name' => 'Manuel Link Account',
            'email' => 'manuel@link.test',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patients/' . $this->patient->patient_id . '/link-account', [
            'patient_account_id' => $account->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Patient account linked successfully (Status: Pending Verification).',
            ]);

        $this->assertDatabaseHas('patient_account_patient', [
            'patient_id' => $this->patient->patient_id,
            'patient_account_id' => $account->id,
            'status' => 'pending',
        ]);
    }

    public function test_manual_link_duplicate_returns_422(): void
    {
        $account = PatientAccount::create([
            'name' => 'Duplicate Link Account',
            'email' => 'duplicate@link.test',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        PatientAccountPatient::create([
            'patient_account_id' => $account->id,
            'patient_id' => $this->patient->patient_id,
            'relationship' => 'self',
            'is_primary' => false,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/patients/' . $this->patient->patient_id . '/link-account', [
            'patient_account_id' => $account->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Account linkage already exists.',
            ]);
    }

    public function test_staff_can_verify_manual_linkage(): void
    {
        $account = PatientAccount::create([
            'name' => 'Verify Link Account',
            'email' => 'verifylink@test.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $linkage = PatientAccountPatient::create([
            'patient_account_id' => $account->id,
            'patient_id' => $this->patient->patient_id,
            'relationship' => 'self',
            'is_primary' => false,
            'status' => 'pending',
        ]);
        $linkageId = \Illuminate\Support\Facades\DB::table('patient_account_patient')->where('patient_account_id', $account->id)->value('id');

        Sanctum::actingAs($this->admin);

        $response = $this->patchJson('/api/patient-account-patient/' . $linkageId . '/verify');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Patient account linkage verified successfully.',
            ]);

        $this->assertDatabaseHas('patient_account_patient', [
            'id' => $linkageId,
            'status' => 'verified',
            'verified_by' => $this->admin->id,
        ]);
    }
}
