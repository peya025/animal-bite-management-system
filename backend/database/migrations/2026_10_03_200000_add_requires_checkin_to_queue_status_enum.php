<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE queues MODIFY COLUMN status 
                ENUM('waiting','called','in_consultation','serving','completed','cancelled','no_response','second_chance','final_recall','absent','requires_checkin') 
                NOT NULL DEFAULT 'waiting'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            // Convert any requires_checkin tickets to no_response before reverting enum
            DB::table('queues')->where('status', 'requires_checkin')->update(['status' => 'no_response']);

            DB::statement("ALTER TABLE queues MODIFY COLUMN status 
                ENUM('waiting','called','in_consultation','serving','completed','cancelled','no_response','second_chance','final_recall','absent') 
                NOT NULL DEFAULT 'waiting'");
        }
    }
};
