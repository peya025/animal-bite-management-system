<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DeveloperUserSeeder extends Seeder
{
    /**
     * Seed a developer user for system access without clinic dependency.
     */
    public function run(): void
    {
        // Only create if developer doesn't exist
        if (!User::where('email', 'dev@system.local')->exists()) {
            User::create([
                'name' => 'System Developer',
                'email' => 'dev@system.local',
                'password' => Hash::make('Dev123456'),
                'role' => 'developer',
                'clinic_id' => null, // Developer has no clinic association
            ]);

            $this->command->info('✓ Developer user created');
            $this->command->info('  Email: dev@system.local');
            $this->command->info('  Password: Dev123456');
        } else {
            $this->command->info('✓ Developer user already exists');
        }
    }
}
