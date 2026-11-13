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
            if (!Schema::hasColumn('bite_incident_intakes', 'schema_version')) {
                $table->string('schema_version', 20)->nullable()->after('appointment_id');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'past_bite_history')) {
                $table->string('past_bite_history', 20)->nullable()->after('patient_description');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'past_bite_dates')) {
                $table->string('past_bite_dates')->nullable()->after('past_bite_history');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'prior_pep_status')) {
                $table->string('prior_pep_status', 20)->nullable()->after('prior_vaccination_facility');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'prior_pep_date')) {
                $table->date('prior_pep_date')->nullable()->after('prior_pep_status');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'prior_pep_facility')) {
                $table->string('prior_pep_facility')->nullable()->after('prior_pep_date');
            }
        });

        Schema::table('bite_incidents', function (Blueprint $table) {
            if (!Schema::hasColumn('bite_incidents', 'animal_type_others')) {
                $table->string('animal_type_others')->nullable()->after('animal_type');
            }
        });

        DB::table('bite_incident_intakes')
            ->whereNull('schema_version')
            ->update(['schema_version' => 'legacy']);
    }

    public function down(): void
    {
        Schema::table('bite_incidents', function (Blueprint $table) {
            if (Schema::hasColumn('bite_incidents', 'animal_type_others')) {
                $table->dropColumn('animal_type_others');
            }
        });

        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            $columns = [
                'schema_version',
                'past_bite_history',
                'past_bite_dates',
                'prior_pep_status',
                'prior_pep_date',
                'prior_pep_facility',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('bite_incident_intakes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
