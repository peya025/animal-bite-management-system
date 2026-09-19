<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OpenVialTest extends TestCase
{
    use RefreshDatabase;

    private function setupClinicAndAdmin(): array
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        return [$clinic, $admin];
    }

    public function test_open_vial_hours_cannot_exceed_configured_max(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();
        Sanctum::actingAs($admin);

        config(['inventory.open_vial_max_hours' => 8]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'VIAL-001',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        // Attempt to open vial with 24 hours (policy limit is 8)
        $response = $this->postJson("/api/inventory/{$batch->inventory_id}/open-vial", [
            'open_vial_hours' => 24,
        ]);

        $response->assertStatus(422);
        $this->assertNull($batch->fresh()->opened_at);
    }

    public function test_open_vial_within_limit_succeeds(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();
        Sanctum::actingAs($admin);

        config(['inventory.open_vial_max_hours' => 8]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'VIAL-002',
            'current_quantity' => 10,
            'expiration_date' => now()->addYear()->toDateString(),
            'status' => 'active',
        ]);

        $response = $this->postJson("/api/inventory/{$batch->inventory_id}/open-vial", [
            'open_vial_hours' => 6,
        ]);

        $response->assertOk();
        $batch->refresh();
        $this->assertEquals('opened', $batch->open_vial_status);
        $this->assertNotNull($batch->opened_at);
        $this->assertNotNull($batch->open_vial_discard_at);
    }
}