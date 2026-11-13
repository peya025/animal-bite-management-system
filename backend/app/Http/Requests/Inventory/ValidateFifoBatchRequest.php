<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class ValidateFifoBatchRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'vaccine_type' => 'required|string|max:100',
            'batch_id'     => 'required|integer',
        ];
    }
}
