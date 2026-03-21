import type { ScaleFamilyMode } from './modeHelpers';

export const MELODIC_MINOR_MODES: ScaleFamilyMode[] = [
  // ── Mode 1: Melodic Minor ──────────────────────────────────────────────
  {
    modeName: 'Melodic Minor',
    modeSlug: 'melodicminor',
    intervals: '1, 2, ♭3, 4, 5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E♭', 'F', 'G', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B♭', 'C', 'D', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E#'] },
      {
        root: 'D♭',
        notes: ['D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭', 'C'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F', 'G'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C', 'D♭', 'E♭', 'F', 'G', 'A'],
      },
      { root: 'F', notes: ['F', 'G', 'A♭', 'B♭', 'C', 'D', 'E'] },
    ],
  },
  // ── Mode 2: Dorian ♭2 ──────────────────────────────────────────────────
  {
    modeName: 'Dorian ♭2',
    modeSlug: 'dorian♭2',
    intervals: '1, ♭2, ♭3, 4, 5, 6, ♭7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D♭', 'E♭', 'F', 'G', 'A', 'B♭'],
      },
      { root: 'G', notes: ['G', 'A♭', 'B♭', 'C', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E♭', 'F', 'G', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B♭', 'C', 'D', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G', 'A', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E', 'F#', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B', 'C#', 'D#', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F#', 'G#', 'A#', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C#', 'D#', 'E#', 'F#'] },
      {
        root: 'E♭',
        notes: ['E♭', 'F♭', 'G♭', 'A♭', 'B♭', 'C', 'D♭'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C♭', 'D♭', 'E♭', 'F', 'G', 'A♭'],
      },
      {
        root: 'F',
        notes: ['F', 'G♭', 'A♭', 'B♭', 'C', 'D', 'E♭'],
      },
    ],
  },
  // ── Mode 3: Lydian Augmented ────────────────────────────────────────────
  {
    modeName: 'Lydian Augmented',
    modeSlug: 'lydianaugmented',
    intervals: '1, 2, 3, #4, #5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F#', 'G#', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C#', 'D#', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G#', 'A#', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D#', 'E#', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A#', 'B#', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E#', 'FX', 'G#', 'A#'] },
      {
        root: 'G♭',
        notes: ['G♭', 'A♭', 'B♭', 'C', 'D', 'E♭', 'F'],
      },
      {
        root: 'D♭',
        notes: ['D♭', 'E♭', 'F', 'G', 'A', 'B♭', 'C'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C', 'D', 'E', 'F', 'G'],
      },
      { root: 'E♭', notes: ['E♭', 'F', 'G', 'A', 'B', 'C', 'D'] },
      { root: 'B♭', notes: ['B♭', 'C', 'D', 'E', 'F#', 'G', 'A'] },
      { root: 'F', notes: ['F', 'G', 'A', 'B', 'C#', 'D', 'E'] },
    ],
  },
  // ── Mode 4: Lydian Dominant ─────────────────────────────────────────────
  {
    modeName: 'Lydian Dominant',
    modeSlug: 'lydiandominant',
    intervals: '1, 2, 3, #4, 5, 6, ♭7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'B♭'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C#', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G#', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D#', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A#', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E#', 'F#', 'G#', 'A'] },
      {
        root: 'G♭',
        notes: ['G♭', 'A♭', 'B♭', 'C', 'D♭', 'E♭', 'F♭'],
      },
      {
        root: 'D♭',
        notes: ['D♭', 'E♭', 'F', 'G', 'A♭', 'B♭', 'C♭'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C', 'D', 'E♭', 'F', 'G♭'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F', 'G', 'A', 'B♭', 'C', 'D♭'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C', 'D', 'E', 'F', 'G', 'A♭'],
      },
      { root: 'F', notes: ['F', 'G', 'A', 'B', 'C', 'D', 'E♭'] },
    ],
  },
  // ── Mode 5: Mixolydian ♭6 ──────────────────────────────────────────────
  {
    modeName: 'Mixolydian ♭6',
    modeSlug: 'mixolydiannat6',
    intervals: '1, 2, 3, 4, 5, ♭6, ♭7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F', 'G', 'A♭', 'B♭'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C', 'D', 'E♭', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G', 'A', 'B♭', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D', 'E', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A', 'B', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E', 'F#', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D#', 'E#', 'F#', 'G#', 'A', 'B'] },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F♭', 'G♭'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F', 'G', 'A♭', 'B♭', 'C♭', 'D♭'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C', 'D', 'E♭', 'F', 'G♭', 'A♭'],
      },
      {
        root: 'F',
        notes: ['F', 'G', 'A', 'B♭', 'C', 'D♭', 'E♭'],
      },
    ],
  },
  // ── Mode 6: Locrian ♮2 ─────────────────────────────────────────────────
  {
    modeName: 'Locrian ♮2',
    modeSlug: 'locriannat2',
    intervals: '1, 2, ♭3, 4, ♭5, ♭6, ♭7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D', 'E♭', 'F', 'G♭', 'A♭', 'B♭'],
      },
      {
        root: 'G',
        notes: ['G', 'A', 'B♭', 'C', 'D♭', 'E♭', 'F'],
      },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A♭', 'B♭', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E♭', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B♭', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D#', 'E', 'F#', 'G', 'A', 'B'] },
      { root: 'G#', notes: ['G#', 'A#', 'B', 'C#', 'D', 'E', 'F#'] },
      { root: 'D#', notes: ['D#', 'E#', 'F#', 'G#', 'A', 'B', 'C#'] },
      { root: 'A#', notes: ['A#', 'B#', 'C#', 'D#', 'E', 'F#', 'G#'] },
      {
        root: 'F',
        notes: ['F', 'G', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭'],
      },
    ],
  },
  // ── Mode 7: Altered Dominant ────────────────────────────────────────────
  {
    modeName: 'Altered Dominant',
    modeSlug: 'altereddominant',
    intervals: '1, ♭2, ♭3, ♭4, ♭5, ♭6, ♭7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B♭'],
      },
      {
        root: 'G',
        notes: ['G', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F'],
      },
      {
        root: 'D',
        notes: ['D', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'],
      },
      {
        root: 'A',
        notes: ['A', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G'],
      },
      { root: 'E', notes: ['E', 'F', 'G', 'A♭', 'B♭', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E♭', 'F', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B♭', 'C', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F', 'G', 'A', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C', 'D', 'E', 'F#'] },
      { root: 'D#', notes: ['D#', 'E', 'F#', 'G#', 'A', 'B', 'C#'] },
      { root: 'A#', notes: ['A#', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
      {
        root: 'F',
        notes: ['F', 'G♭', 'A♭', 'B\u{1D12B}', 'C♭', 'D♭', 'E♭'],
      },
    ],
  },
];
