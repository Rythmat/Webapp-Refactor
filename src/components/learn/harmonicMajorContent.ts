import type { ScaleFamilyMode } from './modeHelpers';

export const HARMONIC_MAJOR_MODES: ScaleFamilyMode[] = [
  // ── Mode 1: Harmonic Major ──────────────────────────────────────────
  {
    modeName: 'Harmonic Major',
    modeSlug: 'harmonicmajor',
    intervals: '1, 2, 3, 4, 5, ♭6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F', 'G', 'A♭', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C', 'D', 'E♭', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G', 'A', 'B♭', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D', 'E', 'F', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A', 'B', 'C', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E', 'F#', 'G', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D', 'E#'] },
      { root: 'D♭', notes: ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B𝄫', 'C'] },
      { root: 'A♭', notes: ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F♭', 'G'] },
      { root: 'E♭', notes: ['E♭', 'F', 'G', 'A♭', 'B♭', 'C♭', 'D'] },
      { root: 'B♭', notes: ['B♭', 'C', 'D', 'E♭', 'F', 'G♭', 'A'] },
      { root: 'F', notes: ['F', 'G', 'A', 'B♭', 'C', 'D♭', 'E'] },
    ],
  },

  // ── Mode 2: Dorian ♭5 ───────────────────────────────────────────────
  {
    modeName: 'Dorian ♭5',
    modeSlug: 'dorian♭5',
    intervals: '1, 2, ♭3, 4, ♭5, 6, ♭7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E♭', 'F', 'G♭', 'A', 'B♭'] },
      { root: 'G', notes: ['G', 'A', 'B♭', 'C', 'D♭', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A♭', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E♭', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B♭', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C', 'D#', 'E'] },
      { root: 'C#', notes: ['C#', 'D#', 'E', 'F#', 'G', 'A#', 'B'] },
      { root: 'G#', notes: ['G#', 'A#', 'B', 'C#', 'D', 'E#', 'F#'] },
      { root: 'E♭', notes: ['E♭', 'F', 'G♭', 'A♭', 'B𝄫', 'C', 'D♭'] },
      { root: 'B♭', notes: ['B♭', 'C', 'D♭', 'E♭', 'F♭', 'G', 'A♭'] },
      { root: 'F', notes: ['F', 'G', 'A♭', 'B♭', 'C♭', 'D', 'E♭'] },
    ],
  },

  // ── Mode 3: Altered Dominant ♮5 ─────────────────────────────────────
  {
    modeName: 'Altered Dominant ♮5',
    modeSlug: 'altereddominantnat5',
    intervals: '1, ♭2, ♭3, ♭4, 5, ♭6, ♭7',
    keys: [
      { root: 'C', notes: ['C', 'D♭', 'E♭', 'F♭', 'G', 'A♭', 'B♭'] },
      { root: 'G', notes: ['G', 'A♭', 'B♭', 'C♭', 'D', 'E♭', 'F'] },
      { root: 'D', notes: ['D', 'E♭', 'F', 'G♭', 'A', 'B♭', 'C'] },
      { root: 'A', notes: ['A', 'B♭', 'C', 'D♭', 'E', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G', 'A♭', 'B', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E♭', 'F#', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B♭', 'C#', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F', 'G#', 'A', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C', 'D#', 'E', 'F#'] },
      { root: 'D#', notes: ['D#', 'E', 'F#', 'G', 'A#', 'B', 'C#'] },
      { root: 'A#', notes: ['A#', 'B', 'C#', 'D', 'E#', 'F#', 'G#'] },
      { root: 'F', notes: ['F', 'G♭', 'A♭', 'B𝄫', 'C', 'D♭', 'E♭'] },
    ],
  },

  // ── Mode 4: Melodic Minor #4 ───────────────────────────────────────
  {
    modeName: 'Melodic Minor #4',
    modeSlug: 'melodicminor#4',
    intervals: '1, 2, ♭3, #4, 5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E♭', 'F#', 'G', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B♭', 'C#', 'D', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G#', 'A', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D#', 'E', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A#', 'B', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E#', 'F#', 'G#', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B#', 'C#', 'D#', 'E#'] },
      { root: 'D♭', notes: ['D♭', 'E♭', 'F♭', 'G', 'A♭', 'B♭', 'C'] },
      { root: 'A♭', notes: ['A♭', 'B♭', 'C♭', 'D', 'E♭', 'F', 'G'] },
      { root: 'E♭', notes: ['E♭', 'F', 'G♭', 'A', 'B♭', 'C', 'D'] },
      { root: 'B♭', notes: ['B♭', 'C', 'D♭', 'E', 'F', 'G', 'A'] },
      { root: 'F', notes: ['F', 'G', 'A♭', 'B', 'C', 'D', 'E'] },
    ],
  },

  // ── Mode 5: Mixolydian ♭2 ──────────────────────────────────────────
  {
    modeName: 'Mixolydian ♭2',
    modeSlug: 'mixolydian♭2',
    intervals: '1, ♭2, 3, 4, 5, 6, ♭7',
    keys: [
      { root: 'C', notes: ['C', 'D♭', 'E', 'F', 'G', 'A', 'B♭'] },
      { root: 'G', notes: ['G', 'A♭', 'B', 'C', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E♭', 'F#', 'G', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B♭', 'C#', 'D', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G#', 'A', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D#', 'E', 'F#', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A#', 'B', 'C#', 'D#', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E#', 'F#', 'G#', 'A#', 'B'] },
      { root: 'A♭', notes: ['A♭', 'B', 'C', 'D♭', 'E♭', 'F', 'G♭'] },
      { root: 'E♭', notes: ['E♭', 'F♭', 'G', 'A♭', 'B♭', 'C', 'D♭'] },
      { root: 'B♭', notes: ['B♭', 'C♭', 'D', 'E♭', 'F', 'G', 'A♭'] },
      { root: 'F', notes: ['F', 'G♭', 'A', 'B♭', 'C', 'D', 'E♭'] },
    ],
  },

  // ── Mode 6: Lydian Augmented #2 ────────────────────────────────────
  {
    modeName: 'Lydian Augmented #2',
    modeSlug: 'lydianaugmented#2',
    intervals: '1, ♯2, 3, ♯4, ♯5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D#', 'E', 'F#', 'G#', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A#', 'B', 'C#', 'D#', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'BX', 'C#', 'D#', 'E#', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'FX', 'G#', 'A#', 'B#', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'CX', 'D#', 'E#', 'F#', 'G#', 'A#'] },
      { root: 'G♭', notes: ['G♭', 'A', 'B♭', 'C', 'D', 'E♭', 'F'] },
      { root: 'D♭', notes: ['D♭', 'E', 'F', 'G', 'A', 'B♭', 'C'] },
      { root: 'A♭', notes: ['A♭', 'B', 'C', 'D', 'E', 'F', 'G'] },
      { root: 'E♭', notes: ['E♭', 'F#', 'G', 'A', 'B', 'C', 'D'] },
      { root: 'B♭', notes: ['B♭', 'C#', 'D', 'E', 'F#', 'G', 'A'] },
      { root: 'F', notes: ['F', 'G#', 'A', 'B', 'C#', 'D', 'E'] },
    ],
  },

  // ── Mode 7: Locrian 𝄫7 ─────────────────────────────────────────────
  {
    modeName: 'Locrian 𝄫7',
    modeSlug: 'locrian𝄫7',
    intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, 𝄫7',
    keys: [
      { root: 'C', notes: ['C', 'D♭', 'E♭', 'F', 'G♭', 'A♭', 'B𝄫'] },
      { root: 'G', notes: ['G', 'A♭', 'B♭', 'C', 'D♭', 'E♭', 'F♭'] },
      { root: 'D', notes: ['D', 'E♭', 'F', 'G', 'A♭', 'B♭', 'C♭'] },
      { root: 'A', notes: ['A', 'B♭', 'C', 'D', 'E♭', 'F', 'G♭'] },
      { root: 'E', notes: ['E', 'F', 'G', 'A', 'B♭', 'C', 'D♭'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E', 'F', 'G', 'A♭'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B', 'C', 'D', 'E♭'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F#', 'G', 'A', 'B♭'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C#', 'D', 'E', 'F'] },
      { root: 'D#', notes: ['D#', 'E', 'F#', 'G#', 'A', 'B', 'C'] },
      { root: 'A#', notes: ['A#', 'B', 'C#', 'D#', 'E', 'F#', 'G'] },
      { root: 'E#', notes: ['E#', 'F#', 'G#', 'A#', 'B', 'C#', 'D'] },
    ],
  },
];
