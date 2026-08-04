<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            // Operating hours
            $table->time('opening_time')->default('08:00:00')->after('is_setup_complete');
            $table->time('closing_time')->default('17:00:00')->after('opening_time');
            
            // Working days (JSON array: [1,2,3,4,5] for Mon-Fri)
            $table->json('working_days')->default('[1,2,3,4,5]')->after('closing_time');
            
            // Holidays/Non-working dates (JSON array of dates)
            $table->json('holiday_dates')->nullable()->after('working_days');
            
            // Special schedule notes
            $table->text('schedule_notes')->nullable()->after('holiday_dates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn([
                'opening_time',
                'closing_time',
                'working_days',
                'holiday_dates',
                'schedule_notes',
            ]);
        });
    }
};
