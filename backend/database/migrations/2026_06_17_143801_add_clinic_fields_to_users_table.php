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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('clinic_id')->after('id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['admin', 'registration', 'triage', 'treatment'])->after('password');
            $table->boolean('is_active')->default(true)->after('role');
            $table->string('phone', 50)->nullable()->after('email');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['clinic_id']);
            $table->dropColumn(['clinic_id', 'role', 'is_active', 'phone', 'last_login_at']);
        });
    }
};
