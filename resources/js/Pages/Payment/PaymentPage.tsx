import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import DonationNotice from "@/Components/Payment/DonationNotice";
import { PageProps, Transaction, Rsvp, GontorEvent } from "@/types";
import { validateFile, MAX_FILE_SIZE_MB } from "@/Helpers/fileValidation";
import SatuteraPanel, {
  SatuteraLiveStatus,
  SATUTERA_FINAL_STATUSES,
} from "@/Components/Payment/SatuteraPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface PaymentPageProps extends PageProps {
  transaction: Transaction;
  rsvp: Rsvp;
  event: GontorEvent;
  bankAccounts: BankAccount[];
  // Harmless/null for manual and ipaymu transactions — only meaningful when
  // payment_provider === 'satutera'. See fase 9, Components/Payment/SatuteraPanel.tsx.
  checkoutToken: string | null;
  expiresAt: string | null;
  satuteraWsUrl: string;
  hash: string;
}

// ─── iPaymu payment channel metadata ─────────────────────────────────────────

const CHANNEL_NAMES: Record<string, string> = {
  qris: "QRIS",
  bca: "BCA Virtual Account",
  bni: "BNI Virtual Account",
  bri: "BRI Virtual Account",
  mandiri: "Mandiri Virtual Account",
  bsi: "BSI Virtual Account",
  btn: "BTN Virtual Account",
  permata: "Permata Virtual Account",
  cimb: "CIMB Niaga Virtual Account",
  bmi: "Muamalat Virtual Account",
};

const VA_INSTRUCTIONS: Record<string, { title: string; steps: string[] }[]> = {
  bca: [
    {
      title: "m-BCA",
      steps: [
        "Login ke BCA Mobile, pilih m-Transfer → BCA Virtual Account.",
        "Masukkan nomor Virtual Account.",
        "Periksa nama dan jumlah tagihan, lalu masukkan PIN m-BCA.",
      ],
    },
    {
      title: "ATM BCA",
      steps: [
        "Pilih Transaksi Lainnya → Transfer → ke Rekening BCA Virtual Account.",
        "Masukkan nomor Virtual Account, konfirmasi dan selesaikan transaksi.",
      ],
    },
  ],
  bni: [
    {
      title: "BNI Mobile Banking",
      steps: [
        "Pilih Transfer → Virtual Account Billing → pilih rekening debet.",
        "Masukkan nomor Virtual Account, konfirmasi dan masukkan Password Transaksi.",
      ],
    },
  ],
  bri: [
    {
      title: "Mobile Banking BRI",
      steps: [
        "Pilih Pembayaran → BRIVA.",
        "Masukkan Nomor Virtual Account, periksa informasi dan masukkan PIN.",
      ],
    },
  ],
  mandiri: [
    {
      title: "Mandiri Mobile Banking",
      steps: [
        "Pilih Bayar → E-Commerce → Penyedia Jasa Ipaymu (89008).",
        "Masukkan Nomor VA, konfirmasi jumlah tagihan dan pilih YA.",
      ],
    },
  ],
  bsi: [
    {
      title: "BSI Mobile",
      steps: [
        "Pilih Payment → Institusi/Akademik/Wakaf → kode institusi 9042.",
        "Masukkan nomor VA, konfirmasi nama & jumlah, masukkan PIN.",
      ],
    },
  ],
  btn: [
    {
      title: "Mobile Banking BTN",
      steps: [
        "Pilih Pembayaran → Akun Virtual.",
        "Masukkan nomor Virtual Account, konfirmasi dan klik Lanjut.",
      ],
    },
  ],
  default: [
    {
      title: "Mobile Banking",
      steps: [
        "Buka aplikasi mobile banking pilihanmu.",
        "Pilih menu Transfer / Pembayaran → Virtual Account.",
        "Masukkan nomor Virtual Account yang tertera.",
        "Konfirmasi nama dan jumlah tagihan, lalu lanjutkan pembayaran.",
      ],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    bg: "bg-surface-container border-surface-container-high",
  },
  // Client-side-only status (fase 9) — Satutera's internal expiry window doesn't always emit a
  // socket event, so SatuteraPanel sets this locally once the countdown hits zero.
  local_expired: {
    label: "Waktu Pembayaran Habis",
    color: "text-red-700",
    icon: "timer_off",
    bg: "bg-red-50 border-red-200",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentPage({
  auth,
  transaction,
  rsvp,
  event,
  bankAccounts,
  checkoutToken,
  expiresAt,
  satuteraWsUrl,
  hash,
}: PaymentPageProps): ReactElement {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedVa, setCopiedVa] = useState(false);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Starts equal to the server-rendered `transaction.status` — updated by SatuteraPanel's
  // socket/countdown for a `satutera` transaction, and by the polling fallback below for any
  // provider (manual included, since a god-mode approve/reject changes status server-side with no
  // socket involved at all).
  const [liveStatus, setLiveStatus] = useState<SatuteraLiveStatus>(transaction.status);
  const isFinal = SATUTERA_FINAL_STATUSES.includes(liveStatus);

  // Polling fallback every 7s while pending — matches Satutera's own frontend interval and mirrors
  // `Store/PaymentPage.tsx`. WebSocket delivery isn't guaranteed (network, proxy, backgrounded
  // tab), so this is the only reliable way this page ever learns a payment succeeded/failed
  // without a manual reload. Reuses the same `/payment/{hash}/status` endpoint SatuteraPanel's
  // local-expiry check does not cover.
  useEffect(() => {
    if (isFinal) return;

    const poll = async () => {
      try {
        const response = await fetch(`/payment/${hash}/status`);
        if (!response.ok) return;
        const body = await response.json();
        if (body.status) setLiveStatus(body.status);
      } catch {
        // Silent — the next tick (or the socket, for satutera) will pick it up.
      }
    };

    const interval = setInterval(poll, 7000);
    return () => clearInterval(interval);
  }, [isFinal, hash]);

  const cancelForm = useForm();

  const handleCancel = () => {
    if (
      confirm(
        "Apakah Anda yakin ingin membatalkan pembayaran dan menghapus pendaftaran? Tindakan ini tidak dapat dibatalkan."
      )
    ) {
      cancelForm.post(`/payments/${transaction.id}/cancel`);
    }
  };

  const status = statusConfig[liveStatus] ?? statusConfig.pending;
  const isManual = transaction.payment_provider === "manual";
  const isSatutera = transaction.payment_provider === "satutera";
  const isPending = liveStatus === "pending";
  const channel = transaction.payment_channel ?? "";
  const channelName = CHANNEL_NAMES[channel] ?? channel;
  const isQris = channel === "qris";
  const qrString = (transaction.metadata as Record<string, string> | null)?.qr_string ?? null;
  const instructions = isQris ? null : (VA_INSTRUCTIONS[channel] ?? VA_INSTRUCTIONS.default);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const copyVa = () => {
    if (transaction.va_number) {
      navigator.clipboard.writeText(transaction.va_number).then(() => {
        setCopiedVa(true);
        setTimeout(() => setCopiedVa(false), 2000);
      });
    }
  };

  // Proof upload form (for manual, on this page)
  const proofForm = useForm<{ proof: File | null; notes: string }>({
    proof: null,
    notes: "",
  });

  const submitProof = (e: React.FormEvent) => {
    e.preventDefault();
    proofForm.post(`/payment-confirmation/${hash}`, { forceFormData: true });
  };

  return (
    <>
      <Head title={`Pembayaran – ${event.title}`} />
      <div className="min-h-screen bg-surface text-on-surface font-body antialiased">
        <Header />

        <main className="max-w-2xl mx-auto px-4 md:px-6 py-10">
          {/* Back */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Dashboard
          </Link>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface">
              Detail Pembayaran
            </h1>
            <p className="font-body text-sm text-on-surface-variant mt-1">{event.title}</p>
          </div>

          {/* Status Banner */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border mb-6 ${status.bg}`}>
            <span
              className={`material-symbols-outlined text-[28px] ${status.color}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {status.icon}
            </span>
            <div className="flex-1">
              <p className={`font-headline font-bold text-base ${status.color}`}>{status.label}</p>
              {isPending && isManual && (
                <p className="text-xs text-on-surface-variant mt-0.5 font-body">
                  Transfer ke rekening di bawah dan upload bukti pembayaran.
                </p>
              )}
              {isPending && !isManual && (
                <p className="text-xs text-on-surface-variant mt-0.5 font-body">
                  Selesaikan pembayaran menggunakan {channelName} di bawah ini.
                </p>
              )}
            </div>
            {isPending && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelForm.processing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Batalkan
              </button>
            )}
          </div>

          {/* Transaction Summary */}
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-5 shadow-sm mb-6">
            <h2 className="font-headline font-bold text-on-surface mb-4 text-sm uppercase tracking-wider">
              Ringkasan Transaksi
            </h2>
            <div className="space-y-3">
              {/* Event */}
              <div className="flex justify-between">
                <span className="text-sm text-on-surface-variant font-body">Event</span>
                <span className="text-sm font-medium text-on-surface font-body text-right max-w-[60%]">
                  {event.title}
                </span>
              </div>

              {/* Package & Included Addons */}
              {rsvp.event_package_id &&
                event.packages &&
                (() => {
                  const pkg = event.packages.find((p) => p.id === rsvp.event_package_id);
                  return pkg ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-on-surface-variant font-body">Paket</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-on-surface font-body">
                            {pkg.name}
                          </span>
                          <span className="block text-xs text-on-surface-variant font-body">
                            {formatRupiah(parseFloat(rsvp.package_amount))}
                          </span>
                        </div>
                      </div>
                      {/* Included Addons */}
                      {pkg.included_addons && pkg.included_addons.length > 0 && (
                        <div className="ml-2 space-y-1">
                          <p className="text-xs text-on-surface-variant/70 uppercase tracking-wide font-body">
                            Termasuk:
                          </p>
                          {pkg.included_addons.map((ia) => (
                            <div key={ia.id} className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[12px]">
                                check_small
                              </span>
                              <span className="text-xs text-on-surface/80 font-body">
                                {ia.name} ×{ia.pivot.included_quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}

              {/* Purchased Addons */}
              {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
                <div className="pt-2 border-t border-surface-container space-y-2">
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-body">
                    Tambahan
                  </p>
                  {rsvp.add_ons_snapshot.map((addon) => (
                    <div key={addon.id} className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs text-on-surface font-medium font-body">
                          {addon.name} ×{addon.quantity}
                        </span>
                        <span className="text-xs font-semibold text-on-surface text-right font-body">
                          {formatRupiah(addon.total)}
                        </span>
                      </div>
                      {/* Addon Variants */}
                      {addon.variants &&
                        typeof addon.variants === "object" &&
                        Object.keys(addon.variants).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(addon.variants).map(([variantKey, variantValue]) => (
                              <span
                                key={variantKey}
                                className="inline-flex items-center gap-0.5 bg-primary/5 text-primary text-[9px] font-medium px-1.5 py-0.5 rounded"
                              >
                                <span className="material-symbols-outlined text-[10px]">
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
                <div className="flex justify-between items-center pt-2 border-t border-surface-container">
                  <span className="text-sm text-on-surface-variant font-body">Infak</span>
                  <span className="text-sm font-medium text-on-surface font-body">
                    {formatRupiah(parseFloat(rsvp.infak_amount))}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-surface-container">
                <span className="text-sm text-on-surface-variant font-body">Metode</span>
                <span className="text-sm font-medium text-on-surface font-body">
                  {isManual ? "Transfer Manual" : channelName}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant font-body">Tanggal</span>
                <span className="text-xs text-on-surface font-body">
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
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant font-body">Dibayar</span>
                  <span className="text-xs text-on-surface font-body">
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

              <div className="flex justify-between items-center bg-primary/5 -mx-5 px-5 py-3 -mb-5 rounded-b-2xl border-t border-surface-container">
                <span className="font-headline font-bold text-on-surface text-sm">Total Bayar</span>
                <span className="font-headline font-bold text-primary text-lg">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* ─── iPaymu: QRIS ─── */}
          {!isManual && !isSatutera && isPending && isQris && (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm mb-6">
              <h2 className="font-headline font-bold text-on-surface mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  qr_code_2
                </span>
                Scan QRIS untuk Membayar
              </h2>
              <p className="font-body text-xs text-on-surface-variant mb-5">
                Gunakan aplikasi e-wallet atau m-banking yang mendukung QRIS.
              </p>

              {qrString ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-surface-container-high">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`}
                      alt="QRIS Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 w-full">
                    <span className="text-sm text-on-surface-variant font-body">Nominal</span>
                    <span className="font-headline font-bold text-primary text-xl">
                      {formatRupiah(transaction.amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-2">
                    qr_code_2
                  </span>
                  <p className="font-body text-sm text-on-surface-variant">
                    QR Code sedang diproses. Silakan refresh halaman atau hubungi panitia.
                  </p>
                </div>
              )}

              <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 font-body space-y-1">
                <p className="font-semibold">Cara pembayaran QRIS:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Buka aplikasi e-wallet atau m-banking pilihanmu.</li>
                  <li>Pilih menu Scan QR atau Bayar.</li>
                  <li>Arahkan kamera ke QR Code di atas.</li>
                  <li>Pastikan nama merchant dan nominal sesuai, lalu konfirmasi.</li>
                </ol>
              </div>
            </div>
          )}

          {/* ─── iPaymu: Virtual Account ─── */}
          {!isManual && !isSatutera && isPending && !isQris && transaction.va_number && (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm mb-6">
              <h2 className="font-headline font-bold text-on-surface mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  account_balance
                </span>
                {channelName}
              </h2>
              <p className="font-body text-xs text-on-surface-variant mb-5">
                Transfer tepat sesuai nominal ke nomor Virtual Account berikut.
              </p>

              <div className="bg-surface-container rounded-xl p-4 space-y-3 mb-4">
                <div>
                  <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                    Nomor Virtual Account
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-headline font-bold text-on-surface text-2xl tracking-widest">
                      {transaction.va_number}
                    </p>
                    <button
                      type="button"
                      onClick={copyVa}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedVa ? "check" : "content_copy"}
                      </span>
                      {copiedVa ? "Tersalin!" : "Salin"}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                    Bank
                  </p>
                  <p className="font-headline font-bold text-on-surface">{channelName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-5">
                <span className="font-body text-sm text-on-surface-variant">Nominal Transfer</span>
                <span className="font-headline font-bold text-primary text-xl">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>

              {instructions && (
                <div className="space-y-3">
                  {instructions.map((group, gi) => (
                    <details
                      key={gi}
                      className="group bg-surface-container rounded-xl overflow-hidden"
                    >
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer font-body font-semibold text-sm text-on-surface">
                        {group.title}
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-open:rotate-180 transition-transform">
                          expand_more
                        </span>
                      </summary>
                      <ol className="px-4 pb-4 space-y-1.5 list-decimal list-inside">
                        {group.steps.map((step, si) => (
                          <li
                            key={si}
                            className="font-body text-xs text-on-surface-variant leading-relaxed"
                          >
                            {step}
                          </li>
                        ))}
                      </ol>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── iPaymu: pending but no VA/QR yet ─── */}
          {!isManual && !isSatutera && isPending && !transaction.va_number && !isQris && (
            <div className="bg-surface-container-lowest rounded-2xl border border-amber-200 p-6 shadow-sm mb-6 text-center">
              <span className="material-symbols-outlined text-5xl text-amber-500 block mb-3">
                hourglass_top
              </span>
              <p className="font-headline font-bold text-on-surface mb-1">
                Nomor Virtual Account Sedang Dibuat
              </p>
              <p className="font-body text-sm text-on-surface-variant">
                Refresh halaman ini dalam beberapa saat, atau cek email kamu untuk informasi
                pembayaran.
              </p>
            </div>
          )}

          {/* ─── Satutera: VA/QRIS + realtime status (fase 9, D37) ─── */}
          {isSatutera && (
            <SatuteraPanel
              status={liveStatus}
              onStatusChange={setLiveStatus}
              paymentDetail={transaction.payment_detail}
              checkoutToken={checkoutToken}
              expiresAt={expiresAt}
              satuteraWsUrl={satuteraWsUrl}
            />
          )}

          {/* ─── Manual: Bank Info ─── */}
          {isManual && isPending && (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm mb-6">
              <h2 className="font-headline font-bold text-on-surface mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  account_balance
                </span>
                Rekening Tujuan Transfer
              </h2>
              <p className="font-body text-xs text-on-surface-variant mb-5">
                Transfer tepat sesuai nominal ke salah satu rekening berikut, kemudian upload bukti
                pembayaran.
              </p>

              <div className="space-y-3 mb-4">
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((acc, idx) => (
                    <div key={idx} className="bg-surface-container rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-headline font-bold text-on-surface text-lg">
                          {acc.bank_name}
                        </p>
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
                            {acc.account_number}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.account_number, idx)}
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
                          {acc.account_holder}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-container rounded-xl p-4 text-center">
                    <p className="text-sm text-on-surface-variant font-body">
                      Informasi rekening belum tersedia. Hubungi panitia.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-5">
                <span className="font-body text-sm text-on-surface-variant">Nominal Transfer</span>
                <span className="font-headline font-bold text-primary text-xl">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>

              {/* Upload Proof */}
              <div className="border-t border-surface-container pt-5">
                <h3 className="font-headline font-bold text-on-surface mb-1 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    upload_file
                  </span>
                  Upload Bukti Transfer
                </h3>
                {transaction.proof ? (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <span
                        className="material-symbols-outlined text-emerald-600 text-[22px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        task_alt
                      </span>
                      <div>
                        <p className="font-body text-sm font-semibold text-emerald-800">
                          Bukti sudah diunggah — menunggu verifikasi admin
                        </p>
                        <p className="font-body text-xs text-emerald-700">
                          {transaction.proof.original_name}
                        </p>
                      </div>
                    </div>
                    {transaction.proof.review_note && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-body">
                        <strong>Catatan Admin:</strong> {transaction.proof.review_note}
                      </div>
                    )}
                    <p className="font-body text-xs text-on-surface-variant">
                      Ingin upload ulang?{" "}
                      <Link
                        href={`/payment-confirmation/${hash}`}
                        className="text-primary hover:underline"
                      >
                        Halaman konfirmasi pembayaran
                      </Link>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitProof} className="mt-3 space-y-3">
                    <p className="font-body text-xs text-on-surface-variant">
                      Format: JPG, PNG, atau PDF. Maks 2 MB.
                    </p>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const error = validateFile(
                            file,
                            ["image/jpeg", "image/png", "application/pdf"],
                            MAX_FILE_SIZE_MB
                          );
                          if (error) {
                            setFileValidationError(error.message);
                            proofForm.setData("proof", null);
                            return;
                          }
                        }
                        setFileValidationError(null);
                        proofForm.setData("proof", file ?? null);
                      }}
                      className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-on-primary file:font-medium hover:file:bg-primary/90"
                    />
                    {fileValidationError && (
                      <p className="text-error text-xs">{fileValidationError}</p>
                    )}
                    {proofForm.errors.proof && (
                      <p className="text-error text-xs">{proofForm.errors.proof}</p>
                    )}
                    <textarea
                      value={proofForm.data.notes}
                      onChange={(e) => proofForm.setData("notes", e.target.value)}
                      rows={2}
                      placeholder="Catatan tambahan (opsional)..."
                      className="w-full bg-surface border border-outline-variant/50 rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                    />
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
            </div>
          )}

          {/* ─── Paid ─── */}
          {liveStatus === "paid" && (
            <div className="bg-surface-container-lowest rounded-2xl border border-emerald-200 p-6 shadow-sm mb-6 text-center">
              <span
                className="material-symbols-outlined text-5xl text-emerald-600 mb-3 block"
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

          {(liveStatus === "paid" || transaction.proof) && <DonationNotice />}
        </main>
      </div>
      <Footer />
    </>
  );
}
