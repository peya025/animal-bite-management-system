<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treatment_plans', function (Blueprint $table) {
            $table->id('treatment_plan_id');
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('bite_id')->unique()->constrained('bite_incidents', 'bite_id')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->enum('plan_type', [
                'full_pep',
                'single_booster',
                'continue_existing_schedule',
                'no_vaccine',
            ]);
            $table->enum('status', ['pending', 'approved', 'completed', 'cancelled'])->default('pending');
            $table->json('ordered_dose_days')->nullable();
            $table->text('doctor_decision_notes')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('continued_from_bite_id')
                ->nullable()
                ->constrained('bite_incidents', 'bite_id')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['clinic_id', 'patient_id', 'status'], 'treatment_plan_patient_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_plans');
    }
};
