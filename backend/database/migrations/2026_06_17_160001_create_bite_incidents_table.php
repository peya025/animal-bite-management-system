<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bite_incidents', function (Blueprint $table) {
            $table->id('bite_id');
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            
            // Auto-generated case number (BC-2024-0001)
            $table->string('case_number', 50)->unique();
            
            // Incident Details
            $table->date('bite_date');
            $table->string('bite_place')->nullable(); // Location of incident
            $table->boolean('site_washed')->default(false); // Critical WHO protocol
            
            // Exposure Classification
            $table->enum('exposure_type', ['bite', 'scratch', 'lick', 'other'])->default('bite');
            $table->string('victim_of_exposure')->nullable(); // Direct victim or exposed person
            $table->enum('severity', ['minor', 'moderate', 'severe'])->default('moderate');
            
            // Animal Information
            $table->string('animal_type')->nullable(); // dog, cat, etc.
            $table->enum('animal_status', ['owned', 'stray', 'unknown'])->default('unknown');
            $table->boolean('animal_captured')->default(false);
            $table->enum('animal_observation_status', ['healthy', 'sick', 'died', 'unknown'])->nullable();
            
            // Wound Details
            $table->string('site_number')->nullable(); // Body part identifier
            $table->text('wound_description')->nullable();
            $table->string('photo_path')->nullable(); // Document wound visually
            
            // Referral
            $table->string('referred_from')->nullable(); // If from another facility
            
            // Case Management
            $table->enum('status', ['active', 'completed', 'referred', 'abandoned'])->default('active');
            $table->text('remarks')->nullable();
            
            // Tracking
            $table->foreignId('created_by')->constrained('users', 'id'); // Triage/doctor staff
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('case_number');
            $table->index('bite_date');
            $table->index(['clinic_id', 'patient_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bite_incidents');
    }
};
