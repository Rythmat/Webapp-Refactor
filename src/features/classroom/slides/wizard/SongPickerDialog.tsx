import { Music, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAllSongs } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';

interface SongPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (song: Song) => void;
}

const MAX_RESULTS = 40;

/**
 * Searchable picker over the static song library. Client-side filter on
 * title / artist / genre — the library is in-memory, so this is instant.
 */
export const SongPickerDialog = ({
  open,
  onOpenChange,
  onSelect,
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
      <DialogContent className="max-w-lg border-white/10 bg-[#161618] p-0 text-white">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-base font-medium">
            Pick a song
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-3">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, artist, or genre…"
            className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto px-2 pb-3">
          {results.map((song) => (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(song);
                  onOpenChange(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
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
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                    {song.genreTags[0]}
                  </span>
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-white/45">
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
