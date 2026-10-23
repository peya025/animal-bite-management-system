<?php

namespace App\Http\Requests\Mobile\Auth;

use App\Models\PatientAccount;
use Illuminate\Foundation\Http\FormRequest;

class MobileChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof PatientAccount;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
