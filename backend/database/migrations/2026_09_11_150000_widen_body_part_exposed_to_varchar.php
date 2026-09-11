<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('tagoloan_treatment_cards') && Schema::hasColumn('tagoloan_treatment_cards', 'body_part_exposed')) {
            DB::statement("ALTER TABLE tagoloan_treatment_cards MODIFY body_part_exposed VARCHAR(255) NULL");
        }

        if (Schema::hasTable('bite_incident_intakes') && Schema::hasColumn('bite_incident_intakes', 'body_part_exposed')) {
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY body_part_exposed VARCHAR(255) NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tagoloan_treatment_cards') && Schema::hasColumn('tagoloan_treatment_cards', 'body_part_exposed')) {
            DB::statement("ALTER TABLE tagoloan_treatment_cards MODIFY body_part_exposed ENUM('head_neck', 'other_parts', 'na_ingestion') NULL");
        }

        if (Schema::hasTable('bite_incident_intakes') && Schema::hasColumn('bite_incident_intakes', 'body_part_exposed')) {
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY body_part_exposed ENUM('head_neck', 'other_parts', 'na_ingestion') NULL");
        }
    }
};
