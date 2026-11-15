<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_encounters', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id');
            $table->unsignedBigInteger('patient_id');
            $table->string('encounter_type', 32); // new_patient, new_exposure, intake_checkin, returning_checkin
            $table->unsignedBigInteger('bite_id')->nullable();
            $table->unsignedBigInteger('intake_id')->nullable();
            $table->unsignedBigInteger('appointment_id')->nullable();
            $table->string('status', 32)->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('clinic_id')->references('id')->on('clinics')->cascadeOnDelete();
            $table->foreign('patient_id')->references('patient_id')->on('patients')->cascadeOnDelete();
            $table->foreign('bite_id')->references('bite_id')->on('bite_incidents')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['clinic_id', 'patient_id']);
            $table->index('bite_id');
        });

        Schema::create('registration_fees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('encounter_id');
            $table->string('currency', 3)->default('PHP');
            $table->bigInteger('total_cents')->default(0);
            $table->bigInteger('amount_paid_cents')->default(0);
            $table->bigInteger('balance_cents')->default(0);
            $table->string('status', 32)->default('not_recorded'); // no_fee, unpaid, partially_paid, paid, not_recorded
            $table->boolean('is_complete')->default(false);
            $table->boolean('no_additional_fees')->default(false);
            $table->text('notes')->nullable();
            $table->json('config_snapshot')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('clinic_id')->references('id')->on('clinics')->cascadeOnDelete();
            $table->foreign('patient_id')->references('patient_id')->on('patients')->cascadeOnDelete();
            $table->foreign('encounter_id')->references('id')->on('registration_encounters')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['clinic_id', 'encounter_id']);
            $table->index(['clinic_id', 'patient_id']);
        });

        Schema::create('registration_fee_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('registration_fee_id');
            $table->unsignedBigInteger('clinic_id');
            $table->string('fee_type', 32); // rig, anti_rabies, additional
            $table->string('label', 128);
            $table->string('disposition', 32)->default('recorded'); // recorded, not_applicable, pending_assessment
            $table->bigInteger('amount_cents')->nullable();
            $table->string('reason', 255)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('registration_fee_id')->references('id')->on('registration_fees')->cascadeOnDelete();
            $table->foreign('clinic_id')->references('id')->on('clinics')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['registration_fee_id', 'fee_type']);
        });

        Schema::create('registration_fee_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('registration_fee_id');
            $table->unsignedBigInteger('clinic_id');
            $table->bigInteger('amount_cents');
            $table->string('payment_method', 32); // cash, other
            $table->string('payment_method_details', 255)->nullable();
            $table->string('reference_number', 128)->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 64)->nullable();
            $table->boolean('is_voided')->default(false);
            $table->timestamp('voided_at')->nullable();
            $table->unsignedBigInteger('voided_by')->nullable();
            $table->string('void_reason', 255)->nullable();
            $table->timestamp('collected_at')->useCurrent();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->foreign('registration_fee_id')->references('id')->on('registration_fees')->cascadeOnDelete();
            $table->foreign('clinic_id')->references('id')->on('clinics')->cascadeOnDelete();
            $table->foreign('voided_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('recorded_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['clinic_id', 'idempotency_key']);
            $table->index('registration_fee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_fee_payments');
        Schema::dropIfExists('registration_fee_items');
        Schema::dropIfExists('registration_fees');
        Schema::dropIfExists('registration_encounters');
    }
};
