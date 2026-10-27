<?php

namespace Tests\Feature\Inventory;

use App\Models\Clinic;
use App\Models\VaccineInventory;
use App\Models\VaccineTypePreset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_stock_counts_only_active_unexpired_inventory_at_the_displayed_clinic(): void
    {
        $clinic = Clinic::create(['name' => 'Public clinic']);
        $other = Clinic::create(['name' => 'Other clinic']);
        VaccineTypePreset::create(['vaccine_name' => 'Test Vaccine', 'category' => 'Test category']);
        VaccineTypePreset::create(['vaccine_name' => 'Catalog only', 'category' => 'Test category']);
        foreach ([
            ['vaccine_type' => 'Test Vaccine', 'current_quantity' => 6],
            ['vaccine_type' => ' test vaccine ', 'current_quantity' => 7],
            ['vaccine_type' => 'Test Vaccine', 'current_quantity' => 50, 'expiration_date' => now()->subDay()],
            ['vaccine_type' => 'Test Vaccine', 'current_quantity' => 50, 'status' => 'expired'],
            ['vaccine_type' => 'Test Vaccine', 'current_quantity' => 50, 'clinic_id' => $other->id],
            ['vaccine_type' => 'Custom item', 'current_quantity' => 4],
            ['vaccine_type' => 'Empty item', 'current_quantity' => 0, 'status' => 'depleted'],
            ['vaccine_type' => 'Expired item', 'current_quantity' => 8, 'expiration_date' => now()->subDay()],
        ] as $index => $attributes) {
            VaccineInventory::create(array_merge([
                'clinic_id' => $clinic->id,
                'batch_number' => 'PUBLIC-'.$index,
                'expiration_date' => now()->addMonth(),
                'status' => 'active',
            ], $attributes));
        }
        $archived = VaccineInventory::create([
            'clinic_id' => $clinic->id, 'batch_number' => 'ARCHIVED',
            'vaccine_type' => 'Test Vaccine', 'current_quantity' => 100,
            'expiration_date' => now()->addMonth(), 'status' => 'active',
        ]);
        $archived->delete();

        $response = $this->getJson('/api/public/vaccine-availability')->assertOk()
            ->assertJsonPath('facility_name', 'Public clinic')->assertJsonCount(4, 'vaccines');
        $vaccines = collect($response->json('vaccines'))->keyBy('vaccine_name');
        $this->assertSame(13, $vaccines['Test Vaccine']['available_vials']);
        $this->assertSame(2, $vaccines['Test Vaccine']['active_batches']);
        $this->assertSame('In Stock', $vaccines['Test Vaccine']['availability_status']);
        $this->assertSame('Test category', $vaccines['Test Vaccine']['category']);
        $this->assertSame('Limited Stock', $vaccines['Custom item']['availability_status']);
        $this->assertSame('Other Biologicals', $vaccines['Custom item']['category']);
        $this->assertSame('Out of Stock', $vaccines['Empty item']['availability_status']);
        $this->assertSame(0, $vaccines['Expired item']['available_vials']);

        VaccineInventory::where('clinic_id', $clinic->id)->where('batch_number', 'PUBLIC-0')->update(['current_quantity' => 1]);
        $updated = collect($this->getJson('/api/public/vaccine-availability')->assertOk()->json('vaccines'))->keyBy('vaccine_name');
        $this->assertSame(8, $updated['Test Vaccine']['available_vials']);
        $this->assertSame('Limited Stock', $updated['Test Vaccine']['availability_status']);
    }

    public function test_empty_inventory_does_not_create_or_publish_catalog_placeholders(): void
    {
        Clinic::create(['name' => 'Empty clinic']);
        $this->getJson('/api/public/vaccine-availability')->assertOk()->assertJsonCount(0, 'vaccines');
        $this->assertDatabaseCount('vaccine_type_presets', 0);
    }
}
