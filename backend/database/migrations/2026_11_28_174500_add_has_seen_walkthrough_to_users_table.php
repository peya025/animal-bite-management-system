<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('has_seen_walkthrough')->default(false)->after('last_login_at');
        });

        // Existing users who have already logged in should not see the welcome walkthrough repeatedly.
        DB::table('users')
            ->whereNotNull('last_login_at')
            ->update(['has_seen_walkthrough' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('has_seen_walkthrough');
        });
    }
};
