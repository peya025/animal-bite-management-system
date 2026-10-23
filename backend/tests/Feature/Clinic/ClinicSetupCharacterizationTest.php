<?php

namespace Tests\Feature\Clinic;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClinicSetupCharacterizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_initialize_fails_validation_on_weak_password(): void
    {
        $response = $this->postJson('/api/setup/initialize', [
            'clinic_name'    => 'New Clinic',
            'admin_name'     => 'Admin Test',
            'admin_email'    => 'admin@test.gov.ph',
            'admin_password' => 'weak',
            'admin_password_confirmation' => 'weak',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['admin_password']);
    }

    public function test_initialize_creates_clinic_admin_module_config_and_token(): void
    {
        $this->assertEquals(0, Clinic::count());

        $response = $this->postJson('/api/setup/initialize', [
            'clinic_name'                 => 'Tagoloan ABTC',
            'admin_name'                  => 'Super Admin',
            'admin_email'                 => 'admin@tagoloan.gov.ph',
            'admin_password'              => 'SecurePass123',
            'admin_password_confirmation' => 'SecurePass123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'email', 'name', 'role'],
                'clinic' => ['id', 'name', 'is_setup_complete'],
            ]);

        $this->assertDatabaseHas('clinics', [
            'name'              => 'Tagoloan ABTC',
            'is_setup_complete' => 0,
        ]);

        $this->assertDatabaseHas('users', [
            'email'           => 'admin@tagoloan.gov.ph',
            'role'            => 'admin',
            'assigned_module' => 'all',
        ]);

        $this->assertDatabaseHas('clinic_module_configs', [
            'triage_module_enabled' => 1,
        ]);
    }

    public function test_initialize_blocks_second_initialization_when_setup_completed(): void
    {
        Clinic::create([
            'name'              => 'Existing Clinic',
            'is_setup_complete' => true,
        ]);

        $response = $this->postJson('/api/setup/initialize', [
            'clinic_name'                 => 'Another Clinic',
            'admin_name'                  => 'Another Admin',
            'admin_email'                 => 'another@clinic.gov.ph',
            'admin_password'              => 'SecurePass123',
            'admin_password_confirmation' => 'SecurePass123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Setup has already been completed',
            ]);
    }

    public function test_initialize_resumes_in_progress_setup_when_valid_token_provided(): void
    {
        $clinic = Clinic::create([
            'name'              => 'In Progress Clinic',
            'is_setup_complete' => false,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name'      => 'Admin User',
            'email'     => 'admin@clinic.gov.ph',
            'password'  => bcrypt('SecurePass123'),
            'role'      => 'admin',
        ]);

        $token = $admin->createToken('setup-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/setup/initialize', []);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Setup already initialized, resuming setup',
            ])
            ->assertJsonPath('clinic.id', $clinic->id);
    }

    public function test_check_setup_and_profile(): void
    {
        $clinic = Clinic::create([
            'name'              => 'Tagoloan ABTC',
            'is_setup_complete' => false,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name'      => 'Admin User',
            'email'     => 'admin@clinic.gov.ph',
            'password'  => bcrypt('SecurePass123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'admin'], [
            'name'          => 'admin',
            'display_name'  => 'Administrator',
            'default_route' => '/admin',
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        Sanctum::actingAs($admin);

        // Check setup status when false
        $statusResponse = $this->getJson('/api/setup/status');
        $statusResponse->assertStatus(200)
            ->assertJson([
                'is_setup_complete' => false,
                'clinic'            => null,
            ]);

        // Get Profile
        $profileResponse = $this->getJson('/api/setup/clinic');
        $profileResponse->assertStatus(200)
            ->assertJsonPath('name', 'Tagoloan ABTC');
    }

    public function test_update_clinic_updates_fields_and_handles_logos(): void
    {
        $clinic = Clinic::create([
            'name'              => 'Tagoloan ABTC',
            'is_setup_complete' => false,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name'      => 'Admin User',
            'email'     => 'admin@clinic.gov.ph',
            'password'  => bcrypt('SecurePass123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'admin'], [
            'name'          => 'admin',
            'display_name'  => 'Administrator',
            'default_route' => '/admin',
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        Sanctum::actingAs($admin);

        // Validation error on bad phone number
        $this->postJson('/api/setup/clinic', [
            'name'           => 'Tagoloan ABTC',
            'contact_number' => '12345',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['contact_number']);

        // Upload main logo
        $logo = UploadedFile::fake()->create('main_logo.png', 100, 'image/png');

        $response = $this->postJson('/api/setup/clinic', [
            'name'           => 'Tagoloan Animal Bite Center',
            'subtitle'       => 'Public Health Care',
            'address'        => 'National Highway, Tagoloan, Misamis Oriental',
            'contact_number' => '09123456789',
            'email'          => 'clinic@tagoloan.gov.ph',
            'logo'           => $logo,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('clinic.name', 'Tagoloan Animal Bite Center')
            ->assertJsonPath('clinic.contact_number', '09123456789');

        $clinic->refresh();
        $this->assertNotNull($clinic->logo_path);
        Storage::disk('public')->assertExists($clinic->logo_path);

        // Remove logo
        $removeResponse = $this->postJson('/api/setup/clinic', [
            'name'        => 'Tagoloan Animal Bite Center',
            'remove_logo' => '1',
        ]);

        $removeResponse->assertStatus(200);
        $clinic->refresh();
        $this->assertNull($clinic->logo_path);
    }

    public function test_complete_setup_marks_clinic_complete(): void
    {
        $clinic = Clinic::create([
            'name'              => 'Tagoloan ABTC',
            'address'           => 'Tagoloan, Misamis Oriental',
            'is_setup_complete' => false,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name'      => 'Admin User',
            'email'     => 'admin@clinic.gov.ph',
            'password'  => bcrypt('SecurePass123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $roleAdmin = Role::firstOrCreate(['slug' => 'admin'], [
            'name'          => 'admin',
            'display_name'  => 'Administrator',
            'default_route' => '/admin',
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/setup/complete');

        $response->assertStatus(200)
            ->assertJsonPath('clinic.is_setup_complete', true);

        $clinic->refresh();
        $this->assertTrue($clinic->is_setup_complete);
        $this->assertNotNull($clinic->setup_completed_at);
    }
}
