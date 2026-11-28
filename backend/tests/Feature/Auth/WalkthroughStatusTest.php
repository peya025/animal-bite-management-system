<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WalkthroughStatusTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create([
            'name' => 'Tagoloan Animal Bite Center',
            'is_setup_complete' => true,
        ]);
    }

    private function seedRoles(): void
    {
        Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'display_name' => 'Clinic Administrator',
            'default_route' => '/dashboard',
        ]);
        Role::firstOrCreate(['slug' => 'receptionist'], [
            'display_name' => 'Receptionist / Registration Staff',
            'default_route' => '/patients',
        ]);
        Role::firstOrCreate(['slug' => 'doctor'], [
            'display_name' => 'Doctor / Triage Officer',
            'default_route' => '/queue',
        ]);
        Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
    }

    public function test_admin_created_user_starts_with_unseen_walkthrough_and_persists_after_marking_seen(): void
    {
        $clinic = $this->createClinic();
        $this->seedRoles();

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Existing Admin',
            'email' => 'existing-admin@clinic.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
            'has_seen_walkthrough' => true,
        ]);

        // Admin creates a new Registration Staff account
        $createRes = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name' => 'New Registration Staff',
            'email' => 'new-reg@clinic.test',
            'password' => 'password123',
            'role' => 'registration',
        ]);

        $createRes->assertStatus(201);
        $newUser = User::where('email', 'new-reg@clinic.test')->firstOrFail();
        $this->assertFalse($newUser->has_seen_walkthrough);

        // Reset cached sanctum guard from actingAs($admin) before authenticating as $newUser via Bearer token
        $this->app['auth']->forgetGuards();

        // First login returns has_seen_walkthrough = false
        $firstLogin = $this->postJson('/api/login', [
            'email' => 'new-reg@clinic.test',
            'password' => 'password123',
        ]);

        $firstLogin->assertStatus(200)
            ->assertJsonPath('user.has_seen_walkthrough', false);

        $token = $firstLogin->json('token');

        // User completes or skips the walkthrough
        $markRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/me/walkthrough-seen');

        $markRes->assertStatus(200)
            ->assertJsonPath('has_seen_walkthrough', true)
            ->assertJsonPath('user.has_seen_walkthrough', true);

        $this->assertTrue($newUser->fresh()->has_seen_walkthrough);

        // Logout does not reset walkthrough status
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertStatus(200);

        $this->assertTrue($newUser->fresh()->has_seen_walkthrough);

        // Reset cached guard so subsequent request authenticates with the new Bearer token
        $this->app['auth']->forgetGuards();

        // Subsequent login returns has_seen_walkthrough = true
        $secondLogin = $this->postJson('/api/login', [
            'email' => 'new-reg@clinic.test',
            'password' => 'password123',
        ]);

        $secondLogin->assertStatus(200)
            ->assertJsonPath('user.has_seen_walkthrough', true);

        // /api/me also returns has_seen_walkthrough = true
        $secondToken = $secondLogin->json('token');
        $this->withHeader('Authorization', "Bearer {$secondToken}")
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('has_seen_walkthrough', true);
    }

    public function test_walkthrough_status_is_tracked_independently_per_user_and_across_all_roles(): void
    {
        $clinic = $this->createClinic();
        $this->seedRoles();

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'New Admin',
            'email' => 'new-admin@clinic.test',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
            'has_seen_walkthrough' => false,
        ]);

        $registration = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Another Staff',
            'email' => 'another-reg@clinic.test',
            'password' => Hash::make('password123'),
            'role' => 'registration',
            'is_active' => true,
            'has_seen_walkthrough' => false,
        ]);

        // Admin marks walkthrough as seen
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/me/walkthrough-seen')
            ->assertStatus(200)
            ->assertJsonPath('has_seen_walkthrough', true);

        $this->assertTrue($admin->fresh()->has_seen_walkthrough);
        // Registration staff remains unseen
        $this->assertFalse($registration->fresh()->has_seen_walkthrough);

        // Registration staff logs in and sees has_seen_walkthrough = false
        $this->postJson('/api/login', [
            'email' => 'another-reg@clinic.test',
            'password' => 'password123',
        ])->assertStatus(200)
            ->assertJsonPath('user.has_seen_walkthrough', false);
    }
}
