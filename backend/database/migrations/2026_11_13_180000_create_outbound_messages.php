<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communication_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->unique()->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->boolean('sms')->default(false);
            $table->boolean('email')->default(false);
            $table->unsignedBigInteger('recorded_by');
            $table->timestamps();
        });
        Schema::create('communication_preference_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->boolean('sms');
            $table->boolean('email');
            $table->unsignedBigInteger('recorded_by');
            $table->timestamp('created_at');
        });
        Schema::create('outbound_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id')->index();
            $table->unsignedBigInteger('patient_id')->nullable()->index();
            $table->unsignedBigInteger('appointment_id')->nullable()->index();
            $table->foreignId('reminder_id')->nullable()->constrained('appointment_reminders')->nullOnDelete();
            $table->string('channel', 20);
            $table->string('purpose', 40);
            $table->string('provider', 80);
            $table->string('idempotency_key', 64)->unique();
            $table->text('recipient');
            $table->text('subject')->nullable();
            $table->text('body');
            $table->json('context')->nullable();
            $table->string('status', 30)->default('queued')->index();
            $table->string('provider_message_id')->nullable();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->string('error_code')->nullable();
            $table->timestamp('next_attempt_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
        });
        Schema::create('outbound_message_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outbound_message_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 80);
            $table->string('status', 30);
            $table->string('error_code')->nullable();
            $table->string('provider_message_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbound_message_attempts');
        Schema::dropIfExists('outbound_messages');
        Schema::dropIfExists('communication_preference_events');
        Schema::dropIfExists('communication_preferences');
    }
};
