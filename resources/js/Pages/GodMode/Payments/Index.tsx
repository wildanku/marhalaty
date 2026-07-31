import { useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { Transaction } from "@/types";

interface PaginatedTransactions {
  data: Transaction[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url: string | null;
  prev_page_url: string | null;
}

interface PaymentsIndexProps {
  admin: { id: number; name: string; email: string };
  transactions: PaginatedTransactions;
}

const formatRupiah = (val: string | number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(typeof val === "string" ? parseFloat(val) : val);

const statusBadge: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  paid: "bg-emerald-900/30 text-emerald-300 border border-emerald-700/40",
  failed: "bg-red-900/30 text-red-300 border border-red-700/40",
  expired: "bg-zinc-800 text-zinc-400 border border-zinc-700",
};

interface ReviewModalProps {
  transactionId: number;
  action: "approve" | "reject";
  userName: string;
  onClose: () => void;
}

function ReviewModal({ transactionId, action, userName, onClose }: ReviewModalProps) {
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

export default function PaymentsIndex({ admin, transactions }: PaymentsIndexProps) {
  const [modal, setModal] = useState<{
    transactionId: number;
    action: "approve" | "reject";
    userName: string;
  } | null>(null);

  return (
    <GodModeLayout admin={admin} title="Manual Payments">
      <Head title="God Mode - Payments" />

      {/* Modal */}
      {modal && (
        <ReviewModal
          transactionId={modal.transactionId}
          action={modal.action}
          userName={modal.userName}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-headline font-bold text-white">Manual Payments</h1>
          <p className="text-white/50 text-sm mt-1">
            Verifikasi bukti transfer manual dari peserta event maupun pembeli toko.
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-amber-900/40 text-amber-300 border border-amber-700/40 rounded-full px-3 py-1 text-sm font-bold">
            {transactions.data.filter((t) => t.status === "pending").length} Pending
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        {transactions.data.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <span className="material-symbols-outlined text-5xl mb-3 block">inbox</span>
            <p className="text-sm">Tidak ada transaksi manual.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    #
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Peserta
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Event / Toko
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Nominal
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Bukti
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Tgl
                  </th>
                  <th className="px-5 py-3.5 text-white/40 font-semibold uppercase tracking-wider text-xs">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.data.map((tx) => {
                  // `tx.user` is eager-loaded directly on the transaction — always populated,
                  // for both the RSVP flow and store orders.
                  const user = tx.user;
                  const event = tx.rsvp?.event;
                  const order = tx.payable;
                  const hasProof = !!tx.proof;

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-white/40 font-mono text-xs">#{tx.id}</td>

                      <td className="px-5 py-4">
                        <p className="text-white font-medium">{user?.name ?? "—"}</p>
                        <p className="text-white/40 text-xs">{user?.email ?? ""}</p>
                      </td>

                      <td className="px-5 py-4">
                        {order ? (
                          <>
                            <p className="text-white/70 text-xs">{order.order_number}</p>
                            <p className="text-white/40 text-[11px]">{order.store?.name ?? "Toko"}</p>
                          </>
                        ) : (
                          <p className="text-white/70 text-xs line-clamp-2">{event?.title ?? "—"}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-emerald-300 font-bold font-headline">
                          {formatRupiah(tx.amount)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {hasProof ? (
                          <a
                            href={`/god-mode/payments/${tx.id}/proof`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              open_in_new
                            </span>
                            Lihat Bukti
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs italic">Belum upload</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-block text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${statusBadge[tx.status] ?? ""}`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-white/40 text-xs">
                        {new Date(tx.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-5 py-4">
                        {tx.status === "pending" && hasProof ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setModal({
                                  transactionId: tx.id,
                                  action: "approve",
                                  userName: user?.name ?? "peserta",
                                })
                              }
                              className="inline-flex items-center gap-1 bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-300 border border-emerald-700/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Setujui
                            </button>
                            <button
                              onClick={() =>
                                setModal({
                                  transactionId: tx.id,
                                  action: "reject",
                                  userName: user?.name ?? "peserta",
                                })
                              }
                              className="inline-flex items-center gap-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-700/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              Tolak
                            </button>
                          </div>
                        ) : tx.status === "pending" && !hasProof ? (
                          <span className="text-white/30 text-xs italic">Menunggu bukti...</span>
                        ) : (
                          <span className="text-white/30 text-xs capitalize">
                            {tx.status === "paid" ? "✅ Disetujui" : tx.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {transactions.last_page > 1 && (
          <div className="flex justify-between items-center px-5 py-4 border-t border-white/5">
            <span className="text-white/40 text-xs">
              Halaman {transactions.current_page} dari {transactions.last_page} ·{" "}
              {transactions.total} transaksi
            </span>
            <div className="flex gap-2">
              {transactions.prev_page_url && (
                <Link
                  href={transactions.prev_page_url}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
                >
                  ← Sebelumnya
                </Link>
              )}
              {transactions.next_page_url && (
                <Link
                  href={transactions.next_page_url}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
                >
                  Berikutnya →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
