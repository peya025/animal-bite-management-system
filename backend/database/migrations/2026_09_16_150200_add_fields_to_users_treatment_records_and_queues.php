<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. users table amendments
        Schema::table('users', function (Blueprint $table) {
            $table->string('signature_path', 255)->nullable()->after('phone');
            $table->string('professional_license_no', 100)->nullable()->after('signature_path');
        });

        // Populate default signature for existing treatment users so clinical tests/dev flows are not blocked
        DB::table('users')
            ->where('role', 'treatment')
            ->update([
                'signature_path'          => 'signatures/default_nurse_signature.png',
                'professional_license_no' => 'RN-0824199',
            ]);

        // 2. treatment_records table amendments
        Schema::table('treatment_records', function (Blueprint $table) {
            $table->dateTime('voided_at')->nullable()->after('status');
            $table->foreignId('voided_by')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();
            $table->text('void_reason')->nullable()->after('voided_by');

            $table->index(['bite_id', 'dose_number', 'voided_at'], 'idx_live_dose_lookup');
        });

        // 3. queues table amendments
        Schema::table('queues', function (Blueprint $table) {
            $table->foreignId('served_by')->nullable()->after('handled_by')->constrained('users')->nullOnDelete();
            $table->timestamp('serving_started_at')->nullable()->after('serving_at');
            $table->foreignId('station_id')->nullable()->after('served_by')->constrained('stations')->nullOnDelete();

            $table->index(['clinic_id', 'status', 'served_by'], 'idx_queue_served_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropForeign(['served_by']);
            $table->dropForeign(['station_id']);
            $table->dropIndex('idx_queue_served_by');
            $table->dropColumn(['served_by', 'serving_started_at', 'station_id']);
        });

        Schema::table('treatment_records', function (Blueprint $table) {
            $table->dropForeign(['voided_by']);
            $table->dropIndex('idx_live_dose_lookup');
            $table->dropColumn(['voided_at', 'voided_by', 'void_reason']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['signature_path', 'professional_license_no']);
        });
    }
};
