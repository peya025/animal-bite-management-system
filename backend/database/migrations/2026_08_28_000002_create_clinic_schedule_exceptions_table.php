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
        if (!Schema::hasTable('clinic_schedule_exceptions')) {
            Schema::create('clinic_schedule_exceptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
                $table->date('exception_date');
                $table->boolean('is_open')->default(false)->comment('false=Special Closure/Holiday, true=Special Extra Open Day');
                $table->time('open_time')->nullable();
                $table->time('close_time')->nullable();
                $table->string('reason', 255)->comment('e.g. Christmas Day, Typhoon Signal #3, Special Weekend Clinic');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(['clinic_id', 'exception_date'], 'clinic_exception_date_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_schedule_exceptions');
    }
};
