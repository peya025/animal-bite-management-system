<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan ABTC']);
    }

    public function test_nurse_cannot_delete_inventory(): void
    {
        $clinic = $this->createClinic();
        $nurse = User::create([
            'name' => 'Nurse Joy',
            'email' => 'joy@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'AUTH-001',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($nurse);
        $response = $this->deleteJson("/api/inventory/{$batch->inventory_id}", [
            'reason' => 'Trying to delete as nurse',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseHas('vaccine_inventory', ['inventory_id' => $batch->inventory_id, 'deleted_at' => null]);
    }

    public function test_developer_cannot_delete_inventory(): void
    {
        $clinic = $this->createClinic();
        $dev = User::create([
            'name' => 'Dev User',
            'email' => 'dev@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'developer',
            'is_active' => true,
        ]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'AUTH-002',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($dev);
        $response = $this->deleteJson("/api/inventory/{$batch->inventory_id}", [
            'reason' => 'Trying to delete as dev',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseHas('vaccine_inventory', ['inventory_id' => $batch->inventory_id, 'deleted_at' => null]);
    }

    public function test_admin_can_archive_inventory_with_reason(): void
    {
        $clinic = $this->createClinic();
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'AUTH-003',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->deleteJson("/api/inventory/{$batch->inventory_id}", [
            'reason' => 'Recalled batch by manufacturer due to packaging defect',
        ]);

        $response->assertOk();
        $this->assertSoftDeleted('vaccine_inventory', [
            'inventory_id' => $batch->inventory_id,
            'archived_reason' => 'Recalled batch by manufacturer due to packaging defect',
            'archived_by' => $admin->id,
        ]);
    }

    public function test_admin_delete_without_reason_returns_422(): void
    {
        $clinic = $this->createClinic();
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'AUTH-004',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->deleteJson("/api/inventory/{$batch->inventory_id}", []);

        $response->assertStatus(422);
        $this->assertDatabaseHas('vaccine_inventory', ['inventory_id' => $batch->inventory_id, 'deleted_at' => null]);
    }
}