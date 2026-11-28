<?php

namespace App\Http\Requests\Vaccination;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkRecallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'appointment_ids' => 'required|array|min:1|max:200',
            'appointment_ids.*' => ['integer', 'distinct', Rule::exists('appointments', 'appointment_id')->where('clinic_id', $this->user()->clinic_id)],
            'channel' => 'nullable|in:all,sms,email,in_app',
        ];
    }
}
