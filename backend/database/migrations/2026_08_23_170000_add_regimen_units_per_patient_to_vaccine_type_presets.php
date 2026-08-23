<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vaccine_type_presets', function (Blueprint $table) {
            if (!Schema::hasColumn('vaccine_type_presets', 'regimen_units_per_patient')) {
                $table->decimal('regimen_units_per_patient', 8, 2)
                    ->default(1)
                    ->after('doses_per_vial');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vaccine_type_presets', function (Blueprint $table) {
            if (Schema::hasColumn('vaccine_type_presets', 'regimen_units_per_patient')) {
                $table->dropColumn('regimen_units_per_patient');
            }
        });
    }
};
