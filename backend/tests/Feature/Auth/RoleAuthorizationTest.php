<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan ABTC']);
    }

    public function test_nurse_cannot_access_admin_endpoints(): void
    {
        $clinic = $this->createClinic();
        $nurse = User::create([
            'name' => 'Nurse Joy',
            'email' => 'joy@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        $nurseRole = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
        $nurse->roles()->attach($nurseRole->id, ['assigned_at' => now()]);

        Sanctum::actingAs($nurse);

        // Attempting to access admin user management
        $response = $this->getJson('/api/users');
        $response->assertStatus(403);
    }

    public function test_developer_routes_return_404_when_flag_disabled(): void
    {
        config(['app.developer_tools_enabled' => false]);

        $clinic = $this->createClinic();
        $dev = User::create([
            'name' => 'Dev User',
            'email' => 'dev@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'developer',
            'is_active' => true,
        ]);

        Sanctum::actingAs($dev);

        $response = $this->getJson('/api/developer/database/tables');
        $response->assertStatus(404);
    }

    public function test_security_headers_are_present(): void
    {
        $response = $this->get('/');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
