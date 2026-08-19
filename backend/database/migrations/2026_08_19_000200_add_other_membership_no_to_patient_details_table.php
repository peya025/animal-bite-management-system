<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('patient_details', 'other_membership_no')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership_no', 100)->nullable()->after('other_membership');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('patient_details', 'other_membership_no')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->dropColumn('other_membership_no');
            });
        }
    }
};
