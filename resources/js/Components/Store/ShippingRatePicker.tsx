import { useEffect, useState } from "react";
import { ShippingRate } from "@/types";

interface ShippingRatePickerProps {
  storeId: string;
  addressId: number | null;
  value: ShippingRate | null;
  onSelect: (rate: ShippingRate | null) => void;
}

type FetchState = "idle" | "loading" | "error" | "done";

export default function ShippingRatePicker({ storeId, addressId, value, onSelect }: ShippingRatePickerProps) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";

  const fetchRates = async () => {
    if (!addressId) return;

    setState("loading");
    setErrorMessage(null);
    onSelect(null);

    try {
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({ store_id: storeId, address_id: addressId }),
      });

      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body.message ?? "Tarif pengiriman belum bisa diambil, coba lagi.");
        setState("error");
        setRates([]);
        return;
      }

      setRates(body.data as ShippingRate[]);
      setState("done");
    } catch {
      setErrorMessage("Tarif pengiriman belum bisa diambil, coba lagi.");
      setState("error");
      setRates([]);
    }
  };

  useEffect(() => {
    if (addressId) fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, addressId]);

  if (!addressId) {
    return <p className="text-sm text-on-surface-variant">Pilih alamat pengiriman terlebih dahulu.</p>;
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-on-surface-variant py-4">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Mengambil tarif pengiriman...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-error-container text-on-error-container rounded-2xl p-4 text-sm flex items-center justify-between gap-3">
        <span>{errorMessage}</span>
        <button
          type="button"
          onClick={fetchRates}
          className="shrink-0 px-3 py-1.5 rounded-full bg-on-error-container/10 font-label font-medium hover:bg-on-error-container/20"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (rates.length === 0) {
    return <p className="text-sm text-on-surface-variant">Tidak ada layanan kurir untuk alamat ini.</p>;
  }

  return (
    <div className="space-y-2">
      {rates.map((rate) => {
        const isSelected = value?.courier_code === rate.courier_code && value?.service === rate.service;
        return (
          <label
            key={`${rate.courier_code}-${rate.service}`}
            className={`flex items-center justify-between gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
              isSelected ? "border-primary bg-primary-container/20" : "border-outline-variant/20 hover:border-outline-variant"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="radio"
                name="shipping_rate"
                checked={isSelected}
                onChange={() => onSelect(rate)}
                className="text-primary focus:ring-primary"
              />
              <div className="min-w-0">
                <p className="font-medium text-on-surface text-sm">
                  {rate.courier_name.toUpperCase()} · {rate.service}
                </p>
                {rate.description && <p className="text-xs text-on-surface-variant">{rate.description}</p>}
                {rate.etd && <p className="text-xs text-on-surface-variant">Estimasi {rate.etd} hari</p>}
              </div>
            </div>
            <p className="font-headline font-semibold text-on-surface whitespace-nowrap">
              Rp {rate.cost.toLocaleString("id-ID")}
            </p>
          </label>
        );
      })}
    </div>
  );
}
