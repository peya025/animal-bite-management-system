<?php

namespace App\Http\Requests\Clinic;

use Illuminate\Foundation\Http\FormRequest;

class StoreClinicResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'admin';
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        foreach (['subtitle', 'thumbnail_url', 'duration_label'] as $nullableField) {
            if ($this->has($nullableField) && is_string($this->input($nullableField)) && trim($this->input($nullableField)) === '') {
                $merge[$nullableField] = null;
            }
        }
        if ($this->has('title') && is_string($this->input('title'))) {
            $merge['title'] = trim($this->input('title'));
        }
        if ($this->has('url') && is_string($this->input('url'))) {
            $merge['url'] = trim($this->input('url'));
        }
        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:video,link'],
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:160'],
            'url' => [
                'required',
                'string',
                'max:500',
                'starts_with:https://',
                'url:https',
            ],
            'thumbnail_url' => [
                'nullable',
                'string',
                'max:500',
                'starts_with:https://',
                'url:https',
            ],
            'duration_label' => [
                'nullable',
                'string',
                'max:10',
                'regex:/^\d{1,2}:[0-5]\d$/',
            ],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.in' => 'The resource type must be either video or link.',
            'url.starts_with' => 'The URL must start with https://.',
            'url.url' => 'The URL must be a valid https:// address.',
            'thumbnail_url.starts_with' => 'The thumbnail URL must start with https://.',
            'thumbnail_url.url' => 'The thumbnail URL must be a valid https:// address.',
            'duration_label.regex' => 'The duration must be formatted as m:ss or mm:ss (for example, 3:45).',
        ];
    }
}
