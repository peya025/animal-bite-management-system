<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Migrate existing old values → Form 3 compatible values
        DB::statement("
            UPDATE bite_incident_intakes
            SET exposure_type = CASE
                WHEN exposure_type = 'bite'    THEN 'transdermal_bite'
                WHEN exposure_type = 'scratch' THEN 'scratch_abrasion'
                WHEN exposure_type = 'lick'    THEN 'nibbling_uncovered_skin'
                WHEN exposure_type = 'other'   THEN 'nibbling_broken_skin'
                ELSE exposure_type
            END
        ");

        // 2. Also add body_part_exposed and animal_type_others if missing
        Schema::table('bite_incident_intakes', function ($table) {
            if (!Schema::hasColumn('bite_incident_intakes', 'body_part_exposed')) {
                $table->enum('body_part_exposed', ['head_neck', 'other_parts', 'na_ingestion'])
                      ->nullable()
                      ->after('wound_location');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'animal_type_others')) {
                $table->string('animal_type_others', 255)->nullable()->after('animal_type');
            }
        });

        // 3. Widen the enum to Form 3 values
        DB::statement("
            ALTER TABLE bite_incident_intakes
            MODIFY exposure_type ENUM(
                'nibbling_uncovered_skin',
                'nibbling_broken_skin',
                'scratch_abrasion',
                'transdermal_bite',
                'handling_ingestion_raw_meat'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        DB::statement("
            UPDATE bite_incident_intakes
            SET exposure_type = CASE
                WHEN exposure_type = 'transdermal_bite'          THEN 'bite'
                WHEN exposure_type = 'scratch_abrasion'          THEN 'scratch'
                WHEN exposure_type = 'nibbling_uncovered_skin'   THEN 'lick'
                ELSE 'other'
            END
        ");

        DB::statement("
            ALTER TABLE bite_incident_intakes
            MODIFY exposure_type ENUM('bite','scratch','lick','other') NOT NULL
        ");

        Schema::table('bite_incident_intakes', function ($table) {
            if (Schema::hasColumn('bite_incident_intakes', 'body_part_exposed')) {
                $table->dropColumn('body_part_exposed');
            }
            if (Schema::hasColumn('bite_incident_intakes', 'animal_type_others')) {
                $table->dropColumn('animal_type_others');
            }
        });
    }
};
