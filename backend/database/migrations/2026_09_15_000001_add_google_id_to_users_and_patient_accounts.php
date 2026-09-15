<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tier 9 — Google OAuth Identity Federation
 * Adds google_id (nullable, unique per table) to users and patient_accounts.
 * Also adds google_sso_enabled, google_sso_roles, and google_sso_domain
 * to clinic_module_configs for per-clinic SSO control.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Staff / Clinical Users ──────────────────────────────────────
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('email');
        });

        // ── Mobile Patient Accounts ─────────────────────────────────────
        Schema::table('patient_accounts', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('email');
        });

        // ── Clinic-level SSO configuration (in clinic_module_configs) ──
        Schema::table('clinic_module_configs', function (Blueprint $table) {
            $table->boolean('google_sso_enabled')->default(false)->after('treatment_section_enabled');
            // JSON array of allowed roles, e.g. ["admin","registration","triage","treatment"]
            $table->json('google_sso_roles')->nullable()->after('google_sso_enabled');
            // Optional domain restriction, e.g. "@doh.gov.ph"
            $table->string('google_sso_domain')->nullable()->after('google_sso_roles');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });

        Schema::table('patient_accounts', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });

        Schema::table('clinic_module_configs', function (Blueprint $table) {
            $table->dropColumn(['google_sso_enabled', 'google_sso_roles', 'google_sso_domain']);
        });
    }
};
