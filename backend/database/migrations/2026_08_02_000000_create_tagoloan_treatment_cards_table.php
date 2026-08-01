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
        // 1. Add Clinic Accreditation columns if not present
        if (!Schema::hasColumn('clinics', 'doh_accreditation_no')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->string('doh_accreditation_no')->default('2022-10-037')->after('license_number');
                $table->string('philhealth_accreditation_no')->default('B10034377')->after('doh_accreditation_no');
            });
        }

        // 2. Add Hospital No to patient_details if not present
        if (!Schema::hasColumn('patient_details', 'hospital_no')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->string('hospital_no')->nullable()->after('patient_id');
            });
        }

        // 3. Create 3NF Normalized tagoloan_treatment_cards table
        Schema::create('tagoloan_treatment_cards', function (Blueprint $table) {
            $table->id('card_id');

            // Foreign Key Relationships
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->foreignId('bite_id')->nullable()->constrained('bite_incidents', 'bite_id')->cascadeOnDelete();

            // Header Form Metadata
            $table->date('card_date');
            $table->string('registry_no')->nullable();
            $table->string('hospital_no')->nullable();
            $table->string('referred_by')->nullable();

            // Exposure Classification & Mode (Tagoloan Form Section 1 & 2)
            $table->enum('exposure_category', ['I', 'II', 'III'])->nullable();
            $table->enum('mode_of_exposure', [
                'nibbling_uncovered_skin',
                'nibbling_broken_skin',
                'scratch_abrasion',
                'transdermal_bite',
                'handling_ingestion_raw_meat'
            ])->nullable();
            $table->enum('body_part_exposed', ['head_neck', 'other_parts', 'na_ingestion'])->nullable();

            // Animal Details & Medical History (Section 3 & 4)
            $table->string('animal_type')->default('dog');
            $table->string('animal_type_others')->nullable();
            $table->boolean('past_bite_history')->default(false);
            $table->string('past_bite_dates')->nullable();
            $table->boolean('past_pep_completed')->default(false);

            // Diagnostics Code
            $table->string('icd10_code')->nullable();

            // Staff Auditor Tracking
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();

            $table->timestamps();

            // Indexes
            $table->index(['clinic_id', 'patient_id']);
            $table->index('registry_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tagoloan_treatment_cards');

        if (Schema::hasColumn('patient_details', 'hospital_no')) {
            Schema::table('patient_details', function (Blueprint $table) {
                $table->dropColumn('hospital_no');
            });
        }

        if (Schema::hasColumn('clinics', 'doh_accreditation_no')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->dropColumn(['doh_accreditation_no', 'philhealth_accreditation_no']);
            });
        }
    }
};
