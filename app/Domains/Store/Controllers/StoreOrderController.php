<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StoreOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = StoreOrder::where('buyer_user_id', $request->user()->id)
            ->with('store')
            ->orderByDesc('created_at')
            ->paginate(10);

        return Inertia::render('Store/Orders/Index', ['orders' => $orders]);
    }

    public function show(Request $request, string $id)
    {
        $order = StoreOrder::where('buyer_user_id', $request->user()->id)
            ->with(['items.digitalDeliveries', 'store'])
            ->findOrFail($id);

        return Inertia::render('Store/Orders/Show', [
            'order' => $order,
            'transaction' => $order->latestTransaction(),
        ]);
    }

    /**
     * Buyer self-marks a shipped order as received. Only "shipped" is a legal starting state —
     * `OrderFulfillmentService` enforces that, this controller just checks ownership.
     */
    public function complete(Request $request, string $id, OrderFulfillmentService $fulfillment)
    {
        $order = StoreOrder::where('buyer_user_id', $request->user()->id)->findOrFail($id);

        $fulfillment->markCompleted($order);

        return redirect()->back()->with('success', 'Terima kasih! Pesanan ditandai selesai.');
    }
}
