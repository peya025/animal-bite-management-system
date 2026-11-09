<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClinicProfileRequest extends FormRequest
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
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('faqs'))) {
            $decoded = json_decode($this->input('faqs'), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->merge(['faqs' => $decoded]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'faqs' => 'sometimes|array|list|max:50',
            'faqs.*' => 'required|array:category,question,answer',
            'faqs.*.category' => 'nullable|string|max:100',
            'faqs.*.question' => 'required|string|max:500',
            'faqs.*.answer' => 'required|string|max:5000',
            'name'                        => 'required|string|max:255',
            'subtitle'                    => 'nullable|string|max:255',
            'address'                     => 'nullable|string',
            'contact_number'              => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'email'                       => 'nullable|email|max:255',
            'license_number'              => 'nullable|string|max:255',
            'hospital_no'                 => 'nullable|string|max:100',
            'doh_accreditation_no'        => 'nullable|string|max:100',
            'philhealth_accreditation_no' => 'nullable|string|max:100',
            'opening_hours'               => 'nullable|string',
            'logo'                        => 'nullable|image|max:2048',
            'remove_logo'                 => 'nullable',
            'left_print_logo'             => 'nullable|image|max:2048',
            'remove_left_print_logo'      => 'nullable',
            'right_print_logo'            => 'nullable|image|max:2048',
            'remove_right_print_logo'     => 'nullable',
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
            'contact_number.regex' => 'Mobile number must start with 09 and contain 11 digits.',
        ];
    }
}
