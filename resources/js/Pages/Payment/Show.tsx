import { useState } from "react";
import { Head, useForm, Link } from "@inertiajs/react";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import { validateFile } from "@/Helpers/fileValidation";
import { PageProps, Transaction, Rsvp, GontorEvent } from "@/types";

interface BankAccount {
  bank: string;
  account_number: string;
  account_holder: string;
}

interface PaymentShowProps extends PageProps {
  transaction: Transaction;
  rsvp: Rsvp;
  event: GontorEvent;
  bankAccounts: BankAccount[];
}

const formatRupiah = (val: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(typeof val === "string" ? parseFloat(val) : val);

const statusConfig: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  pending: {
    label: "Menunggu Pembayaran",
    color: "text-amber-700",
    icon: "schedule",
    bg: "bg-amber-50 border-amber-200",
  },
  paid: {
    label: "Pembayaran Berhasil",
    color: "text-emerald-700",
    icon: "check_circle",
    bg: "bg-emerald-50 border-emerald-200",
  },
  failed: {
    label: "Pembayaran Gagal",
    color: "text-red-700",
    icon: "cancel",
    bg: "bg-red-50 border-red-200",
  },
  expired: {
    label: "Pembayaran Kadaluarsa",
    color: "text-red-700",
    icon: "timer_off",
    bg: "bg-red-50 border-red-200",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-on-surface-variant",
    icon: "block",
    bg: "bg-surface-container border-outline-variant",
  },
};

export default function PaymentShow({
  auth,
  transaction,
  rsvp,
  event,
  bankAccounts,
}: PaymentShowProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const status = statusConfig[transaction.status] ?? statusConfig.pending;

  // ── Upload Proof Form ──────────────────────────────────────────────
  const proofForm = useForm<{
    proof: File | null;
    notes: string;
  }>({
    proof: null,
    notes: "",
  });

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileError(null);
      proofForm.setData("proof", null);
      return;
    }

    // Validate file
    const error = validateFile(file, ["image/jpeg", "image/png", "application/pdf"]);
    if (error) {
      setFileError(error.message);
      proofForm.setData("proof", null);
    } else {
      setFileError(null);
      proofForm.setData("proof", file);
    }
  };

  const submitProof = (e: React.FormEvent) => {
    e.preventDefault();
    proofForm.post(`/payments/${transaction.id}/proof`, {
      forceFormData: true,
    });
  };

  const isManual = transaction.payment_provider === "manual";
  const isPending = transaction.status === "pending";
  const hasProof = !!transaction.proof;

  return (
    <>
      <Head title={`Pembayaran #${transaction.id}`} />
      <div className="min-h-screen bg-surface text-on-surface font-body antialiased">
        <Header />

        <main className="max-w-2xl mx-auto px-6 py-12">
          {/* ── Header ── */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-4"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Kembali ke Dashboard
            </Link>
            <h1 className="font-headline text-3xl font-bold text-on-surface">Detail Pembayaran</h1>
            <p className="font-body text-on-surface-variant text-sm mt-1">
              Transaksi #{transaction.id} · {event.title}
            </p>
          </div>

          {/* ── Status Banner ── */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border mb-6 ${status.bg}`}>
            <span
              className={`material-symbols-outlined text-[28px] ${status.color}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {status.icon}
            </span>
            <div>
              <p className={`font-headline font-bold text-base ${status.color}`}>{status.label}</p>
              {transaction.status === "pending" && isManual && !hasProof && (
                <p className="font-body text-xs text-on-surface-variant mt-0.5">
                  Silakan transfer dan upload bukti pembayaran di bawah.
                </p>
              )}
              {transaction.status === "pending" && isManual && hasProof && (
                <p className="font-body text-xs text-on-surface-variant mt-0.5">
                  Bukti sudah diterima, menunggu verifikasi admin.
                </p>
              )}
            </div>
          </div>

          {/* ── Transaction Summary Card ── */}
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm mb-6">
            <h2 className="font-headline font-bold text-on-surface mb-4 text-base">
              Ringkasan Transaksi
            </h2>
            <div className="space-y-2.5">
              {/* Event */}
              <div className="flex justify-between items-center">
                <span className="font-body text-sm text-on-surface-variant">Event</span>
                <span className="font-body text-sm font-medium text-on-surface">{event.title}</span>
              </div>

              {/* Package & Included Addons */}
              {rsvp.event_package_id &&
                event.packages &&
                (() => {
                  const pkg = event.packages.find((p) => p.id === rsvp.event_package_id);
                  return pkg ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-body text-sm text-on-surface-variant">Paket</span>
                        <div className="text-right">
                          <span className="font-body text-sm font-medium text-on-surface">
                            {pkg.name}
                          </span>
                          <span className="block font-body text-xs text-on-surface-variant">
                            {formatRupiah(parseFloat(rsvp.package_amount))}
                          </span>
                        </div>
                      </div>
                      {/* Included Addons from Package */}
                      {pkg.included_addons && pkg.included_addons.length > 0 && (
                        <div className="ml-2 space-y-2 text-sm">
                          <p className="font-body text-xs text-on-surface-variant/70 uppercase tracking-wide">
                            Termasuk:
                          </p>
                          {pkg.included_addons.map((ia) => (
                            <div key={ia.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[14px]">
                                  check_small
                                </span>
                                <span className="font-body text-xs text-on-surface/80">
                                  {ia.name} ×{ia.pivot.included_quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}

              {/* Addons */}
              {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
                <div className="pt-2 border-t border-surface-container-high space-y-3">
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                    Tambahan
                  </div>
                  {rsvp.add_ons_snapshot.map((addon) => (
                    <div key={addon.id} className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-body text-sm text-on-surface font-medium">
                          {addon.name} ×{addon.quantity}
                        </span>
                        <span className="font-body text-sm font-semibold text-on-surface text-right">
                          {formatRupiah(addon.total)}
                        </span>
                      </div>
                      {/* Addon Variants */}
                      {addon.variants &&
                        typeof addon.variants === "object" &&
                        Object.keys(addon.variants).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(addon.variants).map(([variantKey, variantValue]) => (
                              <span
                                key={variantKey}
                                className="inline-flex items-center gap-1 bg-primary/5 text-primary text-[10px] font-medium px-2 py-1 rounded-lg"
                              >
                                <span className="material-symbols-outlined text-[11px]">
                                  check_small
                                </span>
                                {variantKey}: {String(variantValue)}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {/* Infak */}
              {parseFloat(rsvp.infak_amount) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-surface-container-high">
                  <span className="font-body text-sm text-on-surface-variant">Infak</span>
                  <span className="font-body text-sm font-medium text-on-surface">
                    {formatRupiah(parseFloat(rsvp.infak_amount))}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-surface-container-high">
                <span className="font-body text-sm font-medium text-on-surface">Subtotal</span>
                <span className="font-headline font-bold text-on-surface">
                  {formatRupiah(
                    parseFloat(rsvp.package_amount) +
                      (rsvp.add_ons_snapshot?.reduce((s, a) => s + a.total, 0) ?? 0) +
                      parseFloat(rsvp.infak_amount)
                  )}
                </span>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-2">
                <span className="font-body text-sm text-on-surface-variant">Metode</span>
                <span className="font-body text-sm font-medium text-on-surface capitalize">
                  {transaction.payment_provider === "ipaymu" ? "iPaymu" : "Transfer Manual"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-primary/5 -mx-6 px-6 py-3 rounded-lg">
                <span className="font-headline font-bold text-on-surface">Total Bayar</span>
                <span className="font-headline font-bold text-primary text-lg">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>

              {/* Transaction Date */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-body text-on-surface-variant">Tanggal</span>
                <span className="font-body text-on-surface">
                  {new Date(transaction.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {transaction.paid_at && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-body text-on-surface-variant">Dibayar pada</span>
                  <span className="font-body text-on-surface">
                    {new Date(transaction.paid_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── iPaymu: Pay Now Button ── */}
          {!isManual && isPending && transaction.payment_url && (
            <div className="bg-surface-container-lowest rounded-2xl border border-primary/20 p-6 shadow-sm mb-6 text-center">
              <span
                className="material-symbols-outlined text-4xl text-primary mb-3"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance
              </span>
              <h2 className="font-headline font-bold text-on-surface mb-2">
                Selesaikan Pembayaran
              </h2>
              <p className="font-body text-sm text-on-surface-variant mb-5">
                Klik tombol di bawah untuk melanjutkan ke halaman pembayaran iPaymu.
              </p>
              <a
                href={transaction.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-full font-headline font-bold text-sm hover:opacity-90 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                Bayar Sekarang via iPaymu
              </a>
            </div>
          )}

          {/* ── Manual: Bank Info & Upload Proof ── */}
          {isManual && isPending && (
            <>
              {/* Bank Transfer Info */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm mb-6">
                <h2 className="font-headline font-bold text-on-surface mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    account_balance
                  </span>
                  Informasi Rekening Tujuan
                </h2>
                <p className="font-body text-xs text-on-surface-variant mb-5">
                  Transfer tepat sesuai nominal ke salah satu rekening berikut, kemudian upload
                  bukti di bawah.
                </p>

                <div className="space-y-3 mb-4">
                  {bankAccounts.length > 0 ? (
                    bankAccounts.map((account, idx) => (
                      <div key={idx} className="bg-surface-container rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                              Bank
                            </p>
                            <p className="font-headline font-bold text-on-surface text-lg">
                              {account.bank}
                            </p>
                          </div>
                          {bankAccounts.length > 1 && (
                            <span className="text-[10px] font-bold bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full uppercase">
                              Rekening {idx + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                            Nomor Rekening
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-headline font-bold text-on-surface text-xl tracking-widest">
                              {account.account_number}
                            </p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(account.account_number, idx)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedIdx === idx ? "check" : "content_copy"}
                              </span>
                              {copiedIdx === idx ? "Tersalin!" : "Salin"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                            Atas Nama
                          </p>
                          <p className="font-body font-semibold text-on-surface">
                            {account.account_holder}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-surface-container rounded-xl p-4 text-center">
                      <p className="font-body text-sm text-on-surface-variant">
                        Informasi rekening belum tersedia. Hubungi panitia.
                      </p>
                    </div>
                  )}
                </div>

                {/* Amount highlight */}
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                  <span className="font-body text-sm text-on-surface-variant">
                    Nominal Transfer
                  </span>
                  <span className="font-headline font-bold text-primary text-xl">
                    {formatRupiah(transaction.amount)}
                  </span>
                </div>
              </div>

              {/* Upload Proof */}
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm mb-6">
                <h2 className="font-headline font-bold text-on-surface mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    upload_file
                  </span>
                  Upload Bukti Pembayaran
                </h2>
                {hasProof ? (
                  <div className="mt-4">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-3">
                      <span
                        className="material-symbols-outlined text-emerald-600 text-[22px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        task_alt
                      </span>
                      <div>
                        <p className="font-body text-sm font-semibold text-emerald-800">
                          Bukti sudah diunggah
                        </p>
                        <p className="font-body text-xs text-emerald-700">
                          {transaction.proof?.original_name}
                        </p>
                      </div>
                    </div>
                    {transaction.proof?.review_note && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-body">
                        <strong>Catatan Admin:</strong> {transaction.proof.review_note}
                      </div>
                    )}
                    <p className="font-body text-xs text-on-surface-variant mt-3">
                      Jika ada kesalahan, kamu bisa upload ulang.
                    </p>
                    {/* Allow re-upload */}
                    <form onSubmit={submitProof} className="mt-4 space-y-3">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => proofForm.setData("proof", e.target.files?.[0] ?? null)}
                        className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-surface-container file:text-on-surface file:font-medium hover:file:bg-surface-container-high"
                      />
                      <button
                        type="submit"
                        disabled={proofForm.processing || !proofForm.data.proof}
                        className="w-full bg-surface-container text-on-surface py-3 rounded-full font-headline font-bold text-sm hover:bg-surface-container-high transition-all disabled:opacity-50"
                      >
                        Upload Ulang Bukti
                      </button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={submitProof} className="mt-4 space-y-4">
                    <p className="font-body text-xs text-on-surface-variant">
                      Upload screenshot / foto struk transfer. Format: JPG, PNG, atau PDF. Maks 2
                      MB.
                    </p>
                    <div>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleProofFileChange}
                        className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-on-primary file:font-medium hover:file:bg-primary/90"
                      />
                      {(fileError || proofForm.errors.proof) && (
                        <p className="text-error text-xs mt-1">
                          {fileError || proofForm.errors.proof}
                        </p>
                      )}
                    </div>
                    <div>
                      <textarea
                        value={proofForm.data.notes}
                        onChange={(e) => proofForm.setData("notes", e.target.value)}
                        rows={2}
                        placeholder="Catatan tambahan (opsional)..."
                        className="w-full bg-surface border border-outline-variant/50 rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={proofForm.processing || !proofForm.data.proof}
                      className="w-full bg-primary text-on-primary py-3.5 rounded-full font-headline font-bold text-sm hover:opacity-90 transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {proofForm.processing ? (
                        "Mengunggah..."
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">upload</span>
                          Upload Bukti Pembayaran
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {/* ── Paid State ── */}
          {transaction.status === "paid" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-emerald-200 p-6 shadow-sm mb-6 text-center">
              <span
                className="material-symbols-outlined text-5xl text-emerald-600 mb-3"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              <h2 className="font-headline font-bold text-on-surface text-xl mb-2">
                Pembayaran Dikonfirmasi!
              </h2>
              <p className="font-body text-sm text-on-surface-variant mb-5">
                RSVP kamu sudah terkonfirmasi. Sampai jumpa di event!
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full font-headline font-bold text-sm hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Kembali ke Dashboard
              </Link>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
