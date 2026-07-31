interface OfficialSealIconProps {
  className?: string;
}

/**
 * Bespoke gold seal for the "Official" store badge — deliberately not a Material Symbol (verified
 * checkmarks are already used site-wide for user email verification, alumni status, etc.), so an
 * official *store* reads as its own tier of trust rather than reusing the generic checkmark. A
 * metallic gold gradient + fine ring + small sheen highlight reads as a mint/certification seal at
 * a glance, even shrunk to 14–16px next to a store name.
 */
export default function OfficialSealIcon({ className = "w-4 h-4" }: OfficialSealIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" role="img">
      <defs>
        <radialGradient id="official-seal-fill" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#f2b90c" />
          <stop offset="100%" stopColor="#a66a06" />
        </radialGradient>
        <linearGradient id="official-seal-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#92610a" />
        </linearGradient>
      </defs>

      <circle
        cx="12"
        cy="12"
        r="10.5"
        fill="url(#official-seal-fill)"
        stroke="url(#official-seal-ring)"
        strokeWidth="1"
      />

      {/* Sheen — a soft highlight arc, upper-left, for a subtle metallic feel */}
      <path
        d="M6.2 7.3a8 8 0 0 1 6-2.8"
        stroke="#fffbeb"
        strokeOpacity="0.65"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d="M8 12.3l2.6 2.6L16.2 9"
        stroke="#4a2f00"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
