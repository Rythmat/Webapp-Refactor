import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit/MicroLabel';
import { ICON_BUTTON } from '@/components/kit/libraryLook';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

// ── A shelf, in Suno's layout with Samply's look ───────────────────────────
// Measured on suno.com/explore (owner, 2026-11-04), in its rem: its title
// (1.125rem, semibold) on the left and a quiet "See all ›" on the right, then
// 12.5rem square cards, running to the page's edge, the last tenth of the row
// fading out (and the first, once it has moved). Round arrows float over the
// art, inside the fade; it never moves by itself. Samply's spacing and
// buttons since 2026-11-10: cards 1.5rem apart, flat round arrows.

/** A card's width in a shelf: Suno's 12.5rem, a little less on a phone. */
export const SHELF_ITEM = 'w-[10rem] shrink-0 snap-start sm:w-[12.5rem]';

/**
 * A card's width in a `fit` shelf: 210px, Samply's (owner, 2026-11-10),
 * whatever the window or the app rail does; 24px apart. In rem over the
 * app's 17.6px root.
 */
export const FIT_ITEM = 'w-[11.932rem] shrink-0 snap-start';

/** Half a card's width: the arrows sit there, level with the art's middle. */
const ARROW_TOP = 'top-[5rem] sm:top-[6.25rem]';
const FIT_ARROW_TOP = 'top-[calc(11.932rem/2+0.25rem)]';

const ARROW = cn(
  ICON_BUTTON,
  'absolute z-10 -translate-y-1/2 bg-[#1c1c1f] hover:bg-[#2a2a2f] [@media(hover:none)]:hidden',
);

/** "See all": small grey words, white on hover, as Samply's text buttons. */
export const SEE_ALL_PILL = cn(
  'inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full pl-3 pr-2 text-[0.75rem] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white',
  TRANSITION,
  FOCUS_RING,
);

export function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={SEE_ALL_PILL} aria-label={`See all: ${label}`}>
      See all
      <ChevronRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** The row's fade: the tenth of it that runs on past either edge (a sliver
 *  in a `fit` shelf). */
function fadeMask(
  start: boolean,
  end: boolean,
  fit: boolean,
): CSSProperties | undefined {
  if (start && end) return undefined;
  const edge = fit ? '0.75rem' : '10%';
  const image = `linear-gradient(to right, ${
    start ? '#000 0%' : `transparent 0%, #000 ${edge}`
  }, ${end ? '#000 100%' : `#000 calc(100% - ${edge}), transparent 100%`})`;
  return { maskImage: image, WebkitMaskImage: image };
}

export function Shelf({
  id,
  title,
  reason,
  seeAll,
  count,
  fit = false,
  children,
}: {
  /** Unique on the page: its heading's id and `data-explore-shelf`. */
  id: string;
  title: string;
  /** Small caps over the title: why it's here. */
  reason?: ReactNode;
  /** The whole list; no pill without one. */
  seeAll?: string;
  /** How many cards it holds, to measure again when that changes. */
  count: number;
  /** Samply's grid: 210px cards, 24px apart (give them FIT_ITEM). */
  fit?: boolean;
  /** Its cards, each an `<li>` (give it SHELF_ITEM, or FIT_ITEM). */
  children: ReactNode;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    setEnds({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = list.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, count]);

  const page = (direction: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollBy({
      // A fit shelf turns a whole row of cards; the others, most of one.
      left: direction * el.clientWidth * (fit ? 1 : 0.8),
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const titleId = `explore-shelf-${id}`;
  return (
    <section
      aria-labelledby={titleId}
      data-explore-shelf={id}
      className="flex min-w-0 flex-col gap-4"
    >
      <header className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {reason && <MicroLabel>{reason}</MicroLabel>}
          <h2
            id={titleId}
            className="truncate text-[1.125rem] font-semibold leading-6 text-white"
          >
            {title}
          </h2>
        </div>
        {seeAll && <SeeAll to={seeAll} label={title} />}
      </header>
      <div className="relative -mx-1">
        <ul
          ref={list}
          onScroll={measure}
          data-shelf-fade={`${ends.start ? '' : 'start'} ${ends.end ? '' : 'end'}`.trim()}
          style={fadeMask(ends.start, ends.end, fit)}
          className={cn(
            'flex snap-x snap-mandatory scroll-px-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            fit ? 'gap-[1.364rem]' : 'gap-6',
          )}
        >
          {children}
        </ul>
        {!ends.start && (
          <button
            type="button"
            className={cn(ARROW, fit ? FIT_ARROW_TOP : ARROW_TOP, 'left-3')}
            onClick={() => page(-1)}
            aria-label={`Scroll ${title} back`}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
        )}
        {!ends.end && (
          <button
            type="button"
            className={cn(ARROW, fit ? FIT_ARROW_TOP : ARROW_TOP, 'right-3')}
            onClick={() => page(1)}
            aria-label={`Scroll ${title} on`}
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
}
