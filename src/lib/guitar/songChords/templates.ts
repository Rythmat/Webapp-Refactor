// ── Song chords: movable shapes ────────────────────────────────────────────
// Every song chord that has no open shape is played as a movable grip, in
// root position: Drop 2 for four-note chords (as the Theory lessons), barre
// or four-string triads, and the colour-chord grips players use for 7(♯9),
// 9 and 13. Offsets are frets above the root, string 6 first; null = muted.
// The Theory lessons' grips (lib/guitar/theory/grips.ts) are reused where
// they cover the chord.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import { GRIP_TEMPLATES } from '@/lib/guitar/theory/grips';
import type { FingerNumber } from '@/lib/guitar/types';
import type { SongChordQuality } from './quality';

export interface SongTemplate {
  quality: SongChordQuality;
  rootString: 5 | 6;
  offsets: readonly (number | null)[];
  fingers: readonly (FingerNumber | null)[];
}

const X = null;

const t = (
  quality: SongChordQuality,
  rootString: 5 | 6,
  offsets: readonly (number | null)[],
  fingers: readonly (FingerNumber | null)[],
): SongTemplate => ({ quality, rootString, offsets, fingers });

/** The Theory grips songs reuse, by the song quality they play. */
const REUSED: Readonly<Partial<Record<SongChordQuality, BookChordQuality>>> = {
  maj7: 'maj7',
  dom7: 'dom7',
  min7: 'min7',
  min7b5: 'min7b5',
  dim7: 'dim7',
  min6: 'min6',
  dim: 'dim',
  aug: 'aug',
};

const reused: SongTemplate[] = GRIP_TEMPLATES.flatMap((grip) => {
  const quality = (Object.keys(REUSED) as SongChordQuality[]).find(
    (q) => REUSED[q] === grip.quality,
  );
  return quality
    ? [t(quality, grip.rootString as 5 | 6, grip.offsets, grip.fingers)]
    : [];
});

/** Every movable song grip. */
export const SONG_TEMPLATES: readonly SongTemplate[] = [
  ...reused,
  // Triads: the root-6 full barre strummers use, and Book One's root-5 grips.
  t('maj', 6, [0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]),
  t('min', 6, [0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]),
  t('maj', 5, [X, 0, 2, 2, 2, X], [X, 1, 3, 3, 3, X]),
  t('min', 5, [X, 0, 2, 2, 1, X], [X, 1, 3, 4, 2, X]),
  t('power', 6, [0, 2, 2, X, X, X], [1, 3, 4, X, X, X]),
  t('power', 5, [X, 0, 2, 2, X, X], [X, 1, 3, 4, X, X]),
  // No root-6 sus2: its 2 sits a fret below the root, a backwards reach.
  t('sus2', 5, [X, 0, 2, 2, 0, X], [X, 1, 3, 4, 1, X]),
  t('sus4', 6, [0, 2, 2, 2, X, X], [1, 2, 3, 4, X, X]),
  t('sus4', 5, [X, 0, 2, 2, 3, X], [X, 1, 2, 3, 4, X]),
  t('add9', 5, [X, 0, -1, -3, 0, X], [X, 3, 2, 1, 4, X]),
  // Four-note chords, Drop 2 (R-5-6-3, R-5-♭7-4, R-♯5-♭7-3).
  t('maj6', 6, [0, 2, -1, 1, X, X], [2, 4, 1, 3, X, X]),
  t('maj6', 5, [X, 0, 2, -1, 2, X], [X, 2, 3, 1, 4, X]),
  t('dom7sus4', 6, [0, 2, 0, 2, X, X], [1, 3, 1, 4, X, X]),
  t('dom7sus4', 5, [X, 0, 2, 0, 3, X], [X, 1, 3, 1, 4, X]),
  t('dom7#5', 6, [0, 3, 0, 1, X, X], [1, 4, 2, 3, X, X]),
  t('dom7#5', 5, [X, 0, 3, 0, 2, X], [X, 1, 4, 2, 3, X]),
  // 7(no 3): R 5 ♭7.
  t('dom7no3', 6, [0, 2, 0, X, X, X], [1, 3, 1, X, X, X]),
  t('dom7no3', 5, [X, 0, 2, 0, X, X], [X, 1, 3, 1, X, X]),
  // Colour chords, root on string 5: E7(♯9) is X-7-6-7-8-X.
  t('dom7#9', 5, [X, 0, -1, 0, 1, X], [X, 2, 1, 3, 4, X]),
  t('dom7b9', 5, [X, 0, -1, 0, -1, X], [X, 2, 1, 3, 1, X]),
  t('dom7alt', 5, [X, 0, -1, 0, 1, 1], [X, 2, 1, 3, 4, 4]),
  t('dom9', 5, [X, 0, -1, 0, 0, 0], [X, 2, 1, 3, 3, 3]),
  t('dom13', 5, [X, 0, -1, 0, 0, 2], [X, 2, 1, 3, 3, 4]),
  t('dom13', 6, [0, X, 0, 1, 2, X], [1, X, 2, 3, 4, X]),
  t('maj9', 5, [X, 0, -1, 1, 0, X], [X, 2, 1, 4, 3, X]),
  t('maj7#11', 5, [X, 0, 1, 1, 2, X], [X, 1, 2, 3, 4, X]),
];

/** A movable slash chord: offsets above the bass note's fret. */
export interface SlashTemplate {
  quality: SongChordQuality;
  /** The bass's distance above the root, in semitones (3rd = 4). */
  bassInterval: number;
  bassString: 5 | 6;
  offsets: readonly (number | null)[];
  fingers: readonly (FingerNumber | null)[];
}

const s = (
  quality: SongChordQuality,
  bassInterval: number,
  bassString: 5 | 6,
  offsets: readonly (number | null)[],
  fingers: readonly (FingerNumber | null)[],
): SlashTemplate => ({ quality, bassInterval, bassString, offsets, fingers });

/** The slash chords guitarists grip as one shape (B/D♯, B♭/C, Fm7/B♭). */
export const SLASH_TEMPLATES: readonly SlashTemplate[] = [
  // Major, 3rd in the bass: B/D♯ = X-6-4-4-4-X.
  s('maj', 4, 5, [X, 0, -2, -2, -2, X], [X, 3, 1, 1, 1, X]),
  s('maj', 4, 6, [0, X, -2, 0, 1, X], [2, X, 1, 3, 4, X]),
  // Major, 5th in the bass: B/F♯ = 2-2-4-4-4-2.
  s('maj', 7, 6, [0, 0, 2, 2, 2, 0], [1, 1, 2, 3, 4, 1]),
  s('maj', 7, 5, [X, 0, 0, -1, -2, X], [X, 3, 4, 2, 1, X]),
  // Minor, 5th or ♭3 in the bass.
  s('min', 7, 6, [0, 0, 2, 2, 1, 0], [1, 1, 3, 4, 2, 1]),
  s('min', 3, 5, [X, 0, -1, -1, -2, X], [X, 4, 2, 3, 1, X]),
  // Major over the note a whole step up (D/E, B♭/C): one barre.
  s('maj', 2, 5, [X, 0, 0, 0, 0, X], [X, 1, 1, 1, 1, X]),
  // Minor 7 over its 4th (Fm7/B♭ = X-1-1-1-1-1): one barre.
  s('min7', 5, 5, [X, 0, 0, 0, 0, 0], [X, 1, 1, 1, 1, 1]),
];
