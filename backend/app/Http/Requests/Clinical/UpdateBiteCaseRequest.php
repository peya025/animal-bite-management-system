<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBiteCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bite_place' => 'nullable|string|max:255',
            'site_washed' => 'sometimes|boolean',
            'severity' => 'sometimes|in:minor,moderate,severe',
            'animal_observation_status' => 'nullable|in:healthy,sick,died,unknown',
            'wound_description' => 'nullable|string',
            'status' => 'sometimes|in:active,completed,referred,abandoned',
            'remarks' => 'nullable|string',
        ];
    }
}
