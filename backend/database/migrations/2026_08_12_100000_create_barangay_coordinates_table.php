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
        Schema::create('barangay_coordinates', function (Blueprint $table) {
            $table->id();
            $table->string('barangay');
            $table->string('municipality');
            $table->string('province')->default('Misamis Oriental');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('source')->default('manual'); // 'manual', 'nominatim', 'google'
            $table->timestamps();
            
            // Indexes for fast lookup
            $table->index(['barangay', 'municipality']);
            $table->index('municipality');
            
            // Prevent duplicates
            $table->unique(['barangay', 'municipality', 'province']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barangay_coordinates');
    }
};
