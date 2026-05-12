import { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import ImagePreviewModal from "@/Components/ImagePreviewModal";
import { Rsvp, Transaction } from "@/types";

interface EventStats {
  total_registrants: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
  total_revenue: string;
  manual_pending: number;
}

interface PackageStat {
  package_id: number;
  package_name: string;
  count: number;
  paid_count: number;
  revenue: number;
}

interface AddonStat {
  addon_id: number;
  addon_name: string;
  count: number;
  total_qty: number;
  revenue: number;
}

interface EventShowProps {
  admin: { id: number; name: string; email: string };
  event: {
    id: number;
    title: string;
    location: string;
    event_date: string;
    metadata: Record<string, unknown> | null;
  };
  rsvps: (Rsvp & {
    user: { id: number; name: string; email: string; marhalah_year: number } | null;
    package: { id: number; name: string } | null;
    latest_transaction: Transaction | null;
  })[];
  stats: EventStats;
  package_stats: PackageStat[];
  addon_stats: AddonStat[];
}

const formatRp = (val: string | number) =>
  "Rp " + parseInt(String(val) || "0").toLocaleString("id-ID");

const providerLabel: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-blue-900/30 text-blue-300 border border-blue-700/40" },
  ipaymu: {
    label: "iPaymu",
    color: "bg-purple-900/30 text-purple-300 border border-purple-700/40",
  },
};

const txStatusBadge: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  paid: "bg-emerald-900/30 text-emerald-300 border border-emerald-700/40",
  failed: "bg-red-900/30 text-red-300 border border-red-700/40",
  expired: "bg-zinc-800 text-zinc-400 border border-zinc-700",
  cancelled: "bg-zinc-800 text-zinc-400 border border-zinc-700",
};

interface QuickReviewModalProps {
  transactionId: number;
  action: "approve" | "reject";
  userName: string;
  onClose: () => void;
}

function QuickReviewModal({ transactionId, action, userName, onClose }: QuickReviewModalProps) {
  const { data, setData, post, processing, errors } = useForm({ review_note: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint =
      action === "approve"
        ? `/god-mode/payments/${transactionId}/approve`
        : `/god-mode/payments/${transactionId}/reject`;
    post(endpoint, { onSuccess: onClose });
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
            ? `Konfirmasi pembayaran dari ${userName} telah diterima.`
            : `Tolak bukti transfer dari ${userName}.`}
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
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            {errors.review_note && (
              <p className="text-red-400 text-xs mt-1">{errors.review_note}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl font-medium text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 ${action === "approve" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-700 hover:bg-red-600 text-white"}`}
            >
              {processing ? "Memproses..." : action === "approve" ? "Setujui" : "Tolak"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventShow({
  admin,
  event,
  rsvps,
  stats,
  package_stats,
  addon_stats,
}: EventShowProps) {
  const [activeTab, setActiveTab] = useState<"peserta" | "statistik">("peserta");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [modal, setModal] = useState<{
    transactionId: number;
    action: "approve" | "reject";
    userName: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    imagePath: string;
    fileName: string;
  } | null>(null);

  const filteredRsvps = rsvps.filter((r) => {
    const matchSearch =
      search === "" ||
      (r.user?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.user?.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <GodModeLayout admin={admin} title={`Event: ${event.title}`}>
      <Head title={`God Mode - ${event.title}`} />

      {modal && (
        <QuickReviewModal
          transactionId={modal.transactionId}
          action={modal.action}
          userName={modal.userName}
          onClose={() => setModal(null)}
        />
      )}

      {imagePreview && (
        <ImagePreviewModal
          imagePath={imagePreview.imagePath}
          fileName={imagePreview.fileName}
          onClose={() => setImagePreview(null)}
        />
      )}

      {/* Top bar */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
        <Link
          href="/god-mode/events"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Events
        </Link>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/god-mode/events/${event.id}/export-csv`}
            className="inline-flex items-center gap-2 text-sm bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export CSV
          </a>
          <Link
            href={`/god-mode/events/${event.id}/addons`}
            className="inline-flex items-center gap-2 text-sm bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">category</span>
            Kelola Addon
          </Link>
          <Link
            href={`/god-mode/events/${event.id}/packages`}
            className="inline-flex items-center gap-2 text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            Kelola Paket
          </Link>
          <Link
            href={`/god-mode/events/${event.id}/edit`}
            className="inline-flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Edit Event
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Total RSVP
            </p>
            <span className="material-symbols-outlined text-blue-400 text-[18px]">group</span>
          </div>
          <p className="text-3xl font-bold text-white font-headline">{stats.total_registrants}</p>
        </div>

        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Lunas</p>
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">
              check_circle
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-400 font-headline">{stats.paid_count}</p>
        </div>

        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Pending</p>
            <span className="material-symbols-outlined text-amber-400 text-[18px]">pending</span>
          </div>
          <p className="text-3xl font-bold text-amber-400 font-headline">{stats.pending_count}</p>
          {stats.manual_pending > 0 && (
            <p className="text-xs text-amber-300/70 mt-1">
              {stats.manual_pending} butuh verifikasi
            </p>
          )}
        </div>

        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Gagal/Expired
            </p>
            <span className="material-symbols-outlined text-red-400 text-[18px]">cancel</span>
          </div>
          <p className="text-3xl font-bold text-red-400 font-headline">{stats.failed_count}</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-[#161b22] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Pendapatan
            </p>
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">payments</span>
          </div>
          <p className="text-xl font-bold text-white font-headline">
            {formatRp(stats.total_revenue)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab("peserta")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "peserta" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
        >
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-base">group</span>
            Peserta
          </span>
        </button>
        <button
          onClick={() => setActiveTab("statistik")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "statistik" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
        >
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-base">bar_chart</span>
            Statistik &amp; Laporan
          </span>
        </button>
      </div>

      {/* ─── Peserta Tab ─────────────────────────────────────────────────── */}
      {activeTab === "peserta" && (
        <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex flex-wrap gap-3 items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Daftar Peserta
              <span className="ml-2 text-white/40 font-normal text-sm">
                ({filteredRsvps.length} dari {rsvps.length})
              </span>
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / email..."
                className="bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 w-52"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Lunas</option>
                <option value="failed">Gagal</option>
                <option value="expired">Kadaluarsa</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/70">
              <thead className="bg-white/5 text-xs uppercase text-white/40 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 font-semibold">Peserta</th>
                  <th className="px-5 py-3 font-semibold">Paket</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Metode Bayar</th>
                  <th className="px-5 py-3 font-semibold">Status Bayar</th>
                  <th className="px-5 py-3 font-semibold">Bukti</th>
                  <th className="px-5 py-3 font-semibold">Status RSVP</th>
                  <th className="px-5 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRsvps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-white/30">
                      Tidak ada peserta ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRsvps.map((rsvp) => {
                    const tx = rsvp.latest_transaction;
                    const isManualPending =
                      tx?.payment_provider === "manual" && tx?.status === "pending";
                    const providerInfo = tx ? (providerLabel[tx.payment_provider] ?? null) : null;

                    return (
                      <tr key={rsvp.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{rsvp.user?.name ?? "—"}</div>
                          <div className="text-xs text-white/40 mt-0.5">
                            {rsvp.user?.email ?? "—"}
                          </div>
                          <div className="text-xs text-white/30 mt-0.5">
                            {new Date(rsvp.created_at).toLocaleDateString("id-ID")}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-white/80">{rsvp.package?.name ?? "—"}</span>
                          {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
                            <div className="text-xs text-white/40 mt-0.5">
                              +{rsvp.add_ons_snapshot.length} addon
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-white">
                          {formatRp(rsvp.total_amount)}
                        </td>

                        <td className="px-5 py-4">
                          {providerInfo ? (
                            <div className="space-y-1">
                              <span
                                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${providerInfo.color}`}
                              >
                                {providerInfo.label}
                              </span>
                              {tx?.payment_channel && (
                                <div className="text-xs text-white/40">{tx.payment_channel}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {tx ? (
                            <span
                              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md ${txStatusBadge[tx.status] ?? ""}`}
                            >
                              {tx.status}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {tx?.proof ? (
                            <button
                              onClick={() =>
                                setImagePreview({
                                  imagePath: `/storage/${tx!.proof!.file_path}`,
                                  fileName: tx!.proof!.original_name,
                                })
                              }
                              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">attach_file</span>
                              Lihat
                            </button>
                          ) : (
                            <span className="text-xs text-white/30">Belum</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md ${txStatusBadge[rsvp.status] ?? ""}`}
                          >
                            {rsvp.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <Link
                              href={`/god-mode/events/${event.id}/participants/${rsvp.id}`}
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              Detail
                            </Link>
                            {isManualPending && tx && (
                              <>
                                <button
                                  onClick={() =>
                                    setModal({
                                      transactionId: tx.id,
                                      action: "approve",
                                      userName: rsvp.user?.name ?? "",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    check_circle
                                  </span>
                                  Setujui
                                </button>
                                <button
                                  onClick={() =>
                                    setModal({
                                      transactionId: tx.id,
                                      action: "reject",
                                      userName: rsvp.user?.name ?? "",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">cancel</span>
                                  Tolak
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Statistik Tab ───────────────────────────────────────────────── */}
      {activeTab === "statistik" && (
        <div className="space-y-6">
          {/* Package Stats */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-[18px]">
                  inventory_2
                </span>
                Statistik Paket
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-white/70">
                <thead className="bg-white/5 text-xs uppercase text-white/40 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nama Paket</th>
                    <th className="px-5 py-3 font-semibold text-right">Total Pemesan</th>
                    <th className="px-5 py-3 font-semibold text-right">Sudah Bayar</th>
                    <th className="px-5 py-3 font-semibold text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {package_stats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-white/30">
                        Belum ada data paket.
                      </td>
                    </tr>
                  ) : (
                    package_stats.map((pkg) => (
                      <tr key={pkg.package_id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-4 font-semibold text-white">{pkg.package_name}</td>
                        <td className="px-5 py-4 text-right">{pkg.count}</td>
                        <td className="px-5 py-4 text-right text-emerald-400">{pkg.paid_count}</td>
                        <td className="px-5 py-4 text-right font-semibold text-white">
                          {formatRp(pkg.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                  {package_stats.length > 0 && (
                    <tr className="bg-white/5 font-bold">
                      <td className="px-5 py-3 text-white/60 text-xs uppercase tracking-wider">
                        Total
                      </td>
                      <td className="px-5 py-3 text-right text-white">
                        {package_stats.reduce((s, p) => s + p.count, 0)}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-400">
                        {package_stats.reduce((s, p) => s + p.paid_count, 0)}
                      </td>
                      <td className="px-5 py-3 text-right text-white">
                        {formatRp(package_stats.reduce((s, p) => s + p.revenue, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Addon Stats */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[18px]">
                  category
                </span>
                Statistik Addon
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-white/70">
                <thead className="bg-white/5 text-xs uppercase text-white/40 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nama Addon</th>
                    <th className="px-5 py-3 font-semibold text-right">Pemesan</th>
                    <th className="px-5 py-3 font-semibold text-right">Total Qty</th>
                    <th className="px-5 py-3 font-semibold text-right">Pendapatan (Lunas)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {addon_stats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-white/30">
                        Belum ada addon yang dipesan.
                      </td>
                    </tr>
                  ) : (
                    addon_stats.map((addon) => (
                      <tr key={addon.addon_id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-4 font-semibold text-white">{addon.addon_name}</td>
                        <td className="px-5 py-4 text-right">{addon.count}</td>
                        <td className="px-5 py-4 text-right">{addon.total_qty}</td>
                        <td className="px-5 py-4 text-right font-semibold text-white">
                          {formatRp(addon.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                  {addon_stats.length > 0 && (
                    <tr className="bg-white/5 font-bold">
                      <td className="px-5 py-3 text-white/60 text-xs uppercase tracking-wider">
                        Total
                      </td>
                      <td className="px-5 py-3 text-right text-white">
                        {addon_stats.reduce((s, a) => s + a.count, 0)}
                      </td>
                      <td className="px-5 py-3 text-right text-white">
                        {addon_stats.reduce((s, a) => s + a.total_qty, 0)}
                      </td>
                      <td className="px-5 py-3 text-right text-white">
                        {formatRp(addon_stats.reduce((s, a) => s + a.revenue, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </GodModeLayout>
  );
}
