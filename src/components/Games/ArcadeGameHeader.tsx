import { Fragment, type ReactNode } from 'react';

/**
 * Decorative hexagon + colour-wash pattern painted behind every arcade game
 * header. Extracted from Major Arcanum's original GameHeader so all games share
 * one identical header treatment.
 */
export const ArcadeHeaderPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-40"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern
        id="arcade-hexagons"
        width="50"
        height="43.4"
        patternUnits="userSpaceOnUse"
        patternTransform="scale(2)"
      >
        <path
          d="M25 0L50 14.4V43.3L25 57.7L0 43.3V14.4L25 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-white/10"
        />
      </pattern>
    </defs>
    <path d="M0 0H400L300 200H0V0Z" fill="#28a69a" fillOpacity="0.2" />
    <path d="M300 0H600L500 200H200L300 0Z" fill="#d2404a" fillOpacity="0.3" />
    <path d="M550 0H900L800 200H450L550 0Z" fill="#9d7fce" fillOpacity="0.2" />
    <path
      d="M850 0H1200L1100 200H750L850 0Z"
      fill="#fea92a"
      fillOpacity="0.2"
    />
    <rect width="100%" height="100%" fill="url(#arcade-hexagons)" />
  </svg>
);

export interface HeaderStat {
  label: string;
  value: ReactNode;
  /** Tailwind text-colour class for the value (defaults to white). */
  valueClassName?: string;
}

interface ArcadeGameHeaderProps {
  title: string;
  /**
   * Centre sub-row beneath the title — mode toggles, difficulty / tempo
   * steppers, reset, metronome and other HUD chrome controls.
   */
  controls?: ReactNode;
  /** Right-side labelled stat chips (score / streak / lives / accuracy …). */
  stats?: HeaderStat[];
  /** Fully custom right-side content; overrides `stats` when provided. */
  right?: ReactNode;
  /** Optional custom left-side content (e.g. a Back button). */
  left?: ReactNode;
}

/**
 * The shared arcade game header bar — the single source of truth for the
 * `h-28` hexagon-backed title bar first built for Major Arcanum. Every arcade
 * game renders one of these at the top of its window so the chrome is
 * consistent, with the game's HUD controls and status displays held on the bar.
 */
export function ArcadeGameHeader({
  title,
  controls,
  stats,
  right,
  left,
}: ArcadeGameHeaderProps) {
  return (
    <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden border-b border-zinc-800 px-8">
      <div className="absolute inset-0 bg-[#18181b]">
        <ArcadeHeaderPattern />
      </div>

      {left && (
        <div className="absolute left-8 top-1/2 z-10 -translate-y-1/2">
          {left}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1
          className="font-serif text-5xl italic tracking-wide text-white"
          style={{ fontFamily: '"Playfair Display", serif' }}
        >
          {title}
        </h1>
        {controls && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {controls}
          </div>
        )}
      </div>

      {right ? (
        <div className="absolute right-8 top-1/2 z-10 -translate-y-1/2">
          {right}
        </div>
      ) : (
        stats &&
        stats.length > 0 && (
          <div className="absolute right-8 top-1/2 z-10 flex -translate-y-1/2 items-center gap-8 rounded-xl border border-white/5 bg-black/20 px-6 py-3 backdrop-blur-sm">
            {stats.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <div className="h-8 w-px bg-white/10" />}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {s.label}
                  </span>
                  <span
                    className={`text-xl font-medium tabular-nums ${
                      s.valueClassName ?? 'text-white'
                    }`}
                  >
                    {s.value}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        )
      )}
    </div>
  );
}
