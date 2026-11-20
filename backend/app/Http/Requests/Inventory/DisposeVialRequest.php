<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class DisposeVialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'portions_discarded' => 'required|integer|min:1',
            'reason'             => 'required|string|min:3|max:500',
            'disposed_at'        => 'nullable|date',
        ];
    }
}
