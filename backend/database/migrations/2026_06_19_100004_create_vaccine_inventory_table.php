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
        Schema::create('vaccine_inventory', function (Blueprint $table) {
            $table->id('inventory_id');
            $table->foreignId('clinic_id')->constrained('clinics', 'id')->cascadeOnDelete();
            
            $table->string('vaccine_type'); // Anti-rabies, Tetanus, etc.
            $table->string('batch_number');
            $table->integer('current_quantity')->default(0);
            $table->date('expiration_date')->nullable();
            $table->enum('status', ['active', 'expired', 'depleted', 'deleted'])->default('active');
            
            $table->timestamps();
            
            $table->index('vaccine_type');
            $table->index('batch_number');
            $table->index('expiration_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vaccine_inventory');
    }
};
