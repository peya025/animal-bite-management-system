<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_password_reset_tokens', function (Blueprint $table) {
            $table->foreignId('patient_account_id')->primary()->constrained('patient_accounts')->cascadeOnDelete();
            $table->string('token_hash', 64);
            $table->timestamp('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_password_reset_tokens');
    }
};
