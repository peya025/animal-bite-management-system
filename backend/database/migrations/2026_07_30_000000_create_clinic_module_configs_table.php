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
        Schema::create('clinic_module_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            $table->boolean('triage_module_enabled')->default(true);
            $table->json('field_rules')->nullable();
            $table->timestamps();

            $table->unique('clinic_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_module_configs');
    }
};
