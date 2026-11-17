<?php

namespace App\Http\Requests\Mobile\Device;

use Illuminate\Foundation\Http\FormRequest;

class DeleteDeviceTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fcm_token' => ['nullable', 'string', 'max:500'],
            'device_id' => ['nullable', 'string', 'max:150'],
        ];
    }
}
