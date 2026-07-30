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

## Addendum: checkout submit silently failed validation, errors were invisible (post-launch)

Reported via an Inertia error dump showing `payment_provider`/`payment_method`/`payment_channel`
all `required` even though the user had picked a channel — and nothing on the page told them why
the "Buat Pesanan" click did nothing.

- [x] **Bug found and fixed** in `Pages/Store/Checkout.tsx`: `doSubmit()` called `setData()` inside `post()`'s `onBefore` callback to sync `user_address_id`/`shipping_courier_code`/`shipping_service`/`payment_provider`/`payment_method`/`payment_channel` from local `useState` (`addressId`/`shippingRate`/`selectedChannel`) at submit time. `post()` serializes `data` synchronously when called — `onBefore` runs as part of that same call but a `setData()` inside it does not retroactively change what's already been queued for that request. Every submission actually went out with the form's original empty defaults (`""`/`null`) for all six fields. The three shipping/address fields are `nullable` server-side so they failed silently (**order-correctness bug**: a physical order could be created with no address/courier); the three payment fields are `required` so those surfaced as validation errors — but with nothing on the page rendering them, checkout appeared to just silently do nothing on every attempt
- [x] Fixed by syncing `data` via `useEffect` on `[addressId, shippingRate, selectedChannel]` as each pick happens, instead of at submit time — `doSubmit` is now a plain `post(url)`
- [x] **Also found and fixed**: every validation error across the *entire app* was rendering as a raw, untranslated key (e.g. literally the string `"validation.required"`) instead of a message. Root cause: `lang/id/validation.php` (and `lang/en/validation.php`) didn't exist — Laravel 11+'s skeleton no longer ships these by default — and `.env`'s `APP_FALLBACK_LOCALE=id` matches `APP_LOCALE=id`, so there was no locale to fall back to either. Ran `php artisan lang:publish` for the English defaults and hand-authored a complete `lang/id/validation.php` (every core rule + an `attributes` map for the checkout fields and other common ones) so messages read naturally in Indonesian, matching the rest of the UI
- [x] Added a general error banner to `Checkout.tsx`, placed directly above the "Buat Pesanan" button (not just at the top of the page) — Inertia preserves scroll position on a validation-error response by default, and the button is where the user's viewport already is when they submit, so an alert only visible at the top would go unseen. Deduplicates identical messages (e.g. all three payment_* fields failing at once no longer shows the same line three times)
- [x] **Verified live end-to-end** (not just code-reviewed): filled out the real checkout form (address, J&T shipping, QRIS payment) through a running server and confirmed the order was actually created this time — `StoreOrder` row has the correct `shipping_address_snapshot`, `shipping_courier_code`/`shipping_service` ("jnt"/"EZ"), `shipping_cost` (32000), and the transaction has `payment_provider`/`payment_channel` ("satutera"/"qris") all correctly persisted, where before this fix the request would have been rejected by backend validation
- Not fully explored: the same order's transaction has `payment_method` stored as `NULL` despite the QRIS channel having `method: "qris"` in `paymentChannels` — order still completed successfully and this didn't block checkout, so it's flagged rather than chased down; likely a separate, pre-existing detail in how `CheckoutService`/`Transaction` populate that column, out of scope for this fix

## Addendum: exact/near-exact village names falsely reported as ambiguous (post-launch)

Reported via a live 422 on `/api/shipping/rates`: `"Alamat belum bisa dipetakan ke layanan ongkir"`
with 3 candidates, all variants of "Padangsambian" (postal code 80117, Denpasar Barat) — even
though the buyer's saved village name (`UserAddress #2`, a second real account, not the one used
for this session's other checkout tests) was literally the exact string "Padangsambian".

- [x] **Bug found and fixed** in `RajaOngkirService::resolveDestinationId()`'s scoring: it used `str_contains($normalize($candidate['subdistrict_name']), trim($targetVillage))` — a one-directional substring check. "Padangsambian" (the target) is a substring of *all three* candidates ("PADANGSAMBIAN", "PADANGSAMBIAN KAJA", "PADANGSAMBIAN KLOD/KELOD"), so every candidate scored identically and the tie-break (`secondBest['score'] < best['score']`) never passed — an address that should have matched exactly was always sent to manual disambiguation. A second, compounding bug: `normalize()` didn't strip whitespace, so a local village name formatted with a space (e.g. "Padang Sambian Kaja") wouldn't match RajaOngkir's space-free spelling ("PADANGSAMBIAN KAJA") at all, not even partially
- [x] Replaced with `areaNameVariants()` (strips whitespace/punctuation, splits on `/` for RajaOngkir's dual-spelling entries like "KLOD/KELOD") + `areaMatchTier()` (0=no match, 1=partial/substring, 2=exact) + weighted scoring (`villageTier × 10 + districtTier`) — an exact village match can never be beaten by another candidate's mere district match, since district alone maxes out at 2 points against a 10-point tier gap
- [x] **Verified against the exact reported data** (tinker + `Http::fake` using the three real candidates from the bug report, isolated per run — `Http::fake()` doesn't override an already-registered pattern within one process, learned earlier this session): "Padangsambian" → correctly resolves to id `26031` (previously null/ambiguous); "Padang Sambian Kaja" → resolves to `26032` (previously failed entirely due to the whitespace bug); a genuinely ambiguous case (same subdistrict name under two different districts, no district hint given) still correctly returns null rather than guessing — confirms the fix doesn't overcorrect into false positives
- [x] Ran the fix through the full `AddressResolver::resolve()` path against the real `UserAddress #2` row from the bug report — resolved and persisted `rajaongkir_destination_id`. That test used `Http::fake`, so the persisted value was reset back to `null` afterward (along with the two synthetic `ShippingDestination` cache rows the test wrote) — the real API will resolve and cache it naturally on the next actual checkout attempt, using this fixed logic
- Known residual gap (not a regression — was already unresolved before this fix, not the reported case): a target like "Padangsambian Kelod" vs. candidate "PADANGSAMBIAN KLOD/KELOD" still ties with the plain "PADANGSAMBIAN" candidate, because both partially contain the target as a prefix. A length/edit-distance-aware tiebreak could resolve it, but wasn't worth the added complexity/false-positive risk for a case that wasn't reported and already fails safe (asks the user to pick, rather than guessing wrong)
