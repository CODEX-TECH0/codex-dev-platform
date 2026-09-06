import { useId } from 'react';

interface CodexMarkProps {
  /** Pixel size of the square mark (width == height). */
  size?: number;
  className?: string;
}

/**
 * The Codex mark: a angle-bracket glyph ("</>") on a two-tone diagonal
 * gradient chip, built from the product's own accent colors. Self-contained
 * (carries its own background), so it reads cleanly on both the dark app
 * background (#0B0F14) and on white/light surfaces (landing page, printed
 * docs) without needing separate light/dark variants. Pure inline SVG — no
 * external asset, crisp at favicon size and at hero-banner size alike.
 */
export function CodexMark({ size = 32, className = '' }: CodexMarkProps) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Codex"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <path
        d="M13.5 9 L7.5 16 L13.5 23"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M18.5 9 L24.5 16 L18.5 23"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface CodexLogoProps {
  /** Pixel size of the mark; wordmark text scales relative to it. */
  size?: number;
  /** Show "Codex" text next to the mark. Set false for icon-only contexts (favicon, collapsed sidebar). */
  withWordmark?: boolean;
  className?: string;
}

/**
 * Full lockup: mark + wordmark, for navbars and marketing contexts. Text
 * color is `currentColor` so it inherits from a parent's text color class
 * (e.g. text-text-primary on dark, or a dark ink color on a light landing
 * page section) — the one thing that DOES need to vary between dark/light
 * placements, unlike the self-contained mark chip.
 */
export function CodexLogo({ size = 28, withWordmark = true, className = '' }: CodexLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <CodexMark size={size} />
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight" style={{ fontSize: size * 0.62 }}>
          Codex
        </span>
      )}
    </span>
  );
}
