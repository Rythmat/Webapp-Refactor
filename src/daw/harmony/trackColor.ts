import { useCallback } from 'react';
import { useStore, type AllSlices } from '@/daw/store';

// ── Harmony Color (owner, 2026-10-22) ──────────────────────────────────────
//
// The timeline display's one switch (it was "Colour clips by: Track or
// Harmony"; the store keeps it as clipColorMode). On, a song with a key
// centre colours its tracks and clips by the key centre (rootTrackColor) and
// its notes by their chords; off, every track keeps its own colour, key or
// no key. A track's own colour is never overwritten by the key: each place
// that draws a track asks here which colour it shows.

type ColourState = Pick<AllSlices, 'clipColorMode' | 'rootTrackColor'>;

/** Whether Harmony Color is on. */
export const harmonyColorOn = (s: Pick<AllSlices, 'clipColorMode'>): boolean =>
  s.clipColorMode === 'prism';

/** The colour a track shows: the key centre's under Harmony Color, else its own. */
export function trackColorOf(color: string, s: ColourState): string {
  return harmonyColorOn(s) && s.rootTrackColor ? s.rootTrackColor : color;
}

/**
 * trackColorOf as a function, for a list that colours many tracks; it
 * changes when the switch or the key does.
 */
export function useTrackColorOf(): (color: string) => string {
  const clipColorMode = useStore((s) => s.clipColorMode);
  const rootTrackColor = useStore((s) => s.rootTrackColor);
  return useCallback(
    (color: string) => trackColorOf(color, { clipColorMode, rootTrackColor }),
    [clipColorMode, rootTrackColor],
  );
}

/** trackColorOf, following the switch and the key as they change. */
export function useTrackColor(color: string): string {
  return useStore((s) => trackColorOf(color, s));
}
