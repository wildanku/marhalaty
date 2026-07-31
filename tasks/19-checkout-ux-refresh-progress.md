# Task 19: Checkout page UX refresh + QRIS-only small-amount rule + empty-cart handling

## Overview

Modernize `Pages/Store/Checkout.tsx` (floating mobile summary bar + sticky desktop sidebar,
matching the UX pattern in `resumakit-front`'s checkout flow), truncate shipping method
descriptions to 2 lines with a "Lihat selengkapnya" modal, restrict payment methods to QRIS only
for transactions below a configurable threshold, and handle an empty/missing cart on the checkout
page gracefully instead of a bare 404 or an empty payment form.

## Backend

- [x] `config/store.php`: add `qris_only_below_amount` (env `STORE_QRIS_ONLY_BELOW_AMOUNT`, default 10000)
- [x] `CheckoutController::show()`: expose `qrisOnlyBelowAmount` as an Inertia prop; also now returns `isEmpty: true` (with just `store`) instead of 404-ing (`firstOrFail`) when there's no cart row, or when the cart exists but has zero items
- [x] `CheckoutService::place()`: server-side re-check — reject a non-QRIS `payment_channel` when `subtotal + shipping_cost` (pre-fee amount, same value sent to Satutera) is below the threshold, never trust the client-side filter alone

## Frontend

- [x] New `Components/Store/ShippingMethodDetailModal.tsx` — fee, full description, and (for pickup) store address
- [x] `Pages/Store/Checkout.tsx` rewrite:
  - [x] Section cards get an icon + eyebrow-style header (`SectionCard` helper)
  - [x] Shipping method description: `line-clamp-2` + "Lihat selengkapnya" opens the detail modal
  - [x] QRIS-only banner + channel filtering when `subtotal + shippingCost < qrisOnlyBelowAmount`; auto-clears an already-selected non-QRIS channel if the shipping pick drops the total below the threshold afterward
  - [x] Mobile floating bottom bar (price + "Buat Pesanan", tap to expand) + slide-up order summary sheet, desktop sidebar made `sticky top-24`
  - [x] Validation errors auto-open the mobile sheet (submit trigger lives in a fixed bar / sticky sidebar away from wherever Inertia leaves scroll position)
  - [x] `isEmpty` empty-cart state: props typed as a discriminated union (`{isEmpty:true; store}` vs `{isEmpty:false; ...}`); the non-empty form's hooks were extracted into a separate `CheckoutForm` component so the `isEmpty` early return in the top-level `Checkout` component never sits before a `useState`/`useEffect` call (Rules of Hooks) — `EmptyCheckout` mirrors the exact empty-state pattern already used in `Pages/Store/Cart.tsx` (icon + message + link), linking to `/stores/{slug}` for this specific store

## Verified

- [x] `npx tsc --noEmit` clean, `npm run build` succeeds, `vendor/bin/pint` passes throughout
- [x] Live-tested in browser against a real Rp10 cart item: QRIS-only banner + VA channels hidden correctly once `config:clear` picked up the new `store.php` key (was stale in `bootstrap/cache/config.php` from before this change — **had to run `php artisan config:clear`**, worth remembering if a newly-added config key ever appears to silently not take effect in this environment)
- [x] Shipping method "Lihat selengkapnya" modal verified live (pickup method: fee, keterangan, store address, all rendered)
- [x] Full checkout completed live end-to-end with QRIS after fixing the `va_number` column-width bug (see below) — reached the payment page with QR code, countdown, instructions
- [x] Empty-cart state verified live: cart with 0 items renders the "Belum ada produk untuk dibayar" empty state (not a 404, not an empty form), and the "Lihat Produk" button correctly navigates to `/stores/{slug}`
- [ ] Mobile floating bar / slide-up sheet not visually verified — the browser automation tool's `resize_window` did not change the captured screenshot viewport in this session (stayed at a desktop-sized viewport regardless of requested size), so mobile layout is unverified beyond code review + the same `lg:hidden`/`hidden lg:block` Tailwind pattern already proven elsewhere in this codebase (`Header.tsx`)

### Bugs found and fixed along the way (not in the original ask)

- **QRIS rendered as a broken `<img>` pointing at `payment_detail.qr_template`.** That URL comes
  from iPaymu/Satutera and isn't reliably reachable (404 in testing). Fixed by rendering an actual
  QR code client-side from `payment_detail.qr_string` (the raw EMV payload) using `qrcode.react`
  (`QRCodeSVG`), matching exactly how `resumakit-front`'s `payment-detail-view.tsx` does it — added
  `qrcode.react@4.2.0` as a new dependency (same version resumakit-front uses). `qr_template` is
  now only a fallback if `qr_string` is somehow missing.
- **`transactions.va_number` too narrow for QRIS (`varchar(255)`).** The column also stores the
  full QRIS EMV QR payload (~280 chars) for `payment_method = qris`, not just short VA account
  numbers, and was throwing `SQLSTATE[22001]: value too long for type character varying(255)`.
  Worse: that failure was caught by `initiateSatuteraPayment()`'s `try/catch` in PHP, but Postgres
  itself had already aborted the whole enclosing transaction — so every later query in the same
  `DB::transaction()` (the `fresh()` calls in `CheckoutService::place()`) then failed with
  `25P02: current transaction is aborted`, which is what actually surfaced to the user as an
  unrelated 500. Fixed with a migration widening the column to `text`, plus wrapped that specific
  write in its own nested `DB::transaction()` (Postgres savepoint) so a future failure there is
  contained instead of poisoning the rest of checkout.
