import { RotateCcw, Sparkles } from 'lucide-react';
import { type FC, Fragment, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WelcomeHeader } from '@/components/ClassroomLayout/dashboard/WelcomeHeader';
import { GameRoutes, ProfileRoutes } from '@/constants/routes';
import { useArcadeActivityStore } from '@/features/arcade/useArcadeActivityStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import { ARCADE_ROOT } from './arcadeChrome';
import {
  type ArcadeGame,
  FEATURED_GAME,
  gamesByCategory,
  getGameByRoute,
  isGameFree,
} from './arcadeGames';
import { ArcadeHero } from './dashboard/ArcadeHero';
import { ArcadeShelf } from './dashboard/ArcadeShelf';
import { ARCADE_TABS, ArcadeTabBar } from './dashboard/ArcadeTabBar';
import '@/components/learn/learn.css';

// Same section divider as the Home/Studio/Globe dashboards.
const Divider = () => (
  <hr className="border-0 border-t border-white/15" role="separator" />
);

/**
 * The Arcade hub — a game-launcher dashboard: a featured-game hero spotlight, a
 * player-stats strip, a "Jump back in" / "Start here" row, then category
 * shelves. Reuses the app's HexAvatar/HexWave art + dark-glass system so it
 * reads as a peer of the Home/Learn dashboards.
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

  // "Jump back in" from real launch history; fall back to the free games as a
  // "Start here" row for players who haven't launched anything yet.
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

  return (
    <div className={`flex h-full flex-col ${ARCADE_ROOT}`}>
      {/* `.learn-root` otherwise forces Inter here; override to the app's
          Glacial Indifference for the whole Arcade (matches the Home/Studio
          dashboards). */}
      <div
        className="learn-root flex-1 overflow-y-auto"
        style={{
          fontFamily: "'Glacial Indifference', 'Haskoy', system-ui, sans-serif",
        }}
      >
        <div className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10">
          <ArcadeTabBar />

          {activeCategory ? (
            <ArcadeShelf
              title={activeCategory}
              games={
                gamesByCategory.find((c) => c.category === activeCategory)
                  ?.games ?? []
              }
              isPremium={isPremium}
              onLaunch={launch}
              variant="dashboard"
            />
          ) : (
            <>
              <WelcomeHeader format={(name) => `${name}'s Arcade`} />

              <ArcadeHero
                game={FEATURED_GAME}
                locked={featuredLocked}
                onPlay={() => launch(FEATURED_GAME)}
              />

              {recentGames.length > 0 ? (
                <ArcadeShelf
                  title="Jump back in"
                  games={recentGames}
                  isPremium={isPremium}
                  onLaunch={launch}
                  eyebrowIcon={RotateCcw}
                  recency={playedAt}
                  variant="dashboard"
                />
              ) : (
                <ArcadeShelf
                  title="Start here"
                  games={startHere}
                  isPremium={isPremium}
                  onLaunch={launch}
                  eyebrowIcon={Sparkles}
                  variant="dashboard"
                />
              )}

              {shelves.map(({ category, games }) => (
                <Fragment key={category}>
                  <Divider />
                  <ArcadeShelf
                    title={category}
                    games={games}
                    isPremium={isPremium}
                    onLaunch={launch}
                    variant="dashboard"
                  />
                </Fragment>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
