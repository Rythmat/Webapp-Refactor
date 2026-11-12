import { Flame } from 'lucide-react';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TOP_BAR_HEIGHT } from '@/components/atlas/layout/frameGeometry';
import { AppIcons } from '@/components/icons/appIcons';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { RailToggle } from '@/layouts/DashboardLayout/RailToggle';
import { ChordNotationSwitcher } from './ChordNotationSwitcher';
import { CREDITS_PLACEHOLDER, useTopRailStats } from './useTopRailStats';

interface TopRailProps {
  /** The page's scroller, under the toolbar: its scroll shows the title. */
  scroller: RefObject<HTMLElement>;
  className?: string;
}

/** The Studio's top bar's height (owner, 2026-11-10), every top bar's. */
export const TOOLBAR_HEIGHT = TOP_BAR_HEIGHT;

/** Whether the page has scrolled from its top. */
function useScrolled(scroller: RefObject<HTMLElement>): boolean {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scroller, pathname]);
  return scrolled;
}

/** How far the page scrolls while the fade comes in: 120px, in rem. */
const FADE_RAMP_REM = 6.818;

/**
 * Fades `layers` in as the page scrolls (owner, 2026-11-10): nothing at the
 * top, all of it 120px down, eased at both ends, and back out the same way
 * going up. Written straight to their style, a frame at a time: no render
 * per scroll.
 */
function useScrollFadeIn(
  scroller: RefObject<HTMLElement>,
  layers: readonly RefObject<HTMLElement>[],
) {
  const { pathname } = useLocation();
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const t = Math.min(1, Math.max(0, el.scrollTop / (FADE_RAMP_REM * rem)));
      const eased = String(t * t * (3 - 2 * t));
      for (const layer of layers) {
        if (layer.current) layer.current.style.opacity = eased;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // The layers are refs, fixed for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroller, pathname]);
}

/**
 * The page panel's top edge once it has scrolled (owner, 2026-11-10: the
 * toolbar's fade, kept when the bar moved off the page): the page's colour
 * down from the top with a soft blur fading out below it (Samply's ::before
 * and ::after), so what scrolls up fades into the panel's edge. Over the
 * scroller, in its rounded corners. It comes in with the scroll, not at
 * once (owner: useScrollFadeIn).
 */
export const PageTopFade = ({
  scroller,
}: {
  scroller: RefObject<HTMLElement>;
}) => {
  const wash = useRef<HTMLSpanElement>(null);
  const blur = useRef<HTMLSpanElement>(null);
  useScrollFadeIn(scroller, [wash, blur]);

  return (
    <>
      <span
        ref={wash}
        aria-hidden
        data-page-fade
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[4.318rem] bg-[linear-gradient(to_bottom,#101012_0%,rgb(16_16_18/0.85)_45%,rgb(16_16_18/0.4)_75%,transparent_100%)] opacity-0"
      />
      <span
        ref={blur}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[4.318rem] opacity-0 backdrop-blur-md [mask-image:linear-gradient(to_top,transparent_0,rgb(0_0_0/0.25)_16px,rgb(0_0_0/0.7)_36px,black_56px)]"
      />
    </>
  );
};

/**
 * The app's top bar (owner, 2026-11-10: Suno's play bar, measured on
 * suno.com/discover, mirrored to the top) across the page's column, the
 * side rail running up past it to the window's top, as Suno's does; in the
 * darker black the panels sit on, 8px over the page's panel, its content
 * 24px in. As tall as the Studio's top bar and where it is, at the window's
 * top (owner, 2026-11-10), so nothing in it moves between the two. Its
 * left end opens the app rail while that's shut; the student's stats sit
 * at its right (owner: they stay). As the page scrolls, the page's title
 * fades in small at the left with the page's fade (useScrollFadeIn),
 * Samply's 16px, in regular weight (owner).
 * Every page but the framed ones (the Studio editor, the Globe, the
 * Office), whose own top bars do its job.
 */
export const TopRail = ({ scroller, className }: TopRailProps) => {
  const { totalXp, level, streakDays, unlockedCount } = useTopRailStats();
  const { pathname } = useLocation();
  const scrolled = useScrolled(scroller);
  const [title, setTitle] = useState('');
  const titleRef = useRef<HTMLSpanElement>(null);
  useScrollFadeIn(scroller, [titleRef]);

  // The page's own title, whichever page it is, once it has scrolled: its
  // h1, or the name the page gives the bar (`data-toolbar-title`; Home's
  // "Music Atlas", owner 2026-11-10).
  useEffect(() => {
    if (!scrolled) return;
    const h1 = scroller.current?.querySelector('h1');
    setTitle(h1?.dataset.toolbarTitle ?? h1?.textContent?.trim() ?? '');
  }, [scrolled, scroller, pathname]);

  return (
    <header
      data-app-toolbar
      data-scrolled={scrolled || undefined}
      className={cn(
        'flex shrink-0 items-center gap-3 px-[1.364rem] max-sm:px-[0.682rem]',
        className,
      )}
      style={{ height: TOOLBAR_HEIGHT }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <RailToggle />
        <span
          ref={titleRef}
          aria-hidden
          className="truncate text-[0.909rem] font-normal leading-6 text-white opacity-0"
        >
          {title}
        </span>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-5 text-white max-sm:gap-3.5">
        {/* Chord notation — only once turned on in Settings ▸ Look & Feel.
            On a phone it has its own bar (MobileChordNotationBar). */}
        <div className="max-sm:hidden">
          <ChordNotationSwitcher />
        </div>

        {/* Learning streak — appears once the user has one (gentle, no zero-state). */}
        {streakDays > 0 && (
          <div
            className="flex items-center gap-1.5"
            title={`${streakDays}-day learning streak`}
            aria-label={`${streakDays}-day learning streak`}
          >
            <Flame className="size-4 text-orange-400" fill="currentColor" />
            <span className="text-base leading-none tabular-nums">
              {streakDays}
            </span>
          </div>
        )}

        {/* XP */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base leading-none tabular-nums">
            {totalXp.toLocaleString()}
          </span>
          <span className="text-base leading-none text-white/70">XP</span>
        </div>

        {/* Level */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base leading-none text-white/70">Level</span>
          <span className="text-base leading-none tabular-nums">{level}</span>
        </div>

        {/* Credits (stubbed) */}
        <button
          type="button"
          aria-label={`Credits: ${CREDITS_PLACEHOLDER}`}
          className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white max-sm:hidden"
        >
          <img
            src="/icons/credits-icon.svg"
            alt=""
            draggable={false}
            className="size-5"
          />
          <span className="text-base tabular-nums">{CREDITS_PLACEHOLDER}</span>
        </button>

        {/* Awards — real earned count (hidden at 0); opens the Awards page. */}
        <Link
          to={ProfileRoutes.awards()}
          aria-label={unlockedCount > 0 ? `Awards: ${unlockedCount}` : 'Awards'}
          className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
        >
          <AppIcons.awards aria-hidden className="size-5" />
          {unlockedCount > 0 && (
            <span className="text-base tabular-nums">{unlockedCount}</span>
          )}
        </Link>
      </div>
    </header>
  );
};
