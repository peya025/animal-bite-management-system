<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LinkPatientAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_account_id' => ['required', 'integer', 'exists:patient_accounts,id'],
        ];
    }
}
