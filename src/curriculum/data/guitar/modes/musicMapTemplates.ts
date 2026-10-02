// ── Guitar modes: Music Map progressions ──────────────────────────────────
// The chords of each mode's five Music Maps, built on the chord that carries
// its colour note (modeTables.COLOUR_CHORD): Dorian i–IV, Phrygian i–♭II,
// Lydian I–II, Mixolydian I–♭VII, Aeolian i–♭VI–♭VII, Locrian i°–♭II.
// Bar counts and rhythms follow the same key's Book One maps; Examples 1-3
// are triads and 4-5 are 7th chords, as in the book. Edit freely: each row
// must keep the book's bar counts (1, 2, 2, 4, 4).

import type { GuitarModalMode, ScaleDegree } from '../types';

export type ModeMapDegrees = readonly [
  readonly [ScaleDegree],
  readonly [ScaleDegree, ScaleDegree],
  readonly [ScaleDegree, ScaleDegree],
  readonly [ScaleDegree, ScaleDegree, ScaleDegree, ScaleDegree],
  readonly [ScaleDegree, ScaleDegree, ScaleDegree, ScaleDegree],
];

export const MODE_MUSIC_MAPS: Readonly<
  Record<GuitarModalMode, ModeMapDegrees>
> = {
  dorian: [[1], [1, 4], [1, 2], [1, 4, 1, 4], [1, 7, 4, 1]],
  phrygian: [[1], [1, 2], [1, 7], [1, 2, 1, 2], [1, 2, 3, 2]],
  lydian: [[1], [1, 2], [1, 7], [1, 2, 1, 2], [1, 2, 7, 1]],
  mixolydian: [[1], [1, 7], [1, 5], [1, 7, 4, 1], [1, 5, 7, 1]],
  aeolian: [[1], [1, 6], [1, 4], [1, 6, 7, 1], [1, 4, 6, 7]],
  locrian: [[1], [1, 2], [1, 5], [1, 2, 1, 2], [1, 2, 6, 1]],
};
