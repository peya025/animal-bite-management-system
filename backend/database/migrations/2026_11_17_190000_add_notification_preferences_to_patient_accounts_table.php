<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patient_accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('patient_accounts', 'notification_preferences')) {
                $table->json('notification_preferences')->nullable()->after('is_active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('patient_accounts', 'notification_preferences')) {
                $table->dropColumn('notification_preferences');
            }
        });
    }
};
