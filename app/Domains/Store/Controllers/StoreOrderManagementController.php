<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Seller-side order management (`/my/stores/{store}/orders*`). Every status change is delegated
 * to `OrderFulfillmentService`, which enforces the transition map — this controller never calls
 * `$order->update(['status' => ...])` directly.
 */
class StoreOrderManagementController extends Controller
{
    public function __construct(private OrderFulfillmentService $fulfillment) {}

    public function index(Request $request, Store $store)
    {
        $this->authorize('manageOrders', $store);

        $status = $request->input('status');

        $orders = StoreOrder::where('store_id', $store->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Store/Manage/Orders/Index', [
            'store' => $store,
            'orders' => $orders,
            'status' => $status,
        ]);
    }

    public function show(Store $store, StoreOrder $order)
    {
        $this->authorize('manageOrders', $store);
        abort_unless($order->store_id === $store->id, 404);

        $order->load(['items', 'buyer']);

        return Inertia::render('Store/Manage/Orders/Show', [
            'store' => $store,
            'order' => $order,
        ]);
    }

    public function process(Store $store, StoreOrder $order)
    {
        $this->authorize('manageOrders', $store);
        abort_unless($order->store_id === $store->id, 404);

        $this->fulfillment->markProcessing($order);

        return redirect()->back()->with('success', 'Pesanan sedang diproses.');
    }

    public function ship(Request $request, Store $store, StoreOrder $order)
    {
        $this->authorize('manageOrders', $store);
        abort_unless($order->store_id === $store->id, 404);

        $validated = $request->validate([
            'tracking_number' => 'required|string|max:100',
        ]);

        $this->fulfillment->markShipped($order, $validated['tracking_number']);

        return redirect()->back()->with('success', 'Nomor resi berhasil disimpan, pesanan ditandai dikirim.');
    }

    public function cancel(Request $request, Store $store, StoreOrder $order)
    {
        $this->authorize('manageOrders', $store);
        abort_unless($order->store_id === $store->id, 404);

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $this->fulfillment->cancel($order, $validated['reason']);

        return redirect()->back()->with('success', 'Pesanan berhasil dibatalkan.');
    }
}
