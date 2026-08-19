<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('patient_details', 'other_membership')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('other_membership', 50)->nullable()->after('dswd_nhts');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('patient_details', 'other_membership')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->dropColumn('other_membership');
            });
        }
    }
};
