<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            // Add no_response status support
            $table->timestamp('no_response_at')->nullable()->after('completed_at');

            // Add soft-delete (trash bin) support
            $table->timestamp('deleted_at')->nullable()->after('no_response_at');
        });

        // Extend the status enum to include no_response
        DB::statement("ALTER TABLE queues MODIFY COLUMN status ENUM('waiting','in_consultation','completed','cancelled','no_response') NOT NULL DEFAULT 'waiting'");
    }

    public function down(): void
    {
        // Revert status enum
        DB::statement("ALTER TABLE queues MODIFY COLUMN status ENUM('waiting','in_consultation','completed','cancelled') NOT NULL DEFAULT 'waiting'");

        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn(['no_response_at', 'deleted_at']);
        });
    }
};
