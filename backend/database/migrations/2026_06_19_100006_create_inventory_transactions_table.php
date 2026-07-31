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
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id('transaction_id');
            $table->foreignId('inventory_id')->constrained('vaccine_inventory', 'inventory_id')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('users', 'id')->cascadeOnDelete();
            
            $table->enum('transaction_type', ['received', 'used', 'adjusted', 'expired', 'disposed']); 
            $table->integer('quantity');
            $table->integer('quantity_received')->default(0);
            $table->string('received_from')->nullable();
            $table->integer('dispensed')->default(0);
            $table->integer('transferred')->default(0);
            $table->integer('expired')->default(0);
            $table->integer('balanced')->default(0);
            $table->dateTime('transaction_date');
            $table->string('reference_id')->nullable(); // treatment_id or purchase order
            $table->text('remarks')->nullable();
            
            $table->timestamps();
            
            $table->index('transaction_type');
            $table->index('transaction_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};
