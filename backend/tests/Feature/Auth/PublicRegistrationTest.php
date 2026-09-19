<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_returns_404_when_disabled(): void
    {
        config(['app.public_registration_enabled' => false]);

        $response = $this->postJson('/api/register', [
            'name' => 'Attacker Admin',
            'email' => 'attacker@test.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('users', ['email' => 'attacker@test.com']);
    }

    public function test_admin_can_create_staff_user(): void
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@tagoloan.gov.ph',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name' => 'clinic_admin',
            'display_name' => 'Clinic Administrator',
            'default_route' => '/dashboard',
        ]);
        $admin->roles()->attach($role->id, ['assigned_at' => now()]);

        Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/users', [
            'name' => 'Nurse Maria',
            'email' => 'nurse.maria@tagoloan.gov.ph',
            'password' => 'SecurePass123!',
            'workstation_role' => 'intake_nurse',
            'professional_license_no' => 'RN-123456',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'nurse.maria@tagoloan.gov.ph',
            'clinic_id' => $clinic->id,
        ]);
    }
}
