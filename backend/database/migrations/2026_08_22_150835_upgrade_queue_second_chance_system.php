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
            // How many times this patient has been called
            $table->unsignedTinyInteger('call_count')->default(0)->after('consultation_notes');
            // Which recall stage: null = main queue, 'second_chance', 'final_recall'
            $table->string('recall_stage', 20)->nullable()->after('call_count');
            // Timestamps for each stage
            $table->timestamp('second_chance_at')->nullable()->after('recall_stage');
            $table->timestamp('final_recall_at')->nullable()->after('second_chance_at');
            $table->timestamp('absent_at')->nullable()->after('final_recall_at');
            $table->timestamp('serving_at')->nullable()->after('absent_at');
        });

        // Extend status enum
        DB::statement("ALTER TABLE queues MODIFY COLUMN status 
            ENUM('waiting','called','in_consultation','serving','completed','cancelled','no_response','second_chance','final_recall','absent') 
            NOT NULL DEFAULT 'waiting'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE queues MODIFY COLUMN status 
            ENUM('waiting','in_consultation','completed','cancelled','no_response') 
            NOT NULL DEFAULT 'waiting'");

        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn([
                'call_count', 'recall_stage',
                'second_chance_at', 'final_recall_at',
                'absent_at', 'serving_at',
            ]);
        });
    }
};
