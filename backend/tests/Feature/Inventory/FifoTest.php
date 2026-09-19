<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FifoTest extends TestCase
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

    public function test_deduction_uses_earliest_expiry_batch(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();

        // Batch 1: Expiring in 2 months
        $earlierBatch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'BATCH-EARLY',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        // Batch 2: Expiring in 6 months
        $laterBatch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'BATCH-LATER',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);
        $result = $service->deductForTreatment($clinic->id, $admin->id, 201, 'Speeda', 2);

        $this->assertEquals($earlierBatch->inventory_id, $result['batch']->inventory_id);
        $this->assertEquals(8, $result['batch']->current_quantity);
        $this->assertEquals(10, $laterBatch->fresh()->current_quantity);
    }

    public function test_non_fifo_force_batch_id_returns_422(): void
    {
        [$clinic, $admin] = $this->setupClinicAndAdmin();
        Sanctum::actingAs($admin);

        $earlierBatch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'BATCH-FIFO-1',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(1)->toDateString(),
            'status' => 'active',
        ]);

        $laterBatch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'BATCH-FIFO-2',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(5)->toDateString(),
            'status' => 'active',
        ]);

        // Requesting later batch when earlier batch is available
        $response = $this->postJson('/api/inventory/use-vaccine', [
            'vaccine_type' => 'Speeda',
            'quantity' => 1,
            'treatment_id' => 202,
            'force_batch_id' => $laterBatch->inventory_id,
        ]);

        $response->assertStatus(422);
        $this->assertEquals(10, $laterBatch->fresh()->current_quantity);
        $this->assertEquals(10, $earlierBatch->fresh()->current_quantity);
    }
}