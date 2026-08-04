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
        // Add foreign key constraint to queues.appointment_id
        // This runs AFTER appointments table is created
        Schema::table('queues', function (Blueprint $table) {
            if (Schema::hasTable('appointments') && Schema::hasColumn('queues', 'appointment_id')) {
                // Check if foreign key doesn't already exist
                try {
                    $table->foreign('appointment_id')
                        ->references('appointment_id')
                        ->on('appointments')
                        ->onDelete('set null');
                } catch (\Exception $e) {
                    // Foreign key may already exist, skip
                    \Log::info('Foreign key queues_appointment_id_foreign may already exist');
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
        });
    }
};
