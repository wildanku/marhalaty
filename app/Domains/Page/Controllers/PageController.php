<?php

namespace App\Domains\Page\Controllers;

use App\Domains\Page\Enums\PageMode;
use App\Domains\Page\Models\Page;
use App\Domains\Shared\Services\HtmlSanitizerService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function __construct(private readonly HtmlSanitizerService $htmlSanitizer) {}

    public function show(Page $page): Response|HttpResponse
    {
        abort_unless($page->is_published, 404);

        if ($page->mode === PageMode::FullHtml) {
            return response($page->content, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Content-Security-Policy' => 'sandbox allow-downloads allow-forms allow-modals allow-popups allow-scripts',
                'Referrer-Policy' => 'strict-origin-when-cross-origin',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        return Inertia::render('PublicPages/Show', [
            'page' => [
                'title' => $page->title,
                'content' => $this->htmlSanitizer->sanitize($page->content) ?? '',
            ],
        ]);
    }
}
