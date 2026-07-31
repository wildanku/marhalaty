import { StoreShippingMethod } from "@/types";

interface ShippingMethodDetailModalProps {
  method: StoreShippingMethod;
  storeAddress: string | null;
  onClose: () => void;
}

export default function ShippingMethodDetailModal({
  method,
  storeAddress,
  onClose,
}: ShippingMethodDetailModalProps) {
  const fee = Number(method.fee);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-on-surface/40 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl border border-surface-container-high shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              {method.type === "pickup" ? "Ambil di Toko" : "Pengiriman"}
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface">{method.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-3">
            <span className="text-sm text-on-surface-variant">Biaya</span>
            <span className="font-headline font-bold text-on-surface">
              {fee > 0 ? `Rp ${fee.toLocaleString("id-ID")}` : "Gratis"}
            </span>
          </div>

          {method.description && (
            <div>
              <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Keterangan
              </p>
              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line">
                {method.description}
              </p>
            </div>
          )}

          {method.type === "pickup" && (
            <div className="flex items-start gap-3 rounded-2xl border border-outline-variant/20 p-4">
              <span className="material-symbols-outlined text-primary text-xl shrink-0">
                storefront
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-on-surface">
                  {storeAddress ?? "Alamat toko belum diatur."}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Tidak perlu alamat pengiriman — ambil langsung di lokasi ini.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-surface-container-high text-on-surface px-6 py-3 rounded-full font-label font-semibold hover:bg-surface-container transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
