<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private function setupClinicAndStaff(): array
    {
        $clinic = Clinic::create(['name' => 'Tagoloan ABTC']);
        $nurse = User::create([
            'name' => 'Nurse Joy',
            'email' => 'joy@testclinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);

        return [$clinic, $nurse];
    }

    public function test_concurrent_deductions_do_not_exceed_stock(): void
    {
        [$clinic, $nurse] = $this->setupClinicAndStaff();

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'BATCH-CONCUR-001',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);

        // First deduction: 3 units -> succeeds, remaining 2
        $result1 = $service->deductForTreatment($clinic->id, $nurse->id, 101, 'Speeda', 3);
        $this->assertEquals(2, $result1['remaining_quantity']);

        // Second deduction: 3 units -> fails because only 2 left
        $this->expectException(ValidationException::class);
        $service->deductForTreatment($clinic->id, $nurse->id, 102, 'Speeda', 3);

        $batch->refresh();
        $this->assertEquals(2, $batch->current_quantity);
    }

    public function test_stock_cannot_go_negative(): void
    {
        [$clinic, $nurse] = $this->setupClinicAndStaff();

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Speeda',
            'batch_number' => 'BATCH-CONCUR-002',
            'current_quantity' => 2,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);

        try {
            $service->deductForTreatment($clinic->id, $nurse->id, 103, 'Speeda', 5);
            $this->fail('Expected ValidationException was not thrown.');
        } catch (ValidationException $e) {
            $this->assertTrue(true);
        }

        $batch->refresh();
        $this->assertEquals(2, $batch->current_quantity);
    }
}