<?php

namespace App\Http\Requests\Clinical;

use Illuminate\Foundation\Http\FormRequest;

class TransferOutBiteCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transferred_to_facility' => 'required|string|max:255',
            'transfer_reason' => 'nullable|string',
            'transfer_date' => 'nullable|date',
        ];
    }
}
