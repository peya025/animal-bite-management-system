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
        Schema::table('vaccine_type_presets', function (Blueprint $table) {
            if (!Schema::hasColumn('vaccine_type_presets', 'dosing_regimen_notes')) {
                $table->text('dosing_regimen_notes')->nullable()->after('storage_temperature_notes');
            }
            if (!Schema::hasColumn('vaccine_type_presets', 'administration_route')) {
                $table->string('administration_route')->nullable()->default('Intradermal (ID) / Intramuscular (IM)')->after('dosing_regimen_notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vaccine_type_presets', function (Blueprint $table) {
            if (Schema::hasColumn('vaccine_type_presets', 'dosing_regimen_notes')) {
                $table->dropColumn('dosing_regimen_notes');
            }
            if (Schema::hasColumn('vaccine_type_presets', 'administration_route')) {
                $table->dropColumn('administration_route');
            }
        });
    }
};
