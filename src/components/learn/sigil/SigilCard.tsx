import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { SpotlightCard } from '@/features/landing/motion/SpotlightCard';
import { useArtAccent } from '@/hooks/useArtAccent';
import type { SigilSpec } from './sigilSpec';
import { GrooveSigil, IntervalSigil, ScaleSigil } from './sigils';

// ── A Learn tile: its music drawn as a sigil (owner, 2026-10-26) ──────────
// The landing's spotlight card (a dark glass face whose border and fill
// light where the pointer is, tinted the tile's accent), the sigil in the
// middle, small tracked caps in the corner after the poster, and a strip
// along the foot: a scale's steps, a groove's bar. Children sit on top (the
// saved heart, a "coming soon" veil).

/** The accent before a genre's art colours are read, or without art. */
const NEUTRAL = '#e8e8f0';

export function SigilCard({
  spec,
  label,
  interactive = true,
  className,
  children,
  ...rest
}: {
  spec: SigilSpec;
  /** What the figure shows, for assistive tech ("Lydian"). */
  label: string;
  /** Lifts on hover (a tile that opens). */
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>) {
  const [active, setActive] = useState(false);
  const art = useArtAccent(spec.kind === 'scale' ? undefined : spec.art);
  const accent = spec.kind === 'scale' ? spec.accent : (art ?? NEUTRAL);

  return (
    <div
      {...rest}
      className={cn('spotlight-scope', className)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <SpotlightCard
        accent={accent}
        interactive={interactive}
        className="sigil-host aspect-square size-full"
      >
        <span className="pointer-events-none absolute left-3.5 top-3 max-w-[70%] truncate text-[0.6875rem] uppercase tracking-[0.18em] text-white/45">
          {spec.stats}
        </span>
        <div className="pointer-events-none absolute inset-x-[15%] bottom-[16%] top-[13%]">
          {spec.kind === 'scale' ? (
            <ScaleSigil
              pcs={spec.pcs}
              tonic={spec.tonic}
              stars={spec.stars}
              altered={spec.altered}
              layers={spec.layers}
              weights={spec.weights}
              accent={accent}
              label={label}
            />
          ) : spec.kind === 'groove' ? (
            <GrooveSigil
              steps={spec.steps}
              hits={spec.hits}
              accent={accent}
              label={label}
            />
          ) : (
            <IntervalSigil
              ratio={spec.ratio}
              accent={accent}
              label={label}
              active={active}
            />
          )}
        </div>
        <Strip spec={spec} accent={accent} />
        {children}
      </SpotlightCard>
    </div>
  );
}

/** Along the foot: a scale's steps in tracked caps, a groove's bar as
 *  ticks (its hits tall, the first in the accent). */
function Strip({ spec, accent }: { spec: SigilSpec; accent: string }) {
  if (!spec.strip.length) return null;
  if (spec.kind === 'groove') {
    const first = spec.hits[0];
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[18%] bottom-4 flex h-2.5 items-end gap-[3px]"
      >
        {spec.strip.map((hit, i) => (
          <span
            key={i}
            className={cn(
              'flex-1 rounded-full',
              hit ? 'h-full bg-white/75' : 'h-1 bg-white/20',
            )}
            style={i === first ? { background: accent } : undefined}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-3 bottom-3.5 flex justify-center gap-2.5 text-[0.625rem] uppercase tracking-[0.18em] text-white/40"
    >
      {spec.strip.map((step, i) => (
        <span key={i}>{step}</span>
      ))}
    </div>
  );
}
