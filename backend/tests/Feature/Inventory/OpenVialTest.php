<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentRecord;
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

    public function test_administration_list_formats_vial_and_stock_usage_clearly(): void
    {
        $clinic = $this->createClinic();
        $admin = $this->createAdmin($clinic);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Pia',
            'last_name' => 'Sarz',
            'gender' => 'female',
            'date_of_birth' => '2000-01-01',
        ]);

        $batch = VaccineInventory::create([
            'clinic_id' => $clinic->id,
            'vaccine_type' => 'Verorab',
            'batch_number' => '555',
            'current_quantity' => 5,
            'doses_per_vial' => 3,
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'status' => 'active',
        ]);

        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 0,
            'treatment_date' => now()->toDateString(),
            'administered_at' => now(),
            'administered_by' => $admin->id,
            'status' => 'completed',
            'vaccine_brand' => 'Verorab',
            'batch_no' => '555',
            'inventory_id' => $batch->inventory_id,
            'inventory_units_used' => 1,
            'administration_notes' => 'New vial opened (Dose 1 of 3) from FIFO batch 555',
        ]);

        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 3,
            'treatment_date' => now()->toDateString(),
            'administered_at' => now()->addMinute(),
            'administered_by' => $admin->id,
            'status' => 'completed',
            'vaccine_brand' => 'Verorab',
            'batch_no' => '555',
            'inventory_id' => $batch->inventory_id,
            'inventory_units_used' => 0,
            'administration_notes' => 'Shared open vial (Dose 2 of 3) from batch 555',
        ]);

        TreatmentRecord::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->patient_id,
            'dose_number' => 7,
            'treatment_date' => now()->toDateString(),
            'administered_at' => now()->addMinutes(2),
            'administered_by' => $admin->id,
            'status' => 'completed',
            'is_external' => true,
            'external_facility_name' => 'City Health Office',
            'vaccine_brand' => 'Verorab',
            'inventory_units_used' => 0,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/vaccination-records/administrations');
        $response->assertStatus(200);

        $rows = collect($response->json('data'))->keyBy('dose_number');

        // Legacy unlinked records must stay preserved without inventing a vial ID or sharing history
        $this->assertNull($rows[0]['vial_id']);
        $this->assertNull($rows[0]['vial_code']);
        $this->assertNull($rows[0]['vial']);
        $this->assertTrue($rows[0]['is_legacy_unlinked']);
        $this->assertSame('Legacy Record', $rows[0]['usage_badge']);

        $this->assertNull($rows[3]['vial_id']);
        $this->assertNull($rows[3]['vial_code']);
        $this->assertTrue($rows[3]['is_legacy_unlinked']);

        $this->assertSame('External · 0 deducted', $rows[7]['usage_badge']);
        $this->assertSame('External (0 vials)', $rows[7]['fraction_used']);
        $this->assertFalse($rows[7]['is_legacy_unlinked']);
    }
}
