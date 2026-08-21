<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend other_membership to 500 chars to store JSON array of multiple memberships
        if (Schema::hasColumn('patient_details', 'other_membership')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership', 500)->nullable()->change();
            });
        }
        // Also extend other_membership_no to store multiple IDs
        if (Schema::hasColumn('patient_details', 'other_membership_no')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership_no', 500)->nullable()->change();
            });
        }
        // Also extend other_membership_name to store multiple names
        if (Schema::hasColumn('patient_details', 'other_membership_name')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership_name', 500)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('patient_details', 'other_membership')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership', 50)->nullable()->change();
            });
        }
        if (Schema::hasColumn('patient_details', 'other_membership_no')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership_no', 100)->nullable()->change();
            });
        }
        if (Schema::hasColumn('patient_details', 'other_membership_name')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership_name', 100)->nullable()->change();
            });
        }
    }
};
