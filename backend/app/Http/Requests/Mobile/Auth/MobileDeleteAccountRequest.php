<?php

namespace App\Http\Requests\Mobile\Auth;

use App\Models\PatientAccount;
use Illuminate\Foundation\Http\FormRequest;

class MobileDeleteAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof PatientAccount;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }
}
