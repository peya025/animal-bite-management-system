<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE bite_incidents MODIFY COLUMN episode_type
                ENUM('primary', 're_exposure', 'pending_assessment')
                NOT NULL DEFAULT 'primary'"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('bite_incidents')
                ->where('episode_type', 'pending_assessment')
                ->update(['episode_type' => 'primary']);

            DB::statement(
                "ALTER TABLE bite_incidents MODIFY COLUMN episode_type
                ENUM('primary', 're_exposure')
                NOT NULL DEFAULT 'primary'"
            );
        }
    }
};
