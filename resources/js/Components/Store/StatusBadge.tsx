interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STYLES: Record<string, string> = {
  pending: "bg-tertiary-container text-on-tertiary-container",
  approved: "bg-primary-container text-on-primary-container",
  active: "bg-primary-container text-on-primary-container",
  rejected: "bg-error-container text-on-error-container",
  suspended: "bg-error-container text-on-error-container",
  draft: "bg-surface-container-high text-on-surface-variant",
  archived: "bg-surface-container-high text-on-surface-variant",
  invited: "bg-tertiary-container text-on-tertiary-container",
  revoked: "bg-error-container text-on-error-container",
  pending_payment: "bg-tertiary-container text-on-tertiary-container",
  paid: "bg-primary-container text-on-primary-container",
  processing: "bg-tertiary-container text-on-tertiary-container",
  shipped: "bg-primary-container text-on-primary-container",
  completed: "bg-primary-container text-on-primary-container",
  cancelled: "bg-error-container text-on-error-container",
  expired: "bg-error-container text-on-error-container",
  refunded: "bg-surface-container-high text-on-surface-variant",
};

const LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  active: "Aktif",
  rejected: "Ditolak",
  suspended: "Disuspend",
  draft: "Draft",
  archived: "Diarsipkan",
  invited: "Diundang",
  revoked: "Dicabut",
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  refunded: "Direfund",
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-label font-semibold uppercase tracking-wide ${STYLES[status] ?? "bg-surface-container-high text-on-surface-variant"} ${className}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
