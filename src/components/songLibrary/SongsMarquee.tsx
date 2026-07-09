import { useEffect, useMemo, useState } from 'react';
import { SongCard } from '@/components/songLibrary/SongCard';
import { cn } from '@/components/utilities';
import { getAllSongs, getSong } from '@/curriculum/data/songs';
import './songs-marquee.css';

/**
 * Artists shown per page load. Kept small so the marquee DOM stays light — the
 * rest of the roster rotates in on later loads via the shuffle-bag below.
 */
const MARQUEE_BATCH_SIZE = 30;

/**
 * Persisted "shuffle-bag" of artist song IDs not yet shown this cycle. Draining
 * it a batch at a time means every artist appears before anyone repeats, and
 * each page load pulls a fresh subset.
 */
const BAG_STORAGE_KEY = 'song-marquee-artist-bag';

const shuffleInPlace = <T,>(items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/** Every marquee-eligible song, one per unique artist, in stable roster order. */
const getEligibleIds = (): string[] => {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const song of getAllSongs()) {
    if (!song.artistImageRef?.startsWith('/artists/svg/')) continue;
    if (seen.has(song.artist)) continue;
    seen.add(song.artist);
    ids.push(song.id);
  }
  return ids;
};

/** Reads the persisted bag, dropping any IDs that are no longer eligible. */
const readBag = (eligible: Set<string>): string[] => {
  try {
    const raw = localStorage.getItem(BAG_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is string => typeof id === 'string' && eligible.has(id),
    );
  } catch {
    return [];
  }
};

/**
 * Draws the next batch of artists from the shuffle-bag. When the bag can't fill
 * a batch, the not-yet-shown remainder is carried to the front of a freshly
 * shuffled full roster — so no artist is skipped and none repeats until everyone
 * has had a turn. Returns the batch plus the bag to persist for the next load.
 * Falls back to a plain random draw when the whole roster fits in one batch.
 */
const drawMarqueeBatch = (): { batch: string[]; nextBag: string[] } => {
  const eligible = getEligibleIds();
  if (eligible.length <= MARQUEE_BATCH_SIZE) {
    return { batch: shuffleInPlace([...eligible]), nextBag: [] };
  }

  const eligibleSet = new Set(eligible);
  let bag = readBag(eligibleSet);
  if (bag.length < MARQUEE_BATCH_SIZE) {
    const carried = new Set(bag);
    bag = [
      ...bag,
      ...shuffleInPlace(eligible.filter((id) => !carried.has(id))),
    ];
  }

  return {
    batch: bag.slice(0, MARQUEE_BATCH_SIZE),
    nextBag: bag.slice(MARQUEE_BATCH_SIZE),
  };
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
  // Draw a fresh batch on mount; persist the remaining bag so the next load
  // continues through the roster (see drawMarqueeBatch).
  const [{ batch, nextBag }] = useState(drawMarqueeBatch);

  useEffect(() => {
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(nextBag));
    } catch {
      // localStorage unavailable — this load still shows a fresh random batch.
    }
  }, [nextBag]);

  const songs = useMemo(
    () =>
      batch
        .map((id) => getSong(id))
        .filter((song): song is NonNullable<ReturnType<typeof getSong>> =>
          Boolean(song),
        ),
    [batch],
  );

  // Doubled for the seamless-loop pattern — see songs-marquee.css.
  const marqueeSongs = [...songs, ...songs];

  return (
    <div
      className={cn(
        'song-marquee overflow-hidden py-4',
        bleed && '-mx-6 md:-mx-10',
      )}
    >
      <div className="song-marquee-track flex w-max gap-4 px-6 md:gap-5 md:px-10">
        {marqueeSongs.map((song, i) => (
          <div key={i} className="w-[260px] flex-shrink-0 md:w-[300px]">
            <SongCard song={song} hoverScrim={false} bleedOnHover />
          </div>
        ))}
      </div>
    </div>
  );
};
