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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments', 'appointment_id')->nullOnDelete();
            
            $table->string('type'); // sms, email, push, etc.
            $table->enum('status', ['pending', 'sent', 'failed', 'read'])->default('pending');
            $table->dateTime('send_time')->nullable();
            
            $table->timestamps();
            
            $table->index('type');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
