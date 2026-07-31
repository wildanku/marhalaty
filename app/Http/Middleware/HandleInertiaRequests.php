<?php

namespace App\Http\Middleware;

use App\Domains\Store\Models\CartItem;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $locale = app()->getLocale();
        $translationsPath = base_path("lang/{$locale}.json");
        $translations = file_exists($translationsPath) ? json_decode(file_get_contents($translationsPath), true) : [];

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'locale' => $locale,
            'translations' => $translations,
            // Fase 10 (docs/plan/mvp2/10-storefront-frontside-ux.md, D44) — one cheap indexed SUM,
            // only run for logged-in users, so the floating cart button always has a fresh count.
            'cart' => $request->user()
                ? ['item_count' => (int) CartItem::whereHas(
                    'cart', fn ($q) => $q->where('user_id', $request->user()->id)
                )->sum('quantity')]
                : null,
        ];
    }
}
