<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bite_incident_intakes', function (Blueprint $table) {
            $table->id('intake_id');
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients', 'patient_id')->cascadeOnDelete();
            $table->foreignId('patient_account_id')->constrained('patient_accounts')->cascadeOnDelete();
            $table->foreignId('appointment_id')->unique()->constrained('appointments', 'appointment_id')->cascadeOnDelete();

            $table->date('bite_date');
            $table->string('bite_place')->nullable();
            $table->boolean('site_washed');
            $table->enum('exposure_type', ['bite', 'scratch', 'lick', 'other']);
            $table->string('animal_type', 100);
            $table->enum('animal_status', ['owned', 'stray', 'unknown']);
            $table->boolean('animal_captured')->default(false);
            $table->string('wound_location')->nullable();
            $table->text('patient_description')->nullable();

            $table->enum('status', ['pending', 'reviewed', 'converted'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('bite_id')->nullable()->constrained('bite_incidents', 'bite_id')->nullOnDelete();
            $table->timestamps();

            $table->index(['clinic_id', 'status', 'created_at']);
            $table->index(['patient_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bite_incident_intakes');
    }
};
