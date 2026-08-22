<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Requests\StoreProductRequest;
use App\Domains\Store\Requests\StoreProductImportRequest;
use App\Domains\Store\Services\ProductService;
use App\Domains\Store\Support\StoreManagementUrl;
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
            'role' => $store->roleFor($request->user()),
            'products' => $products,
        ]);
    }

    public function create(Request $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        return Inertia::render('Store/Manage/Products/Form', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
            'product' => null,
        ]);
    }

    public function importForm(Request $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        return Inertia::render('Store/Manage/Products/Import', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
        ]);
    }

    public function import(StoreProductImportRequest $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        $this->products->importProducts($store, $request->products());

        return redirect()->to(StoreManagementUrl::base($request, $store).'/products')
            ->with('success', count($request->products()).' produk berhasil diimpor.');
    }

    public function store(StoreProductRequest $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        $this->products->saveProduct($store, $request->validated() + [
            'digital_file' => $request->file('digital_file'),
            'images' => $request->file('images', []),
        ]);

        return redirect()->to(StoreManagementUrl::base($request, $store).'/products')->with('success', 'Produk berhasil dibuat.');
    }

    public function edit(Request $request, Store $store, Product $product)
    {
        $this->authorize('manageProducts', $store);
        abort_unless($product->store_id === $store->id, 404);

        $product->load(['variants', 'media']);

        return Inertia::render('Store/Manage/Products/Form', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
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

        return redirect()->to(StoreManagementUrl::base($request, $store).'/products')->with('success', 'Produk berhasil diperbarui.');
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

    public function destroy(Request $request, Store $store, Product $product)
    {
        $this->authorize('manageProducts', $store);
        abort_unless($product->store_id === $store->id, 404);

        $this->products->destroy($product);

        return redirect()->to(StoreManagementUrl::base($request, $store).'/products')->with('success', 'Produk berhasil dihapus.');
    }
}
