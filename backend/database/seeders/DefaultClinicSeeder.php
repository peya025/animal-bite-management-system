<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\User;
use App\Models\LandingPageSetting;
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
            'address' => 'Poblacion, Tagoloan, Misamis Oriental',
            'phone' => '09123456789',
            'email' => 'info@animalbitecenter.com',
            'is_setup_complete' => true,
        ]);

        // Create developer user
        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Lead Developer',
            'email' => 'developer@clinic.com',
            'password' => Hash::make('password123'),
            'role' => 'developer',
            'is_active' => true,
            'phone' => '09999999999',
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

        // Seed Landing Page & Footer Settings
        LandingPageSetting::create([
            'clinic_id' => $clinic->id,
            'app_short_name' => 'TABTA',
            'app_full_name' => 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
            'abtc_brand_title' => 'ABTC',
            'abtc_description' => 'Animal Bite Management & Monitoring System',
            'developed_for_text' => 'Developed for Animal Bite Treatment Center',
            'quick_links' => [
                ['label' => 'About System', 'url' => '#about'],
                ['label' => 'Help Center', 'url' => '#help'],
                ['label' => 'Staff Login', 'url' => '#login'],
            ],
            'support_links' => [
                ['label' => 'Contact Support', 'url' => '#contact'],
                ['label' => 'User Guides', 'url' => '#guides'],
                ['label' => 'FAQs', 'url' => '#faqs'],
            ],
            'system_info_links' => [
                ['label' => 'Features', 'url' => '#features'],
                ['label' => 'Security', 'url' => '#security'],
                ['label' => 'Report Issue', 'url' => '#report'],
            ],
            'operating_schedule' => 'SCHEDULE: MONDAYS & THURSDAYS',
            'operating_hours' => '8:00 AM – 5:00 PM',
            'registration_window' => '8:00 AM – 10:00 AM (Come Early!)',
            'requirement_notice' => 'Please bring updated PhilHealth MDR',
        ]);

        $this->command->info('✅ Default clinic, developer account, and landing page settings created successfully!');
        $this->command->newLine();
        $this->command->info('📋 Login Credentials:');
        $this->command->newLine();
        $this->command->info('💻 Developer:');
        $this->command->info('   Email: developer@clinic.com');
        $this->command->info('   Password: password123');
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
