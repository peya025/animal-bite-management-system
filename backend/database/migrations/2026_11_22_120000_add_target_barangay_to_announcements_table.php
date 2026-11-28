<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('announcements') && !Schema::hasColumn('announcements', 'target_barangay')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->string('target_barangay', 120)->nullable()->after('is_urgent');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('announcements') && Schema::hasColumn('announcements', 'target_barangay')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->dropColumn('target_barangay');
            });
        }
    }
};
