<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWeeklyScheduleRequest extends FormRequest
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
            'schedules'                         => ['required', 'array', 'size:7'],
            'schedules.*.day_of_week'           => ['required', 'integer', 'between:0,6'],
            'schedules.*.is_open'               => ['required', 'boolean'],
            'schedules.*.open_time'             => ['nullable', 'date_format:H:i,H:i:s'],
            'schedules.*.close_time'            => ['nullable', 'date_format:H:i,H:i:s'],
            'schedules.*.slot_interval_minutes' => ['nullable', 'integer', 'min:5', 'max:120'],
            'schedules.*.max_patients_per_slot' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
