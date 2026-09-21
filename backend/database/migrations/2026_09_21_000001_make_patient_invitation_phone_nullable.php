<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_invitations', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::table('patient_invitations')->whereNull('phone')->exists()) {
            throw new \RuntimeException('Cannot restore required phones while email-only invitations exist.');
        }
        Schema::table('patient_invitations', function (Blueprint $table) {
            $table->string('phone', 50)->nullable(false)->change();
        });
    }
};