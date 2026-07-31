import { useState } from "react";
import { router } from "@inertiajs/react";
import { StoreOrder } from "@/types";

interface OrderStatusControlProps {
  order: StoreOrder;
  updateUrl: string;
  /** Only true on the god-mode page (D51) — admin-store never gets "buka lagi". */
  allowReopen?: boolean;
}

const OVERRIDE_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "shipped", "completed", "cancelled"],
  processing: ["shipped", "completed", "cancelled"],
  shipped: ["completed"],
  cancelled: ["pending_payment"],
  expired: ["pending_payment"],
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function OrderStatusControl({ order, updateUrl, allowReopen = false }: OrderStatusControlProps) {
  const options = (OVERRIDE_TRANSITIONS[order.status] ?? []).filter(
    (status) => status !== "pending_payment" || allowReopen
  );

  const [target, setTarget] = useState<string>("");
  const [reason, setReason] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  if (options.length === 0) {
    return null;
  }

  const isReopen = target === "pending_payment";
  const needsReason = target === "cancelled";
  const needsTracking = target === "shipped";
  const canSubmit = target !== "" && (!needsReason || reason.trim() !== "");

  const submit = () => {
    if (!canSubmit) return;
    setProcessing(true);
    router.patch(
      updateUrl,
      {
        status: target,
        reason: reason.trim() || null,
        tracking_number: needsTracking ? trackingNumber.trim() || null : null,
      },
      {
        preserveScroll: true,
        onFinish: () => setProcessing(false),
        onSuccess: () => {
          setTarget("");
          setReason("");
          setTrackingNumber("");
        },
      }
    );
  };

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-6 space-y-4">
      <h2 className="font-headline text-lg font-bold text-on-surface">Ubah Status Pesanan</h2>

      <div>
        <label className="block font-label text-sm font-medium text-on-surface mb-2">
          Status Baru
        </label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="block w-full py-2.5 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
        >
          <option value="">Pilih status...</option>
          {options.map((status) => (
            <option key={status} value={status}>
              {status === "pending_payment" ? "Buka Lagi ke Menunggu Bayar" : STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {isReopen && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-tertiary-container/25 border border-tertiary-container/50 px-4 py-3">
          <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">
            warning
          </span>
          <p className="text-xs text-on-tertiary-container leading-relaxed">
            Stok TIDAK otomatis dikunci ulang — verifikasi manual ketersediaan sebelum membuka
            order ini.
          </p>
        </div>
      )}

      {needsTracking && (
        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            Nomor Resi (opsional)
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Nomor resi"
            className="block w-full py-2.5 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
          />
        </div>
      )}

      {target !== "" && (
        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            Alasan {needsReason ? "(wajib)" : "(opsional)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={needsReason ? "Alasan pembatalan" : "Catatan perubahan status (opsional)"}
            className="block w-full py-2.5 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || processing}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
