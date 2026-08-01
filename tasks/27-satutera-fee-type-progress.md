# Satutera `fee_type` (FIX/PERCENT) — Transfer Fee Calculation

Ref: `docs/guidance/payment-changes.md` (changelog 2026-08-01), `docs/guidance/payment-guidance.md` §2-3.

Satutera's `GET /api/v1/payment-channels` now returns `fee_type` (`FIX` or `PERCENT`) alongside
`fee` (now a float). Our checkout/RSVP code read `channel['fee']` as a flat rupiah nominal
everywhere — correct for `FIX` but wrong for `PERCENT`, where `fee` is a decimal percentage of the
pre-fee amount (e.g. `2.5` = 2.5%). This affects the locally-estimated `payment_fee` we fold into
`transactions.amount` before calling Satutera (guidance §3 note: Satutera's own billed
`payment_detail.fee` is unaffected — this is only about our local estimate matching it).

## Backend

- [x] `Shared/Services/SatuteraPaymentService.php` — add `resolveFee(array $channel, int $preFeeAmount): int`, `FIX` = round(fee), `PERCENT` = round(preFeeAmount * fee / 100)
- [x] `Event/Controllers/RsvpController.php` — use `resolveFee()` instead of `(int) $channel['fee']`
- [x] `Store/Services/CheckoutService.php` — use `resolveFee()` instead of `(int) $channel['fee']`

## Frontend

- [x] `types/index.d.ts` — `PaymentChannel.fee_type: "FIX" | "PERCENT"`
- [x] `utils/paymentFee.ts` (new) — `resolveSatuteraFee()`, mirrors backend `resolveFee()`
- [x] `Pages/Store/Checkout.tsx` — `total`, `OrderSummary` props, `ChannelOption` fee label all resolve via helper (pre-fee amount = `preFeeAmount`)
- [x] `Pages/Event/Show.tsx` — `SatuteraChannel.fee_type`, `adminFee` calc, both admin-fee display spots resolve via helper (pre-fee amount = `totals.subtotal`). Unrelated legacy iPaymu `fee_type: "fixed"|"percentage"` branches (dead code, `{false && ...}`) left untouched.

## Not touched (out of scope)

- `payment_detail.fee`/`.total` display (`Store/PaymentPage.tsx`, `Pages/Payment/PaymentPage.tsx`, `SatuteraPanel.tsx`) — already reads the provider-computed, post-creation value, not the channel catalog.
- `SatuteraWebhookController.php` amount verification — reads the already-resolved, stored `transaction.payment_fee`, no channel lookup involved.
