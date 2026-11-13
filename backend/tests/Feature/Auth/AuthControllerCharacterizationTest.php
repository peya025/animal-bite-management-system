<?php

namespace Tests\Feature\Auth;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AuthControllerCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create([
            'name' => 'Tagoloan Animal Bite Center',
            'is_setup_complete' => true,
        ]);
    }

    private function createStaffUser(array $attributes = []): User
    {
        $clinic = $attributes['clinic'] ?? $this->createClinic();
        unset($attributes['clinic']);

        $user = User::create(array_merge([
            'clinic_id' => $clinic->id,
            'name' => 'Nurse Joy',
            'email' => 'joy@tagoloan.gov.ph',
            'password' => Hash::make('secret123'),
            'role' => 'treatment',
            'phone' => '09123456789',
            'is_active' => true,
        ], $attributes));

        $role = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
        $user->roles()->attach($role->id, ['assigned_at' => now()]);

        return $user;
    }

    public function test_login_success_returns_expected_nested_json_and_token(): void
    {
        $user = $this->createStaffUser();

        $response = $this->postJson('/api/login', [
            'email' => 'joy@tagoloan.gov.ph',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'phone',
                    'is_active',
                    'signature_path',
                    'professional_license_no',
                    'roles',
                    'is_solo_nurse',
                    'is_nursing',
                    'clinic',
                ],
                'token',
                'token_type',
            ]);

        $this->assertEquals('Bearer', $response->json('token_type'));
        $this->assertNotEmpty($response->json('token'));
        $this->assertNotNull($user->fresh()->last_login_at);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'login',
        ]);
    }

    public function test_login_inactive_user_returns_422_with_exact_inactive_message(): void
    {
        $this->createStaffUser([
            'email' => 'inactive@tagoloan.gov.ph',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'inactive@tagoloan.gov.ph',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['Your account is inactive. Please contact your administrator.'],
            ]);
    }

    public function test_login_bad_credentials_returns_422_with_exact_incorrect_message(): void
    {
        $this->createStaffUser();

        $response = $this->postJson('/api/login', [
            'email' => 'joy@tagoloan.gov.ph',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['The provided credentials are incorrect.'],
            ]);
    }

    public function test_login_validation_rules_require_email_and_password(): void
    {
        $response = $this->postJson('/api/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_me_endpoint_returns_exact_flat_json_structure(): void
    {
        $user = $this->createStaffUser();
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/me');

        $response->assertStatus(200);

        // Crucial: verify FLAT structure (no outer "user" key)
        $json = $response->json();
        $this->assertArrayNotHasKey('user', $json);
        $this->assertArrayHasKey('id', $json);
        $this->assertArrayHasKey('name', $json);
        $this->assertArrayHasKey('email', $json);
        $this->assertArrayHasKey('role', $json);
        $this->assertArrayHasKey('phone', $json);
        $this->assertArrayHasKey('is_active', $json);
        $this->assertArrayHasKey('clinic', $json);
        $this->assertEquals($user->id, $json['id']);
        $this->assertEquals('treatment', $json['role']);
    }

    public function test_logout_deletes_current_token_and_writes_audit_log(): void
    {
        $user = $this->createStaffUser();
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Successfully logged out',
            ]);

        $this->assertCount(0, $user->fresh()->tokens);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'logout',
        ]);
    }

    public function test_update_profile_updates_name_and_validates_09_phone(): void
    {
        $user = $this->createStaffUser();
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/me', [
                'name' => 'Nurse Joy Updated',
                'phone' => '09987654321',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Profile updated successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Nurse Joy Updated',
            'phone' => '09987654321',
        ]);
    }

    public function test_update_profile_rejects_invalid_phone_regex_with_custom_message(): void
    {
        $user = $this->createStaffUser();
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/me', [
                'name' => 'Nurse Joy',
                'phone' => '12345678', // Invalid format
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone'])
            ->assertJsonFragment([
                'phone' => ['Mobile number must start with 09 and contain 11 digits.'],
            ]);
    }

    public function test_update_profile_with_password_revokes_tokens_and_requires_current_password(): void
    {
        $user = $this->createStaffUser();
        $token = $user->createToken('auth_token')->plainTextToken;

        // Attempt with wrong current password
        $failResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/me', [
                'name' => 'Nurse Joy',
                'current_password' => 'wrong-pass',
                'password' => 'new-secret123',
                'password_confirmation' => 'new-secret123',
            ]);

        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['current_password'])
            ->assertJsonFragment([
                'current_password' => ['Your current password is incorrect.'],
            ]);

        // Success with correct current password
        $successResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/me', [
                'name' => 'Nurse Joy',
                'current_password' => 'secret123',
                'password' => 'new-secret123',
                'password_confirmation' => 'new-secret123',
            ]);

        $successResponse->assertStatus(200);

        // Tokens revoked after password change
        $this->assertCount(0, $user->fresh()->tokens);
        $this->assertTrue(Hash::check('new-secret123', $user->fresh()->password));
    }

    public function test_google_login_rejects_missing_credential(): void
    {
        $response = $this->postJson('/api/auth/google', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['credential']);
    }

    public function test_google_login_rejects_invalid_token_from_google(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response(['error' => 'invalid_token'], 400),
        ]);

        $response = $this->postJson('/api/auth/google', [
            'credential' => 'invalid-google-jwt',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Invalid Google credential. Please try again.',
            ]);
    }

    public function test_register_returns_404_when_public_registration_disabled(): void
    {
        config(['app.public_registration_enabled' => false]);

        $response = $this->postJson('/api/register', [
            'name' => 'New Admin',
            'email' => 'admin@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(404);
    }
}
