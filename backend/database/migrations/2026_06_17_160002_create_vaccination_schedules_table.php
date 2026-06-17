<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccination_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->foreignId('bite_incident_id')->constrained('bite_incidents', 'bite_id')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            
            // WHO Protocol Schedule
            $table->enum('protocol_type', ['standard', 'accelerated', 'modified'])->default('standard');
            $table->integer('dose_number'); // 0, 3, 7, 14, 28 for standard
            $table->date('scheduled_date');
            $table->enum('status', ['scheduled', 'completed', 'missed', 'rescheduled'])->default('scheduled');
            
            // Vaccine Administration (when completed)
            $table->timestamp('administered_at')->nullable();
            $table->foreignId('administered_by')->nullable()->constrained('users', 'id')->nullOnDelete();
            $table->string('vaccine_brand')->nullable();
            $table->string('vaccine_batch_number')->nullable(); // Critical for recalls
            $table->date('vaccine_expiry_date')->nullable();
            $table->string('injection_site')->nullable(); // arm, thigh, etc.
            $table->decimal('dosage_ml', 5, 2)->nullable(); // e.g., 0.5ml, 1.0ml
            
            // Adverse Reactions
            $table->text('adverse_reaction')->nullable();
            $table->text('administration_notes')->nullable();
            
            // Tracking
            $table->foreignId('scheduled_by')->constrained('users', 'id'); // Triage/doctor who created schedule
            
            $table->timestamps();
            
            $table->index('scheduled_date');
            $table->index('status');
            $table->index(['clinic_id', 'scheduled_date', 'status']);
            $table->index(['patient_id', 'dose_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccination_schedules');
    }
};
