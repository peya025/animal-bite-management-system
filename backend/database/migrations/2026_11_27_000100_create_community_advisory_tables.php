<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('community_advisories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->restrictOnDelete();
            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('state', 24)->default('draft');
            $table->string('title', 160);
            $table->text('body');
            $table->date('expires_on');
            $table->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('approved_hash', 64)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('withdrawn_at')->nullable();
            $table->timestamps();
            $table->index(['clinic_id', 'state', 'expires_on']);
        });
        Schema::create('community_advisory_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advisory_id')->constrained('community_advisories')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->string('action', 24);
            $table->text('reason')->nullable();
            // Immutable revision snapshot; never included in the public projection.
            $table->json('snapshot');
            $table->timestamp('created_at');
            $table->unique(['advisory_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_advisory_events');
        Schema::dropIfExists('community_advisories');
    }
};
