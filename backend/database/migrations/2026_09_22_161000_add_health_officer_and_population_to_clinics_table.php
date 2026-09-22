<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            if (!Schema::hasColumn('clinics', 'health_officer_name')) {
                $table->string('health_officer_name', 255)->nullable()->default('JENNIFER L. ADVINCULA MD');
            }
            if (!Schema::hasColumn('clinics', 'population')) {
                $table->unsignedBigInteger('population')->nullable()->default(70000);
            }
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            if (Schema::hasColumn('clinics', 'health_officer_name')) {
                $table->dropColumn('health_officer_name');
            }
            if (Schema::hasColumn('clinics', 'population')) {
                $table->dropColumn('population');
            }
        });
    }
};
