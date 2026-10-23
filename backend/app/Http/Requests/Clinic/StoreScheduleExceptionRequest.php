<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleExceptionRequest extends FormRequest
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
            'id'             => ['nullable', 'integer', 'exists:clinic_schedule_exceptions,id'],
            'exception_date' => ['required', 'date_format:Y-m-d'],
            'is_open'        => ['required', 'boolean'],
            'open_time'      => ['nullable', 'date_format:H:i,H:i:s'],
            'close_time'     => ['nullable', 'date_format:H:i,H:i:s'],
            'reason'         => ['required', 'string', 'max:255'],
        ];
    }
}
