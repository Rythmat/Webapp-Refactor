import { useMemo } from 'react';
import { SongCard } from '@/components/songLibrary/SongCard';
import { cn } from '@/components/utilities';
import { getAllSongs, getSong } from '@/curriculum/data/songs';
import './songs-marquee.css';

const MARQUEE_POOL_SIZE = 30;

const shuffleInPlace = <T,>(items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/** Unique-artist deduped, Fisher-Yates shuffled, capped to keep DOM light. */
const buildMarqueePool = (): string[] => {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const song of getAllSongs()) {
    if (!song.artistImageRef?.startsWith('/artists/svg/')) continue;
    if (seen.has(song.artist)) continue;
    seen.add(song.artist);
    ids.push(song.id);
  }
  shuffleInPlace(ids);
  return ids.slice(0, MARQUEE_POOL_SIZE);
};

interface SongsMarqueeProps {
  /**
   * When true (default), applies `-mx-6 md:-mx-10` so the marquee visually
   * escapes the parent's `px-6 md:px-10` padding for a full-width scroll strip.
   * Pass false when the parent has no horizontal padding (e.g. Learn's
   * edge-to-edge Songs wrapper) — the negative margins would otherwise push
   * the marquee past its container's edges.
   */
  bleed?: boolean;
}

/**
 * Shared songs marquee — a horizontal drifting carousel of SongCards.
 * The parent owns the section header (icon + title + "View All" link, if any);
 * this component only renders the carousel body.
 */
export const SongsMarquee = ({ bleed = true }: SongsMarqueeProps = {}) => {
  const songs = useMemo(
    () =>
      buildMarqueePool()
        .map((id) => getSong(id))
        .filter((song): song is NonNullable<ReturnType<typeof getSong>> =>
          Boolean(song),
        ),
    [],
  );

  // Doubled for the seamless-loop pattern — see songs-marquee.css.
  const marqueeSongs = [...songs, ...songs];

  return (
    <div
      className={cn('song-marquee overflow-hidden', bleed && '-mx-6 md:-mx-10')}
    >
      <div className="song-marquee-track flex w-max gap-4 px-6 md:gap-5 md:px-10">
        {marqueeSongs.map((song, i) => (
          <div key={i} className="w-[260px] flex-shrink-0 md:w-[300px]">
            <SongCard song={song} />
          </div>
        ))}
      </div>
    </div>
  );
};
