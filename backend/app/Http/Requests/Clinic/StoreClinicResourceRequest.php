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

        if (!$this->has('subtitle') && $this->has('description')) {
            $merge['subtitle'] = $this->input('description');
        }

        if (!$this->has('sort_order') && $this->has('display_order')) {
            $merge['sort_order'] = $this->input('display_order');
        }

        if ($this->has('type') && is_string($this->input('type'))) {
            $normalizedType = strtolower(trim($this->input('type')));
            if (in_array($normalizedType, ['website', 'website_link', 'website link'], true)) {
                $merge['type'] = 'link';
            } else {
                $merge['type'] = $normalizedType;
            }
        }

        foreach (['subtitle', 'thumbnail_url', 'duration_label'] as $nullableField) {
            $raw = $merge[$nullableField] ?? $this->input($nullableField);
            if (($this->has($nullableField) || array_key_exists($nullableField, $merge)) && is_string($raw)) {
                $trimmed = trim($raw);
                $merge[$nullableField] = $trimmed === '' ? null : $trimmed;
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
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value) && str_contains(strtolower($value), 'replace-with-')) {
                        $fail('Please provide a real HTTPS URL rather than a placeholder link.');
                    }
                },
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
