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

class FifoTest extends TestCase
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

    public function test_deduction_uses_earliest_expiry_batch(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        // Later expiry batch
        $batchLater = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-2027-EXP',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(12)->toDateString(),
            'status' => 'active',
        ]);

        // Earlier expiry batch
        $batchEarlier = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-2026-EXP',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);
        $result = $service->deductForTreatment($clinic->id, $nurse->id, 101, 'Anti-rabies', 2);

        $this->assertEquals('BATCH-2026-EXP', $result['batch']->batch_number);
        $this->assertEquals(3, $batchEarlier->fresh()->current_quantity);
        $this->assertEquals(10, $batchLater->fresh()->current_quantity);
    }

    public function test_non_fifo_force_batch_id_returns_422(): void
    {
        $clinic = $this->createClinic();
        $nurse = $this->createNurse($clinic);

        $batchEarlier = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-EARLY-1',
            'current_quantity' => 5,
            'expiration_date' => now()->addMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $batchLater = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Anti-rabies',
            'batch_number' => 'BATCH-LATE-1',
            'current_quantity' => 10,
            'expiration_date' => now()->addMonths(12)->toDateString(),
            'status' => 'active',
        ]);

        $service = app(VaccineInventoryUsageService::class);

        $this->expectException(ValidationException::class);
        $service->deductForTreatment($clinic->id, $nurse->id, 102, 'Anti-rabies', 1, $batchLater->inventory_id);
    }
}
