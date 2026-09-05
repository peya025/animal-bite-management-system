<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_module_configs', function (Blueprint $table) {
            $table->boolean('patient_registration_enabled')->default(true)->after('triage_module_enabled');
            $table->boolean('address_section_enabled')->default(true)->after('patient_registration_enabled');
            $table->boolean('socioeconomic_section_enabled')->default(true)->after('address_section_enabled');
            $table->boolean('gov_programs_section_enabled')->default(true)->after('socioeconomic_section_enabled');
            $table->boolean('bite_intake_section_enabled')->default(true)->after('gov_programs_section_enabled');
            $table->boolean('triage_section_enabled')->default(true)->after('bite_intake_section_enabled');
            $table->boolean('treatment_section_enabled')->default(true)->after('triage_section_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_module_configs', function (Blueprint $table) {
            $table->dropColumn([
                'patient_registration_enabled',
                'address_section_enabled',
                'socioeconomic_section_enabled',
                'gov_programs_section_enabled',
                'bite_intake_section_enabled',
                'triage_section_enabled',
                'treatment_section_enabled',
            ]);
        });
    }
};
