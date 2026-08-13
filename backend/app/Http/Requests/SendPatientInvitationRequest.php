<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendPatientInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized via middleware
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'integer', 'exists:patients,patient_id'],
        ];
    }
}
