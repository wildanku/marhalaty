<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\GodMode\Exports\StoreOrdersExport;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreOrder;
use App\Domains\Store\Services\OrderFulfillmentService;
use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class StoreOrderController extends Controller
{
    public function __construct(private OrderFulfillmentService $fulfillment) {}

    public function index(Request $request)
    {
        $filters = $request->only(['status', 'store_id', 'date_from', 'date_to']);

        $orders = StoreOrder::with(['store', 'buyer'])
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['store_id'] ?? null, fn ($q, $storeId) => $q->where('store_id', $storeId))
            ->when($filters['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        $stores = Store::orderBy('name')->get(['id', 'name']);

        return Inertia::render('GodMode/StoreOrders/Index', [
            'admin' => auth('admin')->user(),
            'orders' => $orders,
            'stores' => $stores,
            'filters' => $filters,
        ]);
    }

    public function show(string $id)
    {
        $order = StoreOrder::with(['store', 'buyer', 'items', 'transactions', 'statusHistories'])
            ->findOrFail($id);

        return Inertia::render('GodMode/StoreOrders/Show', [
            'admin' => auth('admin')->user(),
            'order' => $order,
            'paymentStatus' => $order->latestTransaction()?->status,
        ]);
    }

    /**
     * Manual "Ubah Status Pesanan" override (fase 11, D50) — the only place that also accepts
     * `pending_payment` ("buka lagi" from `cancelled`/`expired`, D51: god-mode only, doesn't
     * re-lock stock). Every successful call is also written to `admin_activity_logs`, in addition
     * to the per-order timeline in `store_order_status_histories`.
     */
    public function updateStatus(Request $request, string $id)
    {
        $order = StoreOrder::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                'pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled',
            ])],
            'reason' => 'nullable|required_if:status,cancelled|string|max:500',
            'tracking_number' => 'nullable|required_if:status,shipped|string|max:100',
        ]);

        $admin = auth('admin')->user();

        $this->fulfillment->overrideStatus(
            $order,
            $validated['status'],
            $validated['reason'] ?? null,
            'admin',
            $admin->id,
            $validated['tracking_number'] ?? null,
        );

        AdminActivityLog::create([
            'admin_id' => $admin->id,
            'action' => "update_store_order_status:{$order->id}:{$validated['status']}",
        ]);

        return redirect()->back()->with('success', 'Status pesanan berhasil diperbarui.');
    }

    public function exportExcel(Request $request)
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in([
                'pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'expired', 'refunded',
            ])],
            'store_id' => 'nullable|exists:stores,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $orders = StoreOrder::with(['store', 'buyer', 'items', 'transactions'])
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($validated['store_id'] ?? null, fn ($q, $storeId) => $q->where('store_id', $storeId))
            ->when($validated['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($validated['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->orderBy('created_at')
            ->get();

        $filename = 'store-orders-'.now()->format('Ymd-His').'.xlsx';

        return Excel::download(new StoreOrdersExport($orders), $filename);
    }
}
