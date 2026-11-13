<?php

namespace App\Http\Requests\Developer;

use Illuminate\Foundation\Http\FormRequest;

class RepairSingleDiagnosticRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id'              => ['required', 'string'],
            'appointment_id'  => ['nullable', 'integer'],
            'patient_id'      => ['nullable', 'integer'],
            'auto_fix_action' => ['required', 'string'],
            'rule_code'       => ['nullable', 'string'],
        ];
    }
}
