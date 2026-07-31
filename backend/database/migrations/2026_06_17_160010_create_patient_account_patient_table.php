<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_account_patient', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_account_id')
                ->constrained('patient_accounts')
                ->cascadeOnDelete();
            $table->foreignId('patient_id')
                ->constrained('patients', 'patient_id')
                ->cascadeOnDelete();
            $table->enum('relationship', ['self', 'child', 'dependent']);
            $table->boolean('is_primary')->default(false);
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['patient_account_id', 'patient_id']);
            $table->index(['patient_id', 'status']);
            $table->index(['patient_account_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_account_patient');
    }
};
