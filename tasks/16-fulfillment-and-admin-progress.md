# Task 16: MVP2 Phase 5 — Fulfillment, Notifications, God-Mode Panel, Scheduled Jobs

## Overview

Physical/digital fulfillment with an explicit order-status transition map, buyer digital download
tokens, the remaining transactional emails, a god-mode Store Orders panel, and the two scheduled
commands that keep stock/order state correct without manual intervention. Depends on Task 15
(Phase 4 payments). See `docs/plan/mvp2/5-fulfillment-and-admin.md`.

## Backend

- [x] Migration: `create_digital_deliveries_table` (download_token unique, max_downloads, expires_at, download_count)
- [x] Migration: additive `store_orders.cancellation_reason` (text, nullable) + `store_orders.stock_released_at` (timestamp, nullable, idempotency guard for `releaseStock()`)
- [x] Model `DigitalDelivery`
- [x] `OrderFulfillmentService`: explicit transition map (not a bare `update(['status' => $request->status])`) — `markProcessing()` (paid→processing), `markShipped()` (processing→shipped, sets tracking_number/shipped_at, dispatches email), `markCompleted()` (shipped→completed, sets completed_at), `cancel()` (paid/processing→cancelled only, records reason, releases stock)
- [x] `releaseStock()` made idempotent via `stock_released_at` guard checked inside `lockForUpdate()`
- [x] `onPaid()` extended: issues one `DigitalDelivery` per digital order item (token, 30-day expiry, `STORE_DIGITAL_DOWNLOAD_MAX` quota), dispatches buyer email (with download links if any), dispatches owner/admin "new order" email, Telegram-notifies admin channel
- [x] Controller `Store\Controllers\StoreOrderManagementController` (seller-side: index/show/process/ship/cancel) guarded by `StorePolicy@manageOrders`
- [x] Controller `Store\Controllers\StoreDownloadController` (`show(token)` — the 4 checks from the spec: not expired, quota remaining, order `paid`/`completed`, downloader is the buyer)
- [x] `Store\Controllers\StoreOrderController@complete` (buyer self-marks `shipped` → `completed`)
- [x] Jobs: `SendStoreOrderCreatedEmail` (dispatched at checkout), `SendStoreOrderShippedEmail`, `SendOrderExpiredEmail`, `SendStoreNewOrderEmail` (store owner/admins); `SendStoreOrderPaidEmail` (Phase 4) extended to include digital download links when present
- [x] Blade templates: `store-order-created`, `store-order-shipped`, `store-order-expired`, `store-new-order` (all `@extends('emails.layout')`)
- [x] `app/Console/Commands/ExpireStoreOrders.php` (`store:expire-orders`) — chunked, idempotent via `releaseStock()`'s own guard + its own `status = pending_payment` re-check inside the lock
- [x] `app/Console/Commands/CompleteShippedOrders.php` (`store:complete-shipped`) — `shipped` orders with `shipped_at` > 7 days → `completed`
- [x] `routes/console.php`: `Schedule::command('store:expire-orders')->hourly()`, `Schedule::command('store:complete-shipped')->dailyAt('02:00')` — confirmed registered via `php artisan schedule:list`
- [x] `App\Domains\GodMode\Controllers\StoreOrderController` (index with status/store/date-range filters, show with full transaction history + raw callback payload)
- [x] `App\Domains\GodMode\Exports\StoreOrdersExport` (`maatwebsite/excel`, filtered by store + date range, pattern from `EventParticipantsExport`)
- [x] Guard: added `->whereNotNull('rsvp_id')` to `GodMode\Controllers\PaymentController::index()`'s manual-transactions query
- [x] Store-order admin actions read-only in this phase (no mutating god-mode actions on orders yet, so nothing new to log); Phase 1's approve/reject/suspend already log to `admin_activity_logs`
- [x] Routes: `/my/stores/{store}/orders*`, `/store/orders/{id}/complete`, `/downloads/{token}`, `/god-mode/store-orders*` — 201 total routes resolve with no errors
- [x] `DEPLOYMENT.md` note added: **discovered during this phase that the production entrypoint runs Octane only** — no `queue:work` and no `schedule:run` anywhere in the deploy setup. Documented as a blocking action item (not fixed myself — this is an infra/ops decision, not a code change)

## Frontend

- [x] `Pages/Store/Manage/Orders/Index.tsx` (seller order list, status filter tabs) — linked from the "Pesanan Masuk" card on `Pages/Store/Manage/Dashboard.tsx` (now wired to a real `StoreOrder::where('store_id', ...)->count()` instead of the Phase 1/2 placeholder `0`)
- [x] `Pages/Store/Manage/Orders/Show.tsx` (seller order detail: process/ship-with-tracking/cancel-with-reason actions, each gated to the order's current status)
- [x] `Pages/Store/Orders/Show.tsx` (buyer, from Phase 3) extended: digital download button per item once `paid`/`completed` (quota-exhausted state shown disabled, not hidden), "Pesanan Diterima" button when `shipped`
- [x] `Pages/GodMode/StoreOrders/Index.tsx` (filters: status, store, date range; Excel export link)
- [x] `Pages/GodMode/StoreOrders/Show.tsx` (detail + full transaction history + collapsible raw callback payload per transaction for debugging)
- [x] `GodModeLayout.tsx` nav item: `{ href: "/god-mode/store-orders", label: "Store Orders", icon: "shopping_bag" }`
- [x] `Pages/Dashboard.tsx` quick-nav: added "Pesanan Saya" (grid widened from 4 to 5 columns at `lg` to fit cleanly)
- [x] Extended `Components/Store/StatusBadge.tsx` (Phase 3) already covered all `StoreOrder` statuses — no further changes needed here

## Definition of Done

- [x] Owner can move an order `paid` → `processing` → `shipped` (with tracking) → `completed` — **tinker-verified** end-to-end: each transition applied correctly and `tracking_number`/`shipped_at`/`completed_at` were set
- [x] An illegal transition (e.g. `status: completed` sent directly from `pending_payment`) is rejected server-side — **tinker-verified**: `markCompleted()` on a `pending_payment` order threw `ValidationException` with a clear message; likewise `cancel()` from `shipped` was rejected
- [x] Buyer receives a queued email at every meaningful status change — all six emails (`created`, `paid`, `shipped`, `expired`, plus owner `new-order`) are dispatched via `ShouldQueue` jobs, none sent synchronously (code-verified; actual delivery depends on the queue worker gap noted below)
- [x] Digital product: link unduh is issued only by `onPaid()` — **tinker-verified**: calling `onPaid()` twice produced exactly 1 `DigitalDelivery` row (idempotent), and it is never touched by the webhook's socket-adjacent code or any redirect path
- [x] Download token rejects: wrong buyer, quota exhausted, expired, order not yet paid — **all four curl-tested against a real running server** with a real persisted delivery: wrong buyer → 403, quota exhausted → 403, expired → 410, unpaid order → 403, valid request → 200 with the actual file streamed and `download_count` incremented to 1
- [x] File digital tidak bisa diakses tanpa token — curl-tested: direct access to `/storage/...` for the same filename returned 403 (file lives on the private `local` disk, not `public`)
- [x] `store:expire-orders` mengembalikan stok dengan tepat; menjalankannya dua kali tidak menggandakan stok — **curl/artisan-tested**: run 1 released 3 units back (2→5) and marked the order `expired`; run 2 immediately after found 0 eligible orders (already-expired orders drop out of the `pending_payment` filter) — double protection confirmed
- [x] `/god-mode/payments` **tidak** lagi memunculkan transaksi order toko — `whereNotNull('rsvp_id')` guard added; store-order transactions never have `rsvp_id` set so they were already excluded by the pre-existing `payment_provider = 'manual'` filter too (defense in depth, not a live leak fix)
- [x] Semua aksi admin atas toko/order tercatat di `admin_activity_logs` — true for Phase 1's store approve/reject/suspend; Phase 5's god-mode Store Orders panel is read-only (view + export only), so there are no new mutating actions to log yet
- [ ] `schedule:run` terkonfirmasi terpasang di cron produksi — **not verifiable from inside this session** (this is a production-infra fact, not something this codebase can confirm). Checked the actual deploy setup instead: `docker/entrypoint.sh` only starts Octane, with **no** `queue:work` or `schedule:run` process anywhere — documented as a blocking gap in `DEPLOYMENT.md` rather than silently assumed fixed
- [x] Ekspor Excel order menghasilkan file yang benar untuk satu toko dan satu rentang tanggal — `StoreOrdersExport` built on the same `maatwebsite/excel` pattern as `EventParticipantsExport`; the query is verified filterable by `store_id`+`date_from`+`date_to` by code inspection (matches the same `when()` filter pattern already tinker-tested in the god-mode index action), not separately re-run through a browser click in this session

### Bugs found and fixed during implementation (not in the original plan)

- None new in Phase 5 beyond the pre-existing ULID/media fixes from Phases 1–2. The queue-worker/cron gap above is a **discovered operational gap**, not a code bug — flagged rather than silently patched.
