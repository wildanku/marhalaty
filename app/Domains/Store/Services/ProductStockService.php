<?php

namespace App\Domains\Store\Services;

use App\Domains\Event\Models\EventAddon;
use App\Domains\Store\Models\Product;
use App\Domains\Store\Models\ProductReservation;
use App\Domains\Store\Models\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only place allowed to mutate `products`/`product_variants` stock on behalf of a channel
 * outside the normal store checkout (today: event RSVPs via product-linked addons — D31,
 * docs/plan/mvp2/8-event-product-integration.md). Event domain code must never call
 * `Product::decrement()` directly; it goes through here so locking, idempotency, and the
 * product-vs-variant branch live in exactly one file.
 */
class ProductStockService
{
    /**
     * Locks the product (and variant, if given), validates it's actually sellable, decrements
     * stock, and records the movement as a `ProductReservation` row. Mirrors
     * `CheckoutService::lockAndValidateItems()`'s locking pattern.
     *
     * @param  Model  $reservable  Polymorphic owner of the reservation — today always an `Rsvp`.
     * @param  array<string, mixed>  $selection  Buyer's chosen option combination (e.g. {"Ukuran":"L","Warna":"Merah"}), stored as-is for the seller-facing recap.
     *
     * @throws ValidationException if the product/variant isn't sellable or stock is insufficient.
     */
    public function reserve(Model $reservable, EventAddon $addon, ?ProductVariant $variant, int $qty, array $selection = []): ProductReservation
    {
        return DB::transaction(function () use ($reservable, $addon, $variant, $qty, $selection) {
            $product = Product::where('id', $addon->product_id)->lockForUpdate()->first();

            if (! $product) {
                throw ValidationException::withMessages([
                    'addons' => "Produk untuk \"{$addon->name}\" tidak ditemukan.",
                ]);
            }

            if ($product->status !== 'active' || ! $product->store?->isPubliclyVisible()) {
                throw ValidationException::withMessages([
                    'addons' => "Produk untuk \"{$addon->name}\" sudah tidak tersedia.",
                ]);
            }

            $lockedVariant = null;

            if ($variant) {
                $lockedVariant = ProductVariant::where('id', $variant->id)
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                if (! $lockedVariant || ! $lockedVariant->is_active) {
                    throw ValidationException::withMessages([
                        'addons' => "Varian untuk \"{$addon->name}\" sudah tidak tersedia.",
                    ]);
                }
            }

            $stock = $lockedVariant ? (int) $lockedVariant->stock_quantity : (int) ($product->stock_quantity ?? 0);

            if ($qty > $stock) {
                throw ValidationException::withMessages([
                    'addons' => "Stok \"{$addon->name}\" tidak mencukupi (tersisa {$stock}).",
                ]);
            }

            if ($lockedVariant) {
                ProductVariant::where('id', $lockedVariant->id)->decrement('stock_quantity', $qty);
            } else {
                Product::where('id', $product->id)->decrement('stock_quantity', $qty);
            }

            return ProductReservation::create([
                'product_id' => $product->id,
                'product_variant_id' => $lockedVariant?->id,
                'reservable_type' => $reservable->getMorphClass(),
                'reservable_id' => (string) $reservable->getKey(),
                'event_addon_id' => $addon->id,
                'quantity' => $qty,
                'status' => 'reserved',
                'selection_snapshot' => $selection ?: null,
            ]);
        });
    }

    /**
     * Credits stock back for every still-`reserved` reservation belonging to `$reservable` and
     * marks them `released`. Idempotent via `released_at`/`status` — a second call (e.g. the
     * expiry command racing a manual cancellation) finds nothing left to touch and returns 0.
     *
     * @return int Number of reservation rows released by this call.
     */
    public function releaseFor(Model $reservable): int
    {
        return DB::transaction(function () use ($reservable) {
            $reservations = ProductReservation::where('reservable_type', $reservable->getMorphClass())
                ->where('reservable_id', (string) $reservable->getKey())
                ->where('status', 'reserved')
                ->lockForUpdate()
                ->get();

            $count = 0;

            foreach ($reservations as $reservation) {
                if ($reservation->product_variant_id) {
                    ProductVariant::where('id', $reservation->product_variant_id)->increment('stock_quantity', $reservation->quantity);
                } else {
                    Product::where('id', $reservation->product_id)->increment('stock_quantity', $reservation->quantity);
                }

                $reservation->update(['status' => 'released', 'released_at' => now()]);
                $count++;
            }

            return $count;
        });
    }

    /**
     * Marks a reservation as handed over at the event. Does not touch stock — that was already
     * decremented at reserve() time; this is purely a bookkeeping transition for the seller/admin
     * recap (§5.3). No-ops if the reservation isn't currently `reserved` (e.g. already fulfilled,
     * or already released because the RSVP was cancelled).
     */
    public function fulfill(ProductReservation $reservation): void
    {
        DB::transaction(function () use ($reservation) {
            $locked = ProductReservation::where('id', $reservation->id)->lockForUpdate()->first();

            if (! $locked || $locked->status !== 'reserved') {
                return;
            }

            $locked->update(['status' => 'fulfilled', 'fulfilled_at' => now()]);
        });
    }

    /**
     * Live stock for display purposes (not locked — informational only, e.g. disabling a sold-out
     * variant combo in the UI). Pass the specific `$variant` a buyer is looking at; pass null for
     * a non-variant product addon.
     */
    public function availableFor(EventAddon $addon, ?ProductVariant $variant): int
    {
        if ($variant) {
            return (int) (ProductVariant::where('id', $variant->id)->value('stock_quantity') ?? 0);
        }

        if (! $addon->product_id) {
            return 0;
        }

        return (int) (Product::where('id', $addon->product_id)->value('stock_quantity') ?? 0);
    }
}
