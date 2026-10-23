<?php

namespace App\Http\Requests\Landing;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'app_short_name'      => ['nullable', 'string', 'max:50'],
            'app_full_name'       => ['nullable', 'string', 'max:255'],
            'abtc_brand_title'    => ['nullable', 'string', 'max:50'],
            'abtc_description'    => ['nullable', 'string'],
            'developed_for_text'  => ['nullable', 'string', 'max:255'],
            'quick_links'         => ['nullable', 'array'],
            'support_links'       => ['nullable', 'array'],
            'system_info_links'   => ['nullable', 'array'],
            'operating_schedule'  => ['nullable', 'string', 'max:255'],
            'operating_hours'     => ['nullable', 'string', 'max:255'],
            'registration_window' => ['nullable', 'string', 'max:255'],
            'requirement_notice'  => ['nullable', 'string', 'max:255'],
        ];
    }
}
