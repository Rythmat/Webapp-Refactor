import {
  type CSSProperties,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActivityRail } from '@/components/ClassroomLayout/home/ActivityRail';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { HomePromptBar } from '@/components/ClassroomLayout/home/HomePromptBar';
import { ChoicePills } from '@/components/learn/LearnPromptPills';
import { PerStudent } from '@/components/ui/PerStudent';
import { cn } from '@/components/utilities';
import { GameRoutes, ProfileRoutes } from '@/constants/routes';
import { useArcadeActivityStore } from '@/features/arcade/useArcadeActivityStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import { arcadeFigures, FEATURED_FIGURES } from './arcadeFigures';
import {
  type ArcadeCategory,
  type ArcadeGame,
  FEATURED_GAME,
  gamesByCategory,
  getGameByRoute,
  isGameFree,
} from './arcadeGames';
import { CATEGORY_GLOW, zoneAt } from './arcadeGlow';
import { arcadeSuggestionsFor } from './arcadePromptSuggestions';
import { ArcadeHero } from './dashboard/ArcadeHero';
import { ArcadeShelf } from './dashboard/ArcadeShelf';
import { ARCADE_TABS, ArcadeTabBar } from './dashboard/ArcadeTabBar';

/** The bar's pills: the categories, as the tabs name them. */
const CATEGORY_PILLS = ARCADE_TABS.map((t) => ({
  id: t.category,
  label: t.label,
}));

/**
 * The Arcade, laid out as the Learn page (owner, 2026-10-28: "match
 * /learn"): Home's glow behind; centred at the top, the Arcade icon and the
 * categories (ArcadeTabBar); under it, centred, Home's prompt bar with the
 * Arcade's own prompts, each opening a game, its pills narrowing them to a
 * category (the page's own chosen on a category's tab). Then, on the whole
 * Arcade, the featured game, a "Jump back in" row (once anything has been
 * played), a "Start here" row and a
 * shelf per category; on a category's tab, its games. Every game is its
 * generative cover (lib/art). Home's activity rail pinned to the bottom.
 */
export const ArcadeInlet: FC = () => {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const recordPlay = useArcadeActivityStore((s) => s.recordPlay);
  // Subscribe to the stable `playedAt` object (not a fresh-array selector, which
  // would trip useSyncExternalStore's cached-snapshot check) and derive from it.
  const playedAt = useArcadeActivityStore((s) => s.playedAt);

  const [params] = useSearchParams();
  const tab = params.get('tab') ?? '';
  const activeCategory =
    ARCADE_TABS.find((t) => t.slug === tab)?.category ?? null;

  // The category the bar's pills narrow its prompts to: the tab's own on a
  // category's page, none (every game) on the whole Arcade.
  const [pill, setPill] = useState<ArcadeCategory | null>(activeCategory);
  useEffect(() => setPill(activeCategory), [activeCategory]);
  const suggestions = useMemo(() => arcadeSuggestionsFor(pill), [pill]);
  // The glow's two colours, for the featured card to wear.
  const [glow, setGlow] = useState<readonly [string, string]>();
  // The first colours land at once; only later changes ease (else every
  // card would fade in from nothing over the glow's 5s).
  const [easing, setEasing] = useState(false);
  useEffect(() => {
    if (glow && !easing) {
      const id = requestAnimationFrame(() => setEasing(true));
      return () => cancelAnimationFrame(id);
    }
  }, [glow, easing]);

  // The kind of game scrolled to (owner, 2026-10-28): the glow follows the
  // page down and takes that kind's colours (CATEGORY_GLOW) once its shelf
  // passes half way up the screen; above the first shelf it wanders as on
  // Home. A category's tab is that kind throughout.
  const page = useRef<HTMLDivElement>(null);
  const [scrolledZone, setScrolledZone] = useState<ArcadeCategory | null>(null);
  useEffect(() => {
    const root = page.current;
    if (activeCategory || !root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const shelves = Array.from(
        root.querySelectorAll<HTMLElement>('[data-arcade-zone]'),
        (el) => ({
          zone: el.dataset.arcadeZone as ArcadeCategory,
          top: el.getBoundingClientRect().top,
        }),
      );
      setScrolledZone(zoneAt(shelves, window.innerHeight * 0.5));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    // The page scrolls inside the app's panel: scroll doesn't bubble, so
    // listen in the capture phase.
    window.addEventListener('scroll', schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [activeCategory]);
  const zone = activeCategory ?? scrolledZone;

  // Whether the page has scrolled under the pinned head.
  const top = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = top.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) =>
      setStuck(!entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Scrolling from one kind to the next eases quickly (1.5s), and so does
  // the way back to the wandering colours; then they wander at Home's 5s.
  const [quick, setQuick] = useState(false);
  useEffect(() => {
    setQuick(true);
    if (zone) return;
    const id = window.setTimeout(() => setQuick(false), 1600);
    return () => window.clearTimeout(id);
  }, [zone]);
  const ease = quick ? '1.5s' : '5s';

  const launch = useCallback(
    (game: ArcadeGame) => {
      // Premium game the user can't access → drive the subscribe flow (mirrors
      // LockedFeatureOverlay). Otherwise record the launch and open the game.
      if (!isPremium && !isGameFree(game)) {
        navigate(ProfileRoutes.plan.definition);
        return;
      }
      if (!game.route) return;
      recordPlay(game.route);
      const build = GameRoutes[game.route] as (p?: void) => string;
      navigate(build());
    },
    [isPremium, navigate, recordPlay],
  );

  const featuredLocked = !isPremium && !isGameFree(FEATURED_GAME);

  // "Jump back in" from real launch history, and the free games as a
  // "Start here" row for everyone.
  const recentGames = useMemo(
    () =>
      Object.entries(playedAt)
        .sort((a, b) => b[1] - a[1])
        .map(([route]) => getGameByRoute(route))
        .filter((g): g is ArcadeGame => g != null && g !== FEATURED_GAME)
        .slice(0, 6),
    [playedAt],
  );
  const startHere = gamesByCategory
    .flatMap((c) => c.games)
    .filter((g) => isGameFree(g) && g !== FEATURED_GAME);

  // Category shelves — drop the featured game (it's the hero) and any category
  // that empties out as a result (e.g. Multiplayer, which is just Jam Room).
  const shelves = gamesByCategory
    .map((c) => ({
      category: c.category,
      games: c.games.filter((g) => g !== FEATURED_GAME),
    }))
    .filter((c) => c.games.length > 0);

  // Every card's figures, none shared by two cards on the page.
  const activeGames = activeCategory
    ? (gamesByCategory.find((c) => c.category === activeCategory)?.games ?? [])
    : [];
  const figures = useMemo(
    () =>
      activeCategory
        ? arcadeFigures({
            shelves: [{ row: activeCategory, games: activeGames }],
          })
        : arcadeFigures({
            featured: FEATURED_GAME,
            shelves: shelves.map((c) => ({ row: c.category, games: c.games })),
            again: [
              { row: 'Jump back in', games: recentGames },
              { row: 'Start here', games: startHere },
            ],
          }),
    // The rows are derived from these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCategory, recentGames],
  );

  return (
    // `isolate`, so the glow's -z-10 sits behind everything here but in
    // front of the panel's background (as on Home and Learn).
    <div
      ref={page}
      data-testid="arcade-page"
      data-arcade-glow={zone ?? undefined}
      className="relative isolate flex min-h-full w-full flex-col"
    >
      {/* The glow stays at the top of the screen as the page scrolls under
          it (sticky, no height of its own). */}
      {/* Pinned on the same line as the head below (both 8px up, both
          stuck 8px up), so the head's copy of the glow lies exactly on it. */}
      <div className="pointer-events-none sticky -top-2 -z-10 -mt-2 h-0">
        <HomeGlow
          colors={zone ? CATEGORY_GLOW[zone] : undefined}
          ease={ease}
          onColors={setGlow}
          className="top-0"
        />
      </div>
      {/* Seen while the page is at its top; once it scrolls out, the
          pinned head below draws its backdrop. */}
      <div ref={top} aria-hidden className="h-0" />
      {/* The head, pinned to the top of the panel as the page scrolls
          (owner, 2026-10-28): the games pass under it, blurred, the glow
          showing through. The margins take it to the panel's edges, past
          the scroll area's 8px padding, as the activity rail below does. */}
      <div
        data-arcade-head
        data-stuck={stuck ? '' : undefined}
        className="sticky -top-2 z-20 -mx-2 flex shrink-0 flex-col items-center px-4 pb-6 pt-4"
      >
        {/* Its backdrop once the page scrolls: the panel's own colour with
            the glow drawn again on it (same colours, and the same drift,
            the two started together), so it reads as the glow behind while
            hiding the games passing under it; its foot fades them in. */}
        <div
          aria-hidden
          data-arcade-head-backdrop
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#101012] transition-opacity duration-200 [mask-image:linear-gradient(to_bottom,#000_calc(100%-2rem),transparent)]',
            stuck ? 'opacity-100' : 'opacity-0',
          )}
        >
          {glow && (
            <HomeGlow colors={glow} ease={ease} className="inset-x-0 top-0" />
          )}
        </div>
        {/* The Arcade's navigation, centred at the top. */}
        <ArcadeTabBar />
        {/* The prompt bar under it, centred, as on every Learn page. */}
        <div className="mt-6 flex w-full justify-center">
          <HomePromptBar
            suggestions={suggestions}
            showTargets={false}
            pills={
              <ChoicePills
                label="Suggest"
                options={CATEGORY_PILLS}
                value={pill}
                onChange={setPill}
              />
            }
          />
        </div>
      </div>

      {/* The glow's colours for every card below (the featured one and
          each game's), easing as the glow eases. */}
      <div
        className="relative mx-auto mt-4 flex w-full max-w-[90rem] flex-1 flex-col gap-8 px-4 pb-12 md:px-8"
        style={
          glow
            ? ({
                '--home-glow-a': glow[0],
                '--home-glow-b': glow[1],
                transition: easing
                  ? `--home-glow-a ${ease} ease-in-out, --home-glow-b ${ease} ease-in-out`
                  : 'none',
              } as CSSProperties)
            : undefined
        }
      >
        {activeCategory ? (
          <ArcadeShelf
            title={activeCategory}
            games={activeGames}
            isPremium={isPremium}
            onLaunch={launch}
            figures={figures}
          />
        ) : (
          <>
            <ArcadeHero
              game={FEATURED_GAME}
              locked={featuredLocked}
              onPlay={() => launch(FEATURED_GAME)}
              glow={glow}
              figures={figures.get(FEATURED_FIGURES)}
            />

            {/* "Jump back in" once something has been played; "Start
                here" always (owner, 2026-10-28), under it. */}
            {recentGames.length > 0 && (
              <ArcadeShelf
                title="Jump back in"
                games={recentGames}
                isPremium={isPremium}
                onLaunch={launch}
                recency={playedAt}
                figures={figures}
              />
            )}
            <ArcadeShelf
              title="Start here"
              games={startHere}
              isPremium={isPremium}
              onLaunch={launch}
              figures={figures}
            />

            {shelves.map(({ category, games }) => (
              <ArcadeShelf
                key={category}
                title={category}
                games={games}
                isPremium={isPremium}
                onLaunch={launch}
                zone={category}
                figures={figures}
                divided
              />
            ))}
          </>
        )}
      </div>

      {/* Pinned to the bottom, as on Home and Learn: where you left off.
          The negative margins and the -8px stick take it to the panel's
          edges, past the scroll area's 8px padding. */}
      <div className="sticky -bottom-2 z-20 -mx-2 -mb-2 mt-auto shrink-0">
        <PerStudent
          label="Recent activity"
          minHeight={72}
          className="rounded-none bg-[#0c0c0e]"
        >
          <ActivityRail />
        </PerStudent>
      </div>
    </div>
  );
};
