<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSchedulePoliciesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'schedule_drift_policy'            => ['required', 'in:forward_only,nearest,backward_within_N_days'],
            'backward_max_days'                => ['required', 'integer', 'min:1', 'max:7'],
            'urgent_access_policy'             => ['required', 'in:walk_ins_accepted_outside_hours,refer_to_alternate_facility'],
            'urgent_referral_facility_name'    => ['nullable', 'string', 'max:255'],
            'urgent_referral_facility_address' => ['nullable', 'string', 'max:255'],
            'urgent_referral_facility_contact' => ['nullable', 'string', 'max:255'],
            'urgent_referral_instructions'     => ['nullable', 'string', 'max:1000'],
        ];
    }
}
