<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Services\VaccineInventoryUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private function createClinic(): Clinic
    {
        return Clinic::create(['name' => 'Tagoloan ABTC']);
    }

    private function createNurse(Clinic $clinic): User
    {
        $nurse = User::create([
            'name' => 'Nurse Joy',
            'email' => 'joy@clinic.com',
            'password' => bcrypt('password123'),
            'clinic_id' => $clinic->id,
            'role' => 'treatment',
            'is_active' => true,
        ]);
        $roleNurse = Role::firstOrCreate(['slug' => 'intake_nurse'], [
            'name' => 'intake_nurse',
            'display_name' => 'Intake Nurse',
            'default_route' => '/queue',
        ]);
        $nurse->roles()->attach($roleNurse->id, ['assigned_at' => now()]);

        return $nurse;
    }

    public function test_concurrent_deductions_do_not_exceed_stock(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-STOCK-5',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);

        // Deduct 3
        $result1 = $service->deductForTreatment($clinic->id, $nurse->id, 101, 'Anti-rabies', 3);
        $this->assertEquals(2, $result1['remaining_quantity']);

        // Deduct 2
        $result2 = $service->deductForTreatment($clinic->id, $nurse->id, 102, 'Anti-rabies', 2);
        $this->assertEquals(0, $result2['remaining_quantity']);
        $this->assertEquals('depleted', $batch->fresh()->status);

        // Attempting to deduct 1 more should fail
        $this->expectException(ValidationException::class);
        $service->deductForTreatment($clinic->id, $nurse->id, 103, 'Anti-rabies', 1);
    }

    public function test_stock_cannot_go_negative(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-NEGATIVE-CHECK',
            'current_quantity' => 2,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);

        try {
            $service->deductForTreatment($clinic->id, $nurse->id, 104, 'Anti-rabies', 5);
            $this->fail('Expected ValidationException was not thrown.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('inventory', $e->errors());
        }

        $this->assertEquals(2, $batch->fresh()->current_quantity);
    }
}
