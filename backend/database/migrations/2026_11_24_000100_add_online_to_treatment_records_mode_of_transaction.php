<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('treatment_records') || !Schema::hasColumn('treatment_records', 'mode_of_transaction')) {
            return;
        }

        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement(
                "ALTER TABLE `treatment_records` MODIFY COLUMN `mode_of_transaction` ENUM('walk-in', 'visited', 'referral', 'online') NOT NULL DEFAULT 'walk-in'"
            );
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE treatment_records DROP CONSTRAINT IF EXISTS treatment_records_mode_of_transaction_check');
            DB::statement(
                "ALTER TABLE treatment_records ADD CONSTRAINT treatment_records_mode_of_transaction_check CHECK (mode_of_transaction IN ('walk-in', 'visited', 'referral', 'online'))"
            );
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('treatment_records') || !Schema::hasColumn('treatment_records', 'mode_of_transaction')) {
            return;
        }

        DB::table('treatment_records')
            ->where('mode_of_transaction', 'online')
            ->update(['mode_of_transaction' => 'walk-in']);

        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement(
                "ALTER TABLE `treatment_records` MODIFY COLUMN `mode_of_transaction` ENUM('walk-in', 'visited', 'referral') NOT NULL DEFAULT 'walk-in'"
            );
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE treatment_records DROP CONSTRAINT IF EXISTS treatment_records_mode_of_transaction_check');
            DB::statement(
                "ALTER TABLE treatment_records ADD CONSTRAINT treatment_records_mode_of_transaction_check CHECK (mode_of_transaction IN ('walk-in', 'visited', 'referral'))"
            );
        }
    }
};
