<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * 
     * Control seeding behavior with .env variable:
     * SEED_DEFAULT_CLINIC=true  -> Creates sample clinic & users (skip setup wizard)
     * SEED_DEFAULT_CLINIC=false -> Empty database (setup wizard appears)
     * 
     * Usage:
     * 1. Test with sample data: Set SEED_DEFAULT_CLINIC=true, run: php artisan migrate:fresh --seed
     * 2. Test setup wizard: Set SEED_DEFAULT_CLINIC=false, run: php artisan migrate:fresh --seed
     * 3. Test setup wizard (quick): Run: php artisan migrate:fresh (no --seed flag)
     */
    public function run(): void
    {
        // Check if we should seed default clinic
        $shouldSeed = env('SEED_DEFAULT_CLINIC', true);
        
        if ($shouldSeed) {
            $this->command->info('🌱 Seeding default clinic and test users...');
            $this->call([
                DefaultClinicSeeder::class,
                DefaultClinicConfigSeeder::class,
                VaccineInventorySeeder::class,
            ]);
        } else {
            $this->command->warn('⚠️  SEED_DEFAULT_CLINIC is false - skipping clinic creation');
            $this->command->info('💡 Setup Wizard will appear on first visit');
            $this->command->info('💡 To enable seeding, set SEED_DEFAULT_CLINIC=true in .env');
        }
    }
}
