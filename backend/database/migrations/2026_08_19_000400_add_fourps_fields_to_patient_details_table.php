<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_details', function (Blueprint $table) {
            if (!Schema::hasColumn('patient_details', 'fourps_category')) {
                $table->string('fourps_category', 50)->nullable()->after('fourps_member');
            }
            if (!Schema::hasColumn('patient_details', 'fourps_relationship')) {
                $table->string('fourps_relationship', 50)->nullable()->after('fourps_category');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patient_details', function (Blueprint $table) {
            if (Schema::hasColumn('patient_details', 'fourps_category')) {
                $table->dropColumn('fourps_category');
            }
            if (Schema::hasColumn('patient_details', 'fourps_relationship')) {
                $table->dropColumn('fourps_relationship');
            }
        });
    }
};
