<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\Store;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class StoreDirectoryController extends Controller
{
    public function index(Request $request)
    {
        $stores = QueryBuilder::for(Store::query()->publiclyVisible())
            ->allowedFilters(
                AllowedFilter::callback('search', function (Builder $query, $value) {
                    $query->where('name', 'ilike', "%{$value}%");
                })
            )
            ->withCount(['products as active_products_count' => fn (Builder $q) => $q->where('status', 'active')])
            ->orderByDesc('created_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Store/Directory', [
            'stores' => $stores,
            'filters' => ['search' => $request->input('filter.search')],
        ]);
    }

    public function show(Request $request, Store $store)
    {
        abort_unless($this->isVisibleTo($store, $request), 404);

        $products = QueryBuilder::for(Product::query()->where('store_id', $store->id)->active())
            ->allowedFilters(
                AllowedFilter::exact('type'),
                AllowedFilter::callback('search', function (Builder $query, $value) {
                    $query->where('name', 'ilike', "%{$value}%");
                })
            )
            ->allowedSorts('created_at', 'price')
            ->with(['variants', 'media'])
            ->defaultSort('-created_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Store/Show', [
            'store' => $store->load('primaryAddress.village.district.city.province'),
            'products' => $products,
        ]);
    }

    public function productShow(Request $request, Store $store, string $productSlug)
    {
        abort_unless($this->isVisibleTo($store, $request), 404);

        $product = Product::with(['store', 'variants', 'media'])
            ->where('store_id', $store->id)
            ->where('slug', $productSlug)
            ->where('status', 'active')
            ->firstOrFail();

        return Inertia::render('Store/ProductShow', [
            'store' => $store,
            'product' => $product,
        ]);
    }

    private function isVisibleTo(Store $store, Request $request): bool
    {
        if ($store->isPubliclyVisible()) {
            return true;
        }

        $user = $request->user();

        return $user !== null && $store->isManagedBy($user);
    }
}
