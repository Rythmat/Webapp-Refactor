import { motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, List, type LucideIcon, Rows3 } from 'lucide-react';
import { useMemo, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TAB, TAB_ACTIVE } from '@/components/kit/libraryLook';
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
  artistKey,
  artistRows,
  byTitle,
  easySongs,
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
import { LearnInstrumentPill } from '../learn/LearnInstrumentPill';
import { SongFilterPills } from '../learn/LearnPromptPills';
import { songsReason, useTasteGenres } from '../learn/dashboard/useTasteGenres';
import { GenreOrderContext } from '../learn/sigil/genreOrder';
import { ArtistCard, ArtistListRow, COMPACT_LIST } from './ArtistCard';
import { ArtistPage } from './ArtistPage';
import { EXPLORE_COLUMN, ExploreNavBar, LearnGrid } from './ExploreChrome';
import { ExploreSearchBar } from './ExploreSearchBar';
import { GenreCard } from './GenreCard';
import { FIT_ITEM, Shelf } from './Shelf';
import { SongCard } from './SongCard';

// ── /songs: the whole song library (owner, 2026-11-04) ─────────────────────
// Learn's page with the songs and none of the courses (owner, 2026-11-11):
// its head, "Songs" over the filters in the tabs' place, then a "Best Of"
// for each genre, a genre to a shelf, and last the shelves Learn had
// (theirs, the best-known, easy songs). A search or a filter (?q= ?genre=
// ?difficulty= ?saved=, as the old /songs table read them) turns it into a
// grid of every song that fits, by title.
//
// Three views (owner, 2026-11-11), Learn's tabs under the title: Genre (the
// shelves, the default), Title (every song that fits, A–Z) and Artist
// (every artist A–Z, as cards, as Samply playlists — ArtistPage — or as
// slim lines, the layout toggle's; a name opens theirs alone:
// ?view=artist&artist=<name>).

type SongsView = 'artist' | 'title' | 'genre';

// Genre first, the page's own view (owner, 2026-11-11).
const VIEWS: readonly { id: SongsView; label: string }[] = [
  { id: 'genre', label: 'Genre' },
  { id: 'artist', label: 'Artist' },
  { id: 'title', label: 'Title' },
];

const viewOf = (word: string | null): SongsView =>
  word === 'artist' || word === 'title' ? word : 'genre';

// The Artist tab's layouts (owner, 2026-11-11), a toggle at the top
// (?layout=): their cards in a grid, every artist's track list (the
// default), or one slim line to an artist.
type ArtistLayout = 'grid' | 'tracks' | 'compact';

const LAYOUTS: readonly {
  id: ArtistLayout;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'tracks', label: 'Tracks', icon: Rows3 },
  { id: 'compact', label: 'Compact', icon: List },
];

const layoutOf = (word: string | null): ArtistLayout =>
  word === 'grid' || word === 'compact' ? word : 'tracks';

/** The column the track lists stand in, Samply's 700px. */
const ARTIST_COLUMN = 'mx-auto w-full max-w-[39.773rem]';

function SongShelf({
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
      fit
      id={id}
      title={title}
      reason={reason}
      seeAll={seeAll}
      count={songs.length}
    >
      {songs.map((song) => (
        <li key={song.id} className={FIT_ITEM}>
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
  const view = viewOf(params.get('view'));
  const layout = layoutOf(params.get('layout'));
  const artistAsked = view === 'artist' ? params.get('artist') : null;

  // Every song that fits the filters, by title.
  const matching = useMemo(
    () =>
      byTitle(
        filterSongs(
          songs,
          {
            ...filters,
            search: filters.search.trim(),
            sort: 'title',
          },
          savedIds,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      songs,
      savedIds,
      filters.search,
      filters.genre,
      filters.difficulty,
      filters.saved,
    ],
  );
  const artists = useMemo(
    () => (view === 'artist' ? artistRows(matching) : []),
    [view, matching],
  );
  const artist = artistAsked
    ? (artists.find((row) => row.key === artistKey(artistAsked)) ?? null)
    : null;

  // What the page shows: an artist's page, every artist's in a list, a grid
  // of songs, or the shelves. An artist the filters leave without a song shows
  // the empty grid, with its Clear filters.
  const results: Song[] | null =
    view === 'artist'
      ? artistAsked && !artist
        ? []
        : null
      : view === 'title' || filtering
        ? matching
        : null;
  const shown = artist
    ? 'artist'
    : view === 'artist' && !artistAsked
      ? 'artists'
      : results
        ? 'grid'
        : 'shelves';

  const shelves = useMemo(
    () => ({
      popular: popularSongs(songs),
      easy: easySongs(songs),
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

  // The Best Of row's order: a genre's tile takes its colours from it, as
  // its course's sigil does on Learn (owner, 2026-11-05).
  const genreOrder = useMemo(
    () => shelves.genres.map((genre) => genre.slug),
    [shelves.genres],
  );

  /** /songs in a view: the filters kept, a genre's or an artist's page
   *  left. */
  const hrefFor = (next: SongsView, artistName?: string) => {
    const kept = new URLSearchParams(params);
    kept.delete('genre');
    kept.delete('artist');
    if (next !== 'artist') kept.delete('layout');
    if (next === 'genre') kept.delete('view');
    else kept.set('view', next);
    if (artistName) kept.set('artist', artistName);
    const query = kept.toString();
    return query ? `${SongRoutes.root()}?${query}` : SongRoutes.root();
  };

  /** The Artist tab in another layout, all else kept. */
  const layoutHref = (next: ArtistLayout) => {
    const kept = new URLSearchParams(params);
    if (next === 'tracks') kept.delete('layout');
    else kept.set('layout', next);
    return `${SongRoutes.root()}?${kept.toString()}`;
  };

  // Clearing the filters keeps the view, its layout, and the artist.
  const clear = () => {
    const kept = new URLSearchParams();
    if (view !== 'genre') kept.set('view', view);
    if (view === 'artist' && layout !== 'tracks') kept.set('layout', layout);
    if (artistAsked) kept.set('artist', artistAsked);
    setParams(kept, { replace: true });
  };
  const genreName =
    filters.genre !== 'all' ? (GENRE_LABELS[filters.genre] ?? null) : null;
  // An artist's name heads their own page, under the page's title.
  const title = genreName ?? 'Songs';

  return (
    <GenreOrderContext.Provider value={genreOrder}>
      <div
        data-testid="explore-songs"
        data-explore-view={shown}
        className="relative isolate flex min-h-full w-full flex-col"
      >
        <ExploreNavBar title={title} titleTo={hrefFor(view)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="-mx-1 flex items-center gap-3 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <nav
                aria-label="View songs by"
                className="flex shrink-0 items-center gap-0.5"
              >
                {VIEWS.map((option) => (
                  <Link
                    key={option.id}
                    to={hrefFor(option.id)}
                    aria-current={option.id === view ? 'page' : undefined}
                    className={cn(TAB, option.id === view && TAB_ACTIVE)}
                  >
                    {option.label}
                  </Link>
                ))}
              </nav>
              <span aria-hidden className="h-5 w-px shrink-0 bg-white/10" />
              <SongFilterPills genre={false} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {shown === 'artists' && (
                <div
                  role="group"
                  aria-label="Layout"
                  className="flex h-10 items-center gap-0.5 rounded-full border border-white/10 px-1"
                >
                  {LAYOUTS.map((option) => (
                    <Link
                      key={option.id}
                      to={layoutHref(option.id)}
                      replace
                      aria-label={option.label}
                      title={option.label}
                      aria-current={option.id === layout ? 'true' : undefined}
                      className={cn(
                        TAB,
                        'px-2.5',
                        option.id === layout && TAB_ACTIVE,
                      )}
                    >
                      <option.icon aria-hidden className="size-4" />
                    </Link>
                  ))}
                </div>
              )}
              <ExploreSearchBar
                placeholder="Search songs or artists"
                className="h-10 w-full sm:w-64"
              />
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
        </ExploreNavBar>

        <motion.div
          key={`${view}/${shown}/${artistAsked ?? ''}/${layout}`}
          className={cn(EXPLORE_COLUMN, 'mt-2 flex flex-col gap-10 pb-14')}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {artist ? (
            <ArtistPage artist={artist} />
          ) : shown === 'artists' ? (
            <section aria-live="polite" className="flex flex-col gap-5">
              {/* Over the track lists' column; the grid and the compact list run
                  from the page's left edge. */}
              <p
                className={cn(
                  'text-[0.875rem] text-white/50',
                  layout === 'tracks' && ARTIST_COLUMN,
                )}
              >
                {artists.length
                  ? `${artists.length} ${artists.length === 1 ? 'artist' : 'artists'}`
                  : 'No songs match these filters.'}
              </p>
              {!artists.length ? (
                <div className={ARTIST_COLUMN}>
                  <button type="button" onClick={clear} className={WHITE_PILL}>
                    Clear filters
                  </button>
                </div>
              ) : layout === 'grid' ? (
                <LearnGrid>
                  {artists.map((row) => (
                    <li key={row.key}>
                      <ArtistCard
                        artist={row}
                        to={hrefFor('artist', row.name)}
                      />
                    </li>
                  ))}
                </LearnGrid>
              ) : layout === 'compact' ? (
                <ol aria-label="Artists" className={COMPACT_LIST}>
                  {artists.map((row) => (
                    <ArtistListRow
                      key={row.key}
                      artist={row}
                      to={hrefFor('artist', row.name)}
                    />
                  ))}
                </ol>
              ) : (
                <div className="flex flex-col gap-16">
                  {artists.map((row) => (
                    <ArtistPage
                      key={row.key}
                      artist={row}
                      to={hrefFor('artist', row.name)}
                      // Hundreds of them: the ones off screen skip layout.
                      className="[contain-intrinsic-size:auto_40rem] [content-visibility:auto]"
                    />
                  ))}
                </div>
              )}
            </section>
          ) : results ? (
            <section aria-live="polite" className="flex flex-col gap-5">
              <p className="text-[0.875rem] text-white/50">
                {results.length
                  ? `${results.length} ${results.length === 1 ? 'song' : 'songs'}`
                  : 'No songs match these filters.'}
              </p>
              {results.length > 0 ? (
                <LearnGrid>
                  {results.map((song) => (
                    <li key={song.id}>
                      <SongCard song={song} />
                    </li>
                  ))}
                </LearnGrid>
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
              {shelves.genres.length > 0 && (
                <Shelf
                  fit
                  id="best-of"
                  title="Best Of"
                  count={shelves.genres.length}
                >
                  {shelves.genres.map((genre, position) => (
                    <li key={genre.slug} className={FIT_ITEM}>
                      <GenreCard genre={genre} position={position} />
                    </li>
                  ))}
                </Shelf>
              )}
              {shelves.genres.map((genre) => (
                <SongShelf
                  key={genre.slug}
                  id={`genre-${genre.slug}`}
                  title={genre.label}
                  reason={`${genre.count} songs`}
                  seeAll={SongRoutes.root(undefined, { genre: genre.slug })}
                  songs={genre.songs}
                />
              ))}
              {/* Theirs, the best-known and the easy ones close the page,
                  under the last genre (owner, 2026-11-11). */}
              <SongShelf
                id="for-you"
                title="Songs for you"
                reason={songsReason(tasteGenres)}
                songs={shelves.forYou}
              />
              <SongShelf
                id="popular"
                title="Popular songs"
                songs={shelves.popular}
              />
              <SongShelf
                id="easy"
                title="Easy to start"
                reason="Level 1"
                seeAll={SongRoutes.root(undefined, { difficulty: '1' })}
                songs={shelves.easy}
              />
            </>
          )}
        </motion.div>
      </div>
    </GenreOrderContext.Provider>
  );
}
