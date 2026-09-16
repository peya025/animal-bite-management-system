<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->text('contact_number')->nullable()->change();
            $table->text('address')->nullable()->change();
        });


        Schema::table('treatment_records', function (Blueprint $table): void {
            $table->text('administration_notes')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Encrypted values can exceed the original varchar size; retain text columns
        // rather than risking data truncation during rollback.
    }
};
