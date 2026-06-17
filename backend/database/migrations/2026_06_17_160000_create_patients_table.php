<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id('patient_id');
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            
            // Auto-generated patient number (P-2024-0001)
            $table->string('patient_number', 50)->unique();
            
            // Personal Information
            $table->string('name');
            $table->enum('gender', ['male', 'female']);
            $table->integer('age')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('address')->nullable();
            $table->string('contact_number')->nullable();
            
            // Emergency Contact
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_number')->nullable();
            
            // Registration tracking
            $table->foreignId('registered_by')->constrained('users', 'id');
            $table->timestamp('registration_date')->useCurrent();
            
            $table->timestamps();
            $table->softDeletes(); // For audit trail
            
            $table->index('patient_number');
            $table->index('name');
            $table->index(['clinic_id', 'patient_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
