<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan Animal Bite Treatment Center']);
    }

    private function createAdmin(Clinic $clinic): User
    {
        $admin = User::create([
            'name'      => 'Dr. Admin',
            'email'     => 'admin@testclinic.com',
            'password'  => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name'          => 'clinic_admin',
            'display_name'  => 'Clinic Administrator',
            'default_route' => '/dashboard',
        ]);

        $admin->roles()->attach($role->id, ['assigned_at' => now()]);

        return $admin;
    }

    private function ensureRolesExist(): void
    {
        $roles = [
            ['slug' => 'intake_nurse', 'display_name' => 'Intake Nurse', 'default_route' => '/queue'],
            ['slug' => 'follow_up_nurse', 'display_name' => 'Follow-Up Nurse', 'default_route' => '/nurse/patients'],
            ['slug' => 'clinic_admin', 'display_name' => 'Clinic Administrator', 'default_route' => '/dashboard'],
            ['slug' => 'doctor', 'display_name' => 'Doctor / Triage Officer', 'default_route' => '/doctor/patients'],
            ['slug' => 'receptionist', 'display_name' => 'Receptionist', 'default_route' => '/patients'],
        ];

        foreach ($roles as $r) {
            Role::firstOrCreate(['slug' => $r['slug']], [
                'name'          => $r['slug'],
                'display_name'  => $r['display_name'],
                'default_route' => $r['default_route'],
            ]);
        }
    }

    public function test_admin_can_list_users_with_eager_loaded_roles_and_license(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $this->ensureRolesExist();

        // Create an intake nurse
        $nurse = User::create([
            'name'                    => 'Maria Santos',
            'email'                   => 'maria@testclinic.com',
            'password'                => bcrypt('password123'),
            'clinic_id'               => $clinic->id,
            'role'                    => 'treatment',
            'professional_license_no' => 'RN-112233',
            'signature_path'          => 'signatures/maria.png',
            'is_active'               => true,
        ]);
        $intakeRole = Role::where('slug', 'intake_nurse')->first();
        $nurse->roles()->attach($intakeRole->id, ['assigned_at' => now()]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/users');
        $response->assertOk();

        $data = collect($response->json());
        $found = $data->firstWhere('email', 'maria@testclinic.com');
        $this->assertNotNull($found);
        $this->assertEquals('RN-112233', $found['professional_license_no']);
        $this->assertEquals('signatures/maria.png', $found['signature_path']);
        $this->assertNotEmpty($found['roles']);
        $this->assertEquals('intake_nurse', $found['roles'][0]['slug']);
    }

    public function test_admin_can_create_intake_nurse_with_license(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $this->ensureRolesExist();

        Sanctum::actingAs($admin);

        $payload = [
            'name'                    => 'Nurse Carlos',
            'email'                   => 'carlos@testclinic.com',
            'password'                => 'securepassword123',
            'workstation_role'        => 'intake_nurse',
            'professional_license_no' => 'RN-445566',
            'phone'                   => '09123456789',
        ];

        $response = $this->postJson('/api/users', $payload);
        $response->assertCreated();

        $user = User::where('email', 'carlos@testclinic.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('treatment', $user->role); // Legacy backward-compatibility
        $this->assertEquals('RN-445566', $user->professional_license_no);
        $this->assertNotNull($user->signature_path);
        $this->assertTrue($user->hasRole('intake_nurse'));
        $this->assertFalse($user->hasRole('follow_up_nurse'));
    }

    public function test_admin_can_create_nurse_with_signature_path(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $this->ensureRolesExist();

        Sanctum::actingAs($admin);

        $payload = [
            'name'                    => 'Nurse Carlos With Sig',
            'email'                   => 'carlos_sig@testclinic.com',
            'password'                => 'securepassword123',
            'workstation_role'        => 'intake_nurse',
            'professional_license_no' => 'RN-445566',
            'signature_path'          => 'signatures/default_placeholder.png',
        ];

        $response = $this->postJson('/api/users', $payload);
        $response->assertCreated();

        $user = User::where('email', 'carlos_sig@testclinic.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('signatures/default_placeholder.png', $user->signature_path);
    }

    public function test_admin_can_create_solo_nurse_with_both_workstation_roles(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $this->ensureRolesExist();

        Sanctum::actingAs($admin);

        $payload = [
            'name'                    => 'Nurse Elena',
            'email'                   => 'elena@testclinic.com',
            'password'                => 'securepassword123',
            'workstation_role'        => 'solo_nurse',
            'professional_license_no' => 'RN-998877',
        ];

        $response = $this->postJson('/api/users', $payload);
        $response->assertCreated();

        $user = User::where('email', 'elena@testclinic.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->isSoloNurse());
        $this->assertTrue($user->hasRole('intake_nurse'));
        $this->assertTrue($user->hasRole('follow_up_nurse'));
    }

    public function test_admin_can_update_staff_workstation_role_and_license(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $this->ensureRolesExist();

        $user = User::create([
            'name'                    => 'Staff Member',
            'email'                   => 'staff@testclinic.com',
            'password'                => bcrypt('password123'),
            'clinic_id'               => $clinic->id,
            'role'                    => 'treatment',
            'professional_license_no' => 'RN-OLD123',
            'is_active'               => true,
        ]);
        $intakeRole = Role::where('slug', 'intake_nurse')->first();
        $user->roles()->attach($intakeRole->id, ['assigned_at' => now()]);

        Sanctum::actingAs($admin);

        // Reassign to Follow-Up Nurse and update license
        $response = $this->putJson("/api/users/{$user->id}", [
            'workstation_role'        => 'follow_up_nurse',
            'professional_license_no' => 'RN-NEW999',
        ]);
        $response->assertOk();

        $user->refresh();
        $this->assertEquals('RN-NEW999', $user->professional_license_no);
        $this->assertTrue($user->hasRole('follow_up_nurse'));
        $this->assertFalse($user->hasRole('intake_nurse'));
    }

    public function test_admin_can_send_invitation_with_workstation_role(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);
        $this->ensureRolesExist();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/staff-invitations', [
            'email'            => 'invitee@testclinic.com',
            'workstation_role' => 'intake_nurse',
        ]);
        $response->assertCreated();

        $this->assertDatabaseHas('staff_invitations', [
            'email'            => 'invitee@testclinic.com',
            'role'             => 'treatment',
            'workstation_role' => 'intake_nurse',
        ]);
    }
}
