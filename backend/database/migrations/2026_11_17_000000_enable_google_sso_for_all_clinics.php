<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Enable Google SSO for all existing clinics.
 * Changes the column default to true and backfills existing rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Backfill all existing clinic configs — enable Google SSO
        DB::table('clinic_module_configs')->update([
            'google_sso_enabled' => true,
        ]);
    }

    public function down(): void
    {
        DB::table('clinic_module_configs')->update([
            'google_sso_enabled' => false,
        ]);
    }
};
