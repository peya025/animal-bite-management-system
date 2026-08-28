<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'ideal_date')) {
                $table->date('ideal_date')->nullable()->after('scheduled_date');
            }
            if (!Schema::hasColumn('appointments', 'schedule_drift_days')) {
                $table->integer('schedule_drift_days')->default(0)->after('ideal_date');
            }
            if (!Schema::hasColumn('appointments', 'schedule_adjustment_reason')) {
                $table->string('schedule_adjustment_reason', 255)->nullable()->after('schedule_drift_days');
            }
        });

        // Auto-backfill existing appointments to preserve 100% data integrity
        DB::statement("
            UPDATE `appointments` 
            SET `ideal_date` = COALESCE(DATE(`scheduled_date`), `appointment_date`)
            WHERE `ideal_date` IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'ideal_date',
                'schedule_drift_days',
                'schedule_adjustment_reason',
            ]);
        });
    }
};
