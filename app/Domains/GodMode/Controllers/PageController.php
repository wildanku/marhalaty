<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Page\Models\Page;
use App\Domains\Page\Requests\StorePageRequest;
use App\Domains\Page\Requests\UpdatePageRequest;
use App\Domains\Page\Resources\PageResource;
use App\Domains\Page\Resources\PageSummaryResource;
use App\Domains\Page\Services\PageRouteAvailabilityService;
use App\Domains\Page\Services\PageService;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function __construct(
        private readonly PageService $pageService,
        private readonly PageRouteAvailabilityService $routeAvailability,
    ) {}

    public function index(): Response
    {
        $pages = Page::query()
            ->select(['id', 'title', 'slug', 'mode', 'is_published', 'updated_by_admin_id', 'updated_at'])
            ->with('updatedBy:id,name')
            ->latest('updated_at')
            ->paginate(20);

        return Inertia::render('GodMode/Pages/Index', [
            'admin' => auth('admin')->user(),
            'pages' => PageSummaryResource::collection($pages),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('GodMode/Pages/Create', [
            'admin' => auth('admin')->user(),
            'baseUrl' => rtrim((string) config('app.url'), '/'),
        ]);
    }

    public function store(StorePageRequest $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $page = $this->pageService->create(
            $request->validated(),
            $admin,
            $request->ip(),
            $request->userAgent(),
        );

        return redirect()
            ->route('god-mode.pages.edit', $page)
            ->with('success', 'Page berhasil dibuat.');
    }

    public function edit(Page $page): Response
    {
        return Inertia::render('GodMode/Pages/Edit', [
            'admin' => auth('admin')->user(),
            'page' => PageResource::make($page)->resolve(),
            'baseUrl' => rtrim((string) config('app.url'), '/'),
        ]);
    }

    public function update(UpdatePageRequest $request, Page $page): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $this->pageService->update(
            $page,
            $request->validated(),
            $admin,
            $request->ip(),
            $request->userAgent(),
        );

        return back()->with('success', 'Page berhasil diperbarui.');
    }

    public function destroy(Request $request, Page $page): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth('admin')->user();
        $this->pageService->delete($page, $admin, $request->ip(), $request->userAgent());

        return redirect()->route('god-mode.pages.index')->with('success', 'Page berhasil dihapus.');
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:100'],
            'page_id' => ['nullable', 'integer', 'exists:pages,id'],
        ]);

        $result = $this->routeAvailability->check(
            strtolower(trim($validated['slug'], '/')),
            isset($validated['page_id']) ? (int) $validated['page_id'] : null,
        );

        return response()->json([
            'available' => $result->available,
            'message' => $result->message,
        ]);
    }
}
