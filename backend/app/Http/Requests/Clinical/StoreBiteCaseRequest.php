<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class StoreBiteCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => 'required|exists:patients,patient_id',
            'bite_date' => 'required|date|before_or_equal:today',
            'bite_place' => 'nullable|string|max:255',
            'site_washed' => 'required|boolean',
            'exposure_type' => 'required|in:bite,scratch,lick,other',
            'victim_of_exposure' => 'nullable|string',
            'severity' => 'required|in:minor,moderate,severe',
            'animal_type' => 'nullable|string|max:100',
            'animal_status' => 'required|in:owned,stray,unknown',
            'animal_captured' => 'nullable|boolean',
            'animal_observation_status' => 'nullable|in:healthy,sick,died,unknown',
            'site_number' => 'nullable|string',
            'wound_description' => 'nullable|string',
            'referred_from' => 'nullable|string',
            'remarks' => 'nullable|string',
            'intake_id' => 'nullable|exists:bite_incident_intakes,intake_id',
            'episode_type' => 'nullable|in:primary,re_exposure',
            'is_previously_vaccinated' => 'nullable|boolean',
            'verification_source' => 'nullable|in:system_record,external_certificate_reviewed,patient_self_report_unverified',
            'rig_decision_reason' => 'nullable|string',
            'wound_condition' => 'nullable|string|max:50',
        ];
    }
}
