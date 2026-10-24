import { ArrowUpRight } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';

// ── Insight's cards (owner, 2026-10-24) ────────────────────────────────────
//
// Insight wears the prompt box's design (components/promptBox): each section
// is the box's card — 20 px corners, a hairline edge, a soft shadow, Home's
// faint wash over the panel — with its statement in the box's 15 px white,
// the rest in quieter 13 px, round chips, and the box's pills for actions.

/**
 * Text that takes the rainbow sweep (insight.css), settling on its own
 * colour: white, or the quieter 55%.
 */
export const INK = 'insight-ink [--sweep-to:white]';
export const INK_DIM =
  'insight-ink [--sweep-to:color-mix(in_srgb,white_55%,transparent)]';

/** The statement a card makes: a chord, a key, a progression. */
export const INSIGHT_TEXT = `${INK} text-[15px] leading-6 text-white`;
/** What's said about it. */
export const INSIGHT_DIM = `${INK_DIM} text-[13px] leading-5 text-white/55`;

/** A link that reads as one of the box's hairline pills. */
export const INSIGHT_PILL_LINK =
  'insight-pill flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[13px] font-medium text-white/85 outline-none transition-colors duration-75 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40';

/** A quiet text button (Show more, Clear): the box's ghost pill. */
export const INSIGHT_GHOST =
  'flex h-7 shrink-0 items-center gap-1 rounded-full px-1.5 text-[13px] font-medium text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40';

/** A row inside a card: a match, a move between chords. */
export const INSIGHT_ROW = 'rounded-[14px] bg-white/[0.04] px-3 py-2';

interface InsightCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The card's name, quiet, at its top. */
  title?: ReactNode;
  /** Beside the name, at the end of the row. */
  aside?: ReactNode;
  /** A colour dot before the name (a chord's, the key's). */
  dot?: string;
  /** The card the student is working with: a brighter edge. */
  active?: boolean;
}

/** One of Insight's sections, in the prompt box's card. */
export const InsightCard = forwardRef<HTMLElement, InsightCardProps>(
  function InsightCard(
    { title, aside, dot, active = false, className, children, ...rest },
    ref,
  ) {
    return (
      <section
        ref={ref}
        {...rest}
        className={cn(
          PROMPT_FRAME,
          PROMPT_WASH,
          'flex flex-col gap-2.5 px-4 py-3.5',
          active && 'border-white/25',
          className,
        )}
      >
        {title || aside ? (
          <div className="flex min-h-6 items-center gap-2">
            {dot ? <Dot color={dot} /> : null}
            {title ? (
              <h3
                className={cn(INK_DIM, 'text-[13px] font-medium text-white/55')}
              >
                {title}
              </h3>
            ) : null}
            {aside ? (
              <div className="ml-auto flex items-center gap-1 text-[13px] text-white/40">
                {aside}
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
      </section>
    );
  },
);

/** A colour dot: a chord's, a key's, a track's. */
export function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="insight-dot size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** A chip tinted with a chord's or a track's colour. */
export function TintChip({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      className="insight-pill inline-flex h-7 items-center rounded-full border px-2.5 text-[13px] font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        color,
      }}
    >
      {children}
    </span>
  );
}

/** A note on a card: how the chord stands in the key, a heads-up. */
export function InsightBadge({
  tone = 'dim',
  to,
  title,
  children,
}: {
  tone?: 'dim' | 'amber' | 'purple';
  /** Where the note leads, e.g. the scale a borrowed chord comes from. */
  to?: string;
  title?: string;
  children: ReactNode;
}) {
  const className = cn(
    'insight-pill inline-flex min-h-6 items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[12px] font-medium',
    tone === 'dim' && 'bg-white/[0.06] text-white/60',
    tone === 'amber' && 'bg-amber-500/15 text-amber-400',
    tone === 'purple' && 'bg-purple-500/15 text-purple-300',
    to &&
      'outline-none transition-[filter] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-white/40',
  );
  return to ? (
    <Link to={to} title={title} className={className}>
      {children}
      <ArrowUpRight aria-hidden className="size-3" />
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}
