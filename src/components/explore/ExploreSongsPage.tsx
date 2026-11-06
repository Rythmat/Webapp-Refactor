import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WHITE_PILL } from '@/components/kit/pills';
import {
  filterSongs,
  GENRE_LABELS,
  GENRE_OPTIONS,
  type SavedFilter,
} from '@/components/songLibrary/SongLibraryPage';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import { getAllSongs } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';
import { getCortexRecords, subscribeCortex } from '@/features/cortex/ledger';
import {
  byTitle,
  genreRows,
  popularSongs,
  SHELF_SIZE,
  songsInGenre,
} from '@/features/explore/exploreShelves';
import { useLearnCatalog } from '@/features/learn/catalog/useLearnCatalog';
import { songsFor } from '@/features/learn/dashboard/recommend';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import { useLearnProfile } from '@/features/learn/profile/useLearnProfile';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { LearnActivityRail } from '../learn/LearnActivityRail';
import { LearnInstrumentPill } from '../learn/LearnInstrumentPill';
import { SongFilterPills } from '../learn/LearnPromptPills';
import { songsReason, useTasteGenres } from '../learn/dashboard/useTasteGenres';
import {
  BackToLearn,
  EXPLORE_COLUMN,
  EXPLORE_GRID,
  ExploreHead,
} from './ExploreChrome';
import { SHELF_ITEM, Shelf } from './Shelf';
import { SongCard } from './SongCard';

// ── /explore/songs: the whole song library (owner, 2026-11-04) ─────────────
// In Suno's layout, as the hub: shelves of the best-known, theirs and a
// genre to a shelf. A search or a filter (?q= ?genre= ?difficulty=
// ?saved=, as the old /songs table read them) turns it into a grid of every
// song that fits, by title.

function SongRow({
  id,
  title,
  reason,
  seeAll,
  songs,
}: {
  id: string;
  title: string;
  reason?: string;
  seeAll?: string;
  songs: readonly Song[];
}) {
  if (!songs.length) return null;
  return (
    <Shelf
      id={id}
      title={title}
      reason={reason}
      seeAll={seeAll}
      count={songs.length}
    >
      {songs.map((song) => (
        <li key={song.id} className={SHELF_ITEM}>
          <SongCard song={song} />
        </li>
      ))}
    </Shelf>
  );
}

export function ExploreSongsPage() {
  const reduced = useReducedMotion() ?? false;
  const [params, setParams] = useSearchParams();
  // Read here, under the route's ContentGate: the store fills from the CDN.
  const songs = useMemo(() => getAllSongs(), []);
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const genreReady = useGenreReadiness(true);
  const topics = useLearnCatalog(genreReady);
  const records = useSyncExternalStore(subscribeCortex, getCortexRecords);
  const { profile } = useLearnProfile();
  const tasteGenres = useTasteGenres(topics, records);

  const filters = {
    search: params.get('q') ?? '',
    genre: params.get('genre') ?? 'all',
    difficulty: params.get('difficulty') ?? 'all',
    saved: (params.get('saved') as SavedFilter | null) ?? 'all',
  };
  const filtering =
    Boolean(filters.search.trim()) ||
    filters.genre !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.saved !== 'all';

  const results = useMemo(
    () =>
      filtering
        ? byTitle(
            filterSongs(
              songs,
              {
                ...filters,
                search: filters.search.trim(),
                sort: 'title',
              },
              savedIds,
            ),
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filtering,
      songs,
      savedIds,
      filters.search,
      filters.genre,
      filters.difficulty,
      filters.saved,
    ],
  );

  const shelves = useMemo(
    () => ({
      popular: popularSongs(songs),
      forYou: songsFor(songs, {
        tasteGenres,
        level: profile.level,
        records,
        limit: SHELF_SIZE,
      }),
      genres: genreRows(songs, GENRE_OPTIONS).map((genre) => ({
        ...genre,
        songs: songsInGenre(songs, genre.slug),
      })),
    }),
    [songs, tasteGenres, profile.level, records],
  );

  const clear = () => setParams(new URLSearchParams(), { replace: true });
  const genreName =
    filters.genre !== 'all' ? (GENRE_LABELS[filters.genre] ?? null) : null;

  return (
    <div
      data-testid="explore-songs"
      data-explore-view={results ? 'grid' : 'shelves'}
      className="relative isolate flex min-h-full w-full flex-col"
    >
      <ExploreHead placeholder="Search songs or artists">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
            <SongFilterPills />
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={SongRoutes.setLists()}
              // The tour's way in (navigateTour: open-set-lists).
              aria-label="Open Set Lists"
              className="flex h-10 items-center whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-4 text-[0.9375rem] leading-6 text-white outline-none backdrop-blur-md transition-colors duration-150 hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Set Lists
            </Link>
            <LearnInstrumentPill stay />
          </div>
        </div>
      </ExploreHead>

      <motion.div
        key={results ? 'grid' : 'shelves'}
        className={cn(EXPLORE_COLUMN, 'mt-2 flex flex-col gap-10 pb-14')}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="flex flex-col gap-2">
          <BackToLearn />
          <h1 className="text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight text-white">
            {genreName ?? 'Songs'}
          </h1>
        </div>

        {results ? (
          <section aria-live="polite" className="flex flex-col gap-5">
            <p className="text-[0.9375rem] text-daw-text-3">
              {results.length
                ? `${results.length} ${results.length === 1 ? 'song' : 'songs'}`
                : 'No songs match these filters.'}
            </p>
            {results.length > 0 ? (
              <ul className={EXPLORE_GRID}>
                {results.map((song) => (
                  <li key={song.id}>
                    <SongCard song={song} />
                  </li>
                ))}
              </ul>
            ) : (
              <button
                type="button"
                onClick={clear}
                className={cn(WHITE_PILL, 'self-start')}
              >
                Clear filters
              </button>
            )}
          </section>
        ) : (
          <>
            <SongRow
              id="popular"
              title="Popular songs"
              songs={shelves.popular}
            />
            <SongRow
              id="for-you"
              title="Songs for you"
              reason={songsReason(tasteGenres)}
              songs={shelves.forYou}
            />
            {shelves.genres.map((genre) => (
              <SongRow
                key={genre.slug}
                id={`genre-${genre.slug}`}
                title={genre.label}
                reason={`${genre.count} songs`}
                seeAll={SongRoutes.root(undefined, { genre: genre.slug })}
                songs={genre.songs}
              />
            ))}
          </>
        )}
      </motion.div>
      <LearnActivityRail />
    </div>
  );
}
