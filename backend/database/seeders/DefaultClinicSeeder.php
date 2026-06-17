<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultClinicSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default clinic
        $clinic = Clinic::create([
            'name' => 'Animal Bite Center',
            'address' => '123 Main Street, City',
            'phone' => '09123456789',
            'email' => 'info@animalbitecenter.com',
            'is_setup_complete' => false,
        ]);

        // Create admin user
        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin User',
            'email' => 'admin@clinic.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
            'phone' => '09123456789',
        ]);

        // Create sample staff users for testing
        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Registration Staff',
            'email' => 'registration@clinic.com',
            'password' => Hash::make('password123'),
            'role' => 'registration',
            'is_active' => true,
            'phone' => '09123456790',
        ]);

        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Triage Doctor',
            'email' => 'triage@clinic.com',
            'password' => Hash::make('password123'),
            'role' => 'triage',
            'is_active' => true,
            'phone' => '09123456791',
        ]);

        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Treatment Nurse',
            'email' => 'treatment@clinic.com',
            'password' => Hash::make('password123'),
            'role' => 'treatment',
            'is_active' => true,
            'phone' => '09123456792',
        ]);

        $this->command->info('✅ Default clinic and users created successfully!');
        $this->command->newLine();
        $this->command->info('📋 Login Credentials:');
        $this->command->newLine();
        $this->command->info('👤 Admin:');
        $this->command->info('   Email: admin@clinic.com');
        $this->command->info('   Password: password123');
        $this->command->newLine();
        $this->command->info('👤 Registration Staff:');
        $this->command->info('   Email: registration@clinic.com');
        $this->command->info('   Password: password123');
        $this->command->newLine();
        $this->command->info('👤 Triage Doctor:');
        $this->command->info('   Email: triage@clinic.com');
        $this->command->info('   Password: password123');
        $this->command->newLine();
        $this->command->info('👤 Treatment Nurse:');
        $this->command->info('   Email: treatment@clinic.com');
        $this->command->info('   Password: password123');
    }
}
