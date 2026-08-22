<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // booked_by_account_id — mobile booking account reference
            if (!Schema::hasColumn('appointments', 'booked_by_account_id')) {
                $table->unsignedBigInteger('booked_by_account_id')->nullable()->after('notes');
                $table->foreign('booked_by_account_id')->references('id')->on('users')->onDelete('set null');
            }

            // staff_id — staff assigned to appointment
            if (!Schema::hasColumn('appointments', 'staff_id')) {
                $table->unsignedBigInteger('staff_id')->nullable()->after('booked_by_account_id');
                $table->foreign('staff_id')->references('id')->on('users')->onDelete('set null');
            }

            // queue_number — optional queue tracking
            if (!Schema::hasColumn('appointments', 'queue_number')) {
                $table->integer('queue_number')->nullable()->after('staff_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'queue_number')) {
                $table->dropColumn('queue_number');
            }
            if (Schema::hasColumn('appointments', 'staff_id')) {
                $table->dropForeign(['staff_id']);
                $table->dropColumn('staff_id');
            }
            if (Schema::hasColumn('appointments', 'booked_by_account_id')) {
                $table->dropForeign(['booked_by_account_id']);
                $table->dropColumn('booked_by_account_id');
            }
        });
    }
};
