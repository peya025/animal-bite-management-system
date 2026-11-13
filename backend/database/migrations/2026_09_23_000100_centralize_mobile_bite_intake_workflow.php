<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            $table->time('incident_time')->nullable()->after('bite_date');
            $table->string('laterality', 20)->nullable()->after('body_part_exposed');
            $table->string('wash_method', 50)->nullable()->after('site_washed');
            $table->unsignedSmallInteger('wash_duration_minutes')->nullable()->after('wash_method');
            $table->boolean('animal_available')->nullable()->after('animal_captured');
            $table->string('animal_condition_reported', 30)->nullable()->after('animal_available');
            $table->text('care_received')->nullable()->after('patient_description');
            $table->string('referral_facility')->nullable()->after('care_received');
            $table->string('prior_rabies_vaccination', 20)->nullable()->after('referral_facility');
            $table->date('prior_vaccination_date')->nullable()->after('prior_rabies_vaccination');
            $table->string('prior_vaccination_facility')->nullable()->after('prior_vaccination_date');
            $table->timestamp('submitted_at')->nullable()->after('status');
            $table->foreignId('checked_in_by')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('checked_in_at')->nullable()->after('checked_in_by');
            $table->foreignId('clinically_reviewed_by')->nullable()->after('checked_in_at')->constrained('users')->nullOnDelete();
            $table->timestamp('clinically_reviewed_at')->nullable()->after('clinically_reviewed_by');
        });

        Schema::table('bite_incidents', function (Blueprint $table) {
            $table->string('exposure_mode', 80)->nullable()->after('exposure_type');
            $table->string('body_part_exposed')->nullable()->after('site_number');
            $table->string('laterality', 20)->nullable()->after('body_part_exposed');
            $table->boolean('animal_available')->nullable()->after('animal_captured');
            $table->foreignId('confirmed_by')->nullable()->after('remarks')->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
        });

        if (DB::getDriverName() !== 'mysql') {
            Schema::table('tagoloan_treatment_cards', function (Blueprint $table) {
                $table->string('body_part_exposed')->nullable()->change();
            });
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY animal_captured TINYINT(1) NULL DEFAULT NULL');
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY exposure_type ENUM('nibbling_uncovered_skin','nibbling_broken_skin','scratch_abrasion','transdermal_bite','handling_ingestion_raw_meat','unsure') NOT NULL");
            DB::statement("ALTER TABLE bite_incidents MODIFY exposure_type ENUM('unassessed','bite','scratch','lick','other') NOT NULL DEFAULT 'unassessed'");
            DB::statement("ALTER TABLE bite_incidents MODIFY severity ENUM('unassessed','minor','moderate','severe') NOT NULL DEFAULT 'unassessed'");
            DB::statement("ALTER TABLE bite_incidents MODIFY animal_status ENUM('unassessed','owned','stray','unknown') NOT NULL DEFAULT 'unassessed'");
            DB::statement('ALTER TABLE bite_incidents MODIFY site_washed TINYINT(1) NULL DEFAULT NULL');
            DB::statement('ALTER TABLE bite_incidents MODIFY animal_captured TINYINT(1) NULL DEFAULT NULL');
            DB::statement('ALTER TABLE bite_incidents MODIFY is_previously_vaccinated TINYINT(1) NULL DEFAULT NULL');
        } else {
            Schema::table('bite_incident_intakes', function (Blueprint $table) {
                $table->boolean('animal_captured')->nullable()->default(null)->change();
            });
            Schema::table('bite_incidents', function (Blueprint $table) {
                $table->string('exposure_type')->default('unassessed')->change();
                $table->string('severity')->default('unassessed')->change();
                $table->string('animal_status')->default('unassessed')->change();
                $table->boolean('site_washed')->nullable()->default(null)->change();
                $table->boolean('animal_captured')->nullable()->default(null)->change();
                $table->boolean('is_previously_vaccinated')->nullable()->default(null)->change();
            });
        }

        DB::table('bite_incident_intakes')
            ->whereNull('submitted_at')
            ->update(['submitted_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            DB::table('tagoloan_treatment_cards')
                ->whereNotIn('body_part_exposed', ['head_neck', 'other_parts', 'na_ingestion'])
                ->update(['body_part_exposed' => 'other_parts']);
            Schema::table('tagoloan_treatment_cards', function (Blueprint $table) {
                $table->enum('body_part_exposed', ['head_neck', 'other_parts', 'na_ingestion'])->nullable()->change();
            });
        }

        DB::table('bite_incident_intakes')->where('exposure_type', 'unsure')->update(['exposure_type' => 'nibbling_broken_skin']);
        DB::table('bite_incident_intakes')->whereNull('animal_captured')->update(['animal_captured' => false]);
        DB::table('bite_incidents')->where('exposure_type', 'unassessed')->update(['exposure_type' => 'bite']);
        DB::table('bite_incidents')->where('severity', 'unassessed')->update(['severity' => 'moderate']);
        DB::table('bite_incidents')->where('animal_status', 'unassessed')->update(['animal_status' => 'unknown']);
        DB::table('bite_incidents')->whereNull('site_washed')->update(['site_washed' => false]);
        DB::table('bite_incidents')->whereNull('animal_captured')->update(['animal_captured' => false]);
        DB::table('bite_incidents')->whereNull('is_previously_vaccinated')->update(['is_previously_vaccinated' => false]);

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bite_incident_intakes MODIFY animal_captured TINYINT(1) NOT NULL DEFAULT 0');
            DB::statement("ALTER TABLE bite_incident_intakes MODIFY exposure_type ENUM('nibbling_uncovered_skin','nibbling_broken_skin','scratch_abrasion','transdermal_bite','handling_ingestion_raw_meat') NOT NULL");
            DB::statement("ALTER TABLE bite_incidents MODIFY exposure_type ENUM('bite','scratch','lick','other') NOT NULL DEFAULT 'bite'");
            DB::statement("ALTER TABLE bite_incidents MODIFY severity ENUM('minor','moderate','severe') NOT NULL DEFAULT 'moderate'");
            DB::statement("ALTER TABLE bite_incidents MODIFY animal_status ENUM('owned','stray','unknown') NOT NULL DEFAULT 'unknown'");
            DB::statement('ALTER TABLE bite_incidents MODIFY site_washed TINYINT(1) NOT NULL DEFAULT 0');
            DB::statement('ALTER TABLE bite_incidents MODIFY animal_captured TINYINT(1) NOT NULL DEFAULT 0');
            DB::statement('ALTER TABLE bite_incidents MODIFY is_previously_vaccinated TINYINT(1) NOT NULL DEFAULT 0');
        } else {
            Schema::table('bite_incident_intakes', function (Blueprint $table) {
                $table->boolean('animal_captured')->nullable(false)->default(false)->change();
            });
            Schema::table('bite_incidents', function (Blueprint $table) {
                $table->string('exposure_type')->default('bite')->change();
                $table->string('severity')->default('moderate')->change();
                $table->string('animal_status')->default('unknown')->change();
                $table->boolean('site_washed')->nullable(false)->default(false)->change();
                $table->boolean('animal_captured')->nullable(false)->default(false)->change();
                $table->boolean('is_previously_vaccinated')->nullable(false)->default(false)->change();
            });
        }

        Schema::table('bite_incidents', function (Blueprint $table) {
            $table->dropForeign(['confirmed_by']);
            $table->dropColumn([
                'exposure_mode', 'body_part_exposed', 'laterality', 'animal_available',
                'confirmed_by', 'confirmed_at',
            ]);
        });

        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            $table->dropForeign(['checked_in_by']);
            $table->dropForeign(['clinically_reviewed_by']);
            $table->dropColumn([
                'incident_time', 'laterality', 'wash_method', 'wash_duration_minutes',
                'animal_available', 'animal_condition_reported', 'care_received',
                'referral_facility', 'prior_rabies_vaccination', 'prior_vaccination_date',
                'prior_vaccination_facility',
                'submitted_at', 'checked_in_by', 'checked_in_at',
                'clinically_reviewed_by', 'clinically_reviewed_at',
            ]);
        });
    }
};
