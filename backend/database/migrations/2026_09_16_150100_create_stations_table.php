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
        Schema::create('stations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->string('name', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['clinic_id', 'is_active']);
        });

        // Seed default stations for existing clinics
        $clinics = DB::table('clinics')->get();
        $now = now();

        foreach ($clinics as $clinic) {
            DB::table('stations')->insert([
                [
                    'clinic_id'  => $clinic->id,
                    'name'       => 'Station 1 - Intake',
                    'is_active'  => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'clinic_id'  => $clinic->id,
                    'name'       => 'Station 2 - Follow-ups & Boosters',
                    'is_active'  => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stations');
    }
};
