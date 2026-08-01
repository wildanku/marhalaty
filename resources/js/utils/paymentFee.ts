/**
 * Resolves a Satutera payment channel's `fee`/`fee_type` (payment-changes.md 2026-08-01) against
 * a pre-fee amount into the rupiah amount charged on top — `FIX` is a flat nominal, `PERCENT` is
 * a decimal percentage of `preFeeAmount` (e.g. `2.5` = 2.5%). Mirrors
 * `SatuteraPaymentService::resolveFee()` on the backend so the estimate shown before checkout
 * matches what the server will actually charge.
 */
export function resolveSatuteraFee(
  channel: { fee: number; fee_type?: string } | null | undefined,
  preFeeAmount: number
): number {
  if (!channel) return 0;

  if (channel.fee_type === "PERCENT") {
    return Math.round((preFeeAmount * channel.fee) / 100);
  }

  return channel.fee;
}
