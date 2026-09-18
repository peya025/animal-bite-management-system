<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DualNurseDemoSeeder extends Seeder
{
    public function run(): void
    {
        $clinic = Clinic::first() ?? Clinic::create([
            'name' => 'Animal Bite Center',
            'address' => 'Poblacion, Tagoloan, Misamis Oriental',
            'phone' => '09123456789',
            'email' => 'info@animalbitecenter.com',
            'is_setup_complete' => true,
        ]);

        $intakeRole = Role::firstOrCreate(
            ['slug' => 'intake_nurse'],
            ['name' => 'intake_nurse', 'display_name' => 'Intake Nurse', 'default_route' => '/queue']
        );

        $followUpRole = Role::firstOrCreate(
            ['slug' => 'follow_up_nurse'],
            ['name' => 'follow_up_nurse', 'display_name' => 'Follow-Up Nurse', 'default_route' => '/nurse/patients']
        );

        // 1. Nurse 1 — Intake Station
        $nurse1 = User::updateOrCreate(
            ['email' => 'nurse1@clinic.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Maria Santos',
                'password' => Hash::make('password123'),
                'role' => 'treatment',
                'is_active' => true,
                'signature_path' => 'signatures/maria_santos.png',
                'professional_license_no' => 'RN-782194',
                'phone' => '09123456781',
            ]
        );
        $nurse1->roles()->sync([$intakeRole->id => ['assigned_at' => now()]]);

        // 2. Nurse 2 — Follow-up Station
        $nurse2 = User::updateOrCreate(
            ['email' => 'nurse2@clinic.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Juan Reyes',
                'password' => Hash::make('password123'),
                'role' => 'treatment',
                'is_active' => true,
                'signature_path' => 'signatures/juan_reyes.png',
                'professional_license_no' => 'RN-645821',
                'phone' => '09123456782',
            ]
        );
        $nurse2->roles()->sync([$followUpRole->id => ['assigned_at' => now()]]);

        // 3. Combined / Solo Nurse (Elena Cruz)
        $soloNurse = User::updateOrCreate(
            ['email' => 'treatment@clinic.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Elena Cruz',
                'password' => Hash::make('password123'),
                'role' => 'treatment',
                'is_active' => true,
                'signature_path' => 'signatures/treatment_staff.png',
                'professional_license_no' => 'RN-551029',
                'phone' => '09123456780',
            ]
        );
        $soloNurse->roles()->sync([
            $intakeRole->id => ['assigned_at' => now()],
            $followUpRole->id => ['assigned_at' => now()],
        ]);
    }
}
