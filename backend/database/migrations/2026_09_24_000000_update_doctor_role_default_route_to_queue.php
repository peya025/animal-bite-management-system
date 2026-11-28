<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('roles')) {
            DB::table('roles')
                ->whereIn('slug', ['doctor', 'triage'])
                ->update(['default_route' => '/queue']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('roles')) {
            DB::table('roles')
                ->whereIn('slug', ['doctor', 'triage'])
                ->update(['default_route' => '/doctor/patients']);
        }
    }
};

