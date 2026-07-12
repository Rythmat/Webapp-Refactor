import { useEffect, useMemo, useState } from 'react';
import { SongCard } from '@/components/songLibrary/SongCard';
import { cn } from '@/components/utilities';
import { getAllSongs, getSong } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';
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

const hasArtistPortrait = (song: Song): boolean =>
  Boolean(song.artistImageRef?.startsWith('/artists/svg/'));

/**
 * One song per unique artist (in the given list's order), keeping only artists
 * with an SVG portrait — the marquee's display requirement. Shared by both the
 * default shuffle-bag draw and the controlled (externally-filtered) mode.
 */
const dedupeByArtist = (songs: Song[]): Song[] => {
  const seen = new Set<string>();
  const out: Song[] = [];
  for (const song of songs) {
    if (!hasArtistPortrait(song)) continue;
    if (seen.has(song.artist)) continue;
    seen.add(song.artist);
    out.push(song);
  }
  return out;
};

/** Every marquee-eligible song id, one per unique artist, in stable roster order. */
const getEligibleIds = (): string[] =>
  dedupeByArtist(getAllSongs()).map((s) => s.id);

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
  /**
   * When provided, the marquee shows only these songs (already filtered by the
   * caller) — one card per unique SVG-portrait artist, in a random order — so it
   * reflects an external filter (the Learn Songs tab passes its filtered set).
   * When omitted, the marquee cycles through all artists via the persisted
   * shuffle-bag (its default, e.g. on the Home dashboard). An empty array is a
   * valid controlled value and renders nothing.
   */
  songs?: Song[];
  /**
   * Compact strip: small artwork-only thumbnails and tighter padding, so the
   * marquee stays short when pinned (the Learn Songs tab). Defaults to false
   * (full cards, e.g. the Home dashboard section).
   */
  compact?: boolean;
}

/**
 * Shared songs marquee — a horizontal drifting carousel of SongCards.
 * The parent owns the section header (icon + title + "View All" link, if any);
 * this component only renders the carousel body.
 */
export const SongsMarquee = ({
  bleed = true,
  songs: controlledSongs,
  compact = false,
}: SongsMarqueeProps = {}) => {
  const isControlled = controlledSongs !== undefined;

  // Uncontrolled: draw a fresh shuffle-bag batch on mount and persist the
  // remainder so the next load continues through the roster (see
  // drawMarqueeBatch). Controlled mode derives its batch from the passed list
  // below and leaves the shared bag untouched.
  const [{ batch, nextBag }] = useState(() =>
    isControlled
      ? { batch: [] as string[], nextBag: [] as string[] }
      : drawMarqueeBatch(),
  );

  useEffect(() => {
    if (isControlled) return;
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(nextBag));
    } catch {
      // localStorage unavailable — this load still shows a fresh random batch.
    }
  }, [isControlled, nextBag]);

  const songs = useMemo<Song[]>(() => {
    if (controlledSongs !== undefined) {
      // Reflect the caller's filter: one card per eligible artist, random batch.
      return shuffleInPlace(dedupeByArtist(controlledSongs)).slice(
        0,
        MARQUEE_BATCH_SIZE,
      );
    }
    return batch
      .map((id) => getSong(id))
      .filter((song): song is Song => Boolean(song));
  }, [controlledSongs, batch]);

  // Nothing to show (e.g. a filter that matches no SVG-portrait artists) →
  // render nothing so the strip collapses instead of leaving an empty bar.
  if (songs.length === 0) return null;

  // Doubled for the seamless-loop pattern — see songs-marquee.css.
  const marqueeSongs = [...songs, ...songs];

  return (
    <div
      className={cn(
        'song-marquee overflow-hidden',
        compact ? 'py-2' : 'py-4',
        bleed && '-mx-6 md:-mx-10',
      )}
    >
      <div
        className={cn(
          'song-marquee-track flex w-max px-6 md:px-10',
          compact ? 'gap-3' : 'gap-4 md:gap-5',
        )}
      >
        {marqueeSongs.map((song, i) => (
          <div
            key={i}
            className={cn(
              'flex-shrink-0',
              compact ? 'w-[120px] md:w-[132px]' : 'w-[260px] md:w-[300px]',
            )}
          >
            <SongCard
              song={song}
              hoverScrim={false}
              bleedOnHover
              compact={compact}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
