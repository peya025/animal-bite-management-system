<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_details', function (Blueprint $table) {
            if (!Schema::hasColumn('patient_details', 'has_membership')) {
                $table->string('has_membership', 10)->nullable()->after('dswd_nhts');
            }
            if (!Schema::hasColumn('patient_details', 'other_membership_name')) {
                $table->string('other_membership_name', 100)->nullable()->after('other_membership');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patient_details', function (Blueprint $table) {
            if (Schema::hasColumn('patient_details', 'has_membership')) {
                $table->dropColumn('has_membership');
            }
            if (Schema::hasColumn('patient_details', 'other_membership_name')) {
                $table->dropColumn('other_membership_name');
            }
        });
    }
};
