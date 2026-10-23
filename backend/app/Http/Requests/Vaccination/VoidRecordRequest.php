<?php

namespace App\Http\Requests\Vaccination;

use Illuminate\Foundation\Http\FormRequest;

class VoidRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'void_reason' => 'required|string|min:5|max:1000',
        ];
    }
}
