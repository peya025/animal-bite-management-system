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
        // 1. Enhance bite_incidents table with lifetime episodes & transfer tracking
        Schema::table('bite_incidents', function (Blueprint $table) {
            if (!Schema::hasColumn('bite_incidents', 'episode_number')) {
                $table->unsignedInteger('episode_number')->default(1)->after('patient_id');
            }
            if (!Schema::hasColumn('bite_incidents', 'episode_type')) {
                $table->enum('episode_type', ['primary', 're_exposure'])->default('primary')->after('episode_number');
            }
            if (!Schema::hasColumn('bite_incidents', 'is_previously_vaccinated')) {
                $table->boolean('is_previously_vaccinated')->default(false)->after('episode_type');
            }
            if (!Schema::hasColumn('bite_incidents', 'verification_source')) {
                $table->enum('verification_source', ['system_record', 'external_certificate_reviewed', 'patient_self_report_unverified'])->nullable()->after('is_previously_vaccinated');
            }
            if (!Schema::hasColumn('bite_incidents', 'external_vaccine_proof_path')) {
                $table->string('external_vaccine_proof_path')->nullable()->after('verification_source');
            }
            if (!Schema::hasColumn('bite_incidents', 'external_proof_reviewed_by')) {
                $table->unsignedBigInteger('external_proof_reviewed_by')->nullable()->after('external_vaccine_proof_path');
            }
            if (!Schema::hasColumn('bite_incidents', 'external_proof_reviewed_at')) {
                $table->timestamp('external_proof_reviewed_at')->nullable()->after('external_proof_reviewed_by');
            }
            if (!Schema::hasColumn('bite_incidents', 'rig_decision_reason')) {
                $table->text('rig_decision_reason')->nullable()->after('external_proof_reviewed_at');
            }
            if (!Schema::hasColumn('bite_incidents', 'wound_condition')) {
                $table->string('wound_condition', 50)->default('clean')->after('wound_description');
            }
            if (!Schema::hasColumn('bite_incidents', 'transferred_to_facility')) {
                $table->string('transferred_to_facility')->nullable()->after('status');
            }
            if (!Schema::hasColumn('bite_incidents', 'transferred_at')) {
                $table->timestamp('transferred_at')->nullable()->after('transferred_to_facility');
            }
            if (!Schema::hasColumn('bite_incidents', 'transfer_reason')) {
                $table->text('transfer_reason')->nullable()->after('transferred_at');
            }
        });

        // 2. Enhance treatment_records table with external transfer tracking
        Schema::table('treatment_records', function (Blueprint $table) {
            if (!Schema::hasColumn('treatment_records', 'is_external')) {
                $table->boolean('is_external')->default(false)->after('status');
            }
            if (!Schema::hasColumn('treatment_records', 'external_facility_name')) {
                $table->string('external_facility_name')->nullable()->after('is_external');
            }
        });

        // 3. Backfill existing bite incidents with default episode 1
        DB::table('bite_incidents')->whereNull('episode_number')->orWhere('episode_number', 0)->update([
            'episode_number' => 1,
            'episode_type' => 'primary',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bite_incidents', function (Blueprint $table) {
            $table->dropColumn([
                'episode_number',
                'episode_type',
                'is_previously_vaccinated',
                'verification_source',
                'external_vaccine_proof_path',
                'external_proof_reviewed_by',
                'external_proof_reviewed_at',
                'rig_decision_reason',
                'wound_condition',
                'transferred_to_facility',
                'transferred_at',
                'transfer_reason',
            ]);
        });

        Schema::table('treatment_records', function (Blueprint $table) {
            $table->dropColumn([
                'is_external',
                'external_facility_name',
            ]);
        });
    }
};
