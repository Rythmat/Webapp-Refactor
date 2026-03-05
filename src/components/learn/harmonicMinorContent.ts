import type { ScaleFamilyMode } from './modeHelpers';

export const HARMONIC_MINOR_MODES: ScaleFamilyMode[] = [
  // ── Mode 1: Harmonic Minor ───────────────────────────────────────────
  {
    modeName: 'Harmonic Minor',
    modeSlug: 'harmonicminor',
    intervals: '1, 2, \u266D3, 4, 5, \u266D6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E\u266D', 'F', 'G', 'A\u266D', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B\u266D', 'C', 'D', 'E\u266D', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A', 'B\u266D', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E#'] },
      {
        root: 'D\u266D',
        notes: [
          'D\u266D',
          'E\u266D',
          'F\u266D',
          'G\u266D',
          'A\u266D',
          'B\uD834\uDD2B',
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
          'F\u266D',
          'G',
        ],
      },
      {
        root: 'E\u266D',
        notes: [
          'E\u266D',
          'F',
          'G\u266D',
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D',
        ],
      },
      {
        root: 'B\u266D',
        notes: ['B\u266D', 'C', 'D\u266D', 'E\u266D', 'F', 'G\u266D', 'A'],
      },
      {
        root: 'F',
        notes: ['F', 'G', 'A\u266D', 'B\u266D', 'C', 'D\u266D', 'E'],
      },
    ],
  },

  // ── Mode 2: Locrian ♮6 ───────────────────────────────────────────────
  {
    modeName: 'Locrian ♮6',
    modeSlug: 'locriannat6',
    intervals: '1, \u266D2, \u266D3, 4, \u266D5, 6, \u266D7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D\u266D', 'E\u266D', 'F', 'G\u266D', 'A', 'B\u266D'],
      },
      {
        root: 'G',
        notes: ['G', 'A\u266D', 'B\u266D', 'C', 'D\u266D', 'E', 'F'],
      },
      { root: 'D', notes: ['D', 'E\u266D', 'F', 'G', 'A\u266D', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B\u266D', 'C', 'D', 'E\u266D', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G', 'A', 'B\u266D', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E', 'F', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B', 'C', 'D#', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F#', 'G', 'A#', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C#', 'D', 'E#', 'F#'] },
      { root: 'D#', notes: ['D#', 'E', 'F#', 'G#', 'A', 'B#', 'C#'] },
      {
        root: 'B\u266D',
        notes: [
          'B\u266D',
          'C\u266D',
          'D\u266D',
          'E\u266D',
          'F\u266D',
          'G',
          'A\u266D',
        ],
      },
      {
        root: 'F',
        notes: [
          'F',
          'G\u266D',
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D',
          'E\u266D',
        ],
      },
    ],
  },

  // ── Mode 3: Ionian #5 ────────────────────────────────────────────────
  {
    modeName: 'Ionian #5',
    modeSlug: 'ionian#5',
    intervals: '1, 2, 3, 4, #5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E', 'F', 'G#', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B', 'C', 'D#', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F#', 'G', 'A#', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C#', 'D', 'E#', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G#', 'A', 'B#', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D#', 'E', 'FX', 'G#', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A#', 'B', 'CX', 'D#', 'E#'] },
      {
        root: 'D\u266D',
        notes: ['D\u266D', 'E\u266D', 'F', 'G\u266D', 'A', 'B\u266D', 'C'],
      },
      {
        root: 'A\u266D',
        notes: ['A\u266D', 'B\u266D', 'C', 'D\u266D', 'E', 'F', 'G'],
      },
      {
        root: 'E\u266D',
        notes: ['E\u266D', 'F', 'G', 'A\u266D', 'B', 'C', 'D'],
      },
      {
        root: 'B\u266D',
        notes: ['B\u266D', 'C', 'D', 'E\u266D', 'F#', 'G', 'A'],
      },
      { root: 'F', notes: ['F', 'G', 'A', 'B\u266D', 'C#', 'D', 'E'] },
    ],
  },

  // ── Mode 4: Dorian #4 ────────────────────────────────────────────────
  {
    modeName: 'Dorian #4',
    modeSlug: 'dorian#4',
    intervals: '1, 2, \u266D3, \u266F4, 5, 6, \u266D7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E\u266D', 'F#', 'G', 'A', 'B\u266D'] },
      { root: 'G', notes: ['G', 'A', 'B\u266D', 'C#', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G#', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D#', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A#', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E#', 'F#', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B#', 'C#', 'D#', 'E'] },
      {
        root: 'D\u266D',
        notes: [
          'D\u266D',
          'E\u266D',
          'F\u266D',
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
        notes: ['E\u266D', 'F', 'G\u266D', 'A', 'B\u266D', 'C', 'D\u266D'],
      },
      {
        root: 'B\u266D',
        notes: ['B\u266D', 'C', 'D\u266D', 'E', 'F', 'G', 'A\u266D'],
      },
      { root: 'F', notes: ['F', 'G', 'A\u266D', 'B', 'C', 'D', 'E\u266D'] },
    ],
  },

  // ── Mode 5: Phrygian Dominant ─────────────────────────────────────────
  {
    modeName: 'Phrygian Dominant',
    modeSlug: 'phrygiandominant',
    intervals: '1, \u266D2, 3, 4, 5, \u266D6, \u266D7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D\u266D', 'E', 'F', 'G', 'A\u266D', 'B\u266D'],
      },
      { root: 'G', notes: ['G', 'A\u266D', 'B', 'C', 'D', 'E\u266D', 'F'] },
      { root: 'D', notes: ['D', 'E\u266D', 'F#', 'G', 'A', 'B\u266D', 'C'] },
      { root: 'A', notes: ['A', 'B\u266D', 'C#', 'D', 'E', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G#', 'A', 'B', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D#', 'E', 'F#', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A#', 'B', 'C#', 'D', 'E'] },
      { root: 'C#', notes: ['C#', 'D', 'E#', 'F#', 'G#', 'A', 'B'] },
      { root: 'G#', notes: ['G#', 'A', 'B#', 'C#', 'D#', 'E', 'F#'] },
      {
        root: 'E\u266D',
        notes: [
          'E\u266D',
          'F\u266D',
          'G',
          'A\u266D',
          'B\u266D',
          'C\u266D',
          'D\u266D',
        ],
      },
      {
        root: 'B\u266D',
        notes: [
          'B\u266D',
          'C\u266D',
          'D',
          'E\u266D',
          'F',
          'G\u266D',
          'A\u266D',
        ],
      },
      {
        root: 'F',
        notes: ['F', 'G\u266D', 'A', 'B\u266D', 'C', 'D\u266D', 'E\u266D'],
      },
    ],
  },

  // ── Mode 6: Lydian #2 ────────────────────────────────────────────────
  {
    modeName: 'Lydian #2',
    modeSlug: 'lydian#2',
    intervals: '1, \u266F2, 3, \u266F4, 5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D#', 'E', 'F#', 'G', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A#', 'B', 'C#', 'D', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E#', 'F#', 'G#', 'A', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B#', 'C#', 'D#', 'E', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'FX', 'G#', 'A#', 'B', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'CX', 'D#', 'E#', 'F#', 'G#', 'A#'] },
      {
        root: 'G\u266D',
        notes: ['G\u266D', 'A', 'B\u266D', 'C', 'D\u266D', 'E\u266D', 'F'],
      },
      {
        root: 'D\u266D',
        notes: ['D\u266D', 'E', 'F', 'G', 'A\u266D', 'B\u266D', 'C'],
      },
      {
        root: 'A\u266D',
        notes: ['A\u266D', 'B', 'C', 'D', 'E\u266D', 'F', 'G'],
      },
      {
        root: 'E\u266D',
        notes: ['E\u266D', 'F#', 'G', 'A', 'B\u266D', 'C', 'D'],
      },
      { root: 'B\u266D', notes: ['B\u266D', 'C#', 'D', 'E', 'F', 'G', 'A'] },
      { root: 'F', notes: ['F', 'G#', 'A', 'B', 'C', 'D', 'E'] },
    ],
  },

  // ── Mode 7: Altered Diminished ────────────────────────────────────────
  {
    modeName: 'Altered Diminished',
    modeSlug: 'altereddiminished',
    intervals: '1, \u266D2, \u266D3, \u266D4, \u266D5, \u266D6, \uD834\uDD2B7',
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
          'B\uD834\uDD2B',
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
          'F\u266D',
        ],
      },
      {
        root: 'D',
        notes: [
          'D',
          'E\u266D',
          'F',
          'G\u266D',
          'A\u266D',
          'B\u266D',
          'C\u266D',
        ],
      },
      {
        root: 'A',
        notes: ['A', 'B\u266D', 'C', 'D\u266D', 'E\u266D', 'F', 'G\u266D'],
      },
      {
        root: 'E',
        notes: ['E', 'F', 'G', 'A\u266D', 'B\u266D', 'C', 'D\u266D'],
      },
      { root: 'B', notes: ['B', 'C', 'D', 'E\u266D', 'F', 'G', 'A\u266D'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B\u266D', 'C', 'D', 'E\u266D'] },
      { root: 'C#', notes: ['C#', 'D', 'E', 'F', 'G', 'A', 'B\u266D'] },
      { root: 'G#', notes: ['G#', 'A', 'B', 'C', 'D', 'E', 'F'] },
      { root: 'D#', notes: ['D#', 'E', 'F#', 'G', 'A', 'B', 'C'] },
      { root: 'A#', notes: ['A#', 'B', 'C#', 'D', 'E', 'F#', 'G'] },
      {
        root: 'F',
        notes: [
          'F',
          'G\u266D',
          'A\u266D',
          'B\uD834\uDD2B',
          'C\u266D',
          'D\u266D',
          'E\uD834\uDD2B',
        ],
      },
    ],
  },
];
