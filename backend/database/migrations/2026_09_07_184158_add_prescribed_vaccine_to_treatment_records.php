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
        Schema::table('treatment_records', function (Blueprint $table) {
            if (!Schema::hasColumn('treatment_records', 'prescribed_vaccine_type')) {
                // Doctor's prescribed PEP vaccine (Form 2) — pre-fills and hard-locks nurse Form 3 dropdown
                $table->string('prescribed_vaccine_type', 100)->nullable()->after('medication_treatment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            if (Schema::hasColumn('treatment_records', 'prescribed_vaccine_type')) {
                $table->dropColumn('prescribed_vaccine_type');
            }
        });
    }
};
