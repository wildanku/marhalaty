<?php

namespace App\Domains\Event\Services;

use App\Domains\Event\Models\Event;
use App\Domains\Event\Models\EventAddon;
use App\Domains\Event\Models\EventAddonVariant;
use App\Domains\Event\Models\EventPackage;
use App\Domains\Store\Models\ProductReservation;
use App\Domains\Store\Models\ProductVariant;
use App\Domains\Store\Services\ProductStockService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Resolves the addon portion of an RSVP: locks/validates each addon, decides how much it adds to
 * the RSVP total, and — for product-linked addons (D24–D26,
 * docs/plan/mvp2/8-event-product-integration.md) — resolves each buyer-picked variant slot to a
 * real `product_variants` row and reserves stock for it via `ProductStockService` (never touches
 * `Product`/`ProductVariant` directly — D31). Non-linked addons keep the exact behavior
 * `RsvpController@store` has today (decrement `event_addons.stock_quantity` in place).
 *
 * Addendum (supersedes D26): addons — linked or manual — can now have per-combination pricing via
 * `EventAddon::variants` (`EventAddonVariant`, max 2 option groups, mirrors `ProductVariant`)
 * instead of one flat price for every variant. Snapshot shape is unchanged (still one row per
 * addon purchase — splitting rows per price was found to corrupt `RsvpController@update`/
 * `Rsvp/Edit.tsx`, which key `purchased_addon_variants` by a single `addon.id`): `total` is the
 * exact sum of each unit's resolved price, `price` is the average per unit (`total / quantity`),
 * so `price * quantity` still equals `total` whenever a purchase resolves to a single variant —
 * the common case, and the shape every existing snapshot reader already assumes.
 *
 * Pulled out of `RsvpController` per D32 — that method was already ~160 lines before this.
 */
class RsvpAddonResolver
{
    public function __construct(private ProductStockService $productStock) {}

    /**
     * @param  array{
     *   addons?: array<int, array{id:int, quantity:int}>,
     *   purchased_addon_variants?: array<int|string, mixed>,
     *   purchased_addon_forms?: array<int|string, mixed>,
     *   purchased_addon_notes?: array<int|string, string|null>,
     *   included_addon_variants?: array<int|string, mixed>,
     *   included_addon_forms?: array<int|string, mixed>,
     *   included_addon_notes?: array<int|string, string|null>,
     * }  $validated  Exactly RsvpController@store's already-validated request array — same keys
     *   it reads today (`addons`, `purchased_addon_variants`, etc.), so this is a drop-in
     *   replacement for its two addon loops, not a new payload shape to build.
     * @return array{
     *   0: array<int, array<string, mixed>>,
     *   1: float,
     *   2: array<int, ProductReservation>,
     * } [snapshot rows for rsvps.add_ons_snapshot (same shape as today, aditif only —
     *   docs/plan/mvp2/8-event-product-integration.md §1 finding #5), total addon amount to add
     *   to the RSVP's total_amount, reservations created for product-linked items — caller does
     *   nothing with these beyond bookkeeping, ProductStockService already committed the stock
     *   decrement]
     *
     * @throws ValidationException Same failure shape as the current inline code
     *                             (`ValidationException::withMessages(['addons' => ...])`) — stock shortfall, addon not
     *                             found, or a variant slot that can't be resolved to a real `event_addon_variants` row.
     */
    public function resolve(Model $reservable, Event $event, array $validated, ?EventPackage $package): array
    {
        $snapshot = [];
        $reservations = [];
        $addonTotal = 0;

        $purchasedAddonVariants = $validated['purchased_addon_variants'] ?? [];
        $purchasedAddonForms = $validated['purchased_addon_forms'] ?? [];
        $purchasedAddonNotes = $validated['purchased_addon_notes'] ?? [];

        foreach ($validated['addons'] ?? [] as $purchasedAddon) {
            $addon = EventAddon::where('id', $purchasedAddon['id'])
                ->where('event_id', $event->id)
                ->lockForUpdate()
                ->firstOrFail();

            $quantity = (int) $purchasedAddon['quantity'];
            $variantSlots = $purchasedAddonVariants[$purchasedAddon['id']] ?? null;
            $form = $purchasedAddonForms[$purchasedAddon['id']] ?? null;
            $note = $addon->is_product_linked
                ? $this->normalizeNote($purchasedAddonNotes[$purchasedAddon['id']] ?? null)
                : null;

            if ($addon->is_product_linked) {
                [$row, $rowReservations] = $this->resolveLinkedAddon($reservable, $addon, $quantity, $variantSlots, $form, $note, isIncluded: false);
                $reservations = array_merge($reservations, $rowReservations);
            } elseif ($addon->has_variants) {
                if ($addon->stock_quantity < $quantity) {
                    throw ValidationException::withMessages(['addons' => "Stok \"{$addon->name}\" tidak mencukupi."]);
                }

                $addon->decrement('stock_quantity', $quantity);
                $row = $this->resolveManualVariantPricing($addon, $quantity, $variantSlots, $form, isIncluded: false);
            } else {
                // Unchanged from today's RsvpController@store — addons with no variants still
                // spend their own event-local stock_quantity at one flat price.
                if ($addon->stock_quantity < $quantity) {
                    throw ValidationException::withMessages(['addons' => "Stok \"{$addon->name}\" tidak mencukupi."]);
                }

                $addon->decrement('stock_quantity', $quantity);
                $row = $this->buildAddonRow($addon, $quantity, $variantSlots, $form, isIncluded: false, total: (float) $addon->price * $quantity);
            }

            $addonTotal += $row['total'];
            $snapshot[] = $row;
        }

        // Included-addon variant/form selections (no charge — the package price already covers
        // them). Behavior change from today (D25 / §1 finding #2): a product-linked included addon
        // now DOES reserve stock, because the merchandise physically leaves the seller's shelf
        // regardless of whether the buyer paid for it separately or it came bundled in a package.
        $includedAddonVariants = $validated['included_addon_variants'] ?? [];
        $includedAddonForms = $validated['included_addon_forms'] ?? [];
        $includedAddonNotes = $validated['included_addon_notes'] ?? [];
        $includedAddonIds = array_unique(array_merge(
            array_keys($includedAddonVariants),
            array_keys($includedAddonForms),
            array_keys($includedAddonNotes),
        ));

        if (! empty($includedAddonIds) && $package) {
            $package->loadMissing('includedAddons');

            foreach ($includedAddonIds as $addonId) {
                $includedAddon = $package->includedAddons->firstWhere('id', $addonId);

                if (! $includedAddon) {
                    continue;
                }

                $quantity = (int) $includedAddon->pivot->included_quantity;
                $variantSlots = $includedAddonVariants[$addonId] ?? null;
                $form = $includedAddonForms[$addonId] ?? null;
                $note = $includedAddon->is_product_linked
                    ? $this->normalizeNote($includedAddonNotes[$addonId] ?? null)
                    : null;

                if ($includedAddon->is_product_linked) {
                    [$row, $rowReservations] = $this->resolveLinkedAddon($reservable, $includedAddon, $quantity, $variantSlots, $form, $note, isIncluded: true);
                    $reservations = array_merge($reservations, $rowReservations);
                } elseif ($includedAddon->has_variants) {
                    $row = $this->resolveManualVariantPricing($includedAddon, $quantity, $variantSlots, $form, isIncluded: true);
                } else {
                    $row = $this->buildAddonRow($includedAddon, $quantity, $variantSlots, $form, isIncluded: true, total: 0);
                }

                $snapshot[] = $row;
            }
        }

        return [$snapshot, $addonTotal, $reservations];
    }

    /**
     * @return array{0: array<string, mixed>, 1: array<int, ProductReservation>}
     */
    private function resolveLinkedAddon(Model $reservable, EventAddon $addon, int $quantity, mixed $variantSlots, mixed $form, ?string $note, bool $isIncluded): array
    {
        $reservations = [];
        $total = 0;

        if (! $addon->has_variants) {
            // Locked to one specific variant (or the product itself has no variants) — one
            // reservation covers the whole quantity, price stays the addon's own flat price (D24).
            $lockedVariant = $addon->product_variant_id ? $addon->variant()->first() : null;
            $reservations[] = $this->productStock->reserve($reservable, $addon, $lockedVariant, $quantity, $variantSlots ?? []);
            $total = (float) $addon->price * $quantity;
        } else {
            // Buyer picked a variant per unit, possibly different variants — and now possibly
            // different prices — across units (addendum, supersedes D26's flat price) — one
            // reservation row per distinct variant, quantities grouped.
            $addon->loadMissing('variants');

            foreach ($this->resolveVariantUnitCounts($addon, $quantity, $variantSlots) as $eventAddonVariantId => $qty) {
                $eventAddonVariant = $addon->variants->firstWhere('id', $eventAddonVariantId);
                $productVariant = $eventAddonVariant->product_variant_id
                    ? ProductVariant::find($eventAddonVariant->product_variant_id)
                    : null;

                $reservations[] = $this->productStock->reserve($reservable, $addon, $productVariant, $qty, [
                    'option1_value' => $eventAddonVariant->option1_value,
                    'option2_value' => $eventAddonVariant->option2_value,
                ]);

                $total += (float) $eventAddonVariant->price * $qty;
            }
        }

        $row = $this->buildAddonRow($addon, $quantity, $variantSlots, $form, $isIncluded, $total, $note);

        return [$row, $reservations];
    }

    /**
     * Manual (non-linked) addon with per-combination pricing — no product/stock reservation (D31:
     * only real store products carry stock), but the price charged still depends on which
     * combination the buyer picked. Stock is still the addon's own flat `stock_quantity`, decremented
     * by the caller for the total quantity regardless of which combinations were chosen.
     */
    private function resolveManualVariantPricing(EventAddon $addon, int $quantity, mixed $variantSlots, mixed $form, bool $isIncluded): array
    {
        $addon->loadMissing('variants');

        $total = 0;

        foreach ($this->resolveVariantUnitCounts($addon, $quantity, $variantSlots) as $eventAddonVariantId => $qty) {
            $eventAddonVariant = $addon->variants->firstWhere('id', $eventAddonVariantId);
            $total += (float) $eventAddonVariant->price * $qty;
        }

        return $this->buildAddonRow($addon, $quantity, $variantSlots, $form, $isIncluded, $total);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAddonRow(EventAddon $addon, int $quantity, mixed $variantSlots, mixed $form, bool $isIncluded, float $total, ?string $note = null): array
    {
        if ($isIncluded) {
            $row = [
                'id' => $addon->id,
                'name' => $addon->name,
                'price' => 0,
                'quantity' => $quantity,
                'variants' => $variantSlots,
                'form' => $form,
                'total' => 0,
                'is_included' => true,
            ];

            if ($note !== null) {
                $row['note'] = $note;
            }

            return $row;
        }

        $row = [
            'id' => $addon->id,
            'name' => $addon->name,
            'price' => $quantity > 0 ? round($total / $quantity, 2) : (float) $addon->price,
            'quantity' => $quantity,
            'variant_slots' => $variantSlots,
            'form' => $form,
            'total' => $total,
        ];

        if ($note !== null) {
            $row['note'] = $note;
        }

        return $row;
    }

    private function normalizeNote(mixed $note): ?string
    {
        $normalized = trim((string) $note);

        return $normalized === '' ? null : $normalized;
    }

    /**
     * @return array<int, int> event_addon_variants.id => quantity
     *
     * @throws ValidationException When the buyer's selection doesn't cover every unit, or a slot
     *                             doesn't match any active `event_addon_variants` row.
     */
    private function resolveVariantUnitCounts(EventAddon $addon, int $quantity, mixed $variantSlots): array
    {
        // Frontend sends picks "columnar" — {variantKey: [valuePerUnitIndex, ...]}, one array per
        // option column (Event/Show.tsx `purchased_addon_variants`/`included_addon_variants`,
        // mirrored by Rsvp/Edit.tsx's handlePurchasedVariant/handleIncludedVariant) — never the
        // row-based `[{variantKey: value}, ...]` this method used to expect directly, which made
        // every multi-unit variant purchase fail `count($variantSlots) !== $quantity` below.
        $expectedKeys = is_array($variantSlots) ? count($variantSlots) : 0;
        $rows = $this->columnarVariantSlotsToRows($variantSlots, $quantity);

        if ($expectedKeys === 0 || collect($rows)->contains(fn (array $row) => count($row) !== $expectedKeys)) {
            throw ValidationException::withMessages([
                'addons' => "Pilihan varian untuk \"{$addon->name}\" belum lengkap.",
            ]);
        }

        $variants = $addon->variants->where('is_active', true);
        $counts = [];

        foreach ($rows as $row) {
            $variant = $this->matchVariant($variants, $row);

            if (! $variant) {
                throw ValidationException::withMessages([
                    'addons' => "Kombinasi varian untuk \"{$addon->name}\" tidak tersedia.",
                ]);
            }

            $counts[$variant->id] = ($counts[$variant->id] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * Transposes the columnar `{variantKey: [valuePerUnitIndex, ...]}` shape into one slot per
     * unit (`{variantKey: value}`), same indexing `Event/Show.tsx`'s totals memo uses to price
     * each unit client-side. Always returns exactly `$quantity` rows — a unit with no value for a
     * given key simply omits that key, which `resolveVariantUnitCounts()` above treats as
     * incomplete.
     *
     * @return array<int, array<string, string>>
     */
    private function columnarVariantSlotsToRows(mixed $variantSlots, int $quantity): array
    {
        $rows = [];

        for ($i = 0; $i < $quantity; $i++) {
            $row = [];

            if (is_array($variantSlots)) {
                foreach ($variantSlots as $variantKey => $values) {
                    $value = is_array($values) ? ($values[$i] ?? null) : null;

                    if ($value !== null && $value !== '') {
                        $row[$variantKey] = $value;
                    }
                }
            }

            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * A slot is `{"Ukuran": "L", "Warna": "Merah"}` — option name → chosen value. Matched against
     * the *set* of values on each variant rather than by option-name-to-slot position, since
     * `option1_name`/`option2_name` ordering isn't guaranteed to match the slot's key order.
     */
    private function matchVariant(iterable $variants, mixed $slot): ?EventAddonVariant
    {
        if (! is_array($slot)) {
            return null;
        }

        $wanted = array_values(array_filter($slot, fn ($v) => $v !== null && $v !== ''));
        sort($wanted);

        foreach ($variants as $variant) {
            $actual = array_values(array_filter([$variant->option1_value, $variant->option2_value]));
            sort($actual);

            if ($actual === $wanted) {
                return $variant;
            }
        }

        return null;
    }
}
