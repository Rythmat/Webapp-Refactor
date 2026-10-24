import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * Artists match regardless of case and spacing ("Ace Of Base" and "Ace of
 * Base" are one).
 */
const dedupeByArtist = (songs: Song[]): Song[] => {
  const seen = new Set<string>();
  const out: Song[] = [];
  for (const song of songs) {
    if (!hasArtistPortrait(song)) continue;
    const artist = song.artist.trim().replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(artist)) continue;
    seen.add(artist);
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
  /**
   * Scrolled by hand instead of drifting (the Home page's Songs row): every
   * artist with a portrait, one random song each (owner, 2026-10-23: no
   * artist twice, no song without artwork), not a batch of 30, shuffled on
   * each load, in a horizontal scroller with arrow buttons for a mouse
   * without a sideways wheel, and no play button over a card on hover.
   * Leaves the shuffle-bag alone. Defaults to false
   * (the drifting ticker, e.g. Learn's Songs tab).
   */
  scrollable?: boolean;
}

/**
 * Shared songs marquee — a horizontal drifting carousel of SongCards, or with
 * `scrollable` a strip the user scrolls by hand.
 * The parent owns the section header (icon + title + "View All" link, if any);
 * this component only renders the carousel body.
 */
export const SongsMarquee = ({
  bleed = true,
  songs: controlledSongs,
  compact = false,
  scrollable = false,
}: SongsMarqueeProps = {}) => {
  const isControlled = controlledSongs !== undefined;

  // Uncontrolled: draw a fresh shuffle-bag batch on mount and persist the
  // remainder so the next load continues through the roster (see
  // drawMarqueeBatch). Controlled mode derives its batch from the passed list
  // below and leaves the shared bag untouched.
  // Scrollable draws its own order: the whole library, shuffled per load.
  const usesBag = !isControlled && !scrollable;
  const [{ batch, nextBag }] = useState(() => {
    if (usesBag) return drawMarqueeBatch();
    // Shuffled before the artist dedupe, so each artist's song is a random
    // one of theirs, and the order is new, on every load.
    const batch =
      scrollable && !isControlled
        ? dedupeByArtist(shuffleInPlace([...getAllSongs()])).map((s) => s.id)
        : [];
    return { batch, nextBag: [] as string[] };
  });

  useEffect(() => {
    if (!usesBag) return;
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(nextBag));
    } catch {
      // localStorage unavailable — this load still shows a fresh random batch.
    }
  }, [usesBag, nextBag]);

  const songs = useMemo<Song[]>(() => {
    if (controlledSongs !== undefined) {
      if (scrollable)
        return dedupeByArtist(shuffleInPlace([...controlledSongs]));
      // Reflect the caller's filter: one card per eligible artist, random batch.
      return shuffleInPlace(dedupeByArtist(controlledSongs)).slice(
        0,
        MARQUEE_BATCH_SIZE,
      );
    }
    return batch
      .map((id) => getSong(id))
      .filter((song): song is Song => Boolean(song));
  }, [controlledSongs, batch, scrollable]);

  // Nothing to show (e.g. a filter that matches no SVG-portrait artists) →
  // render nothing so the strip collapses instead of leaving an empty bar.
  if (songs.length === 0) return null;

  if (scrollable) return <ScrollableSongs songs={songs} compact={compact} />;

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
              compact
                ? 'w-[7.5rem] md:w-[8.25rem]'
                : 'w-[16.25rem] md:w-[18.75rem]',
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

/** Whether the scroller has more to show on each side (2px of slack for
 *  fractional scroll positions). */
const scrollEdges = (el: HTMLElement) => ({
  prev: el.scrollLeft > 2,
  next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
});

/**
 * The hand-scrolled strip: a trackpad, a sideways wheel, a swipe or the arrow
 * buttons move it, a card at a time snapping into place. It holds the whole
 * library, so a card off screen skips its rendering (content-visibility). The edges fade where
 * there's more to scroll, and each arrow shows only while its side has more.
 */
const ScrollableSongs = ({
  songs,
  compact,
}: {
  songs: Song[];
  compact: boolean;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => setEdges(scrollEdges(el));
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [songs]);

  // About a view's width a press, keeping a card of the last view in sight.
  const page = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, []);

  const fade = (on: boolean) => (on ? '48px' : '0px');

  return (
    <div className="group/songs relative">
      <div
        ref={scrollerRef}
        data-testid="songs-scroller"
        className={cn(
          'song-marquee-scroller -mx-2 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-2 px-2',
          compact ? 'gap-3 py-2' : 'gap-4 py-4 md:gap-5',
        )}
        style={{
          maskImage: `linear-gradient(to right, transparent, #000 ${fade(edges.prev)}, #000 calc(100% - ${fade(edges.next)}), transparent)`,
          WebkitMaskImage: `linear-gradient(to right, transparent, #000 ${fade(edges.prev)}, #000 calc(100% - ${fade(edges.next)}), transparent)`,
        }}
      >
        {songs.map((song) => (
          <div
            key={song.id}
            className={cn(
              'flex-shrink-0 snap-start [content-visibility:auto] [contain-intrinsic-block-size:auto_22.5rem]',
              compact
                ? 'w-[7.5rem] md:w-[8.25rem]'
                : 'w-[16.25rem] md:w-[18.75rem]',
            )}
          >
            <SongCard
              song={song}
              hoverScrim={false}
              playOverlay={false}
              bleedOnHover
              compact={compact}
            />
          </div>
        ))}
      </div>
      <ScrollArrow side="prev" shown={edges.prev} onClick={() => page(-1)} />
      <ScrollArrow side="next" shown={edges.next} onClick={() => page(1)} />
    </div>
  );
};

const ScrollArrow = ({
  side,
  shown,
  onClick,
}: {
  side: 'prev' | 'next';
  shown: boolean;
  onClick(): void;
}) => {
  const Icon = side === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === 'prev' ? 'Scroll songs left' : 'Scroll songs right'}
      onClick={onClick}
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown || undefined}
      className={cn(
        'absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-sm transition-opacity duration-150 hover:bg-black/85 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        side === 'prev' ? 'left-2' : 'right-2',
        shown
          ? 'opacity-0 group-hover/songs:opacity-100 [@media(hover:none)]:opacity-100'
          : 'pointer-events-none opacity-0',
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
};
