import { useForm } from "@inertiajs/react";

interface PaymentReviewModalProps {
  transactionId: number;
  action: "approve" | "reject";
  userName: string;
  onClose: () => void;
}

/**
 * Approve/reject a manual-transfer transaction via `/god-mode/payments/{id}/approve|reject` —
 * those routes already branch on RSVP vs. `StoreOrder` payable, so this modal works unchanged
 * from both the Payments list and a Store Order's own detail page.
 */
export default function PaymentReviewModal({
  transactionId,
  action,
  userName,
  onClose,
}: PaymentReviewModalProps) {
  const { data, setData, post, processing, errors } = useForm({
    review_note: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint =
      action === "approve"
        ? `/god-mode/payments/${transactionId}/approve`
        : `/god-mode/payments/${transactionId}/reject`;

    post(endpoint, {
      onSuccess: onClose,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="font-headline font-bold text-white text-lg mb-1">
          {action === "approve" ? "✅ Setujui Pembayaran" : "❌ Tolak Pembayaran"}
        </h3>
        <p className="text-white/50 text-sm mb-5">
          {action === "approve"
            ? `Konfirmasi bahwa ${userName} telah berhasil melakukan transfer.`
            : `Tolak bukti transfer dari ${userName} dan minta upload ulang.`}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider block mb-1.5">
              Catatan {action === "reject" ? "(Wajib)" : "(Opsional)"}
            </label>
            <textarea
              value={data.review_note}
              onChange={(e) => setData("review_note", e.target.value)}
              rows={3}
              required={action === "reject"}
              placeholder={
                action === "approve"
                  ? "Bukti pembayaran terverifikasi."
                  : "Contoh: Nominal tidak sesuai, tolong transfer ulang..."
              }
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
            {errors.review_note && (
              <p className="text-red-400 text-xs mt-1">{errors.review_note}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
                action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-red-700 hover:bg-red-600 text-white"
              }`}
            >
              {processing ? "Memproses..." : action === "approve" ? "Setujui" : "Tolak"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
