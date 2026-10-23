<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class InitializeClinicSetupRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // When resuming setup with bearer token, inputs are optional
        if ($this->bearerToken()) {
            return [
                'clinic_name'    => 'nullable|string|max:255',
                'admin_name'     => 'nullable|string|max:255',
                'admin_email'    => 'nullable|email',
                'admin_password' => 'nullable|string',
            ];
        }

        return [
            'clinic_name'    => 'required|string|max:255',
            'admin_name'     => 'required|string|max:255',
            'admin_email'    => 'required|email|unique:users,email',
            'admin_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/',
            ],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'admin_password.regex' => 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        ];
    }
}
