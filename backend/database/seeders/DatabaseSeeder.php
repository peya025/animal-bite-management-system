<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * 
     * NOTE: The DefaultClinicSeeder is for DEVELOPMENT/TESTING.
     * For production/client installations, run migrations without seeding:
     * php artisan migrate:fresh (without --seed flag)
     * 
     * This ensures the Setup Wizard appears on first use.
     * 
     * For development, seeders are enabled by default.
     */
    public function run(): void
    {
        // DEVELOPMENT/TESTING - Creates sample clinic and test users
        $this->call([
            DefaultClinicSeeder::class,
            DefaultClinicConfigSeeder::class,
        ]);
        
        // For production, comment out the above lines so Setup Wizard appears
    }
}
