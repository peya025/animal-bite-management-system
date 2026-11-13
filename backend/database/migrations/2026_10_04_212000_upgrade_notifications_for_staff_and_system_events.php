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
        Schema::table('notifications', function (Blueprint $table) {
            $table->foreignId('patient_id')->nullable()->change();
            $table->foreignId('clinic_id')->nullable()->after('notification_id')->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->after('clinic_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 50)->nullable()->after('user_id');
            $table->string('category', 50)->default('system')->after('type');
            $table->string('title', 255)->nullable()->after('category');
            $table->string('action_url', 255)->nullable()->after('message');
            $table->json('data')->nullable()->after('action_url');
            $table->string('alert_key', 255)->nullable()->after('data');
            $table->boolean('is_active')->default(true)->after('alert_key');
            $table->timestamp('resolved_at')->nullable()->after('is_active');

            $table->index('clinic_id');
            $table->index('user_id');
            $table->index('role');
            $table->index('category');
            $table->index('alert_key');
            $table->index(['clinic_id', 'is_active']);
        });

        Schema::create('notification_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained('notifications', 'notification_id')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at')->useCurrent();
            $table->timestamps();

            $table->unique(['notification_id', 'user_id']);
            $table->index(['user_id', 'read_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_reads');

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['clinic_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn([
                'clinic_id',
                'user_id',
                'role',
                'category',
                'title',
                'action_url',
                'data',
                'alert_key',
                'is_active',
                'resolved_at',
            ]);
        });
    }
};
