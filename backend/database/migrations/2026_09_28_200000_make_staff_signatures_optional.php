<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            $table->timestamp('signed_at')->nullable();
        });
        // These shipped placeholders were never staff signatures. Do not invent consent.
        $placeholders = ['signatures/default_nurse_signature.png', 'signatures/default_placeholder.png'];
        DB::table('users')->whereIn('signature_path', $placeholders)->update(['signature_path' => null]);
        DB::table('treatment_records')->whereIn('signature', $placeholders)->update(['signature' => null]);
    }

    public function down(): void
    {
        Schema::table('treatment_records', fn (Blueprint $table) => $table->dropColumn('signed_at'));
    }
};
