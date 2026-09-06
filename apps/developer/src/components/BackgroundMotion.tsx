/**
 * Subtle technical background motion: a faint dot grid plus a couple of
 * slowly-traveling "signal" lines and soft glowing nodes. Pure CSS
 * animation (no JS/canvas/rAF loop) so it's cheap, and it automatically
 * respects prefers-reduced-motion via the global rule in index.css that
 * collapses all animation-duration to ~0 for users who request it — no
 * separate reduced-motion branch needed here.
 *
 * Deliberately very low-opacity and slow; meant to be felt more than seen.
 * Absolutely positioned, pointer-events-none, safe to drop behind any
 * section without affecting layout or interaction.
 */
export function BackgroundMotion({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.35]">
        <defs>
          <pattern id="codex-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#263241" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#codex-grid)" />
      </svg>

      <svg width="100%" height="100%" className="absolute inset-0">
        <path
          d="M -100 120 Q 300 60 600 160 T 1300 100"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeOpacity="0.28"
          strokeDasharray="6 10"
          className="codex-signal-line"
        />
        <path
          d="M -100 340 Q 400 420 800 320 T 1400 380"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1.5"
          strokeOpacity="0.22"
          strokeDasharray="4 14"
          className="codex-signal-line codex-signal-line-slow"
        />
        <circle cx="18%" cy="22%" r="2.5" fill="#3B82F6" className="codex-node" />
        <circle cx="72%" cy="15%" r="2" fill="#22D3EE" className="codex-node codex-node-delay" />
        <circle cx="45%" cy="68%" r="2.5" fill="#3B82F6" className="codex-node" />
        <circle cx="86%" cy="55%" r="2" fill="#22D3EE" className="codex-node codex-node-delay" />
      </svg>
    </div>
  );
}
