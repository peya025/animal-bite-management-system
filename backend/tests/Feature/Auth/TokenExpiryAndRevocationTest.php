<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenExpiryAndRevocationTest extends TestCase
{
    use RefreshDatabase;

    private function createStaffUser(): User
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $user = User::create([
            'name' => 'Nurse Joy',
            'email' => 'joy@tagoloan.gov.ph',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
        $user->roles()->attach($role->id, ['assigned_at' => now()]);

        return $user;
    }

    public function test_token_rejected_after_25_hours(): void
    {
        config(['sanctum.expiration' => 1440]); // 24 hours

        $user = $this->createStaffUser();
        $token = $user->createToken('test_token')->plainTextToken;

        // Verify valid now
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/me');
        $response->assertStatus(200);

        // Advance time 25 hours
        $this->travel(25)->hours();
        auth('sanctum')->forgetUser();
        auth('web')->forgetUser();

        $expiredResponse = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/me');
        $expiredResponse->assertStatus(401);
    }

    public function test_password_change_invalidates_all_tokens(): void
    {
        $user = $this->createStaffUser();
        $token = $user->createToken('active_device')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)->putJson('/api/me', [
            'name' => 'Nurse Joy Updated',
            'current_password' => 'password123',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);
        $response->assertStatus(200);

        // Flush in-memory authenticated user to simulate next incoming request
        auth('sanctum')->forgetUser();
        auth('web')->forgetUser();

        // Previous token must be revoked and return 401
        $subsequentResponse = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/me');
        $subsequentResponse->assertStatus(401);
    }

    public function test_disabled_user_tokens_are_revoked(): void
    {
        $adminClinic = Clinic::create(['name' => 'Admin Clinic']);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $adminClinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        $roleAdmin = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name' => 'clinic_admin',
            'display_name' => 'Clinic Admin',
            'default_route' => '/dashboard',
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        $adminToken = $admin->createToken('admin_token')->plainTextToken;

        $nurse = User::create([
            'name' => 'Staff to Deactivate',
            'email' => 'staff@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $adminClinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $nurseToken = $nurse->createToken('nurse_token')->plainTextToken;

        // Admin deactivates staff via token
        $deactivateResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->putJson('/api/users/' . $nurse->id, [
                'is_active' => false,
            ]);
        $deactivateResponse->assertStatus(200);

        auth('sanctum')->forgetUser();
        auth('web')->forgetUser();

        // Nurse token should now return 401
        $nurseCall = $this->withHeader('Authorization', 'Bearer ' . $nurseToken)->getJson('/api/me');
        $nurseCall->assertStatus(401);
    }
}
