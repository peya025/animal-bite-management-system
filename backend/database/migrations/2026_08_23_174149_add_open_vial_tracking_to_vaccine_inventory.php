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
        Schema::table('vaccine_inventory', function (Blueprint $table) {
            if (!Schema::hasColumn('vaccine_inventory', 'doses_per_vial')) {
                $table->integer('doses_per_vial')->default(1)->after('open_vial_hours');
            }
            if (!Schema::hasColumn('vaccine_inventory', 'open_vial_doses_used')) {
                $table->integer('open_vial_doses_used')->default(0)->after('open_vial_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vaccine_inventory', function (Blueprint $table) {
            if (Schema::hasColumn('vaccine_inventory', 'doses_per_vial')) {
                $table->dropColumn('doses_per_vial');
            }
            if (Schema::hasColumn('vaccine_inventory', 'open_vial_doses_used')) {
                $table->dropColumn('open_vial_doses_used');
            }
        });
    }
};
