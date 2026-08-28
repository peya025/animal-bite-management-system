<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            if (!Schema::hasColumn('clinics', 'schedule_drift_policy')) {
                $table->enum('schedule_drift_policy', ['forward_only', 'nearest', 'backward_within_N_days'])->default('forward_only')->after('schedule_notes');
            }
            if (!Schema::hasColumn('clinics', 'backward_max_days')) {
                $table->integer('backward_max_days')->default(1)->after('schedule_drift_policy');
            }
            if (!Schema::hasColumn('clinics', 'urgent_access_policy')) {
                $table->enum('urgent_access_policy', ['walk_ins_accepted_outside_hours', 'refer_to_alternate_facility'])->default('walk_ins_accepted_outside_hours')->after('backward_max_days');
            }
            if (!Schema::hasColumn('clinics', 'urgent_referral_facility_name')) {
                $table->string('urgent_referral_facility_name', 255)->nullable()->after('urgent_access_policy');
            }
            if (!Schema::hasColumn('clinics', 'urgent_referral_facility_address')) {
                $table->string('urgent_referral_facility_address', 255)->nullable()->after('urgent_referral_facility_name');
            }
            if (!Schema::hasColumn('clinics', 'urgent_referral_facility_contact')) {
                $table->string('urgent_referral_facility_contact', 255)->nullable()->after('urgent_referral_facility_address');
            }
            if (!Schema::hasColumn('clinics', 'urgent_referral_instructions')) {
                $table->text('urgent_referral_instructions')->nullable()->after('urgent_referral_facility_contact');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn([
                'schedule_drift_policy',
                'backward_max_days',
                'urgent_access_policy',
                'urgent_referral_facility_name',
                'urgent_referral_facility_address',
                'urgent_referral_facility_contact',
                'urgent_referral_instructions',
            ]);
        });
    }
};
