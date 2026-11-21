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
            'email' => 'required|email|max:255',
            'role' => ['nullable', 'string', 'in:registration,receptionist,treatment,intake_nurse,follow_up_nurse,solo_nurse,doctor,triage,admin,clinic_admin'],
            'workstation_role' => ['nullable', 'string', 'in:registration,receptionist,treatment,intake_nurse,follow_up_nurse,solo_nurse,doctor,triage,admin,clinic_admin'],
        ];
    }
}
