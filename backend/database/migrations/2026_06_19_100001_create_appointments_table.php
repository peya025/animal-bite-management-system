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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id('appointment_id');
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->foreignId('booked_by_account_id')->nullable()->constrained('patient_accounts')->nullOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('users', 'id')->nullOnDelete();

            $table->enum('appointment_type', ['consultation', 'vaccination']);
            $table->dateTime('scheduled_date');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->integer('queue_number')->nullable();

            $table->timestamps();

            $table->index('scheduled_date');
            $table->index('status');
            $table->index(['patient_id', 'scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
