<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OpenVialTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan ABTC']);
    }

    private function createAdmin(Clinic $clinic): User
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        $roleAdmin = Role::firstOrCreate(['slug' => 'clinic_admin'], [
            'name' => 'clinic_admin',
            'display_name' => 'Clinic Admin',
            'default_route' => '/dashboard',
        ]);
        $admin->roles()->attach($roleAdmin->id, ['assigned_at' => now()]);

        return $admin;
    }

    public function test_open_vial_hours_cannot_exceed_configured_max(): void
    {
        config(['inventory.open_vial_max_hours' => 8]);

        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-OPEN-EXCEED',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        // Requesting 24 hours when max is 8
        $response = $this->postJson('/api/inventory/' . $batch->inventory_id . '/open-vial', [
            'open_vial_hours' => 24,
        ]);
        $response->assertStatus(422);
    }

    public function test_open_vial_within_limit_succeeds(): void
    {
        config(['inventory.open_vial_max_hours' => 8]);

        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-OPEN-VALID',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/inventory/' . $batch->inventory_id . '/open-vial', [
            'open_vial_hours' => 6,
        ]);
        $response->assertStatus(200);

        $this->assertEquals('opened', $batch->fresh()->open_vial_status);
        $this->assertNotNull($batch->fresh()->open_vial_discard_at);
    }
}
