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
        if (!Schema::hasTable('clinic_schedules')) {
            Schema::create('clinic_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
                $table->unsignedTinyInteger('day_of_week')->comment('0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday');
                $table->boolean('is_open')->default(true);
                $table->time('open_time')->nullable()->default('08:00:00');
                $table->time('close_time')->nullable()->default('17:00:00');
                $table->integer('slot_interval_minutes')->default(30);
                $table->integer('max_patients_per_slot')->default(10);
                $table->timestamps();

                $table->unique(['clinic_id', 'day_of_week'], 'clinic_day_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_schedules');
    }
};
