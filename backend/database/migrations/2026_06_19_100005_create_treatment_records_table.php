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
        Schema::create('treatment_records', function (Blueprint $table) {
            $table->id('treatment_id');
            
            // Foreign Keys
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->foreignId('bite_id')->nullable()->constrained('bite_incidents', 'bite_id')->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments', 'appointment_id')->nullOnDelete();
            $table->foreignId('inventory_id')->nullable()->constrained('vaccine_inventory', 'inventory_id')->nullOnDelete();
            
            // WHO Protocol Schedule (merged from vaccination_schedules)
            $table->enum('protocol_type', ['standard', 'accelerated', 'modified'])->default('standard');
            $table->integer('dose_number'); // 0, 3, 7, 14, 28 for standard
            $table->date('scheduled_date'); // When this dose is scheduled
            
            // Treatment Details
            $table->dateTime('treatment_date')->nullable(); // When actually administered (if completed)
            $table->string('route')->nullable(); // IM, SC, ID
            $table->string('injection_site')->nullable(); // arm, thigh, etc.
            $table->decimal('dosage_ml', 5, 2)->nullable(); // e.g., 0.5ml, 1.0ml
            
            // Vaccine Information
            $table->string('vaccine_brand')->nullable();
            $table->string('vaccine_generic')->nullable();
            $table->string('batch_no')->nullable();
            $table->date('expiration_date')->nullable();
            
            // Additional Treatment
            $table->string('tt_status')->nullable(); // Tetanus toxoid status
            $table->text('medication_given')->nullable();
            
            // Administration Details
            $table->foreignId('administered_by')->nullable()->constrained('users', 'id')->nullOnDelete();
            $table->timestamp('administered_at')->nullable();
            
            // Adverse Reactions & Notes
            $table->text('adverse_reaction')->nullable();
            $table->text('remarks')->nullable();
            $table->text('administration_notes')->nullable();
            
            // Financial & Legal
            $table->string('cost_recovery')->nullable();
            $table->string('signature')->nullable();
            
            // Outcome & Status
            $table->string('outcome')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'])->default('scheduled');
            
            // Tracking
            $table->foreignId('scheduled_by')->constrained('users', 'id'); // Triage/doctor who created schedule
            
            $table->timestamps();
            
            // Indexes
            $table->index('treatment_date');
            $table->index('scheduled_date');
            $table->index('status');
            $table->index(['clinic_id', 'scheduled_date', 'status']);
            $table->index(['patient_id', 'dose_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treatment_records');
    }
};
