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
        Schema::create('patient_device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_account_id')
                ->constrained('patient_accounts')
                ->onDelete('cascade');
            $table->string('fcm_token', 500)->unique();
            $table->string('device_id', 150)->nullable();
            $table->string('device_type', 50)->default('android'); // android, ios, web
            $table->string('device_name', 150)->nullable();
            $table->timestamp('last_used_at')->useCurrent();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['patient_account_id', 'device_type']);
            $table->index(['patient_account_id', 'device_id']);
            $table->index(['patient_account_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_device_tokens');
    }
};
