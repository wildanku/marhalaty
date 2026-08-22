import type { ReactElement } from "react";
import { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import DonationNotice from "@/Components/Payment/DonationNotice";
import { validateFile } from "@/Helpers/fileValidation";
import { PageProps, Transaction, Rsvp, GontorEvent } from "@/types";

interface ConfirmationPageProps extends PageProps {
  transaction: Transaction;
  rsvp: Rsvp;
  event: GontorEvent;
  hash: string;
}

const formatRupiah = (val: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(typeof val === "string" ? parseFloat(val) : val);

export default function ConfirmationPage({
  auth,
  transaction,
  rsvp,
  event,
  hash,
}: ConfirmationPageProps): ReactElement {
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<{ proof: File | null; notes: string }>({
    proof: null,
    notes: "",
  });

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileError(null);
      form.setData("proof", null);
      return;
    }

    // Validate file
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
    form.post(`/payment-confirmation/${hash}`, { forceFormData: true });
  };

  const isPaid = transaction.status === "paid";
  const isManual = transaction.payment_provider === "manual";

  return (
    <>
      <Head title={`Upload Bukti Pembayaran – ${event.title}`} />
      <div className="min-h-screen bg-surface text-on-surface font-body antialiased">
        <Header />

        <main className="max-w-lg mx-auto px-4 md:px-6 py-10">
          {/* Back */}
          <Link
            href={`/payment/${hash}`}
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke halaman pembayaran
          </Link>

          <div className="mb-6">
            <h1 className="font-headline text-2xl font-bold text-on-surface">
              Upload Bukti Pembayaran
            </h1>
            <p className="font-body text-sm text-on-surface-variant mt-1">{event.title}</p>
          </div>

          {/* Amount reminder */}
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 mb-6">
            <div>
              <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                Total Tagihan
              </p>
              <p className="font-headline font-bold text-primary text-2xl">
                {formatRupiah(transaction.amount)}
              </p>
            </div>
            <span
              className="material-symbols-outlined text-primary text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              receipt_long
            </span>
          </div>

          {!isManual ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <span className="material-symbols-outlined text-amber-500 text-4xl block mb-2">
                info
              </span>
              <p className="font-body text-sm text-amber-800">
                Upload bukti hanya diperlukan untuk pembayaran transfer manual. Pembayaran otomatis
                via iPaymu terverifikasi secara langsung.
              </p>
            </div>
          ) : isPaid ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
                <span
                  className="material-symbols-outlined text-5xl text-emerald-600 block mb-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                <h2 className="font-headline font-bold text-on-surface text-lg mb-2">
                  Pembayaran Sudah Dikonfirmasi
                </h2>
                <p className="font-body text-sm text-on-surface-variant mb-4">
                  Tidak perlu upload bukti lagi.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-headline font-bold text-sm hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  Dashboard
                </Link>
              </div>
              <DonationNotice />
            </>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-sm">
              {/* Previous proof notice */}
              {transaction.proof && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">info</span>
                  <div>
                    <p className="font-body text-sm font-semibold text-amber-800">
                      Bukti sebelumnya sudah ada
                    </p>
                    <p className="font-body text-xs text-amber-700">
                      {transaction.proof.original_name} — Upload baru akan menggantikannya.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* File input */}
                <div>
                  <label className="block font-body font-semibold text-sm text-on-surface mb-2">
                    File Bukti Transfer <span className="text-error">*</span>
                  </label>
                  <p className="font-body text-xs text-on-surface-variant mb-3">
                    Screenshot atau foto struk transfer. Format: JPG, PNG, atau PDF. Maks 2 MB.
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      form.data.proof
                        ? "border-primary bg-primary/5"
                        : "border-surface-container-high hover:border-outline-variant"
                    }`}
                  >
                    <input
                      type="file"
                      id="proof-file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="sr-only"
                      onChange={handleProofFileChange}
                    />
                    <label htmlFor="proof-file" className="cursor-pointer block">
                      <span
                        className={`material-symbols-outlined text-4xl block mb-2 ${form.data.proof ? "text-primary" : "text-on-surface-variant/40"}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {form.data.proof ? "check_circle" : "cloud_upload"}
                      </span>
                      {form.data.proof ? (
                        <>
                          <p className="font-body text-sm font-semibold text-primary">
                            {form.data.proof.name}
                          </p>
                          <p className="font-body text-xs text-on-surface-variant mt-1">
                            Klik untuk ganti file
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-body text-sm font-semibold text-on-surface-variant">
                            Klik untuk pilih file
                          </p>
                          <p className="font-body text-xs text-on-surface-variant/60 mt-1">
                            JPG, PNG, PDF maks 2 MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                  {(fileError || form.errors.proof) && (
                    <p className="text-error text-xs mt-1">{fileError || form.errors.proof}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-body font-semibold text-sm text-on-surface mb-2">
                    Catatan <span className="text-on-surface-variant font-normal">(opsional)</span>
                  </label>
                  <textarea
                    value={form.data.notes}
                    onChange={(e) => form.setData("notes", e.target.value)}
                    rows={3}
                    placeholder="Misal: transfer dari rekening atas nama berbeda, dll."
                    className="w-full bg-surface border-2 border-surface-container focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-sm text-on-surface resize-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={form.processing || !form.data.proof}
                  className="w-full bg-primary text-on-primary py-4 rounded-full font-headline font-bold text-sm hover:opacity-90 transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {form.processing ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        progress_activity
                      </span>
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      Upload Bukti Pembayaran
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
