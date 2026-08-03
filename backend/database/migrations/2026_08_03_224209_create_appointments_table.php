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
            $table->unsignedBigInteger('clinic_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('bite_id')->nullable();
            $table->date('appointment_date');
            $table->time('appointment_time')->default('08:00:00');
            $table->enum('appointment_type', ['follow_up_vaccination', 'consultation', 'checkup'])->default('follow_up_vaccination');
            $table->integer('dose_number')->nullable()->comment('For vaccinations: 3, 7, 28, 90, 365');
            $table->enum('status', ['scheduled', 'confirmed', 'completed', 'missed', 'cancelled'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->foreign('clinic_id')->references('id')->on('clinics')->onDelete('cascade');
            $table->foreign('patient_id')->references('patient_id')->on('patients')->onDelete('cascade');
            $table->foreign('bite_id')->references('bite_id')->on('bite_incidents')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');

            $table->index('appointment_date');
            $table->index('status');
            $table->index(['patient_id', 'appointment_date']);
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
