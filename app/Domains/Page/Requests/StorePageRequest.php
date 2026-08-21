<?php

namespace App\Domains\Page\Requests;

use App\Domains\Page\Enums\PageMode;
use App\Domains\Page\Rules\AvailablePageSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('admin')->check();
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('slug')) {
            $this->merge([
                'slug' => strtolower(trim((string) $this->input('slug'), " \t\n\r\0\x0B/")),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                new AvailablePageSlug,
            ],
            'mode' => ['required', Rule::enum(PageMode::class)],
            'content' => ['required', 'string', 'max:2000000'],
            'is_published' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'URL hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
            'content.required' => 'Konten page wajib diisi.',
            'content.max' => 'Konten page maksimal 2 MB.',
        ];
    }
}
