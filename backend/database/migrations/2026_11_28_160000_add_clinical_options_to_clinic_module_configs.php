<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('clinic_module_configs', 'clinical_options')) {
            Schema::table('clinic_module_configs', function (Blueprint $table) {
                $table->json('clinical_options')->nullable()->after('field_rules');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('clinic_module_configs', 'clinical_options')) {
            Schema::table('clinic_module_configs', function (Blueprint $table) {
                $table->dropColumn('clinical_options');
            });
        }
    }
};
