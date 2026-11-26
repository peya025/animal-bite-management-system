<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('community_advisory_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advisory_id')->constrained('community_advisories')->restrictOnDelete();
            $table->unsignedInteger('advisory_version');
            $table->foreignId('patient_account_id')->constrained('patient_accounts')->restrictOnDelete();
            $table->string('channel', 24)->default('fcm');
            $table->string('delivery_purpose', 32)->default('initial_publication');
            $table->string('status', 32)->default('queued');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('next_attempt_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('provider_message_id', 191)->nullable();
            $table->string('error_class', 120)->nullable();
            $table->string('cancellation_reason', 255)->nullable();
            $table->timestamps();

            $table->unique(
                ['advisory_id', 'advisory_version', 'patient_account_id', 'channel', 'delivery_purpose'],
                'cad_unique_logical_delivery'
            );
            $table->index(['status', 'next_attempt_at'], 'cad_status_next_attempt_idx');
            $table->index(['patient_account_id', 'status', 'sent_at'], 'cad_account_caps_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_advisory_deliveries');
    }
};
