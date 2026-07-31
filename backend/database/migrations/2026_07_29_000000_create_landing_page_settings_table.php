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
        Schema::create('landing_page_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('app_short_name')->default('TABTA');
            $table->string('app_full_name')->default('TAGOLOAN ANIMAL BITE TREATMENT CENTER');
            $table->string('abtc_brand_title')->default('ABTC');
            $table->text('abtc_description')->default('Animal Bite Management & Monitoring System');
            $table->string('developed_for_text')->default('Developed for Animal Bite Treatment Center');
            $table->json('quick_links')->nullable();
            $table->json('support_links')->nullable();
            $table->json('system_info_links')->nullable();
            $table->string('operating_schedule')->default('SCHEDULE: MONDAYS & THURSDAYS');
            $table->string('operating_hours')->default('8:00 AM – 5:00 PM');
            $table->string('registration_window')->default('8:00 AM – 10:00 AM (Come Early!)');
            $table->string('requirement_notice')->default('Please bring updated PhilHealth MDR');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landing_page_settings');
    }
};
