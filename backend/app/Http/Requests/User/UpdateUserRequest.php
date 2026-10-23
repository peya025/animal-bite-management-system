<?php

namespace App\Http\Requests\User;

use App\Services\StaffSignatureService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function failedAuthorization(): void
    {
        abort(response()->json(['message' => 'Unauthorized. Admin access required.'], 403));
    }

    public function rules(): array
    {
        $userId = $this->route('id') ?? $this->route('user');

        return [
            'name'                    => ['sometimes', 'required', 'string', 'max:255'],
            'email'                   => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($userId)],
            'password'                => ['sometimes', 'nullable', 'string', 'min:8'],
            'role'                    => ['nullable', 'string'],
            'workstation_role'        => ['nullable', 'string'],
            'roles'                   => ['nullable', 'array'],
            'phone'                   => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'professional_license_no' => ['nullable', 'string', 'max:100'],
            'is_active'               => ['sometimes', 'boolean'],
            ...StaffSignatureService::rules(),
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ];
    }
}
