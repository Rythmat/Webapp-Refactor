import { useMemo } from 'react';
import { useStudioSession } from '@/components/ClassroomLayout/home/useStudioSession';
import { getGameByRoute } from '@/components/Games/arcadeGames';
import {
  lastGlobeStopHref,
  useLastGlobeStop,
  type LastGlobeStop,
} from '@/components/atlas/navigation/lastGlobeStop';
import { GameRoutes, LibraryRoutes } from '@/constants/routes';
import { useArcadeActivityStore } from '@/features/arcade/useArcadeActivityStore';
import {
  homeLibraryCards,
  toProjectEntries,
  type LibraryItem,
  type ProjectEntry,
} from '@/features/library/libraryItems';
import { useLibraryMeta } from '@/features/library/libraryLocalMeta';
import { studioHrefOf } from '@/features/library/libraryTypes';
import { useLibraryItems } from '@/features/library/useLibraryItems';
import {
  useRecentLessons,
  useSavedSongsActivity,
  useViewedSongsActivity,
} from '@/hooks/data/useLearnActivity';
import type { ActivityItem } from '@/hooks/data/useRecentActivity';
import type { ProjectPlaceId } from './projectPlaces';

// ── Where each person left off, in each place (owner, 2026-11-12) ─────────
// The Independent Project's six boxes: the person's own last lesson, song,
// project, session, Globe place and game, each opening right there. Read
// from what the app already keeps for them (this device's, or their
// account's); a place they haven't used yet has none, and its box invites
// them in instead.

export interface PlaceSummary {
  title: string;
  /** The line under it: progress, the artist, how many sessions… */
  detail?: string;
  /** Where it opens: the very thing, not the place's front page. */
  href: string;
}

export type PlaceSummaries = Readonly<
  Record<ProjectPlaceId, PlaceSummary | null>
>;

/** What a box says when its place has nothing of the person's yet. */
export const PLACE_INVITATION: Readonly<Record<ProjectPlaceId, string>> = {
  learn: 'Start a lesson',
  songs: 'Find a song',
  library: 'Start a project',
  studio: 'Start a session',
  globe: 'Explore the map',
  arcade: 'Play a game',
};

const newest = <T>(items: readonly T[], at: (item: T) => number): T | null =>
  items.reduce<T | null>(
    (best, item) => (best === null || at(item) > at(best) ? item : best),
    null,
  );

const fromActivity = (item: ActivityItem | null): PlaceSummary | null =>
  item
    ? {
        title: item.title,
        ...(item.subtitle ? { detail: item.subtitle } : {}),
        href: item.route,
      }
    : null;

/** The lesson last worked on, with how far along it is. */
export const learnSummary = (lessons: readonly ActivityItem[]) =>
  fromActivity(newest(lessons, (l) => l.touchedAt));

/** The song last looked at or saved, with its artist. */
export const songsSummary = (
  saved: readonly ActivityItem[],
  viewed: readonly ActivityItem[],
) => fromActivity(newest([...saved, ...viewed], (s) => s.touchedAt));

/** The project (a folder of sessions) last changed, else the last session. */
export const librarySummary = (
  entries: readonly ProjectEntry[],
  items: readonly LibraryItem[],
): PlaceSummary | null => {
  const [card] = homeLibraryCards(entries, items, 1);
  if (!card) return null;
  if (card.kind === 'project') {
    const n = card.entry.sessions.length;
    return {
      title: card.entry.name,
      detail: `${n} ${n === 1 ? 'session' : 'sessions'}`,
      href: LibraryRoutes.project({ projectId: card.entry.project.id }),
    };
  }
  return {
    title: card.item.name,
    detail: 'Session',
    href: studioHrefOf(card.item.source),
  };
};

/**
 * The Studio session to carry on with: the one the Studio itself would
 * continue, else the newest session in their Library.
 */
export const studioSummary = (
  session: ActivityItem | null,
  items: readonly LibraryItem[] = [],
): PlaceSummary | null => {
  if (session)
    return {
      title: session.title,
      detail: 'Last session',
      href: session.route,
    };
  const latest = newest(items, (i) => i.updatedAt);
  return latest
    ? {
        title: latest.name,
        detail: 'Last session',
        href: studioHrefOf(latest.source),
      }
    : null;
};

/** The Globe's last place or tour. */
export const globeSummary = (
  stop: LastGlobeStop | null,
): PlaceSummary | null =>
  stop
    ? {
        title: stop.title,
        detail: 'Last visited',
        href: lastGlobeStopHref(stop),
      }
    : null;

/** The game last played, and how often. */
export const arcadeSummary = (
  playedAt: Readonly<Record<string, number>>,
  playCount: Readonly<Record<string, number>>,
): PlaceSummary | null => {
  const played = Object.entries(playedAt)
    .sort((a, b) => b[1] - a[1])
    .map(([route]) => ({ route, game: getGameByRoute(route) }))
    .find(({ game }) => game?.route);
  if (!played?.game?.route) return null;
  const build = GameRoutes[played.game.route] as unknown;
  if (typeof build !== 'function') return null;
  const n = playCount[played.route] ?? 1;
  return {
    title: played.game.title,
    detail: `Played ${n} ${n === 1 ? 'time' : 'times'}`,
    href: (build as () => string)(),
  };
};

/**
 * The person's own summaries, one per place. Reads their data: render it
 * only where the screen is theirs (Present, a student's device), never on
 * the room's screen or in a thumbnail.
 */
export const usePlaceSummaries = (): PlaceSummaries => {
  const lessons = useRecentLessons(0);
  const saved = useSavedSongsActivity();
  const viewed = useViewedSongsActivity();
  const { items } = useLibraryItems();
  const meta = useLibraryMeta();
  const session = useStudioSession();
  const globe = useLastGlobeStop();
  const playedAt = useArcadeActivityStore((s) => s.playedAt);
  const playCount = useArcadeActivityStore((s) => s.playCount);

  return useMemo(
    () => ({
      learn: learnSummary(lessons),
      songs: songsSummary(saved, viewed),
      library: librarySummary(toProjectEntries(meta.projects, items), items),
      studio: studioSummary(session, items),
      globe: globeSummary(globe),
      arcade: arcadeSummary(playedAt, playCount),
    }),
    [
      lessons,
      saved,
      viewed,
      items,
      meta.projects,
      session,
      globe,
      playedAt,
      playCount,
    ],
  );
};
