<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\Store\Models\Product;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Cross-store product search for the "Ambil dari Produk Toko" addon-linking modal
 * (docs/plan/mvp2/8-event-product-integration.md §5.1). Deliberately not scoped to one store —
 * admin already has full authority over every store via god-mode.
 */
class ProductSearchController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search', '');

        $products = Product::with(['store', 'variants'])
            ->when($search, function (Builder $query) use ($search) {
                $query->where(function (Builder $q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                        ->orWhere('sku', 'ilike', "%{$search}%")
                        ->orWhereHas('store', fn (Builder $s) => $s->where('name', 'ilike', "%{$search}%"));
                });
            })
            ->orderBy('name')
            ->limit(30)
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'label' => "{$product->name} — {$product->store?->name}",
                'name' => $product->name,
                'store_name' => $product->store?->name,
                'type' => $product->type,
                'status' => $product->status,
                'has_variants' => $product->has_variants,
                'display_price' => $product->display_price,
                'available_stock' => $product->available_stock,
                'image_url' => $product->primary_image_url,
                'variants' => $product->has_variants
                    ? $product->variants->where('is_active', true)->values()->map(fn ($v) => [
                        'id' => $v->id,
                        'label' => $v->label,
                        'price' => $v->price,
                        'stock_quantity' => $v->stock_quantity,
                        'option1_name' => $v->option1_name,
                        'option1_value' => $v->option1_value,
                        'option2_name' => $v->option2_name,
                        'option2_value' => $v->option2_value,
                    ])
                    : [],
            ]);

        return response()->json($products);
    }
}
