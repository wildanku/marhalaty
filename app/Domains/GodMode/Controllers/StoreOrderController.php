<?php

namespace App\Domains\GodMode\Controllers;

use App\Domains\GodMode\Exports\StoreOrdersExport;
use App\Domains\Store\Models\Store;
use App\Domains\Store\Models\StoreOrder;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class StoreOrderController extends Controller
{
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
        $order = StoreOrder::with(['store', 'buyer', 'items', 'transactions'])
            ->findOrFail($id);

        return Inertia::render('GodMode/StoreOrders/Show', [
            'admin' => auth('admin')->user(),
            'order' => $order,
        ]);
    }

    public function exportExcel(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:stores,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $orders = StoreOrder::with(['store', 'buyer', 'items'])
            ->when($validated['store_id'] ?? null, fn ($q, $storeId) => $q->where('store_id', $storeId))
            ->when($validated['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($validated['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->orderBy('created_at')
            ->get();

        $filename = 'store-orders-'.now()->format('Ymd-His').'.xlsx';

        return Excel::download(new StoreOrdersExport($orders), $filename);
    }
}
