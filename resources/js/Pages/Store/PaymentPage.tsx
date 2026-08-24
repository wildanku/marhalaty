import { useEffect, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { PageProps, StoreOrder, Transaction } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import DonationNotice from "@/Components/Payment/DonationNotice";
import UploadedProofCard from "@/Components/Payment/UploadedProofCard";
import { validateFile } from "@/Helpers/fileValidation";
import SatuteraPanel, {
  SatuteraLiveStatus,
  SATUTERA_FINAL_STATUSES,
} from "@/Components/Payment/SatuteraPanel";

interface ManualAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch: string | null;
  instructions: string | null;
}

interface PaymentPageProps extends PageProps {
  order: StoreOrder;
  transaction: Transaction;
  checkoutToken: string | null;
  expiresAt: string | null;
  satuteraWsUrl: string;
  manualAccounts: ManualAccount[];
  hash: string;
}

type LiveStatus = SatuteraLiveStatus;

const FINAL_STATUSES = SATUTERA_FINAL_STATUSES;

export default function PaymentPage() {
  const { order, transaction, checkoutToken, expiresAt, satuteraWsUrl, manualAccounts, hash } =
    usePage<PaymentPageProps>().props;

  const [status, setStatus] = useState<LiveStatus>(transaction.status);
  const isManual = transaction.payment_provider === "manual";
  const isFinal = FINAL_STATUSES.includes(status);

  // Polling fallback every 7s while pending — matches Satutera's own frontend interval. Kept at
  // the page level (not inside SatuteraPanel) because it also drives the manual flow: a god-mode
  // approve/reject changes status server-side with no socket involved at all, and this is how a
  // buyer sitting on this page picks that up without a manual reload.
  useEffect(() => {
    if (isFinal) return;

    const poll = async () => {
      try {
        const response = await fetch(`/store/payment/${hash}/status`);
        if (!response.ok) return;
        const body = await response.json();
        if (body.status) setStatus(body.status);
      } catch {
        // Silent — the next tick (or the socket, for satutera) will pick it up.
      }
    };

    const interval = setInterval(poll, 7000);
    return () => clearInterval(interval);
  }, [isFinal, hash]);

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Pembayaran - ${order.order_number}`} />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <StatusHeadline status={status} />
        </div>

        {isManual && status === "pending" && (
          <ManualPaymentBlock
            hash={hash}
            manualAccounts={manualAccounts}
            proof={transaction.proof ?? null}
          />
        )}

        {!isManual && (
          <SatuteraPanel
            status={status}
            onStatusChange={setStatus}
            paymentDetail={transaction.payment_detail}
            checkoutToken={checkoutToken}
            expiresAt={expiresAt}
            satuteraWsUrl={satuteraWsUrl}
          />
        )}

        {status === "local_expired" && (
          <div className="bg-error-container text-on-error-container rounded-3xl p-8 mb-6 text-center">
            <p className="font-headline text-lg font-bold">Waktu Pembayaran Habis</p>
            <p className="text-sm mt-2">
              Buat pesanan baru untuk mendapatkan metode pembayaran baru.
            </p>
            {order.store?.slug && (
              <Link
                href={`/checkout/${order.store.slug}`}
                className="inline-block mt-4 bg-on-error-container/10 hover:bg-on-error-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
              >
                Buat Pesanan Baru
              </Link>
            )}
          </div>
        )}

        {status === "paid" && (
          <div className="bg-primary-container text-on-primary-container rounded-3xl p-8 mb-6 text-center">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
            <p className="font-headline text-lg font-bold mt-2">Pembayaran Berhasil</p>
            <Link
              href={`/store/orders/${order.id}`}
              className="inline-block mt-4 bg-on-primary-container/10 hover:bg-on-primary-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
            >
              Lihat Pesanan
            </Link>
          </div>
        )}

        {(status === "paid" || transaction.proof) && <DonationNotice />}

        {(status === "failed" || status === "cancelled" || status === "expired") && (
          <div className="bg-error-container text-on-error-container rounded-3xl p-8 mb-6 text-center">
            <p className="font-headline text-lg font-bold">Pembayaran Tidak Berhasil</p>
            {order.store?.slug && (
              <Link
                href={`/checkout/${order.store.slug}`}
                className="inline-block mt-4 bg-on-error-container/10 hover:bg-on-error-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
              >
                Coba Lagi
              </Link>
            )}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-6">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
            {order.order_number}
          </h2>
          <div className="divide-y divide-outline-variant/10">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-on-surface">
                  {item.name_snapshot}
                  {item.variant_label_snapshot ? ` (${item.variant_label_snapshot})` : ""} ×{" "}
                  {item.quantity}
                </span>
                <span className="text-on-surface-variant">
                  Rp {Number(item.subtotal).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t border-outline-variant/10 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="text-on-surface">
                Rp {Number(order.subtotal).toLocaleString("id-ID")}
              </span>
            </div>
            {order.requires_shipping && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Ongkos Kirim</span>
                <span className="text-on-surface">
                  Rp {Number(order.shipping_cost).toLocaleString("id-ID")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Biaya Layanan Pembayaran</span>
              <span className="text-on-surface">
                Rp {Number(order.payment_fee).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-outline-variant/10">
              <span className="font-label font-semibold text-on-surface">Total</span>
              <span className="font-headline text-lg font-bold text-primary">
                Rp {Number(order.total).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

interface ManualPaymentBlockProps {
  hash: string;
  manualAccounts: ManualAccount[];
  proof: Transaction["proof"];
}

function ManualPaymentBlock({ hash, manualAccounts, proof }: ManualPaymentBlockProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReplacingProof, setIsReplacingProof] = useState(false);
  const form = useForm<{ proof: File | null; notes: string }>({ proof: null, notes: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileError(null);
      form.setData("proof", null);
      return;
    }

    const error = validateFile(file, ["image/jpeg", "image/png", "application/pdf"]);
    if (error) {
      setFileError(error.message);
      form.setData("proof", null);
    } else {
      setFileError(null);
      form.setData("proof", file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.post(`/store/payment/${hash}/proof`, { forceFormData: true });
  };

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-8 mb-6">
      <p className="font-headline text-lg font-bold text-on-surface text-center mb-1">
        Transfer Manual ke Rekening Berikut
      </p>
      <p className="text-sm text-on-surface-variant text-center mb-6">
        Transfer tepat sesuai nominal, lalu unggah bukti pembayaran di bawah.
      </p>

      <div className="space-y-3 mb-6">
        {manualAccounts.length > 0 ? (
          manualAccounts.map((account, idx) => (
            <div key={account.id} className="bg-surface-container rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-headline font-bold text-on-surface text-lg">
                  {account.bank_name}
                </p>
                {manualAccounts.length > 1 && (
                  <span className="text-[10px] font-bold bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full uppercase">
                    Rekening {idx + 1}
                  </span>
                )}
              </div>
              <p className="font-headline font-bold text-primary text-xl tracking-widest">
                {account.account_number}
              </p>
              <p className="text-sm text-on-surface-variant">a.n. {account.account_holder}</p>
              {account.branch && (
                <p className="text-xs text-on-surface-variant">Cabang {account.branch}</p>
              )}
              {account.instructions && (
                <p className="text-xs text-on-surface-variant mt-2">{account.instructions}</p>
              )}
            </div>
          ))
        ) : (
          <div className="bg-error-container text-on-error-container rounded-xl p-4 text-sm text-center">
            Informasi rekening belum tersedia. Hubungi admin toko.
          </div>
        )}
      </div>

      {proof && !isReplacingProof ? (
        <UploadedProofCard
          proof={proof}
          viewUrl={`/store/payment/${hash}/proof`}
          onReplace={() => setIsReplacingProof(true)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {proof && (
            <p className="font-body text-sm font-semibold text-on-surface">Ganti bukti transfer</p>
          )}
          <div>
            <label className="block font-body font-semibold text-sm text-on-surface mb-2">
              File Bukti Transfer <span className="text-error">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                form.data.proof
                  ? "border-primary bg-primary/5"
                  : "border-surface-container-high hover:border-outline-variant"
              }`}
            >
              <input
                type="file"
                id="store-proof-file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
              <label htmlFor="store-proof-file" className="cursor-pointer block">
                <span
                  className={`material-symbols-outlined text-4xl block mb-2 ${form.data.proof ? "text-primary" : "text-on-surface-variant/40"}`}
                >
                  {form.data.proof ? "check_circle" : "cloud_upload"}
                </span>
                {form.data.proof ? (
                  <p className="text-sm font-semibold text-primary">{form.data.proof.name}</p>
                ) : (
                  <p className="text-sm font-semibold text-on-surface-variant">
                    Klik untuk pilih file (JPG, PNG, PDF maks 2 MB)
                  </p>
                )}
              </label>
            </div>
            {(fileError || form.errors.proof) && (
              <p className="text-error text-xs mt-1">{fileError || form.errors.proof}</p>
            )}
          </div>

          <div>
            <label className="block font-body font-semibold text-sm text-on-surface mb-2">
              Catatan <span className="text-on-surface-variant font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.data.notes}
              onChange={(e) => form.setData("notes", e.target.value)}
              rows={2}
              className="w-full bg-surface border-2 border-surface-container focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-sm text-on-surface resize-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={form.processing || !form.data.proof}
            className="w-full bg-primary text-on-primary py-3.5 rounded-full font-label font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {form.processing ? "Mengunggah..." : "Unggah Bukti Pembayaran"}
          </button>
        </form>
      )}
    </div>
  );
}

function StatusHeadline({ status }: { status: LiveStatus }) {
  const map: Record<LiveStatus, { icon: string; label: string }> = {
    pending: { icon: "hourglass_top", label: "Menunggu Pembayaran" },
    paid: { icon: "check_circle", label: "Pembayaran Berhasil" },
    failed: { icon: "error", label: "Pembayaran Gagal" },
    cancelled: { icon: "cancel", label: "Pembayaran Dibatalkan" },
    expired: { icon: "schedule", label: "Pembayaran Kedaluwarsa" },
    local_expired: { icon: "schedule", label: "Waktu Pembayaran Habis" },
  };
  const info = map[status];

  return (
    <>
      <span className="material-symbols-outlined text-4xl text-primary">{info.icon}</span>
      <h1 className="font-headline text-2xl font-bold text-on-surface mt-2">{info.label}</h1>
    </>
  );
}
