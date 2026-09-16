<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('display_name', 100);
            $table->string('default_route', 150);
            $table->timestamps();
        });

        // 2. User Roles join table
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('assigned_at')->useCurrent();

            $table->unique(['user_id', 'role_id'], 'uniq_user_role');
        });

        // 3. Seed canonical roles
        $roles = [
            [
                'slug'          => 'intake_nurse',
                'display_name'  => 'Intake Nurse',
                'default_route' => '/queue',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'slug'          => 'follow_up_nurse',
                'display_name'  => 'Follow-Up Nurse',
                'default_route' => '/nurse/patients',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'slug'          => 'clinic_admin',
                'display_name'  => 'Clinic Administrator',
                'default_route' => '/dashboard',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'slug'          => 'doctor',
                'display_name'  => 'Doctor / Triage Officer',
                'default_route' => '/doctor/patients',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'slug'          => 'receptionist',
                'display_name'  => 'Receptionist / Registration Staff',
                'default_route' => '/patients',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ];

        DB::table('roles')->insert($roles);

        // Fetch inserted role IDs
        $roleMap = DB::table('roles')->pluck('id', 'slug');

        // 4. Backfill existing users
        $users = DB::table('users')->get();
        $now = now();

        foreach ($users as $user) {
            $roleSlugsToAssign = [];

            if ($user->role === 'treatment') {
                // Nursing staff gets BOTH intake_nurse and follow_up_nurse to preserve current access
                $roleSlugsToAssign[] = 'intake_nurse';
                $roleSlugsToAssign[] = 'follow_up_nurse';
            } elseif ($user->role === 'admin' || $user->role === 'developer') {
                $roleSlugsToAssign[] = 'clinic_admin';
            } elseif ($user->role === 'triage') {
                $roleSlugsToAssign[] = 'doctor';
            } elseif ($user->role === 'registration') {
                $roleSlugsToAssign[] = 'receptionist';
            }

            foreach ($roleSlugsToAssign as $slug) {
                if (isset($roleMap[$slug])) {
                    DB::table('user_roles')->updateOrInsert(
                        [
                            'user_id' => $user->id,
                            'role_id' => $roleMap[$slug],
                        ],
                        [
                            'assigned_by' => null,
                            'assigned_at' => $now,
                        ]
                    );
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('roles');
    }
};
