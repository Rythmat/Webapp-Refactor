import {
  useContext,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import { CARD } from '@/lib/cover';
import { GenreOrderContext } from './genreOrder';
import { sigilColors, type SigilSpec } from './sigilSpec';
import { GrooveSigil, IntervalSigil, RotarySigil, ScaleSigil } from './sigils';

// ── A Learn tile: its music drawn as a sigil (owner, 2026-10-26) ──────────
// In the Truchet covers' look (owner, 2026-11-05), so a Learn shelf reads as
// one with Best Of: the covers' flat dark card, rounded, a hairline ring,
// easing in a touch on hover (an ancestor `.group`), the figure in the
// two-colour gradient its music chooses (sigilColors). Children sit on top
// (the saved heart, a "coming soon" veil, a title along the foot).

export function SigilCard({
  spec,
  label,
  interactive = true,
  footRoom = false,
  className,
  children,
  style,
  ...rest
}: {
  spec: SigilSpec;
  /** What the figure shows, for assistive tech ("Lydian"). */
  label: string;
  /** Eases in on hover (a tile that opens). */
  interactive?: boolean;
  /** Keep the foot clear for a title set inside the card. */
  footRoom?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>) {
  const [active, setActive] = useState(false);
  const genreOrder = useContext(GenreOrderContext);
  const colors = useMemo(
    () => sigilColors(spec, genreOrder ?? undefined),
    [spec, genreOrder],
  );
  const paint = { colors, look: 'lines' as const };

  return (
    <div
      {...rest}
      data-interactive={interactive ? 'true' : undefined}
      className={cn(
        'sigil-host relative block aspect-square overflow-hidden rounded-2xl ring-1 ring-inset ring-white/[0.08]',
        className,
      )}
      style={{ background: CARD, ...style }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <div
        className={cn(
          'pointer-events-none absolute',
          footRoom ? 'inset-x-[6%] bottom-[14%] top-[3%]' : 'inset-[4%]',
          interactive &&
            'transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100',
        )}
      >
        {spec.kind === 'scale' ? (
          <ScaleSigil
            pcs={spec.pcs}
            tonic={spec.tonic}
            stars={spec.stars}
            altered={spec.altered}
            degrees={spec.degrees}
            layers={spec.layers}
            weights={spec.weights}
            accent={colors[1]}
            label={label}
            paint={paint}
          />
        ) : spec.kind === 'rotary' ? (
          <RotarySigil
            ratio={spec.ratio}
            accent={colors[1]}
            label={label}
            paint={paint}
          />
        ) : spec.kind === 'groove' ? (
          <GrooveSigil
            steps={spec.steps}
            hits={spec.hits}
            accent={colors[1]}
            label={label}
            paint={paint}
          />
        ) : (
          <IntervalSigil
            ratio={spec.ratio}
            accent={colors[1]}
            label={label}
            active={active}
            paint={paint}
          />
        )}
      </div>
      <Strip spec={spec} colors={colors} />
      {children}
    </div>
  );
}

/** Along a groove's foot: its bar as ticks (its hits tall, the first in
 *  the second colour). */
function Strip({
  spec,
  colors,
}: {
  spec: SigilSpec;
  colors: readonly [string, string];
}) {
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
          className={cn('flex-1 rounded-full', hit ? 'h-full' : 'h-1')}
          style={{
            background:
              i === first
                ? colors[1]
                : `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
            opacity: hit ? 0.9 : 0.25,
          }}
        />
      ))}
    </div>
  );
}
