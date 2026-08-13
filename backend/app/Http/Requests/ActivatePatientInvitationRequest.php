<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ActivatePatientInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'size:64'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:patient_accounts,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'The activation code/token is required.',
            'token.size' => 'The activation code must be exactly 64 characters long.',
            'email.unique' => 'This email address is already registered to a patient portal account.',
            'password.min' => 'Password must be at least 8 characters long.',
            'password.confirmed' => 'Password confirmation does not match.',
        ];
    }
}
