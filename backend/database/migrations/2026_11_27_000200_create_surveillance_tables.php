<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('surveillance_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->restrictOnDelete();
            $table->date('cutoff');
            $table->string('rule_version');
            $table->string('fingerprint', 64);
            $table->json('summary');
            $table->timestamp('created_at');
            $table->unique(['clinic_id', 'cutoff', 'fingerprint'], 'surveillance_run_identity');
        });
        Schema::create('surveillance_signals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->restrictOnDelete();
            $table->string('geography_key', 64);
            $table->string('barangay');
            $table->string('municipality');
            $table->string('province');
            $table->string('priority');
            $table->string('state')->default('new');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('latest_run_id')->constrained('surveillance_runs')->restrictOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->restrictOnDelete();
            $table->json('metrics');
            $table->unsignedInteger('below_threshold_days')->default(0);
            $table->date('last_evaluated_cutoff');
            $table->timestamps();
            $table->unique(['clinic_id', 'geography_key']);
        });
        Schema::create('surveillance_signal_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('signal_id')->constrained('surveillance_signals')->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->string('action');
            $table->text('reason')->nullable();
            $table->json('snapshot');
            $table->timestamp('created_at');
            $table->unique(['signal_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surveillance_signal_events');
        Schema::dropIfExists('surveillance_signals');
        Schema::dropIfExists('surveillance_runs');
    }
};
