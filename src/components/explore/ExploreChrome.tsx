import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import { ExploreSearchBar } from './ExploreSearchBar';

// ── What Explore's pages share: the column, the grid, the sticky head ─────

/** Cards across, as the width allows (Suno's 12.5rem): two on a phone. */
export const EXPLORE_GRID =
  'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]';

/** The page's column: the whole window, a rem in from the panel's edge with
 *  the panel's own padding, as Suno's. */
export const EXPLORE_COLUMN = 'w-full px-2';

/** The head's backdrop shows once the page has moved under it. */
export function useScrolledPast() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) =>
      setScrolled(!entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { sentinel, scrolled };
}

/** Explore's sticky head: the search, and whatever a view puts under it. */
export function ExploreHead({
  placeholder,
  children,
}: {
  placeholder: string;
  children?: ReactNode;
}) {
  const { sentinel, scrolled } = useScrolledPast();
  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className={cn(
          'sticky -top-2 z-20 -mx-2 px-2 transition-colors duration-300',
          scrolled ? 'bg-[#101012]' : 'bg-transparent',
        )}
      >
        <div className={cn(EXPLORE_COLUMN, 'flex flex-col gap-3 pb-4 pt-2')}>
          <ExploreSearchBar placeholder={placeholder} />
          {children}
        </div>
      </div>
    </>
  );
}

/** "← Learn": the way back to Learn's shelves. */
export function BackToLearn() {
  return (
    <Link
      to={LearnRoutes.root()}
      className={cn(
        'inline-flex items-center gap-1.5 self-start rounded-full text-[0.875rem] font-bold text-daw-text-3 hover:text-white',
        FOCUS_RING,
      )}
    >
      <ArrowLeft aria-hidden className="size-4" />
      Learn
    </Link>
  );
}

/**
 * Learn's navigation, in the Arcade's look (ArcadeTabBar, owner
 * 2026-11-04): centred and pinned to the top, the Learn icon alone (its
 * name for screen readers), which opens /learn, then the instruments as
 * plain words at the same size, the one showing white. Once the page has
 * moved under it, the panel's own colour draws behind it, its foot fading
 * out, as the Arcade's head does.
 */
export function ExploreNavBar({
  items,
  activeKey,
}: {
  items: readonly { key: string; label: string; to: string }[];
  activeKey: string;
}) {
  const { sentinel, scrolled } = useScrolledPast();
  return (
    <>
      <div ref={sentinel} aria-hidden className="h-0" />
      <div
        data-explore-head
        data-stuck={scrolled ? '' : undefined}
        className="sticky -top-2 z-20 -mx-2 flex shrink-0 flex-col items-center px-4 pb-6 pt-4"
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 bg-[#101012] transition-opacity duration-200 [mask-image:linear-gradient(to_bottom,#000_calc(100%-2rem),transparent)]',
            scrolled ? 'opacity-100' : 'opacity-0',
          )}
        />
        <nav
          aria-label="Learn"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-x-6"
        >
          <Link
            to={LearnRoutes.root()}
            className={cn(
              'flex items-center rounded-lg text-white/85 transition-opacity hover:opacity-90',
              FOCUS_RING,
            )}
          >
            <img
              src="/icons/learn-icon.svg"
              alt=""
              draggable={false}
              className="size-8 md:size-10"
            />
            <span className="sr-only">Learn</span>
          </Link>
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              aria-current={item.key === activeKey ? 'page' : undefined}
              className={cn(
                'rounded-md text-xl font-medium transition-colors md:text-2xl',
                FOCUS_RING,
                item.key === activeKey
                  ? 'text-white'
                  : 'text-white/55 hover:text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
