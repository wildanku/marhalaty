import type { ReactElement } from "react";
import type { PaymentProof } from "@/types";

interface UploadedProofCardProps {
  proof: PaymentProof;
  viewUrl: string;
  onReplace: () => void;
}

/**
 * Confirms that a manual-transfer proof was received, while keeping the exact submitted file
 * visible before the buyer decides to replace it. The URL is authorization-scoped by the
 * corresponding payment page/controller; never use the storage path from the proof payload here.
 */
export default function UploadedProofCard({
  proof,
  viewUrl,
  onReplace,
}: UploadedProofCardProps): ReactElement {
  const isPdf = proof.original_name.toLowerCase().endsWith(".pdf");

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <span
          className="material-symbols-outlined text-emerald-600 text-[22px] shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          task_alt
        </span>
        <div>
          <p className="font-body text-sm font-semibold text-emerald-800">
            Bukti transfer sudah diunggah
          </p>
          <p className="font-body text-xs text-emerald-700 mt-0.5">Menunggu verifikasi admin.</p>
        </div>
      </div>

      {isPdf ? (
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-container p-4 hover:border-primary/40 transition-colors"
        >
          <span className="material-symbols-outlined text-error text-3xl">picture_as_pdf</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-on-surface truncate">
              {proof.original_name}
            </span>
            <span className="block text-xs text-on-surface-variant mt-0.5">Buka dokumen bukti</span>
          </span>
          <span className="material-symbols-outlined text-primary text-[20px]">open_in_new</span>
        </a>
      ) : (
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-surface-container-high bg-surface-container hover:border-primary/40 transition-colors"
        >
          <img
            src={viewUrl}
            alt={`Bukti transfer ${proof.original_name}`}
            className="h-48 w-full object-contain bg-white"
          />
          <span className="flex items-center gap-2 px-3 py-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">open_in_new</span>
            <span className="truncate">{proof.original_name}</span>
          </span>
        </a>
      )}

      {proof.review_note && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-body">
          <strong>Catatan Admin:</strong> {proof.review_note}
        </div>
      )}

      <button
        type="button"
        onClick={onReplace}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-[18px]">upload_file</span>
        Ganti bukti transfer
      </button>
    </div>
  );
}
