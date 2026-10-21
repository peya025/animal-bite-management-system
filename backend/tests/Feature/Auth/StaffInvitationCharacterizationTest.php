<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffInvitationCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;
    private User $admin;
    private User $nurse;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->clinic = Clinic::create(['name' => 'Tagoloan ABTC']);

        $this->admin = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@tagoloan.gov.ph',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->nurse = User::create([
            'clinic_id' => $this->clinic->id,
            'name' => 'Nurse Joy',
            'email' => 'nurse@tagoloan.gov.ph',
            'password' => bcrypt('password123'),
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $this->seedRoles();
    }

    private function seedRoles(): void
    {
        $roles = [
            ['slug' => 'clinic_admin', 'name' => 'clinic_admin', 'display_name' => 'Clinic Admin'],
            ['slug' => 'receptionist', 'name' => 'receptionist', 'display_name' => 'Receptionist'],
            ['slug' => 'doctor', 'name' => 'doctor', 'display_name' => 'Doctor'],
            ['slug' => 'intake_nurse', 'name' => 'intake_nurse', 'display_name' => 'Intake Nurse'],
            ['slug' => 'follow_up_nurse', 'name' => 'follow_up_nurse', 'display_name' => 'Follow-up Nurse'],
        ];

        foreach ($roles as $r) {
            Role::firstOrCreate(['slug' => $r['slug']], $r);
        }
    }

    public function test_admin_can_send_staff_invitation_with_mapped_workstation_role(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/staff-invitations', [
            'email' => 'newnurse@tagoloan.gov.ph',
            'workstation_role' => 'intake_nurse',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'invitation' => [
                    'id',
                    'email',
                    'role',
                    'workstation_role',
                    'token',
                    'status',
                ],
                'email_sent',
                'invitation_link',
            ]);

        $this->assertDatabaseHas('staff_invitations', [
            'clinic_id' => $this->clinic->id,
            'email' => 'newnurse@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
            'status' => 'pending',
        ]);
    }

    public function test_cannot_send_invitation_to_existing_user_email(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/staff-invitations', [
            'email' => 'nurse@tagoloan.gov.ph',
            'workstation_role' => 'intake_nurse',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['A user with this email already exists.'],
            ]);
    }

    public function test_cannot_send_invitation_if_pending_unexpired_invitation_exists(): void
    {
        StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'pending@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/staff-invitations', [
            'email' => 'pending@tagoloan.gov.ph',
            'workstation_role' => 'intake_nurse',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['An invitation has already been sent to this email.'],
            ]);
    }

    public function test_non_admin_cannot_send_staff_invitation(): void
    {
        Sanctum::actingAs($this->nurse);

        $response = $this->postJson('/api/staff-invitations', [
            'email' => 'another@tagoloan.gov.ph',
            'workstation_role' => 'intake_nurse',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_list_clinic_staff_invitations(): void
    {
        StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'invited1@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/staff-invitations');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['email' => 'invited1@tagoloan.gov.ph']);
    }

    public function test_validate_token_returns_invitation_details_for_valid_token(): void
    {
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'check@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);

        $response = $this->getJson('/api/staff-invitations/validate/' . $invitation->token);

        $response->assertStatus(200)
            ->assertExactJson([
                'valid' => true,
                'invitation' => [
                    'email' => 'check@tagoloan.gov.ph',
                    'role' => 'treatment',
                    'clinic_name' => 'Tagoloan ABTC',
                    'expires_at' => $invitation->expires_at->toISOString(),
                ],
            ]);
    }

    public function test_validate_token_returns_404_for_unknown_token(): void
    {
        $response = $this->getJson('/api/staff-invitations/validate/invalid-uuid-token');

        $response->assertStatus(404)
            ->assertJson([
                'valid' => false,
                'message' => 'Invalid invitation token',
            ]);
    }

    public function test_validate_token_returns_400_for_expired_token(): void
    {
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'expired@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);
        $invitation->update(['expires_at' => now()->subDay()]);

        $response = $this->getJson('/api/staff-invitations/validate/' . $invitation->token);

        $response->assertStatus(400)
            ->assertJson([
                'valid' => false,
                'message' => 'This invitation has expired',
            ]);
    }

    public function test_accept_invitation_creates_user_attaches_roles_and_issues_token(): void
    {
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'accepted@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);

        $response = $this->postJson('/api/staff-invitations/accept/' . $invitation->token, [
            'name' => 'Nurse Jenny',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'phone' => '09123456789',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'phone',
                    'is_active',
                    'clinic',
                ],
                'token',
                'token_type',
            ]);

        $this->assertEquals('Bearer', $response->json('token_type'));
        $this->assertNotEmpty($response->json('token'));

        $this->assertDatabaseHas('users', [
            'email' => 'accepted@tagoloan.gov.ph',
            'name' => 'Nurse Jenny',
            'role' => 'treatment',
            'phone' => '09123456789',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('staff_invitations', [
            'id' => $invitation->id,
            'status' => 'accepted',
        ]);
    }

    public function test_accept_invitation_rejects_invalid_phone_regex(): void
    {
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'phonefail@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);

        $response = $this->postJson('/api/staff-invitations/accept/' . $invitation->token, [
            'name' => 'Nurse Jenny',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'phone' => '12345',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone'])
            ->assertJsonFragment([
                'phone' => ['Mobile number must start with 09 and contain 11 digits.'],
            ]);
    }

    public function test_admin_can_cancel_pending_invitation(): void
    {
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'cancelme@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->deleteJson('/api/staff-invitations/' . $invitation->id);

        $response->assertStatus(200)
            ->assertExactJson([
                'message' => 'Invitation cancelled successfully',
            ]);

        $this->assertDatabaseHas('staff_invitations', [
            'id' => $invitation->id,
            'status' => 'expired',
        ]);
    }

    public function test_cannot_cancel_already_accepted_invitation(): void
    {
        $invitation = StaffInvitation::createInvitation([
            'clinic_id' => $this->clinic->id,
            'invited_by' => $this->admin->id,
            'email' => 'alreadyaccepted@tagoloan.gov.ph',
            'role' => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);
        $invitation->update(['status' => 'accepted']);

        Sanctum::actingAs($this->admin);

        $response = $this->deleteJson('/api/staff-invitations/' . $invitation->id);

        $response->assertStatus(400)
            ->assertExactJson([
                'message' => 'Only pending invitations can be cancelled',
            ]);
    }
}
