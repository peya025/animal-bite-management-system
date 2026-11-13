<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class CheckDuplicatePatientRequest extends FormRequest
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
        return [
            'first_name'         => ['required', 'string', 'min:2', 'max:255'],
            'last_name'          => ['required', 'string', 'min:2', 'max:255'],
            'middle_name'        => ['nullable', 'string', 'max:255'],
            'suffix'             => ['nullable', 'string', 'max:50'],
            'date_of_birth'      => ['nullable', 'date'],
            'gender'             => ['nullable', 'in:male,female'],
            'exclude_patient_id' => ['nullable', 'integer'],
        ];
    }
}
