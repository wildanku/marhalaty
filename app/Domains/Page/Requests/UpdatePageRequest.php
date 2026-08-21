<?php

namespace App\Domains\Page\Requests;

use App\Domains\Page\Enums\PageMode;
use App\Domains\Page\Models\Page;
use App\Domains\Page\Rules\AvailablePageSlug;
use Illuminate\Validation\Rule;

class UpdatePageRequest extends StorePageRequest
{
    public function rules(): array
    {
        /** @var Page $page */
        $page = $this->route('page');

        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                new AvailablePageSlug($page->getKey()),
            ],
            'mode' => ['required', Rule::enum(PageMode::class)],
            'content' => ['required', 'string', 'max:2000000'],
            'is_published' => ['required', 'boolean'],
        ];
    }
}
