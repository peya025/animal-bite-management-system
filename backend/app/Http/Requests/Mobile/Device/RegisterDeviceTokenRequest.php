<?php

namespace App\Http\Requests\Mobile\Device;

use Illuminate\Foundation\Http\FormRequest;

class RegisterDeviceTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fcm_token'   => ['required', 'string', 'min:10', 'max:1024'],
            'device_id'   => ['nullable', 'string', 'max:150'],
            'device_type' => ['nullable', 'string', 'in:android,ios,web'],
            'device_name' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'fcm_token.required' => 'FCM registration token is required.',
            'device_type.in'     => 'Device type must be one of: android, ios, web.',
        ];
    }
}
