import { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import ImagePreviewModal from "@/Components/ImagePreviewModal";
import { Rsvp, Transaction, PaymentProof, RsvpAddonSnapshot, CustomFormField } from "@/types";

interface ParticipantRsvp extends Rsvp {
  user: {
    id: number;
    name: string;
    email: string;
    marhalah_year: number;
    phone_number: string | null;
    city: string | { name: string } | null;
    country: string | null;
  } | null;
  guestCity: { name: string } | null;
  package: { id: number; name: string; price: string } | null;
  latest_transaction: (Transaction & { proof: PaymentProof | null }) | null;
}

interface ParticipantShowProps {
  admin: { id: number; name: string; email: string };
  event: {
    id: number;
    title: string;
    metadata: { custom_forms?: CustomFormField[]; [key: string]: unknown } | null;
  };
  rsvp: ParticipantRsvp;
}

const formatRp = (val: string | number) =>
  "Rp " + parseInt(String(val) || "0").toLocaleString("id-ID");

const txStatusBadge: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  paid: "bg-emerald-900/30 text-emerald-300 border border-emerald-700/40",
  failed: "bg-red-900/30 text-red-300 border border-red-700/40",
  expired: "bg-zinc-800 text-zinc-400 border border-zinc-700",
  cancelled: "bg-zinc-800 text-zinc-400 border border-zinc-700",
};

interface ReviewFormProps {
  transactionId: number;
  action: "approve" | "reject";
  onCancel: () => void;
}

function ReviewForm({ transactionId, action, onCancel }: ReviewFormProps) {
  const { data, setData, post, processing, errors } = useForm({ review_note: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint =
      action === "approve"
        ? `/god-mode/payments/${transactionId}/approve`
        : `/god-mode/payments/${transactionId}/reject`;
    post(endpoint);
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-white/5 pt-4">
      <label className="text-xs text-white/60 uppercase tracking-wider block">
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
      {errors.review_note && <p className="text-red-400 text-xs">{errors.review_note}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl font-medium text-sm"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={processing}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 ${action === "approve" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-700 hover:bg-red-600 text-white"}`}
        >
          {processing
            ? "Memproses..."
            : action === "approve"
              ? "✅ Konfirmasi Setuju"
              : "❌ Konfirmasi Tolak"}
        </button>
      </div>
    </form>
  );
}

export default function ParticipantShow({ admin, event, rsvp }: ParticipantShowProps) {
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    imagePath: string;
    fileName: string;
  } | null>(null);
  const tx = rsvp.latest_transaction;
  const isManualPending = tx?.payment_provider === "manual" && tx?.status === "pending";
  const customForms = event.metadata?.custom_forms ?? [];

  const cityName = (() => {
    if (rsvp.is_manual_entry) {
      if (!rsvp.guestCity) return rsvp.guest_foreign_city;
      return rsvp.guestCity.name;
    }
    if (!rsvp.user?.city) return null;
    if (typeof rsvp.user.city === "string") return rsvp.user.city;
    return rsvp.user.city.name;
  })();

  return (
    <GodModeLayout
      admin={admin}
      title={`Peserta: ${rsvp.is_manual_entry ? rsvp.guest_name : (rsvp.user?.name ?? "—")}`}
    >
      <Head title={`God Mode - Detail Peserta`} />

      {imagePreview && (
        <ImagePreviewModal
          imagePath={imagePreview.imagePath}
          fileName={imagePreview.fileName}
          onClose={() => setImagePreview(null)}
        />
      )}

      {/* Back */}
      <div className="mb-6">
        <Link
          href={`/god-mode/events/${event.id}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Kembali ke {event.title}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ──────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          {/* User Profile */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-blue-400">person</span>
              Profil Peserta
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Nama</p>
                <p className="text-white font-semibold">
                  {rsvp.is_manual_entry ? rsvp.guest_name : (rsvp.user?.name ?? "—")}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Email</p>
                <p className="text-white/80 text-sm">
                  {rsvp.is_manual_entry ? rsvp.guest_email || "—" : (rsvp.user?.email ?? "—")}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">No. HP</p>
                <p className="text-white/80 text-sm">
                  {rsvp.is_manual_entry
                    ? rsvp.guest_phone || "—"
                    : (rsvp.user?.phone_number ?? "—")}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Marhalah</p>
                <p className="text-white/80 text-sm">
                  {rsvp.is_manual_entry ? "Manual Registration" : (rsvp.user?.marhalah_year ?? "—")}
                </p>
              </div>
              {cityName && (
                <div>
                  <p className="text-xs text-white/40 mb-0.5">Kota</p>
                  <p className="text-white/80 text-sm">{cityName}</p>
                </div>
              )}
              {(rsvp.is_manual_entry ? rsvp.guest_country : rsvp.user?.country) && (
                <div>
                  <p className="text-xs text-white/40 mb-0.5">Negara</p>
                  <p className="text-white/80 text-sm">
                    {rsvp.is_manual_entry ? rsvp.guest_country : rsvp.user?.country}
                  </p>
                </div>
              )}
            </div>
            {!rsvp.is_manual_entry && rsvp.user && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <Link
                  href={`/god-mode/users/${rsvp.user.id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Lihat profil lengkap
                </Link>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-400">payments</span>
              Info Pembayaran
            </h2>

            {!tx ? (
              <p className="text-white/30 text-sm">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Metode</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${tx.payment_provider === "ipaymu" ? "bg-purple-900/30 text-purple-300 border border-purple-700/40" : "bg-blue-900/30 text-blue-300 border border-blue-700/40"}`}
                  >
                    {tx.payment_provider === "ipaymu" ? "iPaymu" : "Transfer Manual"}
                  </span>
                </div>

                {tx.payment_channel && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Channel</span>
                    <span className="text-xs text-white/80 uppercase">{tx.payment_channel}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Status Bayar</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${txStatusBadge[tx.status] ?? ""}`}
                  >
                    {tx.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Status RSVP</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${txStatusBadge[rsvp.status] ?? ""}`}
                  >
                    {rsvp.status}
                  </span>
                </div>

                {tx.va_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">VA Number</span>
                    <span className="text-xs font-mono text-white/80">{tx.va_number}</span>
                  </div>
                )}

                {tx.paid_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Dibayar</span>
                    <span className="text-xs text-white/80">
                      {new Date(tx.paid_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                {tx.expired_at && !tx.paid_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Kadaluarsa</span>
                    <span className="text-xs text-amber-400">
                      {new Date(tx.expired_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                {/* Proof */}
                {tx?.proof && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-2">Bukti Pembayaran</p>
                    <div className="bg-white/5 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                        <span className="truncate flex-1">{tx.proof.original_name}</span>
                      </div>
                      {tx.proof.notes && (
                        <p className="text-white/40 mt-1 pl-6">{tx.proof.notes}</p>
                      )}
                      {tx.proof.reviewed_at && (
                        <div className="mt-2 pl-6 space-y-1">
                          <p className="text-white/40">
                            Ditinjau: {new Date(tx.proof.reviewed_at).toLocaleDateString("id-ID")}
                          </p>
                          {tx.proof.review_note && (
                            <p className="text-white/60 italic">
                              &ldquo;{tx.proof.review_note}&rdquo;
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2 ml-6">
                        <button
                          onClick={() =>
                            setImagePreview({
                              imagePath: `/storage/${tx!.proof!.file_path}`,
                              fileName: tx!.proof!.original_name,
                            })
                          }
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">preview</span>
                          Lihat Gambar
                        </button>
                        <a
                          href={`/storage/${tx!.proof!.file_path}`}
                          download={tx!.proof!.original_name}
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Approve / Reject buttons for manual pending */}
            {isManualPending && tx && (
              <div className="mt-4 pt-4 border-t border-white/5">
                {reviewAction === null && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReviewAction("approve")}
                      className="flex-1 bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-300 border border-emerald-700/40 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                      ✅ Setujui
                    </button>
                    <button
                      onClick={() => setReviewAction("reject")}
                      className="flex-1 bg-red-900/30 hover:bg-red-800/40 text-red-300 border border-red-700/40 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                      ❌ Tolak
                    </button>
                  </div>
                )}
                {reviewAction && (
                  <ReviewForm
                    transactionId={tx.id}
                    action={reviewAction}
                    onCancel={() => setReviewAction(null)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Registration Summary */}
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-400">
                receipt_long
              </span>
              Rincian Pendaftaran
            </h2>

            {/* Package */}
            <div className="mb-4 pb-4 border-b border-white/5">
              <p className="text-xs text-white/40 mb-1">Paket</p>
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">{rsvp.package?.name ?? "—"}</span>
                <span className="text-white font-semibold">{formatRp(rsvp.package_amount)}</span>
              </div>
            </div>

            {/* Addons */}
            {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
              <div className="mb-4 pb-4 border-b border-white/5">
                <p className="text-xs text-white/40 mb-2">Addon yang Dipesan</p>
                <div className="space-y-2">
                  {rsvp.add_ons_snapshot.map((addon: RsvpAddonSnapshot, i) => (
                    <div key={i} className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-white/80 text-sm">{addon.name}</span>
                        {/* Variants (Included) */}
                        {addon.variants && Object.keys(addon.variants).length > 0 && (
                          <div className="text-xs text-white/40 mt-0.5">
                            {Object.entries(addon.variants)
                              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                              .join(", ")}
                          </div>
                        )}
                        {/* Variants (Purchased) */}
                        {addon.variant_slots && Object.keys(addon.variant_slots).length > 0 && (
                          <div className="text-xs text-white/40 mt-0.5">
                            {Object.entries(addon.variant_slots)
                              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                              .join(", ")}
                          </div>
                        )}
                        {/* Custom Forms */}
                        {addon.form && Object.keys(addon.form).length > 0 && (
                          <div className="text-xs text-white/40 mt-0.5">
                            {Object.entries(addon.form)
                              .map(([k, v]) => {
                                if (typeof v === "object" && v !== null && !Array.isArray(v)) {
                                  return `[Item #${parseInt(k) + 1}: ${Object.entries(v)
                                    .map(([sk, sv]) => `${sk} = ${sv}`)
                                    .join(", ")}]`;
                                }
                                return `${k}: ${v}`;
                              })
                              .join(" ")}
                          </div>
                        )}
                        {addon.note && (
                          <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-2 text-xs text-amber-100">
                            <span className="font-semibold">Catatan produk:</span> {addon.note}
                          </div>
                        )}
                        <span className="text-xs text-white/40">x{addon.quantity}</span>
                      </div>
                      <span className="text-white/80 text-sm whitespace-nowrap">
                        {formatRp(addon.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infak */}
            {parseFloat(rsvp.infak_amount) > 0 && (
              <div className="mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Infak</span>
                  <span className="text-white/80">{formatRp(rsvp.infak_amount)}</span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Total</span>
              <span className="font-bold text-white text-lg">{formatRp(rsvp.total_amount)}</span>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/30">
              Didaftarkan: {new Date(rsvp.created_at).toLocaleString("id-ID")}
            </div>
          </div>

          {/* Custom Form Data */}
          {customForms.length > 0 && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-teal-400">
                  assignment
                </span>
                Jawaban Formulir
              </h2>
              <div className="space-y-3">
                {customForms.map((field: CustomFormField) => {
                  const fieldKey = field.id ?? field.label;
                  const answer = rsvp.custom_form_data?.[fieldKey] ?? "—";
                  return (
                    <div key={fieldKey} className="flex flex-col gap-1">
                      <p className="text-xs text-white/40">{field.label}</p>
                      <p className="text-white/80 text-sm">{answer || "—"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* iPaymu QR / VA Info */}
          {tx?.payment_provider === "ipaymu" && tx?.status === "pending" && (
            <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-purple-400">qr_code</span>
                Info iPaymu
              </h2>
              {tx.va_number && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1">Nomor Virtual Account</p>
                  <p className="font-mono text-white text-lg tracking-widest">{tx.va_number}</p>
                </div>
              )}
              {tx.payment_hash && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Link Pembayaran</p>
                  <a
                    href={`/payment/${tx.payment_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    /payment/{tx.payment_hash.slice(0, 12)}...
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GodModeLayout>
  );
}
