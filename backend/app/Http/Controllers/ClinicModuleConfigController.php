<?php

namespace App\Http\Controllers;

use App\Models\ClinicModuleConfig;
use Illuminate\Http\Request;

class ClinicModuleConfigController extends Controller
{
    /**
     * Get current clinic's module configuration
     * Access: All authenticated users
     */
    public function show(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        $config = ClinicModuleConfig::firstOrCreate(
            ['clinic_id' => $clinicId],
            [
                'triage_module_enabled'         => true,
                'patient_registration_enabled'  => true,
                'address_section_enabled'       => true,
                'socioeconomic_section_enabled' => true,
                'gov_programs_section_enabled'  => true,
                'bite_intake_section_enabled'   => true,
                'triage_section_enabled'        => true,
                'treatment_section_enabled'     => true,
                'field_rules'                   => $this->getDefaultFieldRules(),
            ]
        );
        
        return response()->json($config);
    }

    /**
     * Get default field rules for all configurable fields
     */
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
            
            // TRIAGE/ASSESSMENT FIELDS
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

    /**
     * Update clinic module configuration
     * Access: Admin only
     */
    public function update(Request $request)
    {
        // Check if user is admin
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }
        
        // Build dynamic validation rules
        $validationRules = [
            'triage_module_enabled'         => 'required|boolean',
            'patient_registration_enabled'  => 'nullable|boolean',
            'address_section_enabled'       => 'nullable|boolean',
            'socioeconomic_section_enabled' => 'nullable|boolean',
            'gov_programs_section_enabled'  => 'nullable|boolean',
            'bite_intake_section_enabled'   => 'nullable|boolean',
            'triage_section_enabled'        => 'nullable|boolean',
            'treatment_section_enabled'     => 'nullable|boolean',
            'field_rules'                   => 'required|array',
        ];
        
        // Add validation for each field in field_rules
        $defaultFieldRules = $this->getDefaultFieldRules();
        foreach (array_keys($defaultFieldRules) as $fieldKey) {
            $validationRules["field_rules.{$fieldKey}"] = 'required|in:required,optional,hidden';
        }
        
        $validated = $request->validate($validationRules);
        
        $clinicId = $request->user()->clinic_id;
        
        $config = ClinicModuleConfig::updateOrCreate(
            ['clinic_id' => $clinicId],
            $validated
        );
        
        return response()->json([
            'message' => 'Module configuration updated successfully',
            'config' => $config,
        ]);
    }
}
