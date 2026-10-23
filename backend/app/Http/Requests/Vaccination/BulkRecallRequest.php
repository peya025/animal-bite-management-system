<?php

namespace App\Http\Requests\Vaccination;

use Illuminate\Foundation\Http\FormRequest;

class BulkRecallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'appointment_ids'   => 'required|array|min:1',
            'appointment_ids.*' => 'integer|exists:appointments,appointment_id',
            'channel'           => 'nullable|in:all,sms,email,in_app',
        ];
    }
}
