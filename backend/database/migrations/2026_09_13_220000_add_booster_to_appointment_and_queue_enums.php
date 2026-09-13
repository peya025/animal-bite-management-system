<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `appointments` MODIFY `appointment_type` ENUM('follow_up_vaccination', 'consultation', 'checkup', 'vaccination', 'booster') NOT NULL DEFAULT 'follow_up_vaccination'");
            DB::statement("ALTER TABLE `queues` MODIFY `visit_type` ENUM('new_case', 'follow_up', 'vaccination', 'observation', 'booster') NOT NULL DEFAULT 'new_case'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `appointments` MODIFY `appointment_type` ENUM('follow_up_vaccination', 'consultation', 'checkup', 'vaccination') NOT NULL DEFAULT 'follow_up_vaccination'");
            DB::statement("ALTER TABLE `queues` MODIFY `visit_type` ENUM('new_case', 'follow_up', 'vaccination', 'observation') NOT NULL DEFAULT 'new_case'");
        }
    }
};
