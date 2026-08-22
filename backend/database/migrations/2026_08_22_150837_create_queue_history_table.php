<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('queue_id');
            $table->unsignedBigInteger('clinic_id');
            $table->unsignedBigInteger('patient_id');
            $table->string('action', 50);           // called, no_response, second_chance, final_recall, serving, completed, cancelled, absent
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->unsignedTinyInteger('call_count')->default(0);
            $table->unsignedBigInteger('performed_by')->nullable(); // user id
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at')->useCurrent();

            $table->foreign('queue_id')->references('queue_id')->on('queues')->onDelete('cascade');
            $table->index(['queue_id', 'occurred_at']);
            $table->index(['clinic_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_history');
    }
};
