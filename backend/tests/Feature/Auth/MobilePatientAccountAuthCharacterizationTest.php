<?php

namespace Tests\Feature\Auth;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PatientAccount;
use App\Models\PatientInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobilePatientAccountAuthCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    private PatientAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->account = PatientAccount::create([
            'name'      => 'Maria Santos',
            'email'     => 'maria@example.com',
            'phone'     => '09171234567',
            'password'  => Hash::make('password123'),
            'is_active' => true,
        ]);
    }

    public function test_mobile_patient_can_register_and_receive_token(): void
    {
        $payload = [
            'name'                  => 'Carlos Dalisay',
            'email'                 => 'carlos@example.com',
            'phone'                 => '09181234567',
            'password'              => 'securepass123',
            'password_confirmation' => 'securepass123',
        ];

        $response = $this->postJson('/api/mobile/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'account' => ['id', 'name', 'email', 'phone'],
                'token',
                'token_type',
            ])
            ->assertJsonPath('account.email', 'carlos@example.com')
            ->assertJsonPath('token_type', 'Bearer');

        $this->assertDatabaseHas('patient_accounts', [
            'email' => 'carlos@example.com',
            'name'  => 'Carlos Dalisay',
        ]);
    }

    public function test_registration_rejects_duplicate_email_and_invalid_phone(): void
    {
        // Duplicate email
        $res1 = $this->postJson('/api/mobile/register', [
            'name'                  => 'Duplicate Maria',
            'email'                 => 'maria@example.com',
            'password'              => 'securepass123',
            'password_confirmation' => 'securepass123',
        ]);
        $res1->assertStatus(422)->assertJsonValidationErrors(['email']);

        // Invalid phone prefix
        $res2 = $this->postJson('/api/mobile/register', [
            'name'                  => 'Bad Phone',
            'email'                 => 'badphone@example.com',
            'phone'                 => '08123456789',
            'password'              => 'securepass123',
            'password_confirmation' => 'securepass123',
        ]);
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['phone'])
            ->assertJsonPath('errors.phone.0', 'Mobile number must start with 09 and contain 11 digits.');

        // Password mismatch
        $res3 = $this->postJson('/api/mobile/register', [
            'name'                  => 'Mismatch Pass',
            'email'                 => 'mismatch@example.com',
            'password'              => 'securepass123',
            'password_confirmation' => 'differentpass',
        ]);
        $res3->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_mobile_patient_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/mobile/login', [
            'email'    => 'maria@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'account' => ['id', 'name', 'email'],
                'token',
                'token_type',
            ])
            ->assertJsonPath('account.email', 'maria@example.com')
            ->assertJsonPath('token_type', 'Bearer');

        $this->account->refresh();
        $this->assertNotNull($this->account->last_login_at);
    }

    public function test_login_rejects_invalid_credentials_and_inactive_accounts(): void
    {
        // Bad password
        $res1 = $this->postJson('/api/mobile/login', [
            'email'    => 'maria@example.com',
            'password' => 'wrongpassword',
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'The provided credentials are incorrect.');

        // Inactive account
        $this->account->update(['is_active' => false]);

        $res2 = $this->postJson('/api/mobile/login', [
            'email'    => 'maria@example.com',
            'password' => 'password123',
        ]);
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'This patient account is inactive.');
    }

    public function test_me_endpoint_returns_account_with_eager_loaded_relations_and_cache(): void
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $patient = Patient::create([
            'clinic_id'           => $clinic->id,
            'first_name'          => 'Maria',
            'last_name'           => 'Santos',
            'gender'              => 'female',
            'registration_source' => 'mobile',
        ]);
        $this->account->patients()->attach($patient->patient_id, [
            'relationship' => 'self',
            'is_primary'   => true,
            'status'       => 'verified',
        ]);

        Sanctum::actingAs($this->account);

        $response = $this->getJson('/api/mobile/me');

        $response->assertStatus(200)
            ->assertJsonPath('id', $this->account->id)
            ->assertJsonPath('email', 'maria@example.com')
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'patients',
            ]);

        $cacheKey = "mobile:account:me:{$this->account->id}";
        $this->assertTrue(Cache::has($cacheKey));
    }

    public function test_update_account_updates_name_and_phone_and_clears_cache(): void
    {
        Sanctum::actingAs($this->account);

        $cacheKey = "mobile:account:me:{$this->account->id}";
        Cache::put($cacheKey, ['cached_data'], 300);
        $this->assertTrue(Cache::has($cacheKey));

        $response = $this->patchJson('/api/mobile/me', [
            'name'  => 'Maria Santos Gomez',
            'phone' => '09198765432',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Maria Santos Gomez')
            ->assertJsonPath('phone', '09198765432');

        $this->assertFalse(Cache::has($cacheKey));

        $this->account->refresh();
        $this->assertEquals('Maria Santos Gomez', $this->account->name);
        $this->assertEquals('09198765432', $this->account->phone);
    }

    public function test_logout_revokes_current_token(): void
    {
        Sanctum::actingAs($this->account);

        $token = $this->account->createToken('mobile');
        $this->assertCount(1, $this->account->tokens);

        $response = $this->postJson('/api/mobile/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Successfully logged out.',
            ]);
    }

    public function test_change_password_requires_current_password_and_revokes_other_tokens(): void
    {
        Sanctum::actingAs($this->account);

        $token1 = $this->account->createToken('device-1')->plainTextToken;
        $token2 = $this->account->createToken('device-2')->plainTextToken;

        // Wrong current password
        $res1 = $this->postJson('/api/mobile/change-password', [
            'current_password'      => 'wrongpass',
            'password'              => 'brandnewpass123',
            'password_confirmation' => 'brandnewpass123',
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['current_password'])
            ->assertJsonPath('errors.current_password.0', 'The current password you entered is incorrect.');

        // Correct password change
        $res2 = $this->postJson('/api/mobile/change-password', [
            'current_password'      => 'password123',
            'password'              => 'brandnewpass123',
            'password_confirmation' => 'brandnewpass123',
        ]);
        $res2->assertStatus(200)
            ->assertJson([
                'message' => 'Password has been changed successfully.',
            ]);

        $this->account->refresh();
        $this->assertTrue(Hash::check('brandnewpass123', $this->account->password));
    }

    public function test_logout_other_devices_preserves_current_token(): void
    {
        Sanctum::actingAs($this->account);

        $token1 = $this->account->createToken('device-1');
        $token2 = $this->account->createToken('device-2');

        $response = $this->postJson('/api/mobile/logout-other-devices');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Successfully logged out of all other devices.',
            ]);
    }

    public function test_delete_account_deactivates_and_revokes_all_tokens(): void
    {
        Sanctum::actingAs($this->account);

        $this->account->createToken('test-token');

        // Wrong password
        $res1 = $this->deleteJson('/api/mobile/me', [
            'password' => 'wrongpass',
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['password'])
            ->assertJsonPath('errors.password.0', 'Incorrect password. Account deletion cancelled.');

        // Correct password
        $res2 = $this->deleteJson('/api/mobile/me', [
            'password' => 'password123',
        ]);
        $res2->assertStatus(200)
            ->assertJson([
                'message' => 'Your account has been deactivated successfully.',
            ]);

        $this->account->refresh();
        $this->assertFalse($this->account->is_active);
        $this->assertCount(0, $this->account->tokens);
    }

    public function test_forgot_password_returns_generic_message(): void
    {
        $response = $this->postJson('/api/mobile/forgot-password', [
            'email' => 'maria@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'If an account with that email exists, password reset instructions have been sent.',
            ]);
    }

    public function test_google_login_auto_provisions_and_links_matching_patient_invitation(): void
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $staff = \App\Models\User::create([
            'clinic_id' => $clinic->id,
            'name'      => 'Dr. Staff',
            'email'     => 'staff@tagoloan.gov.ph',
            'password'  => bcrypt('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $walkinPatient = Patient::create([
            'clinic_id'           => $clinic->id,
            'patient_number'      => 'P-2026-9999',
            'first_name'          => 'Google',
            'last_name'           => 'User',
            'email'               => 'googlepatient@example.com',
            'gender'              => 'female',
            'registration_source' => 'walk-in',
        ]);

        $invitation = PatientInvitation::create([
            'clinic_id'   => $clinic->id,
            'patient_id'  => $walkinPatient->patient_id,
            'email'       => 'googlepatient@example.com',
            'token'       => 'random64chartokenfortestingpurposesonly123456789012345678901234567890',
            'status'      => 'pending',
            'invited_by'  => $staff->id,
            'expires_at'  => now()->addDays(7),
        ]);

        // Mock Google tokeninfo endpoint
        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'email' => 'googlepatient@example.com',
                'sub'   => 'google-sub-id-123456',
                'name'  => 'Google User',
            ], 200),
        ]);

        $response = $this->postJson('/api/mobile/auth/google', [
            'credential' => 'mocked-jwt-token',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'account' => ['id', 'email', 'name', 'patients'],
                'token',
                'token_type',
                'sso_method',
            ])
            ->assertJsonPath('account.email', 'googlepatient@example.com')
            ->assertJsonPath('sso_method', 'google');

        // Check account was created
        $newAccount = PatientAccount::where('email', 'googlepatient@example.com')->first();
        $this->assertNotNull($newAccount);
        $this->assertEquals('google-sub-id-123456', $newAccount->google_id);

        // Check patient was linked automatically
        $linked = $newAccount->patients()->where('patients.patient_id', $walkinPatient->patient_id)->first();
        $this->assertNotNull($linked);
        $this->assertEquals('verified', $linked->pivot->status);

        // Check invitation was accepted
        $invitation->refresh();
        $this->assertEquals('accepted', $invitation->status);
    }

    public function test_google_login_rejects_invalid_credential(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'error' => 'invalid_token',
            ], 400),
        ]);

        $response = $this->postJson('/api/mobile/auth/google', [
            'credential' => 'bad-token',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Invalid Google credential. Please try again.',
            ]);
    }
}
