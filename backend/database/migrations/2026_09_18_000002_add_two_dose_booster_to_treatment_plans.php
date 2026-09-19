<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The existing Doctor/Form 2 UI already offers a two-dose booster plan.
     * Keep the stored treatment plan vocabulary aligned with that existing
     * option; this does not introduce a new clinical field.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE treatment_plans MODIFY COLUMN plan_type
                ENUM('full_pep', 'single_booster', 'two_dose_booster', 'continue_existing_schedule', 'no_vaccine') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('treatment_plans')
                ->where('plan_type', 'two_dose_booster')
                ->update(['plan_type' => 'single_booster']);

            DB::statement("ALTER TABLE treatment_plans MODIFY COLUMN plan_type
                ENUM('full_pep', 'single_booster', 'continue_existing_schedule', 'no_vaccine') NOT NULL");
        }
    }
};
