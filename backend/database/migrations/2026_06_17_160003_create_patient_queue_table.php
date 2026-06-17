<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->foreignId('bite_incident_id')->nullable()->constrained('bite_incidents', 'bite_id')->nullOnDelete();
            
            // Queue Management
            $table->integer('queue_number'); // Auto-generated daily: 1, 2, 3...
            $table->date('queue_date');
            $table->enum('visit_type', ['new_case', 'follow_up', 'vaccination', 'observation'])->default('new_case');
            $table->enum('priority', ['normal', 'urgent', 'emergency'])->default('normal');
            
            // Status Tracking
            $table->enum('status', ['waiting', 'in_consultation', 'completed', 'cancelled'])->default('waiting');
            
            // Timestamps for workflow
            $table->timestamp('checked_in_at')->useCurrent();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            // Staff Assignment
            $table->foreignId('checked_in_by')->constrained('users', 'id'); // Registration staff
            $table->foreignId('handled_by')->nullable()->constrained('users', 'id')->nullOnDelete(); // Triage/doctor
            
            // Notes
            $table->text('check_in_notes')->nullable();
            $table->text('consultation_notes')->nullable();
            
            $table->timestamps();
            
            // Ensure unique queue number per day per clinic
            $table->unique(['clinic_id', 'queue_date', 'queue_number'], 'unique_daily_queue');
            $table->index(['queue_date', 'status']);
            $table->index(['clinic_id', 'queue_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_queue');
    }
};
