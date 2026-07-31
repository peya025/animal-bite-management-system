<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('clinic_id')->nullable()->constrained()->nullOnDelete();
            
            // Action details
            $table->string('action'); // 'created', 'updated', 'deleted', 'viewed', 'login', 'logout'
            $table->string('model')->nullable(); // 'Patient', 'User', 'BiteCase', etc.
            $table->unsignedBigInteger('model_id')->nullable(); // ID of the affected record
            
            // Request information
            $table->string('ip_address', 45);
            $table->string('user_agent')->nullable();
            $table->string('url')->nullable();
            $table->string('method', 10)->nullable(); // GET, POST, PUT, DELETE
            
            // Changes tracking
            $table->json('old_values')->nullable(); // Before changes
            $table->json('new_values')->nullable(); // After changes
            
            // Additional context
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // Extra info (location, device, etc.)
            
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index('user_id');
            $table->index('clinic_id');
            $table->index('action');
            $table->index('model');
            $table->index('ip_address');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
