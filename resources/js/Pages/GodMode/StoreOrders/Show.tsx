import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { StoreOrder } from "@/types";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface StoreOrderShowProps {
  admin: Admin;
  order: StoreOrder;
  paymentStatus: string | null;
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
  expired: "Kedaluwarsa",
};

export default function StoreOrderShow({ admin, order, paymentStatus }: StoreOrderShowProps) {
  const shippingAddress = order.shipping_address_snapshot;
  const histories = order.status_histories ?? [];

  const options = OVERRIDE_TRANSITIONS[order.status] ?? [];
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const isReopen = target === "pending_payment";
  const needsReason = target === "cancelled";
  const needsTracking = target === "shipped";
  const canSubmit = target !== "" && (!needsReason || reason.trim() !== "");

  const submitStatus = () => {
    if (!canSubmit) return;
    setProcessing(true);
    router.patch(
      `/god-mode/store-orders/${order.id}/status`,
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
    <GodModeLayout admin={admin} title={order.order_number}>
      <Head title={`God Mode - ${order.order_number}`} />

      <Link href="/god-mode/store-orders" className="text-white/50 hover:text-white text-sm flex items-center gap-1 mb-4">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Kembali ke daftar order
      </Link>

      {paymentStatus && (
        <span className="inline-flex items-center gap-1.5 mb-6 text-[10px] uppercase tracking-wide font-semibold text-white/60 border border-white/10 rounded-full px-2.5 py-1">
          Status bayar: {paymentStatus}
        </span>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {order.buyer_note && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-2">Catatan untuk Penjual</h3>
              <p className="text-white/70 text-sm">{order.buyer_note}</p>
            </div>
          )}

          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Item Pesanan</h3>
            <div className="divide-y divide-white/5">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white">
                      {item.name_snapshot}
                      {item.variant_label_snapshot ? ` (${item.variant_label_snapshot})` : ""}
                    </p>
                    <p className="text-white/50 text-xs">× {item.quantity} · {item.type_snapshot}</p>
                    {item.note_snapshot && (
                      <p className="text-white/40 text-xs italic mt-0.5">"{item.note_snapshot}"</p>
                    )}
                  </div>
                  <span className="text-white">Rp {Number(item.subtotal).toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 mt-3 border-t border-white/5 space-y-1.5 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>Rp {Number(order.subtotal).toLocaleString("id-ID")}</span>
              </div>
              {order.requires_shipping && (
                <div className="flex justify-between text-white/70">
                  <span>Ongkos Kirim</span>
                  <span>Rp {Number(order.shipping_cost).toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between text-white/70">
                <span>Biaya Layanan</span>
                <span>Rp {Number(order.payment_fee).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-white font-semibold pt-1.5 mt-1.5 border-t border-white/5">
                <span>Total</span>
                <span>Rp {Number(order.total).toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          {order.requires_shipping && shippingAddress && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Alamat Pengiriman</h3>
              <p className="text-sm text-white">{shippingAddress.recipient_name} — {shippingAddress.phone}</p>
              <p className="text-sm text-white/50">{shippingAddress.full_address ?? shippingAddress.address_line}</p>
              {order.tracking_number && (
                <p className="text-sm text-white/70 mt-2">
                  Resi: <span className="text-white font-semibold">{order.tracking_number}</span> ({order.shipping_courier_name} {order.shipping_service})
                </p>
              )}
            </div>
          )}

          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Riwayat Transaksi</h3>
            {(order.transactions ?? []).length === 0 ? (
              <p className="text-white/40 text-sm">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-4">
                {(order.transactions ?? []).map((tx) => (
                  <div key={tx.id} className="border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white font-semibold">#{tx.id} · {tx.status}</span>
                      <span className="text-white/50">{tx.payment_channel}</span>
                    </div>
                    <p className="text-white/50 text-xs">Rp {Number(tx.amount).toLocaleString("id-ID")} · fee Rp {Number(tx.payment_fee).toLocaleString("id-ID")}</p>
                    <p className="text-white/50 text-xs">external_reference: {tx.external_reference ?? "-"}</p>
                    {tx.metadata?.callback ? (
                      <details className="mt-2">
                        <summary className="text-xs text-emerald-400 cursor-pointer">Lihat payload callback</summary>
                        <pre className="mt-2 bg-[#0f1117] rounded-lg p-3 text-[11px] text-white/60 overflow-x-auto">
                          {JSON.stringify(tx.metadata.callback, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {options.length > 0 && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Ubah Status Pesanan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Status Baru</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Pilih status...</option>
                    {options.map((status) => (
                      <option key={status} value={status}>
                        {status === "pending_payment"
                          ? "Buka Lagi ke Menunggu Bayar"
                          : STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                {isReopen && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    Stok TIDAK otomatis dikunci ulang — verifikasi manual ketersediaan sebelum
                    membuka order ini.
                  </p>
                )}

                {needsTracking && (
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">
                      Nomor Resi (opsional)
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                )}

                {target !== "" && (
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">
                      Alasan {needsReason ? "(wajib)" : "(opsional)"}
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={submitStatus}
                  disabled={!canSubmit || processing}
                  className="w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {histories.length > 0 && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Riwayat Status</h3>
              <ul className="space-y-3">
                {histories.map((history) => (
                  <li key={history.id} className="text-sm">
                    <p className="text-white">
                      {STATUS_LABELS[history.from_status] ?? history.from_status}
                      {" → "}
                      <span className="font-semibold">
                        {STATUS_LABELS[history.to_status] ?? history.to_status}
                      </span>
                    </p>
                    <p className="text-white/40 text-xs">
                      {new Date(history.created_at).toLocaleString("id-ID")} ·{" "}
                      {history.actor_type === "admin" ? "Admin" : "Penjual"}
                    </p>
                    {history.reason && (
                      <p className="text-white/40 text-xs italic mt-0.5">"{history.reason}"</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Toko</h3>
            <p className="text-white">{order.store?.name}</p>
          </div>
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Pembeli</h3>
            <p className="text-white">{order.buyer?.name}</p>
            <p className="text-white/50 text-sm">{order.buyer?.email}</p>
          </div>
          {order.cancellation_reason && (
            <div className="bg-[#161b22] border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-red-400 font-semibold mb-2">Alasan Pembatalan</h3>
              <p className="text-white/70 text-sm">{order.cancellation_reason}</p>
            </div>
          )}
        </div>
      </div>
    </GodModeLayout>
  );
}
