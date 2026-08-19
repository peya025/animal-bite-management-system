<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('patient_details', 'registered_fourps_beneficiary')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('registered_fourps_beneficiary', 50)->nullable()->after('fourps_relationship');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('patient_details', 'registered_fourps_beneficiary')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->dropColumn(['registered_fourps_beneficiary']);
            });
        }
    }
};
