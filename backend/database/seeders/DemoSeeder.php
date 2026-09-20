<?php

namespace Database\Seeders;

use App\Models\BiteIncident;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Role;
use App\Models\TreatmentPlan;
use App\Models\User;
use App\Models\VaccineInventory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Demo Seeder for Safe Public Demonstrations
 * 
 * NOTE: Only run `php artisan db:seed --class=DemoSeeder` on a fresh database.
 * NEVER run this on a production database containing real health records.
 * All data generated here is strictly synthetic and fictional.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $adminPassword = $this->requiredPassword('DEMO_ADMIN_PASSWORD');
        $staffPassword = $this->requiredPassword('DEMO_STAFF_PASSWORD');

        // 1. Synthetic Clinic
        $clinic = Clinic::firstOrCreate(
            ['name' => 'Synthetic Demo Animal Bite Center'],
            [
                'address' => '100 Demo Facility Way, Synthetic District',
                'phone' => '09120000000',
                'email' => 'demo@synthetic-clinic.example.com',
                'is_setup_complete' => true,
            ]
        );

        // 2. Roles
        $adminRole = Role::firstOrCreate(
            ['slug' => 'clinic_admin'],
            ['name' => 'clinic_admin', 'display_name' => 'Clinic Administrator', 'default_route' => '/dashboard']
        );
        $doctorRole = Role::firstOrCreate(
            ['slug' => 'doctor'],
            ['name' => 'doctor', 'display_name' => 'Doctor / Triage Officer', 'default_route' => '/doctor/patients']
        );
        $intakeNurseRole = Role::firstOrCreate(
            ['slug' => 'intake_nurse'],
            ['name' => 'intake_nurse', 'display_name' => 'Intake Nurse', 'default_route' => '/queue']
        );
        $followUpNurseRole = Role::firstOrCreate(
            ['slug' => 'follow_up_nurse'],
            ['name' => 'follow_up_nurse', 'display_name' => 'Follow-Up Nurse', 'default_route' => '/nurse/patients']
        );
        $receptionistRole = Role::firstOrCreate(
            ['slug' => 'receptionist'],
            ['name' => 'receptionist', 'display_name' => 'Receptionist', 'default_route' => '/patients']
        );

        // 3. Demo Admin User (password supplied only by the deployment environment)
        $admin = User::updateOrCreate(
            ['email' => 'admin@demo-clinic.example.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Demo Admin',
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'is_active' => true,
            ]
        );
        $admin->roles()->sync([$adminRole->id => ['assigned_at' => now()]]);

        // 4. Demo Staff Users
        $doctor = User::updateOrCreate(
            ['email' => 'doctor@demo-clinic.example.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Dr. Alex Mercer',
                'password' => Hash::make($staffPassword),
                'role' => 'triage',
                'is_active' => true,
                'signature_path' => 'signatures/dr_mercer.png',
                'professional_license_no' => 'MD-881234',
                'phone' => '09120000001',
            ]
        );
        $doctor->roles()->sync([$doctorRole->id => ['assigned_at' => now()]]);

        $nurse1 = User::updateOrCreate(
            ['email' => 'intake.nurse@demo-clinic.example.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Nurse Clara Vance',
                'password' => Hash::make($staffPassword),
                'role' => 'treatment',
                'is_active' => true,
                'signature_path' => 'signatures/nurse_clara.png',
                'professional_license_no' => 'RN-441235',
                'phone' => '09120000002',
            ]
        );
        $nurse1->roles()->sync([$intakeNurseRole->id => ['assigned_at' => now()]]);

        $nurse2 = User::updateOrCreate(
            ['email' => 'followup.nurse@demo-clinic.example.com'],
            [
                'clinic_id' => $clinic->id,
                'name' => 'Nurse Julian Croft',
                'password' => Hash::make($staffPassword),
                'role' => 'treatment',
                'is_active' => true,
                'signature_path' => 'signatures/nurse_julian.png',
                'professional_license_no' => 'RN-551236',
                'phone' => '09120000003',
            ]
        );
        $nurse2->roles()->sync([$followUpNurseRole->id => ['assigned_at' => now()]]);

        // 5. Realistic Synthetic Inventory
        VaccineInventory::firstOrCreate(
            ['clinic_id' => $clinic->id, 'batch_number' => 'BATCH-SYNTH-01'],
            [
                'vaccine_type' => 'Speeda',
                'current_quantity' => 150,
                'expiration_date' => now()->addMonths(18)->toDateString(),
                'status' => 'active',
                'open_vial_status' => 'unopened',
                'received_from' => 'Synthetic Health Supply Depository',
            ]
        );
        VaccineInventory::firstOrCreate(
            ['clinic_id' => $clinic->id, 'batch_number' => 'BATCH-SYNTH-02'],
            [
                'vaccine_type' => 'Verorab',
                'current_quantity' => 100,
                'expiration_date' => now()->addMonths(24)->toDateString(),
                'status' => 'active',
                'open_vial_status' => 'unopened',
                'received_from' => 'Synthetic Health Supply Depository',
            ]
        );

        // 6. Synthetic Patient Records & Bite Incidents
        $patient1 = Patient::firstOrCreate(
            ['clinic_id' => $clinic->id, 'patient_number' => 'PAT-DEMO-001'],
            [
                'first_name' => 'DemoJane',
                'last_name' => 'SampleUser',
                'date_of_birth' => '1996-03-20',
                'gender' => 'female',
                'contact_number' => '09129990001',
            ]
        );

        $bite1 = BiteIncident::firstOrCreate(
            ['clinic_id' => $clinic->id, 'patient_id' => $patient1->patient_id],
            [
                'episode_number' => 1,
                'episode_type' => 'primary',
                'status' => 'active',
                'bite_date' => now()->subDays(2)->toDateString(),
                'exposure_type' => 'bite',
                'animal_type' => 'dog',
                'created_by' => $doctor->id,
            ]
        );

        TreatmentPlan::firstOrCreate(
            ['clinic_id' => $clinic->id, 'bite_id' => $bite1->bite_id],
            [
                'patient_id' => $patient1->patient_id,
                'plan_type' => 'full_pep',
                'status' => 'approved',
                'ordered_dose_days' => [0, 3, 7, 28],
                'decided_by' => $doctor->id,
                'decided_at' => now(),
            ]
        );

        // Required system defaults for a fresh demo database.
        $this->call([
            DefaultClinicConfigSeeder::class,
            ClinicScheduleSeeder::class,
        ]);
    }

    private function requiredPassword(string $variable): string
    {
        $password = (string) env($variable, '');

        if (strlen($password) < 12) {
            throw new RuntimeException("{$variable} must be set to a unique password of at least 12 characters before running DemoSeeder.");
        }

        return $password;
    }
}
