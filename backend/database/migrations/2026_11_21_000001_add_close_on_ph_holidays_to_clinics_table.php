<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            if (!Schema::hasColumn('clinics', 'close_on_ph_holidays')) {
                $table->boolean('close_on_ph_holidays')->default(true)->after('holiday_dates');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            if (Schema::hasColumn('clinics', 'close_on_ph_holidays')) {
                $table->dropColumn('close_on_ph_holidays');
            }
        });
    }
};
