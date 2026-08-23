<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\User;
use App\Models\VaccineInventory;
use App\Models\InventoryTransaction;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class VaccineInventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clinic = Clinic::first();
        if (!$clinic) {
            $this->command->warn('No clinic found. Skipping VaccineInventorySeeder.');
            return;
        }

        $admin = User::where('clinic_id', $clinic->id)->where('role', 'admin')->first()
            ?? User::where('clinic_id', $clinic->id)->first();
        $staffId = $admin ? $admin->id : 1;

        $batches = [
            [
                'vaccine_type'     => 'Verorab (Purified Rabies Vaccine 0.5ml)',
                'batch_number'     => 'VR-2026-041',
                'current_quantity' => 150,
                'initial_quantity' => 180,
                'expiration_date'  => Carbon::now()->addMonths(6)->toDateString(),
                'status'           => 'active',
                'created_at'       => Carbon::now()->subMonths(2),
            ],
            [
                'vaccine_type'     => 'Verorab (Purified Rabies Vaccine 0.5ml)',
                'batch_number'     => 'VR-2026-072',
                'current_quantity' => 200,
                'initial_quantity' => 200,
                'expiration_date'  => Carbon::now()->addMonths(11)->toDateString(),
                'status'           => 'active',
                'created_at'       => Carbon::now()->subMonth(),
            ],
            [
                'vaccine_type'     => 'Speeda (Purified Vero Cell Rabies Vaccine 0.5ml)',
                'batch_number'     => 'SP-2026-102',
                'current_quantity' => 80,
                'initial_quantity' => 100,
                'expiration_date'  => Carbon::now()->addMonths(4)->toDateString(),
                'status'           => 'active',
                'created_at'       => Carbon::now()->subMonths(3),
            ],
            [
                'vaccine_type'     => 'Rabipur (PCECV Rabies Vaccine 1IU)',
                'batch_number'     => 'RP-2026-018',
                'current_quantity' => 120,
                'initial_quantity' => 120,
                'expiration_date'  => Carbon::now()->addMonths(8)->toDateString(),
                'status'           => 'active',
                'created_at'       => Carbon::now()->subWeeks(3),
            ],
            [
                'vaccine_type'     => 'Equirab (Equine Rabies Immunoglobulin 1000IU)',
                'batch_number'     => 'EQ-2026-009',
                'current_quantity' => 45,
                'initial_quantity' => 50,
                'expiration_date'  => Carbon::now()->addMonths(5)->toDateString(),
                'status'           => 'active',
                'created_at'       => Carbon::now()->subMonths(2),
            ],
            [
                'vaccine_type'     => 'Tetanus Toxoid (TT 0.5ml)',
                'batch_number'     => 'TT-2026-033',
                'current_quantity' => 90,
                'initial_quantity' => 100,
                'expiration_date'  => Carbon::now()->addMonths(14)->toDateString(),
                'status'           => 'active',
                'created_at'       => Carbon::now()->subMonths(1),
            ],
        ];

        foreach ($batches as $data) {
            $created_at = $data['created_at'];
            $initial_quantity = $data['initial_quantity'];
            unset($data['initial_quantity']);

            $inventory = VaccineInventory::firstOrCreate(
                [
                    'clinic_id'    => $clinic->id,
                    'batch_number' => $data['batch_number'],
                ],
                array_merge($data, [
                    'clinic_id' => $clinic->id,
                ])
            );

            // Record initial delivery transaction if not exists
            if ($inventory->wasRecentlyCreated) {
                InventoryTransaction::create([
                    'inventory_id'     => $inventory->inventory_id,
                    'staff_id'         => $staffId,
                    'transaction_type' => 'received',
                    'quantity'         => $initial_quantity,
                    'transaction_date' => $created_at,
                    'remarks'          => 'Initial stock received from DOH / Central Medical Supply',
                ]);

                // If some were already used, record used transaction
                $used = $initial_quantity - $data['current_quantity'];
                if ($used > 0) {
                    InventoryTransaction::create([
                        'inventory_id'     => $inventory->inventory_id,
                        'staff_id'         => $staffId,
                        'transaction_type' => 'used',
                        'quantity'         => $used,
                        'transaction_date' => Carbon::now()->subDays(5),
                        'remarks'          => 'Administered doses to registered patients',
                    ]);
                }
            }
        }

        $this->command->info('✅ Vaccine inventory and transactions seeded successfully.');
    }
}
