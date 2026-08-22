<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreShippingMethod;
use App\Domains\Store\Requests\StoreShippingMethodRequest;
use App\Domains\Store\Support\StoreManagementUrl;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StoreShippingMethodController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $this->authorize('manageShipping', $store);

        return Inertia::render('Store/Manage/ShippingMethods/Index', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
            'methods' => $store->shippingMethods()->orderByDesc('created_at')->get(),
        ]);
    }

    public function create(Request $request, Store $store)
    {
        $this->authorize('manageShipping', $store);

        return Inertia::render('Store/Manage/ShippingMethods/Form', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
            'method' => null,
        ]);
    }

    public function store(StoreShippingMethodRequest $request, Store $store)
    {
        $this->authorize('manageShipping', $store);

        $store->shippingMethods()->create($request->validated());

        return redirect()->to(StoreManagementUrl::base($request, $store).'/shipping-methods')->with('success', 'Metode pengiriman berhasil dibuat.');
    }

    public function edit(Request $request, Store $store, StoreShippingMethod $shippingMethod)
    {
        $this->authorize('manageShipping', $store);
        abort_unless($shippingMethod->store_id === $store->id, 404);

        return Inertia::render('Store/Manage/ShippingMethods/Form', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
            'method' => $shippingMethod,
        ]);
    }

    public function update(StoreShippingMethodRequest $request, Store $store, StoreShippingMethod $shippingMethod)
    {
        $this->authorize('manageShipping', $store);
        abort_unless($shippingMethod->store_id === $store->id, 404);

        $shippingMethod->update($request->validated());

        return redirect()->to(StoreManagementUrl::base($request, $store).'/shipping-methods')->with('success', 'Metode pengiriman berhasil diperbarui.');
    }

    public function updateStatus(Request $request, Store $store, StoreShippingMethod $shippingMethod)
    {
        $this->authorize('manageShipping', $store);
        abort_unless($shippingMethod->store_id === $store->id, 404);

        $validated = $request->validate(['is_active' => 'required|boolean']);

        $shippingMethod->update(['is_active' => $validated['is_active']]);

        return redirect()->back()->with('success', 'Status metode pengiriman berhasil diperbarui.');
    }

    public function destroy(Request $request, Store $store, StoreShippingMethod $shippingMethod)
    {
        $this->authorize('manageShipping', $store);
        abort_unless($shippingMethod->store_id === $store->id, 404);

        $shippingMethod->delete();

        return redirect()->to(StoreManagementUrl::base($request, $store).'/shipping-methods')->with('success', 'Metode pengiriman berhasil dihapus.');
    }
}
