<?php

namespace App\Domains\Store\Controllers;

use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductReservation;
use App\Domains\Store\Models\Store;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Seller-facing "Pesanan Event" recap (docs/plan/mvp2/8-event-product-integration.md §5.3): which
 * events pulled stock from this store's products, grouped so a seller can see what to bring
 * without asking admin. Read-only — payment for these items runs through the event's own ledger,
 * not the seller (D30); this endpoint doesn't imply an order the seller needs to fulfill payment
 * for.
 */
class StoreEventReservationController extends Controller
{
    /**
     * Page shell — the actual list is fetched client-side from index() below (JSON, not an
     * Inertia prop) to stay consistent with CLAUDE.md's "no unbounded datasets as Inertia props".
     */
    public function page(Request $request, Store $store)
    {
        $this->authorize('manageProducts', $store);

        return Inertia::render('Store/Manage/EventReservations/Index', [
            'store' => $store,
            'role' => $store->roleFor($request->user()),
        ]);
    }

    public function index(Store $store)
    {
        $this->authorize('manageProducts', $store);

        $productIds = Product::where('store_id', $store->id)->pluck('id');

        $reservations = ProductReservation::with(['product', 'variant', 'addon.event'])
            ->whereIn('product_id', $productIds)
            ->whereIn('status', ['reserved', 'fulfilled'])
            ->get()
            ->filter(fn (ProductReservation $r) => $r->addon?->event !== null)
            ->groupBy(fn (ProductReservation $r) => $r->addon->event_id)
            ->map(function ($group) {
                $event = $group->first()->addon->event;

                $items = $group
                    ->groupBy(fn (ProductReservation $r) => $r->product_id.'|'.($r->product_variant_id ?? 'none'))
                    ->map(function ($itemGroup) {
                        $first = $itemGroup->first();

                        return [
                            'product_name' => $first->product?->name,
                            'variant_label' => $first->variant?->label,
                            'reserved' => $itemGroup->where('status', 'reserved')->sum('quantity'),
                            'fulfilled' => $itemGroup->where('status', 'fulfilled')->sum('quantity'),
                        ];
                    })
                    ->values();

                return [
                    'event_id' => $event->id,
                    'event_title' => $event->title,
                    'event_date' => $event->event_date,
                    'items' => $items,
                ];
            })
            ->values();

        return response()->json($reservations);
    }
}
