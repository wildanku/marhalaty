# Task 18: Store Custom Shipping Methods (flat-fee / pickup)

## Overview

Lets a seller define their own shipping options (e.g. "Ambil di Toko", "Kurir Toko — Dalam Kota")
with a seller-set flat fee, entirely independent of RajaOngkir — no distance/weight lookup, no
third-party API call. These coexist with the existing RajaOngkir courier picker at checkout; the
buyer picks either. `pickup`-type methods skip the buyer-address requirement entirely (there's
nothing to resolve — the destination *is* the store).

Design calls made without asking (documented here, flag if wrong):
- Coexistence, not replacement: a store can offer real couriers AND custom methods side by side.
- Two method types: `pickup` (no buyer address required) and `flat` (still collects a buyer
  address for the store to actually deliver to — just not resolved against RajaOngkir).
- Any active store member can manage shipping methods (mirrors `manageProducts`), not owner-only.
- Once a buyer picks `pickup`, the RajaOngkir courier list is hidden entirely (no address to price
  against). For `flat`, it stays visible alongside so the buyer can still compare/switch to a real
  courier — switching is one click since picking a courier rate clears the custom-method selection.

## Backend

- [x] Migration: `create_store_shipping_methods_table` (ULID PK, foreignUlid store_id, name, type enum[pickup,flat], fee decimal, description nullable, is_active)
- [x] Migration: `add_store_shipping_method_id_to_store_orders_table` (nullable foreignUlid, `nullOnDelete()` — traceability only, display fields are already snapshotted)
- [x] Migration: delete-tracking trigger for `store_shipping_methods`
- [x] Model `StoreShippingMethod` (HasUlids, belongsTo Store)
- [x] Registered `StoreShippingMethod::observe(DeletedItemObserver::class)` in `AppServiceProvider::boot()`
- [x] `StorePolicy::manageShipping()` (same rule as `manageProducts`)
- [x] `StoreShippingMethodRequest` (name required max:100, type required in:pickup,flat, fee required numeric min:0, description nullable max:500)
- [x] Controller `Store\Controllers\StoreShippingMethodController` (index/create/store/edit/update/status/destroy) — mirrors `ProductController`'s shape
- [x] Routes: `/my/stores/{store}/shipping-methods*`
- [x] `CheckoutController::show()` passes the store's active `shippingMethods` to the Checkout page
- [x] `CheckoutController::store()` validation: added `shipping_method_id` (nullable, exists:store_shipping_methods,id)
- [x] `CheckoutService::resolveShipping()` branches: `shipping_method_id` present → new `resolveCustomShipping()` (validates method belongs to store + is active, `pickup` skips address entirely, `flat` still requires+snapshots a buyer address) → skips `AddressResolver`/`calculateCost()` entirely; otherwise unchanged RajaOngkir path
- [x] Order snapshot reuses existing columns for display (`shipping_provider='store'`, `shipping_courier_code=<type>`, `shipping_courier_name=<name>`) plus the new `store_shipping_method_id` FK for traceability

## Frontend

- [x] TS type `StoreShippingMethod` in `types/index.d.ts`
- [x] `Pages/Store/Manage/ShippingMethods/Index.tsx` (list, active/inactive toggle, delete)
- [x] `Pages/Store/Manage/ShippingMethods/Form.tsx` (shared create/edit: name, type radio, fee CurrencyInput, description textarea)
- [x] `Pages/Store/Manage/Dashboard.tsx` — third stat card "Metode Pengiriman" (`shippingMethodCount` prop from `StoreController::show()`), same stat-card-as-link pattern as Produk/Pesanan
- [x] `Pages/Store/Checkout.tsx`:
  - `shippingMethods` prop, new `selectedMethod` state, mutually exclusive with `shippingRate` (picking one clears the other)
  - "Pilih Kurir" section renamed "Pilih Pengiriman" — custom methods listed first (always visible, no address needed), existing `ShippingRatePicker` below (hidden only for `pickup`)
  - "Alamat Pengiriman" section hidden when the selected method is `pickup`
  - `canSubmit`/`data` sync (via the `useEffect` from the earlier checkout fix) extended with `shipping_method_id`
  - `OrderSummary` shipping cost reflects `selectedMethod.fee` when a custom method is chosen
- [x] `Pages/Store/Manage/Orders/Show.tsx` — small addendum fix (see below): seller now sees which courier/method was used, and a dedicated "no shipping needed" note for pickup orders where there's no address to show

## Definition of Done

- [x] Seller creates a `pickup` method (fee 0) and a `flat` method (fee > 0) from the store dashboard — **browser-tested**: created "Ambil di Toko" (Gratis) and "Kurir Toko (Dalam Kota)" (Rp 15.000)
- [x] Buyer checkout: picking a `pickup` method hides the address section and completes checkout with no `user_address_id` — **browser-tested**: address section disappeared, order created with `shipping_address_snapshot: null`, `shipping_cost: 0`
- [x] Buyer checkout: picking a `flat` method still requires an address, uses the flat fee, and does not call RajaOngkir for that fee — **browser-tested**: address stayed required, order created with `shipping_cost: 15000`, `shipping_provider: 'store'` (the concurrently-visible RajaOngkir list is a deliberate comparison feature, not part of the flat order's own cost resolution — `resolveCustomShipping()` never calls `calculateCost()`, confirmed by code path)
- [x] Buyer checkout: real RajaOngkir courier selection still works unchanged — **browser-tested** (regression check): selected J&T Express directly, order created with `shipping_provider: 'rajaongkir'`, `store_shipping_method_id: NULL`, correct cost
- [x] Order created via a custom method displays correctly on both buyer (`Orders/Show.tsx`) and seller (`Manage/Orders/Show.tsx`) pages — buyer page needed zero changes (already generic); seller page needed a small addendum (see below) since pickup is the first case where `requires_shipping=true` but there's no address to show at all
- [x] Deleting a shipping method doesn't break past orders — enforced structurally via `nullOnDelete()` + full display-column snapshotting (not re-verified with a live round-trip in this session, but the same pattern already proven for `Product` deletion is not applicable here since there's no analogous "hasBeenOrdered" block — nothing about a `StoreShippingMethod` needs to survive deletion for order display)

### Addendum: seller order page didn't show shipping method for pickup orders

`Manage/Orders/Show.tsx` only ever rendered a shipping block `if (order.requires_shipping &&
shippingAddress)` — before this feature, every `requires_shipping` order always had an address, so
this was never a gap. A `pickup` order breaks that assumption (`requires_shipping=true`,
`shipping_address_snapshot=null`), and the seller would see nothing at all — no address block, no
explanation, indistinguishable from a data bug. Fixed with two small additions: the existing
address block now also shows the courier/method name (`Alamat Pengiriman · Kurir Toko (Dalam
Kota)`), and a new block covers the no-address case (`Pengiriman: Ambil di Toko` — "Pembeli akan
mengambil pesanan sendiri, tidak perlu dikirim.").

### Addendum: pickup card showed a stale/wrong store address (post-launch)

Reported: the "Ambil di Toko" card on checkout showed "Jln Tukad Balian..." — not the store's real
address. Root cause was a design mistake, not just bad test data: the pickup card only ever showed
the seller's free-text `description` field, and the `Form.tsx` placeholder literally suggested
putting the pickup address there ("...& alamat pengambilan..."). Free text duplicating the real
`StoreAddress` is exactly the kind of thing that drifts out of sync the moment a seller edits their
store's actual address — which is what happened (this session's own test data had the address
hand-typed into `description`, then the store's real address changed later in "Alamat" tab,
leaving the description stale).

- [x] `Checkout.tsx`'s pickup card now shows `store.primary_address.full_address` (falling back to `address_line`, then a "belum diatur" message) — the same source of truth already used for RajaOngkir origin resolution, so it can't drift from the real address. `description` remains for supplementary notes only (hours, etc.), shown alongside, not instead of
- [x] `StoreAddress` model was missing `$appends = ['full_address']` — the accessor existed but was never serialized to the frontend at all until this fix; without it `store.primary_address.full_address` would always have been `undefined`
- [x] `Form.tsx` placeholder and description-field copy updated to stop suggesting sellers re-type their address, and to explain (only for `type: pickup`) that the address is automatic
- [x] Fixed this session's own test data (the "Ambil di Toko" method's stale `description`) to drop the duplicated address text
- [x] **Verified live**: reloaded checkout — the card now shows the store's current real address ("Jl. Kalijati Indah, Antapani Kulon, Kec. Antapani, Kota Bandung..."), which had in fact changed since the method was first created, proving the fix tracks the live address rather than a snapshot
