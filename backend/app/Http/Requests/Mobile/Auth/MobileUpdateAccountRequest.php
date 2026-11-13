<?php

namespace App\Http\Requests\Mobile\Auth;

use App\Models\PatientAccount;
use Illuminate\Foundation\Http\FormRequest;

class MobileUpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof PatientAccount;
    }

    public function rules(): array
    {
        return [
            'name'  => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ];
    }
}
