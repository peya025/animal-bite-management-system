<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            $table->json('prophylaxis_orders')->nullable();
            $table->decimal('dose_iu', 10, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('treatment_records', function (Blueprint $table) {
            $table->dropColumn(['prophylaxis_orders', 'dose_iu']);
        });
    }
};
