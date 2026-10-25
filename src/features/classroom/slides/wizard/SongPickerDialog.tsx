import { Music, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GENRE_OPTIONS } from '@/components/songLibrary/SongLibraryPage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { getAllSongs } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';

interface SongPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (song: Song) => void;
  /** Classes for the dialog's box, in place of its own fill (Set Lists
   *  gives it the Learn page's glass). */
  contentClassName?: string;
  /**
   * The Set Lists look inside it too (owner, 2026-10-25): the title at the
   * cards' heading size, the search as a glass pill, each song a card as a
   * set list is, its genre by name.
   */
  glass?: boolean;
}

/** A genre slug's name, as the song list's filter shows it ("rnb" → R&B). */
const GENRE_NAMES: Record<string, string> = Object.fromEntries(
  GENRE_OPTIONS.map((o) => [o.value, o.label]),
);

const MAX_RESULTS = 40;

/**
 * Searchable picker over the static song library. Client-side filter on
 * title / artist / genre — the library is in-memory, so this is instant.
 */
export const SongPickerDialog = ({
  open,
  onOpenChange,
  onSelect,
  contentClassName,
  glass = false,
}: SongPickerDialogProps) => {
  const [query, setQuery] = useState('');
  const songs = useMemo(() => getAllSongs(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            s.genreTags?.some((g) => g.toLowerCase().includes(q)),
        )
      : songs;
    return pool.slice(0, MAX_RESULTS);
  }, [songs, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-lg border-white/10 bg-[#161618] p-0 text-white',
          contentClassName,
        )}
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle
            className={
              glass
                ? 'text-xl font-medium text-white md:text-2xl'
                : 'text-base font-medium'
            }
          >
            Pick a song
          </DialogTitle>
        </DialogHeader>
        <div
          className={
            glass
              ? 'px-4 pb-3'
              : 'flex items-center gap-2 border-b border-white/10 px-5 pb-3'
          }
        >
          <div
            className={
              glass
                ? 'flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-white transition-colors focus-within:border-white/20'
                : 'contents'
            }
          >
            <Search
              className={cn(
                'h-4 w-4 shrink-0',
                glass ? 'text-white' : 'text-white/40',
              )}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, artist, or genre…"
              className={cn(
                'w-full bg-transparent text-sm text-white outline-none',
                glass
                  ? 'min-w-0 leading-6 placeholder:text-white/50'
                  : 'py-1 placeholder:text-white/35',
              )}
            />
          </div>
        </div>
        <ul
          className={cn(
            'max-h-[50vh] overflow-y-auto',
            glass
              ? 'custom-scrollbar flex flex-col gap-2 px-4 pb-4'
              : 'px-2 pb-3',
          )}
        >
          {results.map((song) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(song);
                  onOpenChange(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl text-left transition-colors',
                  // A set list card's look.
                  glass
                    ? 'border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-white/25 hover:bg-white/[0.05]'
                    : 'px-3 py-2 hover:bg-white/[0.06]',
                )}
              >
                <SongThumb song={song} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {song.title}
                  </span>
                  <span className="block truncate text-xs text-white/50">
                    {song.artist}
                  </span>
                </span>
                {song.genreTags?.[0] && (
                  <span
                    className={
                      glass
                        ? 'shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/60'
                        : 'shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50'
                    }
                  >
                    {glass
                      ? (GENRE_NAMES[song.genreTags[0]] ?? song.genreTags[0])
                      : song.genreTags[0]}
                  </span>
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li
              className={cn(
                'px-3 py-6 text-center text-sm',
                glass ? 'text-white/50' : 'text-white/45',
              )}
            >
              No songs match “{query}”.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

const SongThumb = ({ song }: { song: Song }) => {
  const src =
    song.artistImageSource !== 'none' && song.artistImageRef
      ? song.artistImageRef
      : null;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06]">
      <Music className="h-4 w-4 text-white/40" />
    </span>
  );
};
