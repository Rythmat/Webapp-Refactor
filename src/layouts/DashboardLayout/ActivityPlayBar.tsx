import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActivityDots,
  ActivityNowShowing,
  useActivityCycle,
} from '@/components/ClassroomLayout/home/ActivityRail';
import { useHomeActivity } from '@/components/ClassroomLayout/home/useHomeActivity';
import { PerStudent } from '@/components/ui/PerStudent';
import { cn } from '@/components/utilities';
import {
  GameRoutes,
  LearnRoutes,
  LibraryRoutes,
  ProfileRoutes,
  SongRoutes,
} from '@/constants/routes';
import { mixItem, sourceOfStudioHref } from '@/features/library/libraryTypes';
import {
  PlayerExtras,
  PlayerNowPlaying,
  PlayerScrubber,
  PlayerTransport,
} from '@/features/library/player/PlayerParts';
import {
  playerActive,
  usePlayer,
} from '@/features/library/player/libraryPlayer';

/** The pages with Recent activity under them: Home, Learn (and its Songs)
 *  and the Arcade (owner, 2026-11-10), their landing pages only; and the
 *  Library, every page of it (owner, 2026-11-11). */
const PLAY_BAR_PATHS = [
  ProfileRoutes.root(),
  LearnRoutes.root(),
  SongRoutes.root(),
  GameRoutes.root(),
  LibraryRoutes.root(),
];

export function isPlayBarPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return (
    PLAY_BAR_PATHS.includes(path) || path.startsWith(`${LibraryRoutes.root()}/`)
  );
}

/**
 * Whether the bar shows: on its pages, and on every page while the player
 * holds something (the music carries on from page to page, as Samply's).
 * The pages that take the whole window (the Studio editor, the lesson
 * players) never show it; the caller leaves them out.
 */
export function shouldShowPlayBar(
  pathname: string,
  playerHolds: boolean,
): boolean {
  return playerHolds || isPlayBarPath(pathname);
}

/**
 * Recent activity as Suno's play bar (owner, 2026-11-10, measured on
 * suno.com/discover), a tenth smaller (owner): 57.6px across the whole
 * window, under the side rail and the page alike, so the rail ends above
 * it; in the darker black the panels sit on, 8px from the window's edges and
 * 8px under the panels, its content 21.6px in. With no activity and nothing
 * to play there's no bar, and the rail runs to the bottom.
 *
 * The player lives in it too (owner, 2026-11-11: one bar, not two): while
 * it holds something, its cover and names stand on the left in the
 * activity's place, its controls and waveform in the middle, the queue and
 * the volume on the right. With nothing in it, a Studio project showing in
 * Recent activity can be played from the bar; a lesson or a song shows as
 * it always has.
 */
export function ActivityPlayBar() {
  return (
    <div
      data-activity-play-bar
      className="shrink-0 px-[0.455rem] pb-[0.455rem] [&:not(:has(aside))]:hidden"
    >
      <PerStudent label="Recent activity" minHeight={58}>
        <PlayBar />
      </PerStudent>
    </div>
  );
}

function PlayBar() {
  const cycle = useActivityCycle(useHomeActivity());
  const active = usePlayer(playerActive);
  const navigate = useNavigate();
  const showing = cycle.item;

  // The activity showing, as something to play, when it is a project.
  const playable = useMemo(() => {
    if (!showing || showing.kind !== 'project') return null;
    const source = sourceOfStudioHref(showing.route);
    return source ? mixItem(source, showing.title) : null;
  }, [showing]);

  if (!showing && !active) return null;
  const withPlayer = active || playable !== null;

  return (
    <aside
      aria-label={active ? 'Player' : 'Continue where you left off'}
      className="flex h-[3.273rem] w-full shrink-0 items-center justify-between gap-[0.9rem] px-[1.227rem]"
      {...cycle.holdProps}
    >
      <div
        className={cn(
          'min-w-0',
          withPlayer ? 'w-[28%] max-w-[18rem] shrink-0' : 'flex-1',
        )}
      >
        {active ? (
          <PlayerNowPlaying />
        ) : showing ? (
          <ActivityNowShowing item={showing} playBar />
        ) : null}
      </div>

      {withPlayer && (
        <div className="flex min-w-0 flex-1 items-center justify-center gap-[0.9rem]">
          <PlayerTransport fallback={playable} />
          {active && (
            <PlayerScrubber className="hidden max-w-[40rem] sm:flex" />
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-3">
        {active && <PlayerExtras />}
        <ActivityDots
          items={cycle.items}
          index={cycle.index}
          // While the player holds the left, a dot opens its activity.
          onPick={(n) =>
            active ? navigate(cycle.items[n].route) : cycle.setIndex(n)
          }
          playBar
        />
      </div>
    </aside>
  );
}
