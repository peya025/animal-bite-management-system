<?php

namespace App\Http\Requests\Queue;

use Illuminate\Foundation\Http\FormRequest;

class StoreQueueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id'       => 'required|exists:patients,patient_id',
            'bite_incident_id' => 'nullable|exists:bite_incidents,bite_id',
            'visit_type'       => 'required|in:new_case,consultation,follow_up,vaccination,observation,booster',
            'priority'         => 'nullable|in:normal,urgent,emergency',
            'queue_category'   => 'nullable|in:regular,appointment,senior_citizen,pwd,pregnant,priority',
            'check_in_notes'   => 'nullable|string|max:1000',
        ];
    }
}
