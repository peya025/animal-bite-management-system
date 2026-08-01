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
        Schema::table('treatment_records', function (Blueprint $table) {
            // CHU/RHU Personnel Fields
            $table->enum('mode_of_transaction', ['walk-in', 'visited', 'referral'])->default('walk-in')->after('patient_id');
            $table->string('referred_from', 255)->nullable()->after('mode_of_transaction');
            $table->string('referred_to', 255)->nullable()->after('referred_from');
            
            // Consultation Details
            $table->date('consultation_date')->nullable()->after('treatment_date');
            $table->time('consultation_time')->nullable()->after('consultation_date');
            $table->string('blood_pressure', 20)->nullable()->after('consultation_time');
            $table->string('temperature', 10)->nullable()->after('blood_pressure');
            $table->string('height', 10)->nullable()->after('temperature');
            $table->string('weight', 10)->nullable()->after('height');
            
            // Nature of Visit
            $table->enum('nature_of_visit', ['new_consultation', 'new_admission', 'follow_up'])->nullable()->after('weight');
            
            // Type of Consultation (stored as JSON array)
            $table->json('consultation_types')->nullable()->after('nature_of_visit');
            
            // Clinical Notes
            $table->text('chief_complaints')->nullable()->after('consultation_types');
            $table->text('diagnosis')->nullable()->after('chief_complaints');
            $table->text('medication_treatment')->nullable()->after('diagnosis');
            $table->string('provider_name', 255)->nullable()->after('medication_treatment');
            $table->text('laboratory_findings')->nullable()->after('provider_name');
            $table->string('performed_lab_test', 255)->nullable()->after('laboratory_findings');
            
            // Provider Details
            $table->string('attending_provider', 255)->nullable()->after('performed_lab_test');
            $table->string('referred_by', 255)->nullable()->after('attending_provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            $table->dropColumn([
                'mode_of_transaction',
                'referred_from',
                'referred_to',
                'consultation_date',
                'consultation_time',
                'blood_pressure',
                'temperature',
                'height',
                'weight',
                'nature_of_visit',
                'consultation_types',
                'chief_complaints',
                'diagnosis',
                'medication_treatment',
                'provider_name',
                'laboratory_findings',
                'performed_lab_test',
                'attending_provider',
                'referred_by',
            ]);
        });
    }
};
