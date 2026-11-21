<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientAccountPatient;
use App\Models\PatientInvitation;
use App\Models\Queue;
use App\Models\Role;
use App\Models\Station;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Services\Clinical\PatientRowActions;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientRowActionsTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinic = Clinic::create(['name' => 'Tagoloan Animal Bite Center']);

        $this->staff = User::create([
            'name' => 'Registration Staff',
            'email' => 'staff@example.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $this->clinic->id,
            'role' => 'registration',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'registration'], [
            'name' => 'registration',
            'display_name' => 'Registration Staff',
            'default_route' => '/patients',
        ]);
        $this->staff->roles()->attach($role->id, ['assigned_at' => now()]);

        // Enable registration and triage stations for the clinic
        Station::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Registration Station',
            'station_type' => 'registration',
            'is_active' => true,
        ]);
        Station::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Triage Station',
            'station_type' => 'triage',
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->staff);
    }

    private function createPatient(array $attrs = []): Patient
    {
        static $pNum = 100;
        $pNum++;
        $createdPast = $attrs['created_at'] ?? null;
        unset($attrs['created_at']);

        $patient = Patient::create(array_merge([
            'clinic_id' => $this->clinic->id,
            'patient_number' => "P-2026-{$pNum}",
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'gender' => 'male',
            'date_of_birth' => '1995-05-15',
            'address' => 'Tagoloan, Misamis Oriental',
            'contact_number' => '09123456789',
            'email' => 'juan@example.com',
            'registration_source' => 'walk_in',
            'registered_by' => $this->staff->id,
        ], $attrs));

        if ($createdPast) {
            $patient->timestamps = false;
            $patient->created_at = $createdPast;
            $patient->updated_at = $createdPast;
            $patient->save();
        }

        return $patient;
    }

    private function setupPendingAdministration(Patient $patient): BiteIncident
    {
        $incident = BiteIncident::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'case_number' => 'CASE-2026-001',
            'bite_date' => now()->subDays(5)->toDateString(),
            'exposure_category' => 'Category III',
            'status' => 'active',
            'episode_type' => 'primary',
            'confirmed_at' => now()->subDays(5),
            'created_by' => $this->staff->id,
        ]);

        // Consultation record with unadministered/pending dose from a prior visit
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => null,
            'medication_given' => null,
            'status' => 'completed',
            'nature_of_visit' => 'Animal Bite Initial Assessment',
            'diagnosis' => 'Rabies Exposure Category III',
            'chief_complaints' => 'Dog bite on right hand',
            'exposure_category' => 'Category III',
            'consultation_date' => now()->subDays(3)->toDateString(),
            'treatment_date' => now()->subDays(3)->toDateString(),
            'consultation_time' => '09:00',
            'blood_pressure' => '120/80',
            'temperature' => 36.5,
            'weight' => 60,
            'height' => 165,
            'prescribed_pep' => 'speeda',
        ]);

        // Unadministered Day 0 dose from prior day
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'bite_id' => $incident->bite_id,
            'dose_number' => 0,
            'medication_given' => 'Speeda 0.1ml ID',
            'status' => 'scheduled',
            'scheduled_date' => now()->subDays(3)->toDateString(),
            'treatment_date' => now()->subDays(3)->toDateString(),
            'remarks' => 'Patient left clinic before nurse administration',
        ]);

        return $incident;
    }

    public function test_pending_administration_and_pending_arrival_yields_reassess_and_blocked_reason()
    {
        $patient = $this->createPatient([
            'created_at' => now()->subDays(3),
        ]);
        $this->setupPendingAdministration($patient);

        $today = now('Asia/Manila')->toDateString();
        // Appointment scheduled for today (pending arrival)
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'appointment_date' => $today,
            'scheduled_date' => $today,
            'status' => 'scheduled',
        ]);

        $actions = PatientRowActions::resolve($patient->fresh());

        $this->assertSame('reassess', $actions['primary']);
        $this->assertSame('REASSESSMENT_REQUIRED', $actions['check_in_blocked_reason']);
        $this->assertTrue($actions['view']);
    }

    public function test_checkin_returns_409_reassessment_required_when_patient_has_pending_administration()
    {
        $patient = $this->createPatient([
            'created_at' => now()->subDays(3),
        ]);
        $this->setupPendingAdministration($patient);

        $response = $this->postJson("/api/patients/{$patient->patient_id}/check-in", [
            'mode_of_transaction' => 'walk-in',
        ]);

        $response->assertStatus(409);
        $response->assertJson([
            'code' => 'REASSESSMENT_REQUIRED',
            'message' => 'Reassessment required before check-in.',
        ]);

        // Verify no queue entry was created
        $this->assertDatabaseMissing('queues', [
            'patient_id' => $patient->patient_id,
            'clinic_id' => $this->clinic->id,
        ]);
    }

    public function test_pending_arrival_only_yields_checkin_and_is_idempotent()
    {
        $pastDate = now()->subDays(3);
        $patient = $this->createPatient([
            'created_at' => $pastDate,
        ]);

        // Prior stub consultation record
        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => null,
            'status' => 'scheduled',
            'consultation_date' => $pastDate->toDateString(),
            'treatment_date' => $pastDate->toDateString(),
            'consultation_time' => '09:00',
            'blood_pressure' => '120/80',
            'temperature' => '36.5',
            'mode_of_transaction' => 'walk-in',
        ]);

        $today = now('Asia/Manila')->toDateString();
        Appointment::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'appointment_type' => 'consultation',
            'appointment_date' => $today,
            'scheduled_date' => $today,
            'status' => 'scheduled',
        ]);

        $actions = PatientRowActions::resolve($patient->fresh());
        $this->assertSame('checkin', $actions['primary']);
        $this->assertNull($actions['check_in_blocked_reason']);

        // 1st Check In call
        $response1 = $this->postJson("/api/patients/{$patient->patient_id}/check-in", [
            'mode_of_transaction' => 'walk-in',
        ]);
        $response1->assertStatus(200);

        $this->assertDatabaseCount('queues', 1);

        // 2nd Check In call (double check-in idempotency)
        $response2 = $this->postJson("/api/patients/{$patient->patient_id}/check-in", [
            'mode_of_transaction' => 'walk-in',
        ]);
        $response2->assertStatus(200);
        $response2->assertJson([
            'code' => 'ALREADY_IN_QUEUE',
            'already_checked_in' => true,
        ]);

        // Still exactly 1 queue ticket in database
        $this->assertDatabaseCount('queues', 1);
    }

    public function test_neither_pending_administration_nor_pending_arrival_yields_null_primary()
    {
        // Patient registered today with no pending administration and no appointment
        $patient = $this->createPatient([
            'created_at' => now('Asia/Manila'),
        ]);

        $actions = PatientRowActions::resolve($patient->fresh());
        $this->assertNull($actions['primary']);
        $this->assertNull($actions['check_in_blocked_reason']);
        $this->assertTrue($actions['view']);
    }

    public function test_online_patient_invite_is_null()
    {
        $patient = $this->createPatient([
            'registration_source' => 'mobile',
        ]);

        $actions = PatientRowActions::resolve($patient->fresh());
        $this->assertNull($actions['invite']);
    }

    public function test_walk_in_invite_send_resend_and_expired_states()
    {
        $patient = $this->createPatient([
            'registration_source' => 'walk_in',
            'contact_number' => '09123456789',
            'email' => 'juan.walkin@example.com',
        ]);

        // 1. No invite sent yet -> send
        $actions1 = PatientRowActions::resolve($patient->fresh());
        $this->assertSame('send', $actions1['invite']);
        $this->assertNull($actions1['invite_disabled_reason']);

        // 2. Pending invite active -> resend
        $invite = PatientInvitation::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'invited_by' => $this->staff->id,
            'recipient_email' => $patient->email,
            'token' => 'token_test_123',
            'status' => 'pending',
            'expires_at' => now()->addDays(5),
        ]);

        $actions2 = PatientRowActions::resolve($patient->fresh());
        $this->assertSame('resend', $actions2['invite']);

        // 3. Last invite expired -> send
        $invite->update([
            'status' => 'expired',
            'expires_at' => now()->subDay(),
        ]);

        $actions3 = PatientRowActions::resolve($patient->fresh());
        $this->assertSame('send', $actions3['invite']);
    }

    public function test_walk_in_with_verified_account_has_no_invite_button()
    {
        $patient = $this->createPatient([
            'registration_source' => 'walk_in',
        ]);

        $account = PatientAccount::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan.account@example.com',
            'phone' => '09123456789',
            'password' => bcrypt('password123'),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);

        PatientAccountPatient::create([
            'patient_account_id' => $account->id,
            'patient_id' => $patient->patient_id,
            'relationship' => 'self',
            'is_primary' => true,
            'status' => 'verified',
            'verified_by' => $this->staff->id,
            'verified_at' => now(),
        ]);

        $actions = PatientRowActions::resolve($patient->fresh());
        $this->assertNull($actions['invite']);
    }

    public function test_walk_in_with_no_contact_info_invite_disabled_and_endpoint_rejects()
    {
        $patient = $this->createPatient([
            'registration_source' => 'walk_in',
            'contact_number' => null,
            'email' => null,
        ]);

        $actions = PatientRowActions::resolve($patient->fresh());
        $this->assertSame('send', $actions['invite']);
        $this->assertSame('NO_CONTACT', $actions['invite_disabled_reason']);

        // Endpoint rejects
        $response = $this->postJson('/api/patient-invitations', [
            'patient_id' => $patient->patient_id,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'code' => 'NO_CONTACT',
        ]);
    }

    public function test_resend_throttle_works()
    {
        $patient = $this->createPatient([
            'registration_source' => 'walk_in',
            'email' => 'test.throttle@example.com',
        ]);

        // Initial invitation created
        $invite = PatientInvitation::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'invited_by' => $this->staff->id,
            'recipient_email' => $patient->email,
            'token' => 'throttle_token',
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        // Hit throttle for this patient
        \Illuminate\Support\Facades\RateLimiter::hit('patient_invite_resend:'.$patient->patient_id, 300);

        // Attempt immediate resend (within 5 minutes)
        $response = $this->postJson("/api/patient-invitations/{$invite->id}/resend");

        $response->assertStatus(429);
        $response->assertJson([
            'code' => 'THROTTLED',
        ]);
    }

    public function test_audit_logs_are_written_for_checkin_reassess_and_invites()
    {
        $pastDate = now()->subDays(2);
        $patient = $this->createPatient([
            'created_at' => $pastDate,
        ]);

        TreatmentRecord::create([
            'clinic_id' => $this->clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => null,
            'status' => 'scheduled',
            'consultation_date' => $pastDate->toDateString(),
            'treatment_date' => $pastDate->toDateString(),
            'consultation_time' => '09:00',
            'blood_pressure' => '120/80',
            'temperature' => '36.5',
            'mode_of_transaction' => 'walk-in',
        ]);

        // 1. Check in audit log
        $res = $this->postJson("/api/patients/{$patient->patient_id}/check-in", [
            'mode_of_transaction' => 'walk-in',
        ]);
        $res->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'patient.check_in',
            'model' => 'Patient',
            'model_id' => $patient->patient_id,
            'user_id' => $this->staff->id,
        ]);

        // 2. Reassess audit log
        $reassessPatient = $this->createPatient([
            'created_at' => now()->subDays(4),
        ]);
        $this->setupPendingAdministration($reassessPatient);

        $reassessRes = $this->postJson("/api/patients/{$reassessPatient->patient_id}/check-in", [
            'is_reassessment' => true,
            'blood_pressure' => '120/80',
            'temperature' => '36.6',
            'weight' => '65',
            'height' => '170',
        ]);
        $reassessRes->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'patient.reassess_routed',
            'model' => 'Patient',
            'model_id' => $reassessPatient->patient_id,
            'user_id' => $this->staff->id,
        ]);
    }

    public function test_patient_list_api_response_shape_has_actions_and_frozen_keys_intact()
    {
        $patient = $this->createPatient();

        $response = $this->getJson('/api/patients');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertNotEmpty($data);

        $firstRow = $data[0];

        // New key 'actions' must be present
        $this->assertArrayHasKey('actions', $firstRow);
        $this->assertIsArray($firstRow['actions']);
        $this->assertArrayHasKey('primary', $firstRow['actions']);
        $this->assertArrayHasKey('check_in_blocked_reason', $firstRow['actions']);
        $this->assertArrayHasKey('invite', $firstRow['actions']);
        $this->assertArrayHasKey('invite_disabled_reason', $firstRow['actions']);
        $this->assertArrayHasKey('view', $firstRow['actions']);

        // Frozen keys must be completely unchanged
        $frozenKeys = [
            'patient_id',
            'clinic_id',
            'patient_number',
            'first_name',
            'last_name',
            'gender',
            'date_of_birth',
            'address',
            'contact_number',
            'email',
            'registration_source',
            'created_at',
            'name',
            'age',
            'has_completed_primary',
            'is_category1_no_treatment',
            'case_status',
            'visit_status',
            'treatment_status',
            'queue_status',
            'pending_treatment_summary',
            'ongoing_course',
        ];

        foreach ($frozenKeys as $key) {
            $this->assertArrayHasKey($key, $firstRow, "Frozen key '{$key}' must remain intact in row payload.");
        }
    }
}
