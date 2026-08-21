<?php

namespace App\Domains\Page\Services;

use App\Domains\Page\Enums\PageMode;
use App\Domains\Page\Models\Page;
use App\Domains\Shared\Services\HtmlSanitizerService;
use App\Models\Admin;
use App\Models\AdminActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PageService
{
    public function __construct(private readonly HtmlSanitizerService $htmlSanitizer) {}

    /** @param array{title: string, slug: string, mode: string, content: string, is_published: bool} $data */
    public function create(array $data, Admin $admin, ?string $ipAddress, ?string $userAgent): Page
    {
        return DB::transaction(function () use ($data, $admin, $ipAddress, $userAgent): Page {
            $page = Page::create([
                ...$this->prepareData($data),
                'created_by_admin_id' => $admin->getKey(),
                'updated_by_admin_id' => $admin->getKey(),
            ]);

            $this->log($admin, "Created page /{$page->slug}", $ipAddress, $userAgent);

            return $page;
        });
    }

    /** @param array{title: string, slug: string, mode: string, content: string, is_published: bool} $data */
    public function update(
        Page $page,
        array $data,
        Admin $admin,
        ?string $ipAddress,
        ?string $userAgent,
    ): Page {
        return DB::transaction(function () use ($page, $data, $admin, $ipAddress, $userAgent): Page {
            $page->update([
                ...$this->prepareData($data),
                'updated_by_admin_id' => $admin->getKey(),
            ]);

            $this->log($admin, "Updated page /{$page->slug}", $ipAddress, $userAgent);

            return $page->refresh();
        });
    }

    public function delete(Page $page, Admin $admin, ?string $ipAddress, ?string $userAgent): void
    {
        DB::transaction(function () use ($page, $admin, $ipAddress, $userAgent): void {
            $slug = $page->slug;
            $page->delete();
            $this->log($admin, "Deleted page /{$slug}", $ipAddress, $userAgent);
        });
    }

    /**
     * Basic content is sanitized because it is inserted into the application DOM. Full HTML is
     * intentionally preserved and later served as an isolated, CSP-sandboxed document.
     *
     * @param  array{title: string, slug: string, mode: string, content: string, is_published: bool}  $data
     * @return array{title: string, slug: string, mode: string, content: string, is_published: bool}
     */
    private function prepareData(array $data): array
    {
        $content = $data['mode'] === PageMode::Basic->value
            ? $this->htmlSanitizer->sanitize($data['content'])
            : trim($data['content']);

        if ($content === null || $content === '') {
            throw ValidationException::withMessages([
                'content' => 'Konten page wajib berisi konten yang valid.',
            ]);
        }

        return [
            'title' => trim($data['title']),
            'slug' => $data['slug'],
            'mode' => $data['mode'],
            'content' => $content,
            'is_published' => $data['is_published'],
        ];
    }

    private function log(
        Admin $admin,
        string $action,
        ?string $ipAddress,
        ?string $userAgent,
    ): void {
        AdminActivityLog::create([
            'admin_id' => $admin->getKey(),
            'action' => $action,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }
}
