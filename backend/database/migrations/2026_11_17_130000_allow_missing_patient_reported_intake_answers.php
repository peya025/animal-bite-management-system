<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY bite_date DATE NULL');
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY site_washed TINYINT(1) NULL DEFAULT NULL');
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY exposure_type ENUM('nibbling_uncovered_skin','nibbling_broken_skin','scratch_abrasion','transdermal_bite','handling_ingestion_raw_meat','unsure') NULL DEFAULT NULL");
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY animal_type VARCHAR(100) NULL');
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY animal_status ENUM('owned','stray','unknown') NULL DEFAULT NULL");
            return;
        }

        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            $table->date('bite_date')->nullable()->change();
            $table->boolean('site_washed')->nullable()->default(null)->change();
            $table->string('exposure_type')->nullable()->default(null)->change();
            $table->string('animal_type', 100)->nullable()->change();
            $table->string('animal_status')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        if (DB::table('bite_incident_intakes')->whereNull('bite_date')->orWhereNull('site_washed')
            ->orWhereNull('exposure_type')->orWhereNull('animal_type')->orWhereNull('animal_status')->exists()) {
            throw new RuntimeException('Cannot restore required intake columns while patient-reported answers are missing.');
        }
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY bite_date DATE NOT NULL');
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY site_washed TINYINT(1) NOT NULL');
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY exposure_type ENUM('nibbling_uncovered_skin','nibbling_broken_skin','scratch_abrasion','transdermal_bite','handling_ingestion_raw_meat','unsure') NOT NULL");
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY animal_type VARCHAR(100) NOT NULL');
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY animal_status ENUM('owned','stray','unknown') NOT NULL");
            return;
        }
        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            $table->date('bite_date')->nullable(false)->change();
            $table->boolean('site_washed')->nullable(false)->change();
            $table->string('exposure_type')->nullable(false)->change();
            $table->string('animal_type', 100)->nullable(false)->change();
            $table->string('animal_status')->nullable(false)->change();
        });
    }
};
