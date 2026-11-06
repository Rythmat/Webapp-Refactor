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
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

// ── A shelf, in Suno's layout ──────────────────────────────────────────────
// Measured on suno.com/explore (owner, 2026-11-04), in its rem: its title
// (1.125rem, semibold) on the left and a "See all ›" pill on the right, then
// 12.5rem square cards a rem apart, running to the page's edge, the last
// tenth of the row fading out (and the first, once it has moved). Round
// arrows float over the art, inside the fade; it never moves by itself.

/** A card's width in a shelf: Suno's 12.5rem, a little less on a phone. */
export const SHELF_ITEM = 'w-[10rem] shrink-0 snap-start sm:w-[12.5rem]';

/** Half a card's width: the arrows sit there, level with the art's middle. */
const ARROW_TOP = 'top-[5rem] sm:top-[6.25rem]';

const ARROW = cn(
  'absolute z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-[#1c1c1f]/60 text-white backdrop-blur-md hover:bg-[#1c1c1f]/90 [@media(hover:none)]:hidden',
  ARROW_TOP,
  TRANSITION,
  FOCUS_RING,
);

/** Suno's "See all": a quiet pill, its edge a hairline. */
export const SEE_ALL_PILL = cn(
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-white/10 pl-3 pr-2 text-[0.875rem] font-medium text-white hover:bg-white/[0.06]',
  TRANSITION,
  FOCUS_RING,
);

export function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={SEE_ALL_PILL} aria-label={`See all: ${label}`}>
      See all
      <ChevronRight aria-hidden className="size-4" />
    </Link>
  );
}

/** The row's fade: the tenth of it that runs on past either edge. */
function fadeMask(start: boolean, end: boolean): CSSProperties | undefined {
  if (start && end) return undefined;
  const image = `linear-gradient(to right, ${
    start ? '#000 0%' : 'transparent 0%, #000 10%'
  }, ${end ? '#000 100%' : '#000 90%, transparent 100%'})`;
  return { maskImage: image, WebkitMaskImage: image };
}

export function Shelf({
  id,
  title,
  reason,
  seeAll,
  count,
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
  /** Its cards, each an `<li>` (give it SHELF_ITEM). */
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
      left: direction * el.clientWidth * 0.8,
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
          style={fadeMask(ends.start, ends.end)}
          className="flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </ul>
        {!ends.start && (
          <button
            type="button"
            className={cn(ARROW, 'left-3')}
            onClick={() => page(-1)}
            aria-label={`Scroll ${title} back`}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
        )}
        {!ends.end && (
          <button
            type="button"
            className={cn(ARROW, 'right-3')}
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
