<?php

namespace App\Http\Requests\Clinical;

use App\Services\PatientMembershipService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $membershipService = app(PatientMembershipService::class);

        return array_merge([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'gender' => 'required|in:male,female',
            'age' => 'nullable|integer|min:0|max:150',
            'date_of_birth' => 'nullable|date|before_or_equal:today',
            'address' => 'nullable|string',
            'contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email' => 'nullable|string|email|max:255',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'hospital_no' => 'nullable|string|max:100',
            // Extended Form 1 fields
            'blood_type' => 'nullable|string|max:10',
            'mother_maiden_name' => 'nullable|string|max:255',
            'civil_status' => 'nullable|in:single,married,widowed,separated,annulled,cohabitation',
            'spouse_name' => 'nullable|string|max:255',
            'address_municipality' => 'nullable|string|max:255',
            'address_barangay' => 'nullable|string|max:255',
            'address_purok' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:100',
            'educational_attainment' => 'nullable|string|max:50',
            'employment_status' => 'nullable|string|max:50',
            'family_member' => 'nullable|string|max:50',
            'philhealth_member' => 'nullable|in:yes,no',
            'philhealth_status' => 'nullable|in:member,dependent',
            'philhealth_no' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('patient_details', 'philhealth_no'),
            ],
            'philhealth_category' => 'nullable|string|max:50',
            'fourps_member' => 'nullable|in:yes,no',
            'fourps_category' => 'nullable|string|max:50',
            'fourps_relationship' => 'nullable|string|max:50',
            'registered_fourps_beneficiary' => 'nullable|string|max:50',
            'dswd_nhts' => 'nullable|in:yes,no',
            'has_membership' => 'nullable|string|max:10',
            'other_membership' => 'nullable|string|max:500',
            'other_membership_name' => 'nullable|string|max:500',
            'other_membership_no' => 'nullable|string|max:500',
            // II. For CHU / RHU Personnel Only & III. Consultation Details & Vitals
            'mode_of_transaction'       => 'nullable|in:walk-in,visited,referral',
            'reg_mode_of_transaction'   => 'nullable|in:walk-in,visited,referral',
            'reg_date_of_consultation'  => 'nullable|date',
            'reg_consultation_time'     => 'nullable|string|max:10',
            'reg_blood_pressure'        => 'nullable|string|max:20',
            'reg_temperature'           => 'nullable|string|max:10',
            'reg_height'                => 'nullable|string|max:10',
            'reg_weight'                => 'nullable|string|max:10',
            'reg_attending_provider'    => 'nullable|string|max:255',
            'reg_referred_by'           => 'nullable|string|max:255',
        ], $membershipService->validationRules());
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
            'emergency_contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ];
    }
}
