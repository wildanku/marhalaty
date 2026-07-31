import { StoreOrderStatusHistory } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export default function OrderStatusTimeline({
  histories,
}: {
  histories: StoreOrderStatusHistory[];
}) {
  if (histories.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-6">
      <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Riwayat Status</h2>
      <ul className="space-y-3">
        {histories.map((history) => (
          <li key={history.id} className="flex items-start gap-3 text-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">
              history
            </span>
            <div className="min-w-0">
              <p className="text-on-surface">
                {STATUS_LABELS[history.from_status] ?? history.from_status}
                {" → "}
                <span className="font-medium">
                  {STATUS_LABELS[history.to_status] ?? history.to_status}
                </span>
              </p>
              <p className="text-xs text-on-surface-variant">
                {new Date(history.created_at).toLocaleString("id-ID")} ·{" "}
                {history.actor_type === "admin" ? "Admin" : "Penjual"}
              </p>
              {history.reason && (
                <p className="text-xs text-on-surface-variant italic mt-0.5">"{history.reason}"</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
