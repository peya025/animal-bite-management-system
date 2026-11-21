<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class CheckInBiteIntakeRequest extends FormRequest
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
            'consultation_date'   => ['nullable', 'date'],
            'consultation_time'   => ['nullable', 'string', 'max:20'],
            'blood_pressure'      => ['nullable', 'string', 'max:50'],
            'temperature'         => ['nullable', 'numeric', 'between:30,45'],
            'weight'              => ['nullable', 'numeric', 'between:0.5,300'],
            'height'              => ['nullable', 'numeric', 'between:20,250'],
            'attending_provider'  => ['nullable', 'string', 'max:255'],
            'referred_by'         => ['nullable', 'string', 'max:255'],
            'mode_of_transaction' => ['nullable', 'string', 'in:walk-in,online,referral,visited'],
            'registration_fee'    => ['nullable'],
        ];
    }
}
