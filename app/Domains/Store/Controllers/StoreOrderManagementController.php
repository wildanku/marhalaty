<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
            'role' => $store->roleFor($request->user()),
            'orders' => $orders,
            'status' => $status,
        ]);
    }

    public function show(Request $request, Store $store, StoreOrder $order)
    {
        $this->authorize('manageOrders', $store);
        abort_unless($order->store_id === $store->id, 404);

        $order->load(['items', 'buyer', 'statusHistories']);

        return Inertia::render('Store/Manage/Orders/Show', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
            'order' => $order,
            'paymentStatus' => $order->latestTransaction()?->status,
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

    /**
     * Manual "Ubah Status Pesanan" override (fase 11, D50). Never accepts `pending_payment` —
     * "buka lagi" from `cancelled`/`expired` is god-mode only (D51), since it doesn't re-lock
     * stock and needs manual availability verification.
     */
    public function updateStatus(Request $request, Store $store, StoreOrder $order)
    {
        $this->authorize('manageOrders', $store);
        abort_unless($order->store_id === $store->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['paid', 'processing', 'shipped', 'completed', 'cancelled'])],
            'reason' => 'nullable|required_if:status,cancelled|string|max:500',
            'tracking_number' => 'nullable|required_if:status,shipped|string|max:100',
        ]);

        $this->fulfillment->overrideStatus(
            $order,
            $validated['status'],
            $validated['reason'] ?? null,
            auth('admin')->check() ? 'admin' : 'store_member',
            $request->user()->id,
            $validated['tracking_number'] ?? null,
        );

        return redirect()->back()->with('success', 'Status pesanan berhasil diperbarui.');
    }
}
