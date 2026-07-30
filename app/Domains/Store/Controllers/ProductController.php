<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Requests\StoreProductRequest;
use App\Domains\Store\Services\ProductService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function __construct(private ProductService $products) {}

    public function index(Request $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        $products = $store->products()
            ->with(['variants', 'media'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Store/Manage/Products/Index', [
            'store' => $store,
            'products' => $products,
        ]);
    }

    public function create(Store $store)
    {
        $this->authorize('manageProducts', $store);

        return Inertia::render('Store/Manage/Products/Form', [
            'store' => $store,
            'product' => null,
        ]);
    }

    public function store(StoreProductRequest $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        $this->products->saveProduct($store, $request->validated() + [
            'digital_file' => $request->file('digital_file'),
            'images' => $request->file('images', []),
        ]);

        return redirect()->route('stores.products.index', $store)->with('success', 'Produk berhasil dibuat.');
    }

    public function edit(Store $store, Product $product)
    {
        $this->authorize('manageProducts', $store);
        abort_unless($product->store_id === $store->id, 404);

        $product->load(['variants', 'media']);

        return Inertia::render('Store/Manage/Products/Form', [
            'store' => $store,
            'product' => $product,
        ]);
    }

    public function update(StoreProductRequest $request, Store $store, Product $product)
    {
        $this->authorize('manageProducts', $store);
        abort_unless($product->store_id === $store->id, 404);

        $this->products->saveProduct($store, $request->validated() + [
            'digital_file' => $request->file('digital_file'),
            'images' => $request->file('images', []),
        ], $product);

        return redirect()->route('stores.products.index', $store)->with('success', 'Produk berhasil diperbarui.');
    }

    public function updateStatus(Request $request, Store $store, Product $product)
    {
        $this->authorize('manageProducts', $store);
        abort_unless($product->store_id === $store->id, 404);

        $validated = $request->validate([
            'status' => 'required|in:draft,active,archived',
        ]);

        $product->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Status produk berhasil diperbarui.');
    }

    public function destroy(Store $store, Product $product)
    {
        $this->authorize('manageProducts', $store);
        abort_unless($product->store_id === $store->id, 404);

        $this->products->destroy($product);

        return redirect()->route('stores.products.index', $store)->with('success', 'Produk berhasil dihapus.');
    }
}
