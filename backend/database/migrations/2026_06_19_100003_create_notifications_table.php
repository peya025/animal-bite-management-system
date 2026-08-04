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
            $table->foreignId('patient_account_id')->nullable()->constrained('patient_accounts')->cascadeOnDelete();
            
            // appointment_id will be added later via separate migration
            $table->unsignedBigInteger('appointment_id')->nullable();

            $table->string('type'); // sms, email, push, etc.
            $table->text('message');
            $table->enum('status', ['pending', 'sent', 'failed', 'read'])->default('pending');
            $table->dateTime('send_time')->nullable();
            $table->timestamp('read_at')->nullable();

            $table->timestamps();

            $table->index('type');
            $table->index('status');
            $table->index(['patient_account_id', 'status']);
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
