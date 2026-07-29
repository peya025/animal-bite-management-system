<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            
            // Health Information
            $table->string('blood_type', 10)->nullable();
            $table->string('mother_maiden_name')->nullable();
            $table->enum('civil_status', ['single','married','widowed','separated','annulled','cohabitation'])->nullable();
            $table->string('spouse_name')->nullable();
            
            // Address Breakdown (PSGC codes)
            $table->string('address_municipality')->nullable();
            $table->string('address_barangay')->nullable();
            $table->string('address_purok')->nullable();
            $table->string('province', 100)->default('Misamis Oriental');
            
            // Socioeconomic
            $table->string('educational_attainment', 50)->nullable();
            $table->string('employment_status', 50)->nullable();
            $table->string('family_member', 50)->nullable();
            
            // Government Programs
            $table->enum('philhealth_member', ['yes', 'no'])->nullable();
            $table->enum('philhealth_status', ['member', 'dependent'])->nullable();
            $table->string('philhealth_no', 50)->nullable();
            $table->string('philhealth_category', 50)->nullable();
            $table->enum('fourps_member', ['yes', 'no'])->nullable();
            $table->enum('dswd_nhts', ['yes', 'no'])->nullable();
            
            $table->timestamps();
            
            $table->unique('patient_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_details');
    }
};
