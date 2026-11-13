<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the non-production accounts used by the login page's quick-access
 * buttons. Run this only for local development or an isolated test database.
 */
class QuickLoginDemoSeeder extends Seeder
{
    public function run(): void
    {
        $clinic = Clinic::first();

        if (! $clinic) {
            $clinic = Clinic::create([
                'name' => 'Animal Bite Center',
                'address' => 'Poblacion, Tagoloan, Misamis Oriental',
                'email' => 'info@animalbitecenter.com',
                'phone' => '09123456789',
                'is_setup_complete' => true,
            ]);
        }

        $roles = [
            'intake_nurse' => Role::firstOrCreate(
                ['slug' => 'intake_nurse'],
                ['display_name' => 'Intake Nurse', 'default_route' => '/queue']
            ),
            'follow_up_nurse' => Role::firstOrCreate(
                ['slug' => 'follow_up_nurse'],
                ['display_name' => 'Follow-Up Nurse', 'default_route' => '/nurse/patients']
            ),
            'clinic_admin' => Role::firstOrCreate(
                ['slug' => 'clinic_admin'],
                ['display_name' => 'Clinic Administrator', 'default_route' => '/dashboard']
            ),
            'doctor' => tap(Role::firstOrCreate(
                ['slug' => 'doctor'],
                ['display_name' => 'Doctor / Triage Officer', 'default_route' => '/queue']
            ), function ($role) {
                if ($role->default_route !== '/queue') {
                    $role->update(['default_route' => '/queue']);
                }
            }),
            'receptionist' => Role::firstOrCreate(
                ['slug' => 'receptionist'],
                ['display_name' => 'Receptionist / Registration Staff', 'default_route' => '/patients']
            ),
        ];

        $accounts = [
            ['name' => 'Lead Developer', 'email' => 'developer@clinic.com', 'role' => 'developer', 'roles' => ['clinic_admin']],
            ['name' => 'Admin User', 'email' => 'admin@clinic.com', 'role' => 'admin', 'roles' => ['clinic_admin']],
            ['name' => 'Registration Staff', 'email' => 'registration@clinic.com', 'role' => 'registration', 'roles' => ['receptionist']],
            ['name' => 'Triage Doctor', 'email' => 'triage@clinic.com', 'role' => 'triage', 'roles' => ['doctor']],
            ['name' => 'Maria Santos', 'email' => 'nurse1@clinic.com', 'role' => 'treatment', 'roles' => ['intake_nurse']],
            ['name' => 'Juan Reyes', 'email' => 'nurse2@clinic.com', 'role' => 'treatment', 'roles' => ['follow_up_nurse']],
            ['name' => 'Elena Cruz', 'email' => 'treatment@clinic.com', 'role' => 'treatment', 'roles' => ['intake_nurse', 'follow_up_nurse']],
        ];

        foreach ($accounts as $account) {
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'clinic_id' => $clinic->id,
                    'name' => $account['name'],
                    'password' => Hash::make('password123'),
                    'role' => $account['role'],
                    'is_active' => true,
                ]
            );

            $user->roles()->sync(
                collect($account['roles'])
                    ->mapWithKeys(fn (string $role) => [$roles[$role]->id => ['assigned_at' => now()]])
                    ->all()
            );
        }
    }
}
