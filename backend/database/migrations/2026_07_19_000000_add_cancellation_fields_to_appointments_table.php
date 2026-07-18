<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->text('cancellation_reason')->nullable()->after('status');
            $table->timestamp('cancelled_at')->nullable()->after('cancellation_reason');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['cancellation_reason', 'cancelled_at']);
        });
    }
};
