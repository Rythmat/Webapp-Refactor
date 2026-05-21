/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  type FC,
  type MouseEvent,
} from 'react';
import {
  BookOpen,
  Heart,
  LayoutGrid,
  List,
  Music,
  Search,
  X,
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { FixedSizeGrid, type GridChildComponentProps } from 'react-window';
import type { Song } from '@/curriculum/types/songLibrary';
import { getAllSongs } from '@/curriculum/data/songs';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { useElementSize } from '@/hooks/useElementSize';
import { useUISound } from '@/hooks/useUISound';
import { FilterDropdown } from './FilterDropdown';
import { SongCard } from './SongCard';

/* ── Types ───────────────────────────────────────────────────────────── */

type SortMode =
  | 'popularity'
  | 'title'
  | 'artist'
  | 'difficulty_asc'
  | 'difficulty_desc';

type SavedFilter = 'all' | 'saved' | 'unsaved';

type ViewMode = 'grid' | 'list';

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

/* ── SongLibraryBody (used inside Learn) ─────────────────────────────── */

export const SongLibraryBody: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { play } = useUISound();
  const allSongs = useMemo(() => getAllSongs(), []);
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const toggleSaved = useSavedSongsStore((s) => s.toggleSaved);

  const [filters, setFilters] = useState<Filters>(() => ({
    search: searchParams.get('q') ?? '',
    genre: searchParams.get('genre') ?? 'all',
    difficulty: searchParams.get('difficulty') ?? 'all',
    saved: (searchParams.get('saved') as SavedFilter) || 'all',
    sort: (searchParams.get('sort') as SortMode) || 'popularity',
  }));

  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'grid',
  );

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
    update('sort', filters.sort, 'popularity');
    update('view', viewMode, 'grid');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, viewMode]);

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allSongs.forEach((s) =>
      s.genreTags.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)),
    );
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return [
      { value: 'all', label: 'All genres' },
      ...sorted.map(([g]) => ({ value: g, label: g })),
    ];
  }, [allSongs]);

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
      style={{ paddingTop: 16, paddingBottom: 24, height: '100%' }}
    >
      {/* ── Header row: title + view toggle ── */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 14 }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: '#e8e8e8',
            margin: 0,
          }}
        >
          Song Library
        </h1>
        <ViewToggle
          viewMode={viewMode}
          onChange={(m) => {
            play('click');
            setViewMode(m);
          }}
        />
      </div>

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
          options={genreOptions}
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
      ) : viewMode === 'grid' ? (
        <VirtualizedSongGrid songs={results} />
      ) : (
        <SongListTable
          songs={results}
          savedIds={savedIds}
          onToggleSaved={toggleSaved}
        />
      )}
    </div>
  );
};

/* ── VirtualizedSongGrid (react-window) ─────────────────────────────── */

const MIN_TILE_WIDTH = 220;
const TILE_FOOTER_HEIGHT = 96;
const TILE_GAP = 16;

const VirtualizedSongGrid: FC<{ songs: Song[] }> = ({ songs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);

  const columnCount = Math.max(
    1,
    Math.floor((width + TILE_GAP) / (MIN_TILE_WIDTH + TILE_GAP)),
  );
  // Each react-window "column" takes width/columnCount; the SongCard inside
  // gets right/bottom padding equal to TILE_GAP, which produces the visual gap.
  const columnWidth = columnCount > 0 ? width / columnCount : MIN_TILE_WIDTH;
  // The card's visible width = columnWidth - TILE_GAP (since the cell
  // contributes a right-padding of TILE_GAP).
  const tileVisualWidth = Math.max(0, columnWidth - TILE_GAP);
  const rowHeight = tileVisualWidth + TILE_FOOTER_HEIGHT + TILE_GAP;
  const rowCount = Math.ceil(songs.length / columnCount);

  const Cell = useCallback(
    ({ rowIndex, columnIndex, style }: GridChildComponentProps) => {
      const idx = rowIndex * columnCount + columnIndex;
      const song = songs[idx];
      if (!song) return null;
      return (
        <div
          style={{
            ...style,
            paddingRight: TILE_GAP,
            paddingBottom: TILE_GAP,
            boxSizing: 'border-box',
          }}
        >
          <SongCard song={song} />
        </div>
      );
    },
    [songs, columnCount],
  );

  const itemKey = useCallback(
    ({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) => {
      const idx = rowIndex * columnCount + columnIndex;
      return songs[idx]?.id ?? `__empty-${rowIndex}-${columnIndex}`;
    },
    [songs, columnCount],
  );

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
      {width > 0 && height > 0 && (
        <FixedSizeGrid
          columnCount={columnCount}
          rowCount={rowCount}
          columnWidth={columnWidth}
          rowHeight={rowHeight}
          width={width}
          height={height}
          overscanRowCount={2}
          itemKey={itemKey}
        >
          {Cell}
        </FixedSizeGrid>
      )}
    </div>
  );
};

/* ── ViewToggle ─────────────────────────────────────────────────────── */

const ViewToggle: FC<{
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

/* ── SearchInput ────────────────────────────────────────────────────── */

const SearchInput: FC<{
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}> = ({ value, onChange, onClear }) => {
  return (
    <div
      className="flex items-center"
      style={{
        flex: 1,
        minWidth: 200,
        height: 32,
        padding: '0 12px',
        gap: 8,
        borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Search
        width={14}
        height={14}
        style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search artist name or song title"
        className="flex-1 bg-transparent outline-none"
        style={{
          fontSize: 12,
          color: '#ffffff',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          aria-label="Clear search"
        >
          <X width={12} height={12} />
        </button>
      )}
    </div>
  );
};

/* ── SongListTable ──────────────────────────────────────────────────── */

interface SongListTableProps {
  songs: Song[];
  savedIds: Record<string, true>;
  onToggleSaved: (id: string) => void;
}

const SongListTable: FC<SongListTableProps> = ({
  songs,
  savedIds,
  onToggleSaved,
}) => {
  const fs = 12;
  const fsSmall = 11;
  const cellPad = '8px 12px';
  const iconSize = 14;

  const handleHeartClick = (e: MouseEvent, songId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSaved(songId);
  };

  return (
    <table
      className="w-full"
      style={{ borderCollapse: 'separate', borderSpacing: '0 1px' }}
    >
      <thead>
        <tr>
          {['Artist', 'Title', 'Difficulty', 'Genre', 'Saved', 'Links'].map(
            (col) => (
              <th
                key={col}
                className="text-left font-medium pb-2 px-3"
                style={{
                  fontSize: fsSmall,
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
        {songs.map((song, i) => {
          const isSaved = Boolean(savedIds[song.id]);
          return (
            <tr
              key={song.id}
              className="cursor-pointer transition-colors hover:bg-white/[0.04]"
              style={{
                background:
                  i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}
            >
              <td style={{ padding: cellPad }}>
                <Link
                  to={`/songs/${song.id}`}
                  className="block"
                  style={{ fontSize: fs, color: '#ffffff' }}
                >
                  {song.artist}
                </Link>
              </td>
              <td style={{ padding: cellPad }}>
                <Link
                  to={`/songs/${song.id}`}
                  className="block"
                  style={{ fontSize: fs, color: 'rgba(255,255,255,0.6)' }}
                >
                  "{song.title}"
                </Link>
              </td>
              <td
                style={{
                  fontSize: fs,
                  padding: cellPad,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Lvl. {song.difficulty}
              </td>
              <td
                style={{
                  fontSize: fs,
                  padding: cellPad,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {song.genreTags[0] ?? ''}
              </td>
              <td style={{ padding: cellPad }}>
                <button
                  type="button"
                  onClick={(e) => handleHeartClick(e, song.id)}
                  aria-label={isSaved ? 'Remove from saved' : 'Save song'}
                  aria-pressed={isSaved}
                  className="transition-colors"
                >
                  <Heart
                    width={iconSize}
                    height={iconSize}
                    fill={isSaved ? 'currentColor' : 'none'}
                    style={{
                      color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.3)',
                    }}
                  />
                </button>
              </td>
              <td style={{ padding: cellPad }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <Link
                    to={`/songs/${song.id}`}
                    className="transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    aria-label="Open song"
                  >
                    <BookOpen width={iconSize} height={iconSize} />
                  </Link>
                  <Link
                    to={`/songs/${song.id}`}
                    className="transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    aria-label="Play song"
                  >
                    <Music width={iconSize} height={iconSize} />
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => handleHeartClick(e, song.id)}
                    aria-label={isSaved ? 'Remove from saved' : 'Save song'}
                    aria-pressed={isSaved}
                    className="transition-colors"
                  >
                    <Heart
                      width={iconSize}
                      height={iconSize}
                      fill={isSaved ? 'currentColor' : 'none'}
                      style={{
                        color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.4)',
                      }}
                    />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
