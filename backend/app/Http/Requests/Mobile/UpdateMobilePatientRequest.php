<?php

namespace App\Http\Requests\Mobile;

use App\Models\Patient;
use App\Services\PatientMembershipService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMobilePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof \App\Models\PatientAccount;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'gender' => $this->input('gender', $this->input('sex')),
            'emergency_contact_number' => $this->input(
                'emergency_contact_number',
                $this->input('emergency_contact_phone'),
            ),
        ]);
    }

    public function rules(): array
    {
        $membershipService = app(PatientMembershipService::class);
        $patient = $this->route('patient');
        $detailsId = ($patient instanceof Patient) ? $patient->details?->id : null;

        return array_merge([
            'clinic_id'                => ['sometimes', 'integer', 'exists:clinics,id'],
            'relationship'             => ['required', 'in:self,child,dependent'],
            'first_name'               => ['required', 'string', 'max:255'],
            'middle_name'              => ['nullable', 'string', 'max:255'],
            'last_name'                => ['required', 'string', 'max:255'],
            'suffix'                   => ['nullable', 'string', 'max:50'],
            'gender'                   => ['required', 'in:male,female'],
            'date_of_birth'            => ['nullable', 'date', 'before:today'],
            'address'                  => ['nullable', 'string', 'max:255'],
            'contact_number'           => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email'                    => ['nullable', 'string', 'email', 'max:255'],
            'emergency_contact_name'   => ['nullable', 'string', 'max:255'],
            'emergency_contact_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],

            // Details
            'blood_type'               => ['nullable', 'string', 'max:10'],
            'mother_maiden_name'       => ['nullable', 'string', 'max:255'],
            'civil_status'             => ['nullable', 'in:single,married,widowed,separated,annulled,cohabitation'],
            'spouse_name'              => ['nullable', 'string', 'max:255'],
            'address_municipality'     => ['nullable', 'string', 'max:255'],
            'address_barangay'         => ['nullable', 'string', 'max:255'],
            'address_purok'            => ['nullable', 'string', 'max:255'],
            'province'                 => ['nullable', 'string', 'max:100'],
            'educational_attainment'   => ['nullable', 'string', 'max:50'],
            'employment_status'        => ['nullable', 'string', 'max:50'],
            'family_member'            => ['nullable', 'string', 'max:50'],
            'philhealth_member'        => ['nullable', 'in:yes,no'],
            'philhealth_status'        => ['nullable', 'in:member,dependent'],
            'philhealth_no'            => ['nullable', 'string', 'max:50', Rule::unique('patient_details', 'philhealth_no')->ignore($detailsId)],
            'philhealth_category'      => ['nullable', 'string', 'max:50'],
            'fourps_member'            => ['nullable', 'in:yes,no'],
            'fourps_category'          => ['nullable', 'string', 'max:50'],
            'fourps_relationship'      => ['nullable', 'string', 'max:50'],
            'registered_fourps_beneficiary' => ['nullable', 'string', 'max:50'],
            'dswd_nhts'                => ['nullable', 'in:yes,no'],
            'has_membership'           => ['nullable', 'string', 'max:10'],
            'other_membership'         => ['nullable', 'string', 'max:500'],
            'other_membership_name'    => ['nullable', 'string', 'max:500'],
            'other_membership_no'      => ['nullable', 'string', 'max:500'],
        ], $membershipService->validationRules());
    }

    public function messages(): array
    {
        return [
            'contact_number.regex'           => 'Mobile number must start with 09 and contain 11 digits.',
            'emergency_contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ];
    }
}
