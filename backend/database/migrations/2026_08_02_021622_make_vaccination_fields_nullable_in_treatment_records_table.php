<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Make vaccination-specific fields nullable so Form 2 (general consultation)
     * can create records without vaccination protocol data.
     */
    public function up(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            // Make vaccination protocol fields nullable for general consultations
            $table->integer('dose_number')->nullable()->change();
            $table->date('scheduled_date')->nullable()->change();
            $table->foreignId('scheduled_by')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            // Revert to NOT NULL (this might fail if there are nullable records)
            $table->integer('dose_number')->nullable(false)->change();
            $table->date('scheduled_date')->nullable(false)->change();
            $table->foreignId('scheduled_by')->nullable(false)->change();
        });
    }
};
