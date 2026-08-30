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
        // 1. Add recall and channel metadata to appointments table
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'booking_channel')) {
                $table->enum('booking_channel', ['walk_in', 'online_mobile'])
                    ->default('walk_in')
                    ->after('appointment_type');
            }
            if (!Schema::hasColumn('appointments', 'missed_at')) {
                $table->timestamp('missed_at')
                    ->nullable()
                    ->default(null)
                    ->after('status');
            }
            if (!Schema::hasColumn('appointments', 'reminder_sent_count')) {
                $table->unsignedInteger('reminder_sent_count')
                    ->default(0)
                    ->after('missed_at');
            }
            if (!Schema::hasColumn('appointments', 'last_reminded_at')) {
                $table->timestamp('last_reminded_at')
                    ->nullable()
                    ->default(null)
                    ->after('reminder_sent_count');
            }
        });

        // 2. Create appointment_reminders table for SMS/Email/In-App audit logging
        if (!Schema::hasTable('appointment_reminders')) {
            Schema::create('appointment_reminders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('clinic_id')->default(1);
                $table->unsignedBigInteger('appointment_id');
                $table->unsignedBigInteger('patient_id');
                $table->enum('channel', ['sms', 'email', 'in_app']);
                $table->string('recipient', 255)->comment('Target phone, email address, or patient account ID');
                $table->string('subject', 255)->nullable();
                $table->text('message');
                $table->enum('status', ['sent', 'failed', 'pending'])->default('sent');
                $table->string('error_details', 500)->nullable();
                $table->unsignedBigInteger('sent_by_user_id')->nullable()->comment('Staff user ID who triggered recall, NULL if system automated');
                $table->timestamps();

                $table->foreign('appointment_id')->references('appointment_id')->on('appointments')->onDelete('cascade');
                $table->foreign('patient_id')->references('patient_id')->on('patients')->onDelete('cascade');

                $table->index(['appointment_id']);
                $table->index(['patient_id']);
                $table->index(['channel', 'status']);
                $table->index(['clinic_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_reminders');

        Schema::table('appointments', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('appointments', 'booking_channel')) $cols[] = 'booking_channel';
            if (Schema::hasColumn('appointments', 'missed_at')) $cols[] = 'missed_at';
            if (Schema::hasColumn('appointments', 'reminder_sent_count')) $cols[] = 'reminder_sent_count';
            if (Schema::hasColumn('appointments', 'last_reminded_at')) $cols[] = 'last_reminded_at';

            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
