import type { ScaleFamilyMode } from './modeHelpers';

export const MELODIC_MINOR_MODES: ScaleFamilyMode[] = [
  // ── Mode 1: Melodic Minor ──────────────────────────────────────────────
  {
    modeName: 'Melodic Minor',
    modeSlug: 'melodicminor',
    intervals: '1, 2, \u266D3, 4, 5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E\u266D', 'F', 'G', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B\u266D', 'C', 'D', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E#'] },
      {
        root: 'D\u266D',
        notes: [
          'D\u266D',
          'E\u266D',
          'F\u266D',
          'G\u266D',
          'A\u266D',
          'B\u266D',
          'C',
        ],
      },
      {
        root: 'A\u266D',
        notes: [
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D\u266D',
          'E\u266D',
          'F',
          'G',
        ],
      },
      {
        root: 'E\u266D',
        notes: ['E\u266D', 'F', 'G\u266D', 'A\u266D', 'B\u266D', 'C', 'D'],
      },
      {
        root: 'B\u266D',
        notes: ['B\u266D', 'C', 'D\u266D', 'E\u266D', 'F', 'G', 'A'],
      },
      { root: 'F', notes: ['F', 'G', 'A\u266D', 'B\u266D', 'C', 'D', 'E'] },
    ],
  },
  // ── Mode 2: Dorian ♭2 ──────────────────────────────────────────────────
  {
    modeName: 'Dorian ♭2',
    modeSlug: 'dorian\u266D2',
    intervals: '1, \u266D2, \u266D3, 4, 5, 6, \u266D7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D\u266D', 'E\u266D', 'F', 'G', 'A', 'B\u266D'],
      },
      { root: 'G', notes: ['G', 'A\u266D', 'B\u266D', 'C', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E\u266D', 'F', 'G', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B\u266D', 'C', 'D', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G', 'A', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E', 'F#', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B', 'C#', 'D#', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F#', 'G#', 'A#', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C#', 'D#', 'E#', 'F#'] },
      {
        root: 'E\u266D',
        notes: [
          'E\u266D',
          'F\u266D',
          'G\u266D',
          'A\u266D',
          'B\u266D',
          'C',
          'D\u266D',
        ],
      },
      {
        root: 'B\u266D',
        notes: [
          'B\u266D',
          'C\u266D',
          'D\u266D',
          'E\u266D',
          'F',
          'G',
          'A\u266D',
        ],
      },
      {
        root: 'F',
        notes: ['F', 'G\u266D', 'A\u266D', 'B\u266D', 'C', 'D', 'E\u266D'],
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
        root: 'G\u266D',
        notes: ['G\u266D', 'A\u266D', 'B\u266D', 'C', 'D', 'E\u266D', 'F'],
      },
      {
        root: 'D\u266D',
        notes: ['D\u266D', 'E\u266D', 'F', 'G', 'A', 'B\u266D', 'C'],
      },
      {
        root: 'A\u266D',
        notes: ['A\u266D', 'B\u266D', 'C', 'D', 'E', 'F', 'G'],
      },
      { root: 'E\u266D', notes: ['E\u266D', 'F', 'G', 'A', 'B', 'C', 'D'] },
      { root: 'B\u266D', notes: ['B\u266D', 'C', 'D', 'E', 'F#', 'G', 'A'] },
      { root: 'F', notes: ['F', 'G', 'A', 'B', 'C#', 'D', 'E'] },
    ],
  },
  // ── Mode 4: Lydian Dominant ─────────────────────────────────────────────
  {
    modeName: 'Lydian Dominant',
    modeSlug: 'lydiandominant',
    intervals: '1, 2, 3, #4, 5, 6, \u266D7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'B\u266D'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C#', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G#', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D#', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A#', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E#', 'F#', 'G#', 'A'] },
      {
        root: 'G\u266D',
        notes: [
          'G\u266D',
          'A\u266D',
          'B\u266D',
          'C',
          'D\u266D',
          'E\u266D',
          'F\u266D',
        ],
      },
      {
        root: 'D\u266D',
        notes: [
          'D\u266D',
          'E\u266D',
          'F',
          'G',
          'A\u266D',
          'B\u266D',
          'C\u266D',
        ],
      },
      {
        root: 'A\u266D',
        notes: ['A\u266D', 'B\u266D', 'C', 'D', 'E\u266D', 'F', 'G\u266D'],
      },
      {
        root: 'E\u266D',
        notes: ['E\u266D', 'F', 'G', 'A', 'B\u266D', 'C', 'D\u266D'],
      },
      {
        root: 'B\u266D',
        notes: ['B\u266D', 'C', 'D', 'E', 'F', 'G', 'A\u266D'],
      },
      { root: 'F', notes: ['F', 'G', 'A', 'B', 'C', 'D', 'E\u266D'] },
    ],
  },
  // ── Mode 5: Mixolydian ♭6 ──────────────────────────────────────────────
  {
    modeName: 'Mixolydian ♭6',
    modeSlug: 'mixolydiannat6',
    intervals: '1, 2, 3, 4, 5, \u266D6, \u266D7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F', 'G', 'A\u266D', 'B\u266D'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C', 'D', 'E\u266D', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G', 'A', 'B\u266D', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D', 'E', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A', 'B', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E', 'F#', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A#', 'B', 'C#', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D#', 'E#', 'F#', 'G#', 'A', 'B'] },
      {
        root: 'A\u266D',
        notes: [
          'A\u266D',
          'B\u266D',
          'C',
          'D\u266D',
          'E\u266D',
          'F\u266D',
          'G\u266D',
        ],
      },
      {
        root: 'E\u266D',
        notes: [
          'E\u266D',
          'F',
          'G',
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D\u266D',
        ],
      },
      {
        root: 'B\u266D',
        notes: ['B\u266D', 'C', 'D', 'E\u266D', 'F', 'G\u266D', 'A\u266D'],
      },
      {
        root: 'F',
        notes: ['F', 'G', 'A', 'B\u266D', 'C', 'D\u266D', 'E\u266D'],
      },
    ],
  },
  // ── Mode 6: Locrian ♮2 ─────────────────────────────────────────────────
  {
    modeName: 'Locrian ♮2',
    modeSlug: 'locriannat2',
    intervals: '1, 2, \u266D3, 4, \u266D5, \u266D6, \u266D7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D', 'E\u266D', 'F', 'G\u266D', 'A\u266D', 'B\u266D'],
      },
      {
        root: 'G',
        notes: ['G', 'A', 'B\u266D', 'C', 'D\u266D', 'E\u266D', 'F'],
      },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A\u266D', 'B\u266D', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E\u266D', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B\u266D', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D#', 'E', 'F#', 'G', 'A', 'B'] },
      { root: 'G#', notes: ['G#', 'A#', 'B', 'C#', 'D', 'E', 'F#'] },
      { root: 'D#', notes: ['D#', 'E#', 'F#', 'G#', 'A', 'B', 'C#'] },
      { root: 'A#', notes: ['A#', 'B#', 'C#', 'D#', 'E', 'F#', 'G#'] },
      {
        root: 'F',
        notes: [
          'F',
          'G',
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D\u266D',
          'E\u266D',
        ],
      },
    ],
  },
  // ── Mode 7: Altered Dominant ────────────────────────────────────────────
  {
    modeName: 'Altered Dominant',
    modeSlug: 'altereddominant',
    intervals: '1, \u266D2, \u266D3, \u266D4, \u266D5, \u266D6, \u266D7',
    keys: [
      {
        root: 'C',
        notes: [
          'C',
          'D\u266D',
          'E\u266D',
          'F\u266D',
          'G\u266D',
          'A\u266D',
          'B\u266D',
        ],
      },
      {
        root: 'G',
        notes: [
          'G',
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D\u266D',
          'E\u266D',
          'F',
        ],
      },
      {
        root: 'D',
        notes: ['D', 'E\u266D', 'F', 'G\u266D', 'A\u266D', 'B\u266D', 'C'],
      },
      {
        root: 'A',
        notes: ['A', 'B\u266D', 'C', 'D\u266D', 'E\u266D', 'F', 'G'],
      },
      { root: 'E', notes: ['E', 'F', 'G', 'A\u266D', 'B\u266D', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E\u266D', 'F', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B\u266D', 'C', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F', 'G', 'A', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C', 'D', 'E', 'F#'] },
      { root: 'D#', notes: ['D#', 'E', 'F#', 'G#', 'A', 'B', 'C#'] },
      { root: 'A#', notes: ['A#', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
      {
        root: 'F',
        notes: [
          'F',
          'G\u266D',
          'A\u266D',
          'B\u{1D12B}',
          'C\u266D',
          'D\u266D',
          'E\u266D',
        ],
      },
    ],
  },
];
