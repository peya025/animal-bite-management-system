<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->string('queue_category', 30)
                  ->default('regular')
                  ->after('visit_type')
                  ->comment('regular, appointment, senior_citizen, pwd, pregnant, priority');

            // cancelled_at column (fix: cancel() was writing completed_at)
            $table->timestamp('cancelled_at')->nullable()->after('absent_at');
        });
    }

    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn(['queue_category', 'cancelled_at']);
        });
    }
};
