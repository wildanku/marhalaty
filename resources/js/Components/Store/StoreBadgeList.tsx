import { StoreBadgeColorToken, StoreBadgeSummary } from "@/types";

interface StoreBadgeListProps {
  badges: StoreBadgeSummary[] | undefined;
  size?: "sm" | "md";
  max?: number;
  className?: string;
}

// Kelas Tailwind ditulis lengkap (bukan dirangkai dari variabel) supaya tetap kena scan build-time.
const COLOR_STYLES: Record<StoreBadgeColorToken, string> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  error: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default function StoreBadgeList({ badges, size = "md", max, className = "" }: StoreBadgeListProps) {
  if (!badges || badges.length === 0) return null;

  const visible = typeof max === "number" ? badges.slice(0, max) : badges;
  const hiddenCount = typeof max === "number" ? Math.max(0, badges.length - max) : 0;
  const isSmall = size === "sm";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          title={badge.description ?? badge.name}
          className={`inline-flex items-center gap-1 rounded-full font-label font-medium ${COLOR_STYLES[badge.color_token]} ${
            isSmall ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
          }`}
        >
          <span className={`material-symbols-outlined ${isSmall ? "text-[13px]" : "text-sm"}`}>{badge.icon}</span>
          {badge.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-on-surface-variant">+{hiddenCount}</span>
      )}
    </div>
  );
}
