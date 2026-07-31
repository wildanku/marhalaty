import { StoreBadgeColorToken, StoreBadgeSummary } from "@/types";
import OfficialSealIcon from "@/Components/Store/OfficialSealIcon";

interface StoreBadgeIconsProps {
  badges: StoreBadgeSummary[] | undefined;
  size?: "sm" | "md";
  className?: string;
}

// Solid bg + on-color — a low-contrast *-container pairing disappears at icon-chip size.
const CHIP_STYLES: Record<StoreBadgeColorToken, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-secondary text-on-secondary",
  tertiary: "bg-tertiary text-on-tertiary",
  error: "bg-error text-on-error",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

/**
 * Compact, icon-only badge row meant to sit inline right next to a store name. "Official" gets a
 * bespoke gold seal instead of a colored chip — it's the one badge meant to read as a distinct
 * tier of trust at a glance, not just another category tag.
 */
export default function StoreBadgeIcons({
  badges,
  size = "sm",
  className = "",
}: StoreBadgeIconsProps) {
  if (!badges || badges.length === 0) return null;

  const dimension = size === "sm" ? "w-[15px] h-[15px]" : "w-[18px] h-[18px]";
  const chipSize = size === "sm" ? "w-[18px] h-[18px]" : "w-[20px] h-[20px]";
  const iconTextSize = size === "sm" ? "text-[10px]" : "text-[12px]";

  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      {badges.map((badge) =>
        badge.code === "official" ? (
          <span
            key={badge.id}
            title={badge.description ?? badge.name}
            className="inline-flex shrink-0"
          >
            <OfficialSealIcon className={`${dimension} drop-shadow-sm`} />
          </span>
        ) : (
          <span
            key={badge.id}
            title={badge.description ?? badge.name}
            className={`inline-flex items-center justify-center rounded-full shrink-0 ${chipSize} ${CHIP_STYLES[badge.color_token]}`}
          >
            <span className={`material-symbols-outlined ${iconTextSize} leading-none`}>
              {badge.icon}
            </span>
          </span>
        )
      )}
      <span className="sr-only">{badges.map((b) => b.name).join(", ")}</span>
    </span>
  );
}
