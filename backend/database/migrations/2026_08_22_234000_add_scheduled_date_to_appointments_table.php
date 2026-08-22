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
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'scheduled_date')) {
                $table->date('scheduled_date')->nullable()->after('patient_id');
            }
        });

        // Populate scheduled_date from appointment_date if appointment_date exists
        if (Schema::hasColumn('appointments', 'appointment_date') && Schema::hasColumn('appointments', 'scheduled_date')) {
            DB::statement("UPDATE `appointments` SET `scheduled_date` = `appointment_date` WHERE `scheduled_date` IS NULL AND `appointment_date` IS NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'scheduled_date')) {
                $table->dropColumn('scheduled_date');
            }
        });
    }
};
