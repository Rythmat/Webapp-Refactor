import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { SpotlightCard } from '@/features/landing/motion/SpotlightCard';
import { useArtAccent } from '@/hooks/useArtAccent';
import type { SigilSpec } from './sigilSpec';
import { GrooveSigil, IntervalSigil, RotarySigil, ScaleSigil } from './sigils';

// ── A Learn tile: its music drawn as a sigil (owner, 2026-10-26) ──────────
// The landing's spotlight card (its border and fill light where the
// pointer is, tinted the tile's accent) in the prompt box's wash (owner,
// 2026-10-28), the sigil in the middle and, for a groove, its bar along the
// foot; no small text (owner, 2026-10-28). Children sit on top (the saved
// heart, a "coming soon" veil).

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
        className="sigil-host sigil-card aspect-square size-full"
      >
        {/* The figure as large as the card allows (owner, 2026-10-28): clear
            of the title along the foot, its circle the same size on every
            tab. */}
        <div className="pointer-events-none absolute inset-x-[6%] bottom-[14%] top-[3%]">
          {spec.kind === 'scale' ? (
            <ScaleSigil
              pcs={spec.pcs}
              tonic={spec.tonic}
              stars={spec.stars}
              altered={spec.altered}
              degrees={spec.degrees}
              layers={spec.layers}
              weights={spec.weights}
              accent={accent}
              label={label}
            />
          ) : spec.kind === 'rotary' ? (
            <RotarySigil ratio={spec.ratio} accent={accent} label={label} />
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

/** Along a groove's foot: its bar as ticks (its hits tall, the first in
 *  the accent). */
function Strip({ spec, accent }: { spec: SigilSpec; accent: string }) {
  if (spec.kind !== 'groove' || !spec.strip.length) return null;
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
