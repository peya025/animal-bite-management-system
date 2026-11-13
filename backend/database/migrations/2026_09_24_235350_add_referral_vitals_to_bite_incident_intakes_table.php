<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            if (!Schema::hasColumn('bite_incident_intakes', 'referral_blood_pressure')) {
                $table->string('referral_blood_pressure', 50)->nullable()->after('referral_facility');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'referral_temperature')) {
                $table->string('referral_temperature', 20)->nullable()->after('referral_blood_pressure');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'referral_height')) {
                $table->string('referral_height', 20)->nullable()->after('referral_temperature');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'referral_weight')) {
                $table->string('referral_weight', 20)->nullable()->after('referral_height');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'referral_provider_name')) {
                $table->string('referral_provider_name', 255)->nullable()->after('referral_weight');
            }
            if (!Schema::hasColumn('bite_incident_intakes', 'referral_document_photo')) {
                $table->mediumText('referral_document_photo')->nullable()->after('referral_provider_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bite_incident_intakes', function (Blueprint $table) {
            $columns = [
                'referral_blood_pressure',
                'referral_temperature',
                'referral_height',
                'referral_weight',
                'referral_provider_name',
                'referral_document_photo',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('bite_incident_intakes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
