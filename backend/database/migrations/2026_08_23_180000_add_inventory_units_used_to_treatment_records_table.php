<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            if (!Schema::hasColumn('treatment_records', 'inventory_units_used')) {
                $table->integer('inventory_units_used')->nullable()->after('inventory_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            if (Schema::hasColumn('treatment_records', 'inventory_units_used')) {
                $table->dropColumn('inventory_units_used');
            }
        });
    }
};
