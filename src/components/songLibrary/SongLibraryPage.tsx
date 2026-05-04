/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useMemo, useState, useEffect, useCallback, type FC } from 'react';
import { Search, X, Music } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import type { Song, DifficultyLevel } from '@/curriculum/types/songLibrary';
import { getAllSongs } from '@/curriculum/data/songs';
import { useUISound } from '@/hooks/useUISound';

/* ── Types ───────────────────────────────────────────────────────────── */

type SortMode = 'popularity' | 'title' | 'artist' | 'difficulty_asc' | 'difficulty_desc';

interface Filters {
  search: string;
  genre: string | 'all';
  difficulty: DifficultyLevel | 'all';
  sort: SortMode;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Medium+' };

function stripThe(s: string): string {
  return s.replace(/^the\s+/i, '');
}

function filterSongs(songs: Song[], f: Filters): Song[] {
  return songs.filter((s) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.artist.toLowerCase().includes(q)) return false;
    }
    if (f.genre !== 'all' && !s.genreTags.includes(f.genre)) return false;
    return !(f.difficulty !== 'all' && s.difficulty !== f.difficulty);
  });
}

function sortSongs(songs: Song[], mode: SortMode): Song[] {
  const sorted = [...songs];
  switch (mode) {
    case 'popularity': return sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case 'title': return sorted.sort((a, b) => stripThe(a.title).localeCompare(stripThe(b.title)));
    case 'artist': return sorted.sort((a, b) => stripThe(a.artist).localeCompare(stripThe(b.artist)));
    case 'difficulty_asc': return sorted.sort((a, b) => a.difficulty - b.difficulty);
    case 'difficulty_desc': return sorted.sort((a, b) => b.difficulty - a.difficulty);
    default: return sorted;
  }
}

/* ── Main Component ─────────────────────────────────────────────────── */

export const SongLibraryPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { play } = useUISound();
  const allSongs = useMemo(() => getAllSongs(), []);

  const [filters, setFilters] = useState<Filters>(() => ({
    search: searchParams.get('q') ?? '',
    genre: (searchParams.get('genre') as string) || 'all',
    difficulty: searchParams.get('difficulty') ? (Number(searchParams.get('difficulty')) as DifficultyLevel) : 'all',
    sort: (searchParams.get('sort') as SortMode) || 'popularity',
  }));

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.q = filters.search;
    if (filters.genre !== 'all') params.genre = filters.genre;
    if (filters.difficulty !== 'all') params.difficulty = String(filters.difficulty);
    if (filters.sort !== 'popularity') params.sort = filters.sort;
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    allSongs.forEach((s) => s.genreTags.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allSongs]);

  const results = useMemo(() => sortSongs(filterSongs(allSongs, filters), filters.sort), [allSongs, filters]);

  const [searchInput, setSearchInput] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => updateFilter('search', searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput, updateFilter]);

  const fs = 'clamp(0.55rem, 0.85vw, 0.75rem)';
  const fsSmall = 'clamp(0.5rem, 0.75vw, 0.65rem)';

  return (
    <div className="flex flex-col h-full" style={{ backgroundImage: 'url(/backgrounds/dashboard-bg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

      {/* ── Header + Filters ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        {/* Title */}
        <h1 className="text-white font-bold mb-3" style={{ fontSize: 'clamp(1rem, 1.6vw, 1.3rem)' }}>Songs</h1>

        {/* Filter row: dropdowns + search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Difficulty dropdown */}
          <select
            value={filters.difficulty === 'all' ? '' : String(filters.difficulty)}
            onChange={(e) => updateFilter('difficulty', e.target.value ? (Number(e.target.value) as DifficultyLevel) : 'all')}
            className="rounded-lg outline-none cursor-pointer text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(0.25rem, 0.4vw, 0.35rem) clamp(0.5rem, 0.8vw, 0.7rem)', fontSize: fsSmall }}
          >
            <option value="" style={{ background: '#1a1a1a' }}>Difficulty</option>
            <option value="1" style={{ background: '#1a1a1a' }}>Easy</option>
            <option value="2" style={{ background: '#1a1a1a' }}>Medium</option>
            <option value="3" style={{ background: '#1a1a1a' }}>Medium+</option>
          </select>

          {/* Genre dropdown */}
          <select
            value={filters.genre}
            onChange={(e) => updateFilter('genre', e.target.value)}
            className="rounded-lg outline-none cursor-pointer text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(0.25rem, 0.4vw, 0.35rem) clamp(0.5rem, 0.8vw, 0.7rem)', fontSize: fsSmall }}
          >
            <option value="all" style={{ background: '#1a1a1a' }}>Genre</option>
            {genres.map(([g]) => (
              <option key={g} value={g} style={{ background: '#1a1a1a' }}>{g}</option>
            ))}
          </select>

          {/* Saved dropdown (placeholder) */}
          <select
            className="rounded-lg outline-none cursor-pointer text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(0.25rem, 0.4vw, 0.35rem) clamp(0.5rem, 0.8vw, 0.7rem)', fontSize: fsSmall }}
          >
            <option style={{ background: '#1a1a1a' }}>Saved</option>
          </select>

          {/* Search */}
          <div className="flex items-center rounded-lg overflow-hidden flex-1 min-w-[150px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(0.25rem, 0.4vw, 0.35rem) clamp(0.5rem, 0.8vw, 0.7rem)' }}>
            <Search className="text-white/30 flex-shrink-0" style={{ width: 'clamp(0.7rem, 0.9vw, 0.8rem)', height: 'clamp(0.7rem, 0.9vw, 0.8rem)' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search artist name or song title"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 ml-2"
              style={{ fontSize: fsSmall }}
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); updateFilter('search', ''); }} className="text-white/30 hover:text-white transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pb-4">
        <div className="rounded-2xl glass-panel-sm h-full overflow-y-auto custom-scrollbar" style={{ background: 'rgba(26, 26, 26, 0.7)', padding: 'clamp(0.5rem, 1vw, 1rem)' }}>
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Music size={28} className="text-white/10 mb-3" />
            <p className="text-white/40" style={{ fontSize: fs }}>No songs match these filters</p>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 1px' }}>
            {/* Column headers */}
            <thead>
              <tr>
                {['Artist', 'Title', 'Difficulty', 'Genre', 'Saved', 'Popularity'].map((col) => (
                  <th key={col} className="text-left font-medium text-white/40 pb-2 px-3" style={{ fontSize: fsSmall, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((song, i) => (
                <tr
                  key={song.id}
                  className="cursor-pointer transition-colors hover:bg-white/[0.04]"
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                  onClick={() => { play('click'); }}
                >
                  <td className="px-3" style={{ padding: 'clamp(0.35rem, 0.6vw, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)' }}>
                    <Link to={`/songs/${song.id}`} className="text-white hover:text-white/80 block" style={{ fontSize: fs }}>
                      {song.artist}
                    </Link>
                  </td>
                  <td className="px-3" style={{ padding: 'clamp(0.35rem, 0.6vw, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)' }}>
                    <Link to={`/songs/${song.id}`} className="text-white/60 hover:text-white block" style={{ fontSize: fs }}>
                      "{song.title}"
                    </Link>
                  </td>
                  <td className="px-3 text-white/50" style={{ fontSize: fs, padding: 'clamp(0.35rem, 0.6vw, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)' }}>
                    {DIFFICULTY_LABEL[song.difficulty] ?? `L${song.difficulty}`}
                  </td>
                  <td className="px-3 text-white/40" style={{ fontSize: fs, padding: 'clamp(0.35rem, 0.6vw, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)' }}>
                    {song.genreTags[0] ?? ''}
                  </td>
                  <td className="px-3 text-white/30" style={{ fontSize: fs, padding: 'clamp(0.35rem, 0.6vw, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)' }}>
                    —
                  </td>
                  <td className="px-3 text-white/30" style={{ fontSize: fs, padding: 'clamp(0.35rem, 0.6vw, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)' }}>
                    {song.popularity ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  );
};
