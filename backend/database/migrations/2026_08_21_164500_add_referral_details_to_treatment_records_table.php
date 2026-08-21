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
        Schema::table('treatment_records', function (Blueprint $table) {
            if (!Schema::hasColumn('treatment_records', 'pertinent_history')) {
                $table->text('pertinent_history')->nullable()->after('referred_to');
            }
            if (!Schema::hasColumn('treatment_records', 'reason_for_referral')) {
                $table->text('reason_for_referral')->nullable()->after('pertinent_history');
            }
            if (!Schema::hasColumn('treatment_records', 'actions_taken')) {
                $table->text('actions_taken')->nullable()->after('reason_for_referral');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            $table->dropColumn(['pertinent_history', 'reason_for_referral', 'actions_taken']);
        });
    }
};
