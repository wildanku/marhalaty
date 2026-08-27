# Store Order Payment Proof Display (God Mode Store Order + Seller Pesanan)

Manual-transfer proof upload/review already worked end-to-end via the generic God Mode → Payments
page, but was invisible from the two order-specific screens (God Mode → Store Order detail, and
the seller's own Toko → Pesanan detail). This closes that gap.

- [x] Audit: confirm upload (`StorePaymentProofController`) and review
      (`GodMode\PaymentController::approve/reject`) already handle `StoreOrder` transactions
      correctly — they do, only the two detail pages lacked proof visibility.
- [x] God Mode → Store Order detail (`GodMode\StoreOrderController::show`): eager-load
      `transactions.proof`; render proof (file, notes, review state) per transaction, plus
      Setujui/Tolak reusing the existing `/god-mode/payments/{id}/approve|reject` routes.
- [x] Extract the approve/reject modal out of `GodMode/Payments/Index.tsx` into
      `Components/GodMode/PaymentReviewModal.tsx` so both pages share it.
- [x] Seller Pesanan detail (`Store\StoreOrderManagementController::show`): load the latest
      transaction's proof, pass as `paymentProof` prop; add a new authorization-scoped
      `orders/{order}/proof` route (both the `my/stores` and god-mode `stores/{store}/manage`
      groups) to stream the file instead of exposing the raw `/storage/{path}` link — read-only,
      no approve/reject (verification stays admin-only).
- [x] `npx tsc --noEmit` and `vendor/bin/pint --test` on touched files pass (pre-existing Pint
      findings in `StoreOrderController.php` predate this change).
