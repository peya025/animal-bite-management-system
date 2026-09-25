<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PrintLogosSetupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_admin_can_upload_and_remove_left_and_right_print_logos(): void
    {
        $clinic = Clinic::create([
            'name' => 'Test Clinic',
            'is_setup_complete' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('Password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $role = \App\Models\Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name'          => 'clinic_admin',
            'display_name'  => 'Clinic Administrator',
            'default_route' => '/dashboard',
        ]);
        $admin->roles()->attach($role->id, ['assigned_at' => now()]);

        $leftLogo = UploadedFile::fake()->create('left_logo.png', 10, 'image/png');
        $rightLogo = UploadedFile::fake()->create('right_logo.png', 10, 'image/png');

        // 1. Upload left and right print logos
        \Laravel\Sanctum\Sanctum::actingAs($admin, ['*']);

        $response = $this->postJson('/api/setup/clinic', [
                'name' => 'Test Clinic Updated',
                'left_print_logo' => $leftLogo,
                'right_print_logo' => $rightLogo,
            ]);

        $response->assertOk();
        $response->assertJsonPath('clinic.name', 'Test Clinic Updated');

        $clinic->refresh();
        $this->assertNotNull($clinic->left_print_logo_path);
        $this->assertNotNull($clinic->right_print_logo_path);
        $this->assertNotNull($clinic->left_print_logo_url);
        $this->assertNotNull($clinic->right_print_logo_url);

        Storage::disk('public')->assertExists($clinic->left_print_logo_path);
        Storage::disk('public')->assertExists($clinic->right_print_logo_path);

        // 2. Remove left and right print logos
        $removeResponse = $this->postJson('/api/setup/clinic', [
                'name' => 'Test Clinic Updated',
                'remove_left_print_logo' => '1',
                'remove_right_print_logo' => '1',
            ]);

        $removeResponse->assertOk();

        $clinic->refresh();
        $this->assertNull($clinic->left_print_logo_path);
        $this->assertNull($clinic->right_print_logo_path);
        $this->assertNull($clinic->left_print_logo_url);
        $this->assertNull($clinic->right_print_logo_url);
    }

    public function test_public_storage_route_serves_logo_without_symlink(): void
    {
        Storage::disk('public')->put('clinic-logos/test-seal.png', 'fake-image-bytes');

        $apiResponse = $this->get('/api/storage/clinic-logos/test-seal.png');
        $apiResponse->assertOk();
        $this->assertTrue($apiResponse->headers->has('Access-Control-Allow-Origin'));
        $this->assertEquals('fake-image-bytes', $apiResponse->getContent());
    }
}



