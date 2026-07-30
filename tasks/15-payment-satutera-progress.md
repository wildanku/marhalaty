# Task 15: MVP2 Phase 4 — Payment via Satutera Payment Service

## Overview

Fetch payment channels, create a VA/QRIS payment (`raw_detail`), show it on our own page, track
status realtime via WebSocket, and treat the signed server-to-server callback as the fulfillment
source of truth. `SatuteraPaymentService` is a standalone service — it does **not** implement the
existing `PaymentProviderInterface` (that contract is RSVP/event-specific and untouched). See
`docs/plan/mvp2/4-payment-satutera.md` and `docs/guidance/payment-guidance.md`.

## Backend

- [x] Migration: additive `transactions` columns (`payable_type`, `payable_id`, `payment_fee`, `checkout_token`, `payment_detail`) + backfill existing rows to `payable_type = Rsvp::class` + `rsvp_id` made nullable (via raw `ALTER TABLE ... DROP NOT NULL`, no doctrine/dbal dependency needed)
- [x] Migration: `create_payment_webhook_events_table` (unique `[provider, payment_id, event_type]` for idempotency)
- [x] `config/services.php`: add `satutera` block (base_url, client_id, client_secret, api_key, webhook_secret)
- [x] `VITE_SATUTERA_BASE_URL` env var (exposed to frontend for socket.io)
- [x] Model `Transaction`: add `payable()` morphTo, `payment_detail` → `json` cast, `payment_fee` → `decimal:2`, extend `$fillable` — `rsvp()` relation and existing event flow untouched
- [x] `App\Domains\Shared\Services\SatuteraPaymentService`: `getPaymentChannels()` (cached 15 min, filters `supports_direct_detail`), `createPayment()` (raw-body HMAC signing, `Idempotency-Key`), `getPaymentStatus()`, `verifyCallbackSignature()` (`hash_equals`)
- [x] `App\Domains\Store\Services\OrderFulfillmentService`: `onPaid()` (mark order paid, email buyer via queued job — digital download link generation deferred to Phase 5's `digital_deliveries` table, out of scope here) / `releaseStock()` (reverse decrement on cancel/expire)
- [x] Controller `Store\Controllers\StorePaymentPageController` (`show`, `status` JSON)
- [x] Controller `Store\Controllers\SatuteraWebhookController` (`handle` — signature verify → idempotency lock → amount re-check → update transaction/order → `OrderFulfillmentService`)
- [x] Routes: `GET /store/payment/{hash}`, `GET /store/payment/{hash}/status`, `POST /webhooks/satutera/payment` (CSRF-exempt), `GET /api/store/payment-channels`
- [x] `CheckoutService` wired to call `SatuteraPaymentService::createPayment()` after order creation and persist the response fields per the spec's field mapping table

## Frontend

- [x] `pnpm add socket.io-client` (4.8.3)
- [x] TS types: `PaymentDetail`, `PaymentInstruction`, extend `Transaction` with `payable_type`/`payable_id`/`checkout_token`/`payment_detail`/`payment_fee`
- [x] `Pages/Store/PaymentPage.tsx` — order summary with payment fee as its own line, QRIS image (falls back to raw `qr_string` in a monospace block if Satutera doesn't supply `qr_template` — **no QR-image-generation library was added**, since none existed in the project and adding one wasn't confirmed with the user), VA number + copy button + provider-supplied instructions, countdown to `expires_at`, realtime status badge, graceful "detail belum tersedia" state when payment creation failed (e.g. no credentials)
- [x] Socket wiring: connect with `path: "/ws/payments"`, `transports: ["websocket"]`; re-`emit("subscribe", ...)` in the `connect` handler (not just once on mount)
- [x] Polling fallback every 7s while `pending`, stops on a final status
- [x] Local `expires_at` check independent of socket/polling (guidance §6: internal expiry does not always emit a socket event)

## Definition of Done

- [x] `GET /api/store/payment-channels` returns `supports_direct_detail` channels with `fee`, no credentials in the response, cached — **verified live against the real Satutera service** (`https://payment.satutera.com` is reachable from this environment): returned 10 real channels (QRIS + 9 VA banks) with correct fees, no secrets in the payload
- [x] Selected channel's `fee` flows into order `payment_fee` and renders as its own summary line — verified live: QRIS (fee 0) checkout produced `order.payment_fee = 0.00`, `order.total = subtotal` exactly
- [ ] Create payment succeeds for QRIS and at least one VA bank — **not fully verified, no `SATUTERA_CLIENT_ID`/`SATUTERA_CLIENT_SECRET`/`SATUTERA_API_KEY` configured**. The request reached the live server correctly-formed and was rejected with `401 Missing client authentication headers` (confirmed in `storage/logs/laravel.log`) — i.e. the plumbing works, but no successful payment was created
- [x] Signed body is byte-identical to the sent body — no 401s **from signature errors specifically**: a local signing unit check (in tinker) reproduced the exact HMAC formula with a payload containing non-ASCII and slash characters and the signature matched a manual recomputation. (The live 401 above was an auth-credential issue, not a signature-mismatch issue — Satutera's own error message said "Missing client authentication headers", not "invalid signature".)
- [ ] `Idempotency-Key` sent; retrying create-payment for the same order does not create a duplicate payment — the header is sent (`order-{orderId}-{transactionId}`), but retry behavior was not live-tested since payment creation itself fails without credentials
- [x] Payment page shows VA/QRIS + Satutera-supplied instructions + countdown — verified live: `Store/PaymentPage` component rendered with correct order/transaction props from a real checkout; since no `payment_detail` exists (no live payment was created), the page's "detail belum tersedia" fallback branch is what actually rendered — the VA/QRIS branch was verified by code review, not by seeing it live
- [x] Socket connects, re-subscribes on every `connect` (code-level only — the `useEffect` puts `socket.emit("subscribe", ...)` inside the `on("connect", ...)` handler, not outside it, so it re-fires on reconnect; not exercised against a live socket connection in this session)
- [x] Polling fallback runs when the socket is unavailable, stops after a final status (code-level: the `setInterval` polling effect's dependency array includes `isFinal`, so it never (re-)starts once a terminal status is reached)
- [x] Past `expires_at` while still `pending` → UI shows expired without waiting for a socket event (dedicated `useEffect` computes remaining time every second purely from `expiresAt`, independent of socket/polling state)
- [x] Callback with a bad signature is rejected 400 and logged — **curl-tested against the running server**: wrong signature → `400 {"message":"Invalid signature"}`
- [x] The same callback sent 3× is only processed once — **curl-tested**: same signed payload POSTed 3× all returned `200 OK`, but `payment_webhook_events` had exactly 1 row and the transaction/order were updated to `paid` exactly once
- [x] Callback with a mismatched `amount` does **not** mark the order paid and logs at error level — **curl-tested**: a payload with `amount: 99999` against a 30000 transaction returned `200 OK` (per spec — always ack a validated signature) but left both transaction and order status unchanged, and logged `Satutera callback amount mismatch` at ERROR level
- [x] `transactions` migration runs on Postgres; backfill logic is correct (conditional `UPDATE ... WHERE rsvp_id IS NOT NULL`, verified against an empty table in this dev DB — no pre-existing rows to backfill); the pre-existing RSVP/event payment flow was regression-tested afterward (RSVP → Transaction → webhook-style status update → the `rsvp()`/`latestTransaction` relations all still work identically)

### Bugs found and fixed during implementation (not in the original plan)

- None specific to Phase 4 beyond the cross-cutting ULID/media fixes already covered in the Phase 1/2 checklists.
