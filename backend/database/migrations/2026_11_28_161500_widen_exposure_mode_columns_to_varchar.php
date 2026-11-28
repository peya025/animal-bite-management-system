<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            if (Schema::hasTable('tagoloan_treatment_cards') && Schema::hasColumn('tagoloan_treatment_cards', 'mode_of_exposure')) {
                DB::statement("ALTER TABLE tagoloan_treatment_cards MODIFY mode_of_exposure VARCHAR(120) NULL");
            }
            if (Schema::hasTable('bite_incident_intakes') && Schema::hasColumn('bite_incident_intakes', 'exposure_type')) {
                DB::statement("ALTER TABLE bite_incident_intakes MODIFY exposure_type VARCHAR(120) NULL");
            }
        }
    }

    public function down(): void
    {
        // Intentionally left non-destructive so custom clinic exposure keys are not truncated.
    }
};
