# Task 14: MVP2 Phase 3 — Cart, Buyer Address, Shipping (RajaOngkir), Order Creation

## Overview

Per-store cart, buyer addresses, RajaOngkir shipping cost calculation, and transactional order
creation with server-side recalculation of every amount. Depends on Task 13 (products must be
`active` to be purchasable). See `docs/plan/mvp2/3-cart-checkout-shipping.md`.

## Backend

- [x] Migration: `create_shipping_destinations_table` (cache of local address → RajaOngkir destination_id)
- [x] Migration: `create_user_addresses_table` (mirrors `store_addresses` shape)
- [x] Migration: `create_carts_table` (ULID PK, unique [user_id, store_id] — cart is per-store)
- [x] Migration: `create_cart_items_table` (bigint PK, unique [cart_id, product_id, product_variant_id])
- [x] Migration: `create_store_orders_table` (ULID PK, order_number, status enum, shipping snapshot columns, address snapshots as JSON not FK)
- [x] Migration: `create_store_order_items_table` (bigint PK, item snapshot columns, `restrictOnDelete` on product_id)
- [x] Delete-tracking triggers for `user_addresses`, `store_orders`, `store_order_items` (carts/cart_items and shipping_destinations intentionally skipped — ephemeral/cache data, no audit value)
- [x] `config/store.php` (order_expiry_minutes, digital_download_max, variant option/value limits)
- [x] Contract `App\Contracts\ShippingProviderInterface`
- [x] DTO `App\Domains\Store\Data\ShippingRate`
- [x] `App\Domains\Shared\Services\RajaOngkirService` (searchDestination, resolveDestinationId, calculateCost, providerCode) — `Http::asForm()` for cost endpoint, only-cache-on-success (a transient API failure is never cached as "no service" for the full TTL), `->retry(2, 200)`, 10s timeout
- [x] Bind `ShippingProviderInterface` → `RajaOngkirService` in `AppServiceProvider::register()`
- [x] Models: `UserAddress`, `Cart`, `CartItem`, `StoreOrder`, `StoreOrderItem`, `ShippingDestination`
- [x] `AddressResolver` service (village/postal_code → RajaOngkir destination, ambiguous-match handling, caches to `shipping_destinations`)
- [x] `CartService` (add/updateQty/remove/summary with `issues[]`: inactive product, insufficient stock, "details changed since added" heuristic since cart_items intentionally has no price snapshot, store suspended)
- [x] `CheckoutService::place()` — transactional, `lockForUpdate()` on products/variants, server recomputes subtotal/weight/shipping, re-verifies chosen courier+service against a fresh `calculateCost()` call, builds order + order items with snapshots, decrements stock, sets `expires_at`, empties cart
- [x] Controller `UserAddressController` (index/store/update/destroy/setDefault) — JSON endpoints consumed by `AddressPicker`/`AddressForm`, not a full Inertia page (matches the spec's frontend file list, which has no standalone addresses page)
- [x] Controller `Store\Controllers\CartController` (index/store/updateQty/destroy)
- [x] Controller `Store\Controllers\ShippingController` (`POST /api/shipping/rates`, `throttle:30,1`)
- [x] Controller `Store\Controllers\CheckoutController` (show/store)
- [x] Controller `Store\Controllers\StoreOrderController` (buyer order history index/show)
- [x] Routes wired: `/my/addresses*`, `/cart*`, `/api/shipping/rates`, `/checkout/{store:slug}`, `/store/orders*` (191 routes total resolve with no errors)

## Frontend

- [x] TS types: `UserAddress`, `Cart`, `CartItem`, `StoreOrder`, `StoreOrderItem`, `ShippingRate`, `CartSummary`, `CartIssue` in `types/index.d.ts`
- [x] `Components/Store/AddressForm.tsx` (shared buyer address form on top of `RegionPicker`, posts to the JSON `/my/addresses` endpoint)
- [x] `Components/Store/AddressPicker.tsx` (pick saved address or add new inline)
- [x] `Components/Store/ShippingRatePicker.tsx` (fetch-based, not Inertia nav; loading state; reload button on failure)
- [x] `Components/Store/OrderSummary.tsx` (subtotal/ongkir/fee/total)
- [x] `Pages/Store/Cart.tsx`
- [x] `Pages/Store/Checkout.tsx`
- [x] `Pages/Store/Orders/Index.tsx`
- [x] `Pages/Store/Orders/Show.tsx`
- [x] Wired "Tambah ke Keranjang" on `Pages/Store/ProductShow.tsx` to `POST /cart/items`; added Cart/My Orders links to `Header.tsx`
- [x] Extended `Components/Store/StatusBadge.tsx` with `StoreOrder` status labels (pending_payment, paid, processing, shipped, completed, cancelled, expired, refunded)

## Definition of Done

- [ ] `RajaOngkirService` resolves a destination and calculates cost against sandbox credentials — **not verifiable, no `RAJAONGKIR_API_KEY` configured**. The RajaOngkir *host* is reachable from this environment (confirmed via `curl`, which got a real `401 Invalid API key` response, not a network failure), so the request-shape/`Http::asForm()` plumbing is sound, but no successful destination search or cost calculation was exercised
- [x] Postal code mapping to multiple kecamatan surfaces a choice to the user, not a silent guess (`AddressResolver::resolve()` only auto-confirms when one candidate has a clearly higher name-match score than the runner-up; otherwise returns `candidates` for the caller to show)
- [x] Destination resolution result is cached in `shipping_destinations` and not re-fetched for the same address (`AddressResolver::resolve()` short-circuits when `rajaongkir_destination_id` is already set)
- [x] Cached shipping cost does not call the API a second time within TTL — **re-verified live** (see addendum below): `Http::fake` + call count assertions confirm a second identical `calculateCost()`/`searchDestination()` call makes zero additional HTTP requests
- [x] Cart is separated per store — verified live: adding a product created a `Cart` scoped to `(user_id, store_id)`; a second store's product would create a second, separate cart row (schema-enforced via the unique constraint)
- [x] Out-of-stock/deactivated items surface a warning in the cart and block checkout — verified via `CartService::summary()` unit exercise in tinker (insufficient-stock/inactive-product/inactive-variant/store-suspended cases each produce a distinct `issues[]` entry)
- [x] Client-supplied `shipping_cost` has no effect — `CheckoutService::resolveShipping()` always recomputes rates server-side and rejects if the client's chosen courier+service isn't found in that fresh result
- [x] Order is created with item/address/courier snapshots; stock decremented by quantity — **verified live end-to-end** (real HTTP requests through a running server): added to cart → checked out a digital order → `StoreOrder`/`StoreOrderItem` rows created with correct snapshots, `Product.stock_quantity` decremented, cart emptied
- [x] Digital-only cart skips the address/shipping step entirely and `shipping_cost = 0` — verified live: checkout page returned `requires_shipping: false`, order created with `shipping_cost = 0` and no address/courier snapshot
- [ ] Two simultaneous checkouts against the last unit of stock: one succeeds, one is rejected with a clear out-of-stock message — the `lockForUpdate()` guard is in place in `CheckoutService::lockAndValidateItems()`, but a genuine concurrent-request race was not exercised in this session (would need two parallel processes hitting checkout at once)
- [x] Shipping provider error fails checkout with a clear message, never a zero-shipping order — `resolveShipping()` throws `ValidationException` whenever `calculateCost()` returns empty or the chosen rate isn't matched; there is no code path that lets `shipping_cost` default to 0 while `requires_shipping` is true

## Addendum: RajaOngkir 100-req/24h quota hardening (post-launch)

Komerce's plan backing `RAJAONGKIR_API_KEY` caps usage at 100 requests/24h — tight enough that the
original 6h TTL cache alone wasn't safe, and `searchDestination()` had no caching at all. Revisited
`RajaOngkirService` to harden both call sites against the quota.

- [x] `RAJAONGKIR_CACHE_TTL` default raised 21600 → 86400 (aligned to the provider's 24h window) in `config/services.php`, `.env`, `.env.example`
- [x] New `RAJAONGKIR_STALE_TTL` (default 604800 / 7 days) — a longer-lived backup copy of the last successful response
- [x] Extracted shared `RajaOngkirService::rememberWithFallback()`: fresh-cache hit → return; else call the API; success → cache both fresh + stale copies; failure (exception, non-2xx, or empty) → serve the stale copy if one exists, else return empty. Only successful, non-empty results are ever cached (unchanged principle from the original implementation)
- [x] `searchDestination()` now goes through the same caching/fallback path — previously **zero** caching, meaning every ambiguous-address lookup during checkout spent quota uncached
- [x] **Bug found and fixed**: `calculateCost()` cached raw `ShippingRate` *objects*. This project's `config/cache.php` has `serializable_classes => false` (Laravel's default hardening against gadget-chain attacks on a leaked `APP_KEY`) — any object round-tripped through the cache silently comes back as a useless `__PHP_Incomplete_Class` instead of throwing, which would fatal on the very next line that calls a method on it (`$rate->toArray()` in `ShippingController`, `$rate->matches()` in `CheckoutService`). This was invisible in the original implementation because it was only "verified by code," never by an actual cache-hit round-trip. Fixed by caching plain arrays only and reconstructing `ShippingRate` objects fresh on every call (cache hit or miss) — confirmed via `Http::fake` + tinker that a cache-hit no longer produces `__PHP_Incomplete_Class`
- [x] Verified via isolated tinker + `Http::fake` runs (each in its own process, since `Http::fake()` on a repeated URL pattern within one process doesn't override the first registration — a testing-only gotcha, not a service bug): (1) identical `searchDestination`/`calculateCost` calls hit the API once, second call served from cache; (2) fresh-cache-expired + live-call-failing serves the stale copy instead of erroring; (3) no fresh cache and no stale copy + failing live call correctly returns empty (surfaces the existing "coba lagi" error path, doesn't fabricate data)
- Not changed: the pre-existing `->retry(2, 200)` on both endpoints doubles the request cost of every failed call (e.g. once the quota is already exhausted, each lookup burns ~2 more attempts instead of 1) — flagged, not fixed, since it's a pre-existing behavior outside the scope of "add caching" and changing HTTP retry semantics is a separate call
