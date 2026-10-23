<?php

namespace App\Http\Requests\Vaccination;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVaccinationScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scheduled_date'       => 'sometimes|date',
            'status'               => 'sometimes|in:scheduled,completed,missed,rescheduled',
            'administration_notes' => 'nullable|string',
        ];
    }
}
