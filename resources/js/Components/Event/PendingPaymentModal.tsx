import { FormEvent, useEffect, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import type { Rsvp } from "@/types";

interface SatuteraChannel {
  provider: string;
  method: string;
  code: string;
  name: string;
  fee: number;
  fee_type: "FIX" | "PERCENT";
  image: string | null;
}

interface ReplacePaymentData {
  payment_provider: "manual" | "satutera";
  channel_provider: string;
  payment_method: string;
  payment_channel: string;
}

interface PendingPaymentModalProps {
  rsvp: Rsvp;
  enabledPaymentProviders: string[];
  qrisOnlyBelowAmount: number;
  onClose: () => void;
}

const formatRupiah = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function PendingPaymentModal({
  rsvp,
  enabledPaymentProviders,
  qrisOnlyBelowAmount,
  onClose,
}: PendingPaymentModalProps) {
  const manualEnabled = enabledPaymentProviders.includes("manual");
  const satuteraEnabled = enabledPaymentProviders.includes("satutera");
  const [channels, setChannels] = useState<SatuteraChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(satuteraEnabled);
  const subtotal = Number.parseFloat(rsvp.total_amount) || 0;
  const qrisOnly = subtotal > 0 && subtotal < qrisOnlyBelowAmount;

  const { data, setData, post, processing, errors } = useForm<ReplacePaymentData>({
    payment_provider: manualEnabled ? "manual" : "satutera",
    channel_provider: "",
    payment_method: "",
    payment_channel: "",
  });

  useEffect(() => {
    if (!satuteraEnabled) {
      setIsLoadingChannels(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingChannels(true);

    fetch("/api/payment/channels", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load payment channels");
        return (await response.json()) as { data: SatuteraChannel[] };
      })
      .then((body) => setChannels(body.data ?? []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setChannels([]);
      })
      .finally(() => setIsLoadingChannels(false));

    return () => controller.abort();
  }, [satuteraEnabled]);

  const visibleChannels = useMemo(
    () => channels.filter((channel) => !qrisOnly || channel.method === "qris"),
    [channels, qrisOnly]
  );

  const selectManual = () => {
    setData({
      payment_provider: "manual",
      channel_provider: "",
      payment_method: "",
      payment_channel: "",
    });
  };

  const selectAutomatic = () => {
    setData({
      payment_provider: "satutera",
      channel_provider: "",
      payment_method: "",
      payment_channel: "",
    });
  };

  const selectChannel = (channel: SatuteraChannel) => {
    setData({
      payment_provider: "satutera",
      channel_provider: channel.provider,
      payment_method: channel.method,
      payment_channel: channel.code,
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    post(`/rsvps/${rsvp.id}/payment-method`);
  };

  const automaticSelected = data.payment_provider === "satutera" && data.payment_channel.length > 0;
  const canSubmit =
    (data.payment_provider === "manual" && manualEnabled) ||
    (data.payment_provider === "satutera" && satuteraEnabled && automaticSelected);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-payment-title"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="replace-payment-title"
              className="font-headline text-xl font-bold text-on-surface"
            >
              Ubah metode pembayaran
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Pendaftaran tetap tersimpan. Kami akan mengirim ulang instruksi untuk metode yang
              dipilih.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-surface-container-low px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Total pendaftaran
          </p>
          <p className="mt-1 font-headline text-lg font-bold text-on-surface">
            {formatRupiah(subtotal)}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {manualEnabled && (
            <button
              type="button"
              onClick={selectManual}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                data.payment_provider === "manual"
                  ? "border-primary bg-primary/5"
                  : "border-surface-container-high bg-surface-container-lowest hover:border-outline-variant"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 text-primary">
                  account_balance
                </span>
                <span>
                  <span className="block font-headline text-sm font-bold text-on-surface">
                    Transfer Manual
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                    Transfer ke rekening yang tersedia lalu unggah bukti pembayaran. Tanpa biaya
                    admin.
                  </span>
                </span>
              </div>
            </button>
          )}

          {satuteraEnabled && (
            <button
              type="button"
              onClick={selectAutomatic}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                data.payment_provider === "satutera"
                  ? "border-primary bg-primary/5"
                  : "border-surface-container-high bg-surface-container-lowest hover:border-outline-variant"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5 text-primary">bolt</span>
                <span>
                  <span className="block font-headline text-sm font-bold text-on-surface">
                    Pembayaran Otomatis
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                    Bayar melalui QRIS atau Virtual Account. Status akan terverifikasi otomatis.
                  </span>
                </span>
              </div>
            </button>
          )}

          {data.payment_provider === "satutera" && satuteraEnabled && (
            <div className="space-y-2 rounded-2xl border border-surface-container-high bg-surface-container-low p-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Pilih channel pembayaran
              </p>
              {qrisOnly && (
                <p className="rounded-xl bg-tertiary-container/30 px-3 py-2 text-xs leading-5 text-on-surface-variant">
                  Untuk total di bawah {formatRupiah(qrisOnlyBelowAmount)}, hanya QRIS yang
                  tersedia.
                </p>
              )}
              {visibleChannels.length === 0 ? (
                <p className="px-1 py-3 text-sm text-on-surface-variant">
                  {isLoadingChannels
                    ? "Memuat channel pembayaran…"
                    : "Channel pembayaran otomatis sedang tidak tersedia. Coba transfer manual atau hubungi admin."}
                </p>
              ) : (
                visibleChannels.map((channel) => {
                  const selected =
                    data.channel_provider === channel.provider &&
                    data.payment_method === channel.method &&
                    data.payment_channel === channel.code;
                  const fee =
                    channel.fee_type === "PERCENT"
                      ? `+${channel.fee}%`
                      : channel.fee === 0
                        ? "Tanpa biaya"
                        : `+${formatRupiah(channel.fee)}`;

                  return (
                    <button
                      key={`${channel.provider}-${channel.method}-${channel.code}`}
                      type="button"
                      onClick={() => selectChannel(channel)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-surface-container-high bg-surface hover:border-outline-variant"
                      }`}
                    >
                      {channel.image ? (
                        <img
                          src={channel.image}
                          alt=""
                          className="h-9 w-9 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-primary">payments</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface">
                          {channel.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-on-surface-variant">{fee}</span>
                      </span>
                      {selected && (
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {errors.payment_provider && (
            <p className="text-sm text-error">{errors.payment_provider}</p>
          )}
          {errors.payment_channel && <p className="text-sm text-error">{errors.payment_channel}</p>}

          {!manualEnabled && !satuteraEnabled && (
            <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
              Tidak ada metode pembayaran yang tersedia saat ini. Hubungi admin untuk bantuan.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit || processing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {processing ? "Memproses..." : "Kirim ulang instruksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
