<?php

namespace App\Domains\Page\Services;

use App\Domains\Page\Data\PageRouteAvailability;
use App\Domains\Page\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class PageRouteAvailabilityService
{
    /**
     * Check both persisted page slugs and every registered route. The public page
     * catch-all itself is intentionally ignored so it does not mark every slug unavailable.
     */
    public function check(string $slug, ?int $ignorePageId = null): PageRouteAvailability
    {
        if (! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            return new PageRouteAvailability(
                false,
                'URL hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
            );
        }

        $pageExists = Page::query()
            ->where('slug', $slug)
            ->when($ignorePageId !== null, fn ($query) => $query->whereKeyNot($ignorePageId))
            ->exists();

        if ($pageExists) {
            return new PageRouteAvailability(false, 'URL sudah digunakan oleh page lain.');
        }

        $candidateRequest = Request::create('/'.$slug, 'GET');

        foreach (Route::getRoutes() as $route) {
            if ($route->getName() === 'pages.show') {
                continue;
            }

            if ($route->matches($candidateRequest, false)) {
                return new PageRouteAvailability(false, 'URL sudah digunakan oleh fitur sistem.');
            }
        }

        return new PageRouteAvailability(true, 'URL tersedia.');
    }
}
