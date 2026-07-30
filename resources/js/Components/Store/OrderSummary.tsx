interface OrderSummaryProps {
  subtotal: number;
  shippingCost?: number | null;
  paymentFee?: number | null;
  requiresShipping: boolean;
  className?: string;
}

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function OrderSummary({
  subtotal,
  shippingCost,
  paymentFee,
  requiresShipping,
  className = "",
}: OrderSummaryProps) {
  const total = subtotal + (shippingCost ?? 0) + (paymentFee ?? 0);

  return (
    <div className={`bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high ${className}`}>
      <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Ringkasan Pesanan</h3>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">Subtotal</dt>
          <dd className="text-on-surface">{formatRupiah(subtotal)}</dd>
        </div>
        {requiresShipping && (
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Ongkos Kirim</dt>
            <dd className="text-on-surface">{shippingCost !== null && shippingCost !== undefined ? formatRupiah(shippingCost) : "—"}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">Biaya Layanan Pembayaran</dt>
          <dd className="text-on-surface">{paymentFee !== null && paymentFee !== undefined ? formatRupiah(paymentFee) : "—"}</dd>
        </div>
      </dl>
      <div className="flex justify-between items-baseline pt-4 mt-4 border-t border-outline-variant/20">
        <span className="font-label font-semibold text-on-surface">Total</span>
        <span className="font-headline text-xl font-bold text-primary">{formatRupiah(total)}</span>
      </div>
    </div>
  );
}
