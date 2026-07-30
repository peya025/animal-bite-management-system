<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\ClinicModuleConfig;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing configs with comprehensive field rules
        $configs = ClinicModuleConfig::all();
        
        foreach ($configs as $config) {
            $config->field_rules = $this->getDefaultFieldRules();
            $config->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to basic field rules
        $configs = ClinicModuleConfig::all();
        
        foreach ($configs as $config) {
            $config->field_rules = [
                'bite_location' => 'required',
                'exposure_category' => 'required',
                'animal_status' => 'optional',
                'philhealth_info' => 'optional',
                'fourps_info' => 'optional',
                'wound_washing' => 'optional',
            ];
            $config->save();
        }
    }

    private function getDefaultFieldRules(): array
    {
        return [
            // PATIENT REGISTRATION FIELDS
            'blood_type' => 'optional',
            'mother_maiden_name' => 'optional',
            'civil_status' => 'optional',
            'spouse_name' => 'optional',
            
            // ADDRESS FIELDS
            'address_municipality' => 'required',
            'address_barangay' => 'required',
            'address_purok' => 'optional',
            'province' => 'required',
            
            // SOCIOECONOMIC FIELDS
            'educational_attainment' => 'optional',
            'employment_status' => 'optional',
            'family_member' => 'optional',
            
            // GOVERNMENT PROGRAMS
            'philhealth_member' => 'optional',
            'philhealth_status' => 'optional',
            'philhealth_no' => 'optional',
            'philhealth_category' => 'optional',
            'fourps_member' => 'optional',
            'dswd_nhts' => 'optional',
            
            // BITE INCIDENT INTAKE FIELDS
            'bite_date' => 'required',
            'bite_place' => 'required',
            'site_washed' => 'required',
            'exposure_type' => 'required',
            'animal_type' => 'required',
            'animal_status' => 'required',
            'animal_captured' => 'optional',
            'wound_location' => 'required',
            'patient_description' => 'optional',
            
            // TRIAGE/ASSESSMENT FIELDS (for future bite_incidents table)
            'exposure_category' => 'required',
            'bite_site' => 'required',
            'animal_observation_status' => 'optional',
            'treatment_given' => 'optional',
            
            // TREATMENT FIELDS
            'protocol_type' => 'required',
            'route' => 'optional',
            'injection_site' => 'optional',
            'dosage_ml' => 'optional',
            'vaccine_brand' => 'optional',
            'vaccine_generic' => 'optional',
            'batch_no' => 'optional',
            'tt_status' => 'optional',
            'medication_given' => 'optional',
            'adverse_reaction' => 'optional',
            'cost_recovery' => 'optional',
        ];
    }
};
