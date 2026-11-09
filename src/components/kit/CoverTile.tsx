import { Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { SpectrumRim } from '@/components/art/light/SpectrumLight';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { MicroLabel } from './MicroLabel';

export type CoverTileLayout = 'portrait' | 'wide' | 'tray';

export interface CoverTileProps {
  title: string;
  /** Under the title: a one-liner, "Last played 2h ago". */
  sub?: ReactNode;
  /** Over the title, in small caps: "EAR TRAINING — FREE". */
  eyebrow?: ReactNode;
  /** The cover: an ArtCover, filling the card. */
  art: ReactNode;
  /**
   * portrait  a 3:4 card, the art filling it and the words inside at its
   *           foot (the reference's Share card; shelves, grids)
   * wide      the same, 16:10
   * tray      a row card: a small square cover beside the words (the
   *           reference's Motive row; "Jump back in")
   */
  layout?: CoverTileLayout;
  onSelect?: () => void;
  /** The button's name: "Play Chroma". */
  ariaLabel: string;
  /** Fill the column instead of the shelf's fixed width (grids). */
  fluid?: boolean;
  className?: string;
}

/** The art box's shape for each layout: what ArtCover's `aspect` should be. */
export const COVER_ASPECT: Record<CoverTileLayout, number> = {
  portrait: 3 / 4,
  wide: 16 / 10,
  tray: 1,
};

/** The card's foot, darkened so the words read over the art's fade. */
const FOOT = {
  background:
    'linear-gradient(to top, var(--daw-surface-1) 12%, color-mix(in srgb, var(--daw-surface-1) 70%, transparent) 46%, transparent 100%)',
};

/**
 * An item as a card of its own cover (the reference: art inside a rounded
 * card, its title and line inside at the foot). Hovered or focused, its rim
 * lights with the spectrum and the art breathes; it carries the Studio's
 * focus ring and transitions.
 */
export function CoverTile({
  title,
  sub,
  eyebrow,
  art,
  layout = 'portrait',
  onSelect,
  ariaLabel,
  fluid = false,
  className,
}: CoverTileProps) {
  if (layout === 'tray') {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={ariaLabel}
        data-cover-tile="tray"
        className={cn(
          'art-host group relative flex shrink-0 snap-start items-center gap-3 rounded-[var(--daw-radius-2xl)] bg-daw-surface-1 p-3 pr-4 text-left hover:bg-daw-hover',
          TRANSITION,
          FOCUS_RING,
          fluid ? 'w-full' : 'w-[19rem]',
          className,
        )}
      >
        <span className="relative block size-12 shrink-0 overflow-hidden rounded-[var(--daw-radius-lg)] bg-daw-bg">
          {art}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {eyebrow && <MicroLabel>{eyebrow}</MicroLabel>}
          <span className="truncate text-[0.9375rem] leading-tight text-daw-text">
            {title}
          </span>
          {sub && (
            <span className="truncate text-[0.8125rem] text-daw-text-3">
              {sub}
            </span>
          )}
        </span>
        <Play
          aria-hidden
          className="size-4 shrink-0 text-daw-text-3 transition-colors group-hover:text-daw-text"
          fill="currentColor"
        />
        <SpectrumRim state="hover" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={ariaLabel}
      data-cover-tile={layout}
      className={cn(
        'art-host group relative flex shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[var(--daw-radius-2xl)] bg-daw-surface-1 text-left',
        layout === 'wide' ? 'aspect-[16/10]' : 'aspect-[3/4]',
        TRANSITION,
        FOCUS_RING,
        fluid ? 'w-full' : layout === 'wide' ? 'w-[18.75rem]' : 'w-[13.75rem]',
        className,
      )}
    >
      <span className="absolute inset-0">{art}</span>
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-3/5"
        style={FOOT}
      />
      <span
        data-cover-words
        className="relative flex min-w-0 flex-col gap-1.5 p-4"
      >
        {eyebrow && <MicroLabel>{eyebrow}</MicroLabel>}
        <span className="text-base leading-tight text-daw-text">{title}</span>
        {sub && (
          <span className="line-clamp-2 text-[0.8125rem] leading-snug text-daw-text-3">
            {sub}
          </span>
        )}
      </span>
      <SpectrumRim state="hover" />
    </button>
  );
}
