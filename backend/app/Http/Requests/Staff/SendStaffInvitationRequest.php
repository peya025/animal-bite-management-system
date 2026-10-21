<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;

class SendStaffInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'            => 'required|email|max:255',
            'role'             => ['nullable', 'string'],
            'workstation_role' => ['nullable', 'string'],
        ];
    }
}
