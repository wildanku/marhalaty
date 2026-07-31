<?php

namespace App\Http\Controllers;

use App\Domains\Event\Models\Event;
use App\Domains\Store\Models\FeaturedProduct;
use App\Domains\Store\Models\Store;
use Inertia\Inertia;

class WelcomeController extends Controller
{
    public function index()
    {
        $upcomingEvents = Event::query()
            ->where(function ($q) {
                $q->whereNull('visibility_scope')
                    ->orWhere('visibility_scope', 'global');
            })
            ->where('event_date', '>=', now()->startOfDay())
            ->orderBy('event_date', 'asc')
            ->limit(4)
            ->get();

        $featuredProducts = FeaturedProduct::active()
            ->whereHas('product', fn ($q) => $q->active())
            ->with(['product.store:id,name,slug', 'product.store.activeBadges', 'product.media'])
            ->orderBy('sort_order')
            ->limit(config('store.max_homepage_highlights'))
            ->get()
            ->pluck('product')
            ->filter()
            ->values();

        return Inertia::render('Welcome', [
            'upcomingEvents' => $upcomingEvents->values(),
            'featuredProducts' => $featuredProducts,
            'hasPubliclyVisibleStore' => $featuredProducts->isNotEmpty() || Store::publiclyVisible()->exists(),
        ]);
    }
}
