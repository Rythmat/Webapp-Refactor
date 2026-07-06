/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useMemo, useState, useEffect, useCallback, type FC } from 'react';
import { Heart, LayoutGrid, List, Music } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import type { Song } from '@/curriculum/types/songLibrary';
import { getAllSongs } from '@/curriculum/data/songs';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { useSongActions } from '@/features/songs/useSongActions';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { FilterDropdown } from './FilterDropdown';
import { SearchInput } from './SearchInput';

/* ── Types ───────────────────────────────────────────────────────────── */

type SortMode =
  | 'popularity'
  | 'title'
  | 'artist'
  | 'difficulty_asc'
  | 'difficulty_desc';

type SavedFilter = 'all' | 'saved' | 'unsaved';

export type ViewMode = 'grid' | 'list';

interface Filters {
  search: string;
  genre: string; // 'all' | genre slug
  difficulty: string; // 'all' | '1' | '2' | '3'
  saved: SavedFilter;
  sort: SortMode;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function stripThe(s: string): string {
  return s.replace(/^the\s+/i, '');
}

function filterSongs(
  songs: Song[],
  f: Filters,
  savedIds: Record<string, true>,
): Song[] {
  return songs.filter((s) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (
        !s.title.toLowerCase().includes(q) &&
        !s.artist.toLowerCase().includes(q)
      )
        return false;
    }
    if (f.genre !== 'all' && !s.genreTags.includes(f.genre)) return false;
    if (f.difficulty !== 'all' && String(s.difficulty) !== f.difficulty)
      return false;
    if (f.saved === 'saved' && !savedIds[s.id]) return false;
    return !(f.saved === 'unsaved' && savedIds[s.id]);
  });
}

function sortSongs(songs: Song[], mode: SortMode): Song[] {
  const sorted = [...songs];
  switch (mode) {
    case 'popularity':
      return sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case 'title':
      return sorted.sort((a, b) =>
        stripThe(a.title).localeCompare(stripThe(b.title)),
      );
    case 'artist':
      return sorted.sort((a, b) =>
        stripThe(a.artist).localeCompare(stripThe(b.artist)),
      );
    case 'difficulty_asc':
      return sorted.sort((a, b) => a.difficulty - b.difficulty);
    case 'difficulty_desc':
      return sorted.sort((a, b) => b.difficulty - a.difficulty);
    default:
      return sorted;
  }
}

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All levels' },
  { value: '1', label: 'Lvl. 1' },
  { value: '2', label: 'Lvl. 2' },
  { value: '3', label: 'Lvl. 3' },
];

const SAVED_OPTIONS: { value: SavedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'saved', label: 'Saved only' },
  { value: 'unsaved', label: 'Unsaved only' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'artist', label: 'Artist (A–Z)' },
  { value: 'difficulty_asc', label: 'Difficulty (Easy → Hard)' },
  { value: 'difficulty_desc', label: 'Difficulty (Hard → Easy)' },
];

// Canonical 14-genre list, matching the Courses section. Source of truth for
// both the dropdown and the `song.genreTags` values produced by
// scripts/normalize-song-genres.mjs.
const GENRE_OPTIONS = [
  { value: 'all', label: 'All Genres' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'hip hop', label: 'Hip Hop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'blues', label: 'Blues' },
  { value: 'folk', label: 'Folk' },
  { value: 'funk', label: 'Funk' },
  { value: 'neo-soul', label: 'Neo Soul' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'latin', label: 'Latin' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'jam-band', label: 'Jam Band' },
  { value: 'african', label: 'African' },
];

/* ── SongLibraryBody (used inside Learn) ─────────────────────────────── */

export const SongLibraryBody: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const allSongs = useMemo(() => getAllSongs(), []);
  const savedIds = useSavedSongsStore((s) => s.savedIds);

  const [filters, setFilters] = useState<Filters>(() => ({
    search: searchParams.get('q') ?? '',
    genre: searchParams.get('genre') ?? 'all',
    difficulty: searchParams.get('difficulty') ?? 'all',
    saved: (searchParams.get('saved') as SavedFilter) || 'all',
    sort: (searchParams.get('sort') as SortMode) || 'title',
  }));

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const update = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };
    update('q', filters.search, '');
    update('genre', filters.genre, 'all');
    update('difficulty', filters.difficulty, 'all');
    update('saved', filters.saved, 'all');
    update('sort', filters.sort, 'title');
    // `view` param is intentionally not synced — Songs is list-only now.
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const results = useMemo(
    () => sortSongs(filterSongs(allSongs, filters, savedIds), filters.sort),
    [allSongs, filters, savedIds],
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => updateFilter('search', searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput, updateFilter]);

  return (
    <div
      className="flex flex-col"
      style={{ paddingBottom: 24, height: '100%' }}
    >
      <div
        className="sticky top-0 z-10 pt-1 pb-3"
        style={{ background: '#101012' }}
      >
        {/* ── Filter row ── */}
        <div
          className="flex items-center flex-wrap"
          style={{ gap: 10, marginBottom: 16 }}
        >
          <FilterDropdown
            label="Difficulty"
            value={filters.difficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={(v) => updateFilter('difficulty', v)}
          />
          <FilterDropdown
            label="Genre"
            value={filters.genre}
            options={GENRE_OPTIONS}
            onChange={(v) => updateFilter('genre', v)}
          />
          <FilterDropdown
            label="Saved"
            value={filters.saved}
            options={SAVED_OPTIONS}
            onChange={(v) => updateFilter('saved', v as SavedFilter)}
          />
          <FilterDropdown
            label="Sort"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(v) => updateFilter('sort', v as SortMode)}
          />
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onClear={() => {
              setSearchInput('');
              updateFilter('search', '');
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      {results.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ padding: '48px 0' }}
        >
          <Music
            size={28}
            className="text-white/10"
            style={{ marginBottom: 12 }}
          />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            No songs match these filters
          </p>
        </div>
      ) : (
        <SongListTable songs={results} />
      )}
    </div>
  );
};

/* ── ViewToggle ─────────────────────────────────────────────────────── */

export const ViewToggle: FC<{
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}> = ({ viewMode, onChange }) => {
  const items: { mode: ViewMode; Icon: typeof LayoutGrid }[] = [
    { mode: 'grid', Icon: LayoutGrid },
    { mode: 'list', Icon: List },
  ];
  return (
    <div
      className="flex items-center overflow-hidden"
      style={{
        width: 56,
        height: 28,
        borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {items.map(({ mode, Icon }) => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-label={`${mode} view`}
            aria-pressed={active}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 28,
              height: 28,
              background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
            }}
          >
            <Icon width={14} height={14} />
          </button>
        );
      })}
    </div>
  );
};

/* ── SongThumbnail (small circular artist portrait for list rows) ────── */

const THUMBNAIL_SIZE = 40;

const SongThumbnail: FC<{ song: Song }> = ({ song }) => {
  const [imageBroken, setImageBroken] = useState(false);
  const hasArtistImage = !!song.artistImageRef && !imageBroken;
  const avatarConfig = useMemo(
    () => defaultAvatarConfig(song.genreTags[0] ?? song.artist),
    [song.genreTags, song.artist],
  );

  return (
    <div
      className="overflow-hidden rounded-full"
      style={{
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      {hasArtistImage ? (
        <img
          src={song.artistImageRef}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <HexAvatarSVG config={avatarConfig} size={THUMBNAIL_SIZE} circular />
      )}
    </div>
  );
};

/* ── SongListTable ──────────────────────────────────────────────────── */

const LIST_FS = 12;
const LIST_FS_SMALL = 11;
const LIST_CELL_PAD = '8px 12px';
const LIST_ICON_SIZE = 14;

interface SongListTableProps {
  songs: Song[];
}

const SongListTable: FC<SongListTableProps> = ({ songs }) => {
  return (
    <table
      className="w-full"
      style={{ borderCollapse: 'separate', borderSpacing: '0 1px' }}
    >
      <thead>
        <tr>
          {['', 'Artist', 'Title', 'Difficulty', 'Genre', 'Saved', 'Links'].map(
            (col, i) => (
              <th
                key={i}
                className="text-left font-medium pb-2 px-3"
                style={{
                  fontSize: LIST_FS_SMALL,
                  color: 'rgba(255,255,255,0.4)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {col}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {songs.map((song, i) => (
          <SongListRow key={song.id} song={song} index={i} />
        ))}
      </tbody>
    </table>
  );
};

interface SongListRowProps {
  song: Song;
  index: number;
}

const SongListRow: FC<SongListRowProps> = ({ song, index }) => {
  const { openInLesson, openInStudio, openInGlobe, toggleSaved, isSaved } =
    useSongActions(song);

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-white/[0.04]"
      style={{
        background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}
    >
      <td style={{ padding: LIST_CELL_PAD, width: 56 }}>
        <SongThumbnail song={song} />
      </td>
      <td style={{ padding: LIST_CELL_PAD }}>
        <Link
          to={`/songs/${song.id}`}
          className="block"
          style={{ fontSize: LIST_FS, color: '#ffffff' }}
        >
          {song.artist}
        </Link>
      </td>
      <td style={{ padding: LIST_CELL_PAD }}>
        <Link
          to={`/songs/${song.id}`}
          className="block"
          style={{ fontSize: LIST_FS, color: 'rgba(255,255,255,0.6)' }}
        >
          "{song.title}"
        </Link>
      </td>
      <td
        style={{
          fontSize: LIST_FS,
          padding: LIST_CELL_PAD,
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        Lvl. {song.difficulty}
      </td>
      <td
        style={{
          fontSize: LIST_FS,
          padding: LIST_CELL_PAD,
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        {song.genreTags[0] ?? ''}
      </td>
      <td style={{ padding: LIST_CELL_PAD }}>
        <button
          type="button"
          onClick={toggleSaved}
          aria-label={isSaved ? 'Remove from saved' : 'Save song'}
          aria-pressed={isSaved}
          title={isSaved ? 'Remove from saved' : 'Save song'}
          className="transition-colors hover:text-white"
          style={{ color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.3)' }}
        >
          <Heart
            width={LIST_ICON_SIZE}
            height={LIST_ICON_SIZE}
            fill={isSaved ? 'currentColor' : 'none'}
          />
        </button>
      </td>
      <td style={{ padding: LIST_CELL_PAD }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={openInLesson}
            aria-label="Open in Lesson"
            title="Open in Lesson"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <img
              src="/icons/learn-icon.svg"
              alt=""
              draggable={false}
              width={LIST_ICON_SIZE}
              height={LIST_ICON_SIZE}
            />
          </button>
          <button
            type="button"
            onClick={openInStudio}
            aria-label="Open in Studio"
            title="Open in Studio"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <img
              src="/icons/studio-icon.svg"
              alt=""
              draggable={false}
              width={LIST_ICON_SIZE}
              height={LIST_ICON_SIZE}
            />
          </button>
          <button
            type="button"
            onClick={openInGlobe}
            aria-label="Open in Globe"
            title="Open in Globe"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <img
              src="/icons/globe-icon.svg"
              alt=""
              draggable={false}
              width={LIST_ICON_SIZE}
              height={LIST_ICON_SIZE}
            />
          </button>
          <button
            type="button"
            onClick={toggleSaved}
            aria-label={isSaved ? 'Remove from saved' : 'Save song'}
            aria-pressed={isSaved}
            title={isSaved ? 'Remove from saved' : 'Save song'}
            className="transition-colors hover:text-white"
            style={{ color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.4)' }}
          >
            <Heart
              width={LIST_ICON_SIZE}
              height={LIST_ICON_SIZE}
              fill={isSaved ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      </td>
    </tr>
  );
};

/* ── SongLibraryPage (standalone page wrapper) ──────────────────────── */

export const SongLibraryPage: FC = () => {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundImage: 'url(/backgrounds/dashboard-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '0 32px',
      }}
    >
      <SongLibraryBody />
    </div>
  );
};
