/**
 * Songs tab — searchable song library with a destination toggle:
 *  • Practice chart → `song:<id>:chart` (the song's practice/chord page)
 *  • Theory lesson  → `song:<id>:lesson` (the Learn lesson for its key/mode)
 */
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getAllSongs } from '@/curriculum/data/songs';
import { getYouTubeVideoId } from '../../../slides/songDeepLinks';
import { PickerResultList } from './PickerResultList';
import {
  searchItems,
  songItems,
  type PickableItem,
  type PickedTile,
  type SlideMediaEmbed,
  type SongDestination,
} from './catalog';

interface SongsTabProps {
  onSelect: (tile: PickedTile, embed?: SlideMediaEmbed) => void;
}

const DESTS: { id: SongDestination; label: string }[] = [
  { id: 'chart', label: 'Practice chart' },
  { id: 'lesson', label: 'Theory lesson' },
];

export const SongsTab = ({ onSelect }: SongsTabProps) => {
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState<SongDestination>('chart');

  const songs = useMemo(() => getAllSongs(), []);
  const items = useMemo(() => songItems(songs, dest), [songs, dest]);
  const results = useMemo(() => searchItems(items, query), [items, query]);

  const pick = (item: PickableItem) => {
    const tile = {
      module: item.module,
      activityRef: item.ref,
      label: { en: item.title },
    };
    // Embed BOTH the song's YouTube video and its artist image as independent
    // freeform blocks (each movable / resizable / deletable), alongside the tile.
    const song = songs.find((s) => s.id === item.songId);
    const video = song ? getYouTubeVideoId(song) : null;
    const embed: SlideMediaEmbed = {};
    if (video) {
      embed.media = {
        type: 'youtube',
        videoId: video.videoId,
        ...(video.startSec !== undefined ? { startSec: video.startSec } : {}),
      };
    }
    if (song && song.artistImageSource !== 'none' && song.artistImageRef) {
      embed.sideMedia = { type: 'artistImage', songId: song.id };
    }
    onSelect(tile, embed.media || embed.sideMedia ? embed : undefined);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-5 pb-3 pt-1">
        <span className="text-xs uppercase tracking-wider text-white/40">
          Opens
        </span>
        <div className="flex gap-1">
          {DESTS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDest(d.id)}
              className={
                'rounded-full px-3 py-1 text-xs transition-colors ' +
                (dest === d.id
                  ? 'bg-[#7ecfcf] text-black'
                  : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white')
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
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
      <PickerResultList
        items={results}
        onPick={pick}
        emptyText={`No songs match “${query}”.`}
      />
    </div>
  );
};
