import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ARCADE_GAMES,
  artForGame,
  FEATURED_GAME,
  getGameByRoute,
  isGameFree,
  type ArcadeGame,
} from '@/components/Games/arcadeGames';
import { ArtCover } from '@/components/art/ArtCover';
import { SongThumb } from '@/components/explore/songArt';
import {
  GameRoutes,
  LearnRoutes,
  ProfileRoutes,
  SongRoutes,
} from '@/constants/routes';
import { getAllSongs } from '@/curriculum/data/songs';
import { useSongsReady } from '@/features/classroom/plan/useSongsReady';
import { getCortexRecords, subscribeCortex } from '@/features/cortex/ledger';
import {
  topicTitle,
  type CatalogCourse,
} from '@/features/learn/catalog/learnCatalog';
import { useLearnCatalog } from '@/features/learn/catalog/useLearnCatalog';
import {
  arcadePick,
  recommend,
  songsFor,
} from '@/features/learn/dashboard/recommend';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import { useLearnProfile } from '@/features/learn/profile/useLearnProfile';
import { useLearnChoice } from '@/features/learn/useInstrumentStore';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { useViewedSongsStore } from '@/features/songs/useViewedSongsStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import type { CoverSpec } from '@/lib/cover';
import { CourseCover } from '../cover/CourseCover';
import {
  COLUMN_ROWS,
  DiscoverColumn,
  type DiscoverRow,
} from './DiscoverColumn';
import { homeSongs, type HomeSongWhy } from './homeSongs';
import { songsReason, useTasteGenres } from './useTasteGenres';

const KIND_TITLE: Readonly<Record<CatalogCourse['kind'], string>> = {
  theory: 'Theory',
  genre: 'Genre',
  technique: 'Technique',
  audio: 'Audio',
};

/** A course's cover, filling a Discover tile or thumbnail. */
const coverArt = (cover: CoverSpec) => (
  <CourseCover
    cover={cover}
    stack={false}
    className="size-full [&>span]:rounded-none [&>span]:ring-0"
  />
);

/** A course as a Discover row: opens its next stop, or the course. */
function courseRow(course: CatalogCourse, meta: string): DiscoverRow {
  const next = course.next;
  return {
    id: course.id,
    to: next && !next.locked ? next.route : course.route,
    thumb: coverArt(course.cover),
    title: course.title,
    subtitle:
      course.topic === 'audio'
        ? 'Audio'
        : `${topicTitle(course.topic)} · ${KIND_TITLE[course.kind]}`,
    meta,
  };
}

/**
 * Three columns in Suno Discover's layout (owner, 2026-11-04): Learn (what
 * to do next, from the student's answers and history), Arcade (owner,
 * 2026-11-05: the games they played last, then one picked for them, then the
 * featured) and Songs (owner, 2026-11-11: the songs they came back to, then
 * ones picked for them, then the best known; Progress moved up beside the
 * Studio card, HomeProgressColumn). On Home, where the instrument picker was
 * (owner, 2026-11-04). Fills the width it's given; three across from 46rem,
 * stacked below.
 */
export function LearnDiscoverColumns() {
  const choice = useLearnChoice();
  const genreReady = useGenreReadiness(true);
  const topics = useLearnCatalog(genreReady);
  const { profile } = useLearnProfile();
  const records = useSyncExternalStore(subscribeCortex, getCortexRecords);
  const { isPremium } = useIsPremium();
  // Fixed for the visit, so nothing reshuffles under the student.
  const [nowMs] = useState(() => Date.now());
  const tasteGenres = useTasteGenres(topics, records);

  const recs = useMemo(
    () =>
      recommend({
        topics,
        profile,
        fallbackTopic: choice,
        tasteGenres,
        records,
        nowMs,
      }),
    [topics, profile, choice, tasteGenres, records, nowMs],
  );

  // The lead, then courses from the suggested rows, each with why.
  const forYou = useMemo<DiscoverRow[]>(() => {
    const rows: DiscoverRow[] = [];
    if (recs.lead) {
      const { course, kind } = recs.lead;
      rows.push(
        courseRow(
          course,
          kind === 'continue' && course.next
            ? `Next: ${course.next.title}`
            : 'Start here',
        ),
      );
    }
    // Round the rows, one course each, until the column's four are filled.
    for (let pass = 0; pass < 4 && rows.length < COLUMN_ROWS; pass += 1) {
      for (const shelf of recs.shelves) {
        if (rows.length >= COLUMN_ROWS) break;
        const course = shelf.courses.find(
          (c) => !rows.some((row) => row.id === c.id),
        );
        if (course) rows.push(courseRow(course, shelf.reason));
      }
    }
    return rows.slice(0, COLUMN_ROWS);
  }, [recs]);

  // The Arcade: the games they played last (their own history), then one
  // picked for their instrument and goals, then the featured games.
  const arcadeRows = useMemo<DiscoverRow[]>(() => {
    const played = Object.entries(records)
      .filter(([id]) => id.startsWith('game:'))
      .sort((a, b) => b[1][1] - a[1][1])
      .map(([id]) => getGameByRoute(id.slice('game:'.length)))
      .filter((g): g is ArcadeGame => Boolean(g));
    const suggested = arcadePick({
      primary: recs.primary,
      goals: profile.goals ?? [],
      isPremium,
      records,
    });
    const order = [
      ...played,
      ...(suggested ? [suggested] : []),
      FEATURED_GAME,
      ...ARCADE_GAMES,
    ];
    const seen = new Set<string>();
    const games = order.filter((g) => {
      if (!g.route || seen.has(g.route)) return false;
      seen.add(g.route);
      return true;
    });
    return games.slice(0, COLUMN_ROWS).map((game) => {
      const locked = !isPremium && !isGameFree(game);
      const route = GameRoutes[game.route!] as (p?: void) => string;
      const art = artForGame(game);
      return {
        id: `game:${game.route}`,
        to: locked ? ProfileRoutes.plan() : route(),
        thumb: (
          <ArtCover
            seed={art.seed}
            kind={art.kind}
            variant={art.variant}
            mode={art.mode}
            palette={art.palette}
            aspect={1}
            motion="none"
            density="thumb"
          />
        ),
        title: game.title,
        subtitle: game.category,
        meta: locked
          ? 'Premium'
          : played.includes(game)
            ? 'Jump back in'
            : game === suggested
              ? 'Picked for you'
              : game.blurb,
      };
    });
  }, [records, recs.primary, profile.goals, isPremium]);

  // Songs: the library loads on its own; the column fills in when it lands.
  const songsReady = useSongsReady();
  const savedAt = useSavedSongsStore((s) => s.savedAt);
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const viewedAt = useViewedSongsStore((s) => s.viewedAt);
  const songRows = useMemo<DiscoverRow[]>(() => {
    if (!songsReady) return [];
    const songs = getAllSongs();
    // Saved times of songs still saved (unsaving keeps no row).
    const saved = Object.fromEntries(
      Object.entries(savedAt).filter(([id]) => savedIds[id]),
    );
    const picked = songsFor(songs, {
      tasteGenres,
      level: profile.level,
      records,
      limit: COLUMN_ROWS,
    });
    const why: Record<HomeSongWhy, string> = {
      saved: 'Saved',
      back: 'Jump back in',
      picked: songsReason(tasteGenres),
      popular: 'Popular',
    };
    return homeSongs({
      songs,
      savedAt: saved,
      viewedAt,
      picked,
      limit: COLUMN_ROWS,
    }).map(({ song, why: reason }) => ({
      id: `song:${song.id}`,
      to: SongRoutes.song({ songId: song.id }),
      thumb: <SongThumb song={song} />,
      title: song.title,
      subtitle: song.artist,
      meta: why[reason],
    }));
  }, [
    songsReady,
    savedAt,
    savedIds,
    viewedAt,
    tasteGenres,
    profile.level,
    records,
  ]);

  return (
    <div className="@container w-full" data-learn-columns>
      <div className="grid grid-cols-1 gap-6 @[46rem]:grid-cols-3">
        <DiscoverColumn
          title="Learn"
          icon="/icons/learn-icon.svg"
          rows={forYou}
          empty="Tell us what you play to get picks."
          seeMore={{ to: LearnRoutes.root() }}
        />
        <DiscoverColumn
          title="Arcade"
          icon="/icons/arcade-icon.svg"
          rows={arcadeRows}
          seeMore={{ to: GameRoutes.root() }}
        />
        <DiscoverColumn
          title="Songs"
          icon="/icons/songs-icon.svg"
          rows={songRows}
          empty={songsReady ? 'No songs yet.' : 'Loading songs…'}
          seeMore={{ to: SongRoutes.root() }}
        />
      </div>
    </div>
  );
}
