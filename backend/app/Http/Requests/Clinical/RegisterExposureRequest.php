<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class RegisterExposureRequest extends FormRequest
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
            'site_washed' => 'nullable|boolean',
            'exposure_type' => 'nullable|in:bite,scratch,lick,other',
            'severity' => 'nullable|in:minor,moderate,severe',
            'animal_type' => 'nullable|string|max:100',
            'animal_status' => 'nullable|in:owned,stray,unknown',
            'animal_captured' => 'nullable|boolean',
            'animal_observation_status' => 'nullable|in:healthy,sick,died,unknown',
            'site_number' => 'nullable|string|max:255',
            'wound_description' => 'nullable|string',
            'remarks' => 'nullable|string',

            // Consultation Details & Vitals
            'consultation_date' => 'nullable|date',
            'consultation_time' => 'nullable|string|max:20',
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => 'nullable|string|max:10',
            'height' => 'nullable|string|max:10',
            'weight' => 'nullable|string|max:10',
            'attending_provider' => 'nullable|string|max:255',
            'referred_by' => 'nullable|string|max:255',
            'reg_date_of_consultation' => 'nullable|date',
            'reg_consultation_time' => 'nullable|string|max:20',
            'reg_blood_pressure' => 'nullable|string|max:20',
            'reg_temperature' => 'nullable|string|max:10',
            'reg_height' => 'nullable|string|max:10',
            'reg_weight' => 'nullable|string|max:10',
            'reg_attending_provider' => 'nullable|string|max:255',
            'reg_referred_by' => 'nullable|string|max:255',
        ];
    }
}
