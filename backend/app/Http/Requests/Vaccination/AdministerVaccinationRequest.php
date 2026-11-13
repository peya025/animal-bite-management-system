<?php

namespace App\Http\Requests\Vaccination;

use Illuminate\Foundation\Http\FormRequest;

class AdministerVaccinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role gate is enforced in the controller before this request is resolved
    }

    public function rules(): array
    {
        return [
            'vaccine_brand'         => 'required|string|max:100',
            'vaccine_batch_number'  => 'required|string|max:100',
            'vaccine_expiry_date'   => 'nullable|date|after:today',
            'injection_site'        => 'required|string|max:100',
            'dosage_ml'             => 'nullable|numeric|min:0|max:10',
            'adverse_reaction'      => 'nullable|string',
            'administration_notes'  => 'nullable|string',
        ];
    }
}
