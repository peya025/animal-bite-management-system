<?php

namespace App\Http\Requests\Patient;

use Illuminate\Foundation\Http\FormRequest;

class BulkPatientInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_ids'   => ['required', 'array', 'min:1'],
            'patient_ids.*' => ['required', 'integer'],
        ];
    }
}
