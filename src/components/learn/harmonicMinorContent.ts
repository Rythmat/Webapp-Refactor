import type { ScaleFamilyMode } from './modeHelpers';

export const HARMONIC_MINOR_MODES: ScaleFamilyMode[] = [
  // ── Mode 1: Harmonic Minor ───────────────────────────────────────────
  {
    modeName: 'Harmonic Minor',
    modeSlug: 'harmonicminor',
    intervals: '1, 2, ♭3, 4, 5, ♭6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B'] },
      { root: 'G', notes: ['G', 'A', 'B♭', 'C', 'D', 'E♭', 'F#'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G', 'A', 'B♭', 'C#'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E#'] },
      {
        root: 'D♭',
        notes: ['D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B𝄫', 'C'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭', 'D'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C', 'D♭', 'E♭', 'F', 'G♭', 'A'],
      },
      {
        root: 'F',
        notes: ['F', 'G', 'A♭', 'B♭', 'C', 'D♭', 'E'],
      },
    ],
  },

  // ── Mode 2: Locrian ♮6 ───────────────────────────────────────────────
  {
    modeName: 'Locrian ♮6',
    modeSlug: 'locriannat6',
    intervals: '1, ♭2, ♭3, 4, ♭5, 6, ♭7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D♭', 'E♭', 'F', 'G♭', 'A', 'B♭'],
      },
      {
        root: 'G',
        notes: ['G', 'A♭', 'B♭', 'C', 'D♭', 'E', 'F'],
      },
      { root: 'D', notes: ['D', 'E♭', 'F', 'G', 'A♭', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B♭', 'C', 'D', 'E♭', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G', 'A', 'B♭', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D', 'E', 'F', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B', 'C', 'D#', 'E'] },
      { root: 'D♭', notes: ['D♭', 'E𝄫', 'F♭', 'G♭', 'A𝄫', 'B♭', 'C♭'] },
      { root: 'A♭', notes: ['A♭', 'B𝄫', 'C♭', 'D♭', 'E𝄫', 'F', 'G♭'] },
      { root: 'E♭', notes: ['E♭', 'F♭', 'G♭', 'A♭', 'B𝄫', 'C', 'D♭'] },
      {
        root: 'B♭',
        notes: ['B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G', 'A♭'],
      },
      {
        root: 'F',
        notes: ['F', 'G♭', 'A♭', 'B♭', 'C♭', 'D', 'E♭'],
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
        root: 'D♭',
        notes: ['D♭', 'E♭', 'F', 'G♭', 'A', 'B♭', 'C'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C', 'D♭', 'E', 'F', 'G'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F', 'G', 'A♭', 'B', 'C', 'D'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C', 'D', 'E♭', 'F#', 'G', 'A'],
      },
      { root: 'F', notes: ['F', 'G', 'A', 'B♭', 'C#', 'D', 'E'] },
    ],
  },

  // ── Mode 4: Dorian #4 ────────────────────────────────────────────────
  {
    modeName: 'Dorian #4',
    modeSlug: 'dorian#4',
    intervals: '1, 2, ♭3, ♯4, 5, 6, ♭7',
    keys: [
      { root: 'C', notes: ['C', 'D', 'E♭', 'F#', 'G', 'A', 'B♭'] },
      { root: 'G', notes: ['G', 'A', 'B♭', 'C#', 'D', 'E', 'F'] },
      { root: 'D', notes: ['D', 'E', 'F', 'G#', 'A', 'B', 'C'] },
      { root: 'A', notes: ['A', 'B', 'C', 'D#', 'E', 'F#', 'G'] },
      { root: 'E', notes: ['E', 'F#', 'G', 'A#', 'B', 'C#', 'D'] },
      { root: 'B', notes: ['B', 'C#', 'D', 'E#', 'F#', 'G#', 'A'] },
      { root: 'F#', notes: ['F#', 'G#', 'A', 'B#', 'C#', 'D#', 'E'] },
      {
        root: 'D♭',
        notes: ['D♭', 'E♭', 'F♭', 'G', 'A♭', 'B♭', 'C♭'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B♭', 'C♭', 'D', 'E♭', 'F', 'G♭'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F', 'G♭', 'A', 'B♭', 'C', 'D♭'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C', 'D♭', 'E', 'F', 'G', 'A♭'],
      },
      { root: 'F', notes: ['F', 'G', 'A♭', 'B', 'C', 'D', 'E♭'] },
    ],
  },

  // ── Mode 5: Phrygian Dominant ─────────────────────────────────────────
  {
    modeName: 'Phrygian Dominant',
    modeSlug: 'phrygiandominant',
    intervals: '1, ♭2, 3, 4, 5, ♭6, ♭7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D♭', 'E', 'F', 'G', 'A♭', 'B♭'],
      },
      { root: 'G', notes: ['G', 'A♭', 'B', 'C', 'D', 'E♭', 'F'] },
      { root: 'D', notes: ['D', 'E♭', 'F#', 'G', 'A', 'B♭', 'C'] },
      { root: 'A', notes: ['A', 'B♭', 'C#', 'D', 'E', 'F', 'G'] },
      { root: 'E', notes: ['E', 'F', 'G#', 'A', 'B', 'C', 'D'] },
      { root: 'B', notes: ['B', 'C', 'D#', 'E', 'F#', 'G', 'A'] },
      { root: 'F#', notes: ['F#', 'G', 'A#', 'B', 'C#', 'D', 'E'] },
      { root: 'D♭', notes: ['D♭', 'E𝄫', 'F', 'G♭', 'A♭', 'B𝄫', 'C♭'] },
      { root: 'A♭', notes: ['A♭', 'B𝄫', 'C', 'D♭', 'E♭', 'F♭', 'G♭'] },
      {
        root: 'E♭',
        notes: ['E♭', 'F♭', 'G', 'A♭', 'B♭', 'C♭', 'D♭'],
      },
      {
        root: 'B♭',
        notes: ['B♭', 'C♭', 'D', 'E♭', 'F', 'G♭', 'A♭'],
      },
      {
        root: 'F',
        notes: ['F', 'G♭', 'A', 'B♭', 'C', 'D♭', 'E♭'],
      },
    ],
  },

  // ── Mode 6: Lydian #2 ────────────────────────────────────────────────
  {
    modeName: 'Lydian #2',
    modeSlug: 'lydian#2',
    intervals: '1, ♯2, 3, ♯4, 5, 6, 7',
    keys: [
      { root: 'C', notes: ['C', 'D#', 'E', 'F#', 'G', 'A', 'B'] },
      { root: 'G', notes: ['G', 'A#', 'B', 'C#', 'D', 'E', 'F#'] },
      { root: 'D', notes: ['D', 'E#', 'F#', 'G#', 'A', 'B', 'C#'] },
      { root: 'A', notes: ['A', 'B#', 'C#', 'D#', 'E', 'F#', 'G#'] },
      { root: 'E', notes: ['E', 'FX', 'G#', 'A#', 'B', 'C#', 'D#'] },
      { root: 'B', notes: ['B', 'CX', 'D#', 'E#', 'F#', 'G#', 'A#'] },
      {
        root: 'G♭',
        notes: ['G♭', 'A', 'B♭', 'C', 'D♭', 'E♭', 'F'],
      },
      {
        root: 'D♭',
        notes: ['D♭', 'E', 'F', 'G', 'A♭', 'B♭', 'C'],
      },
      {
        root: 'A♭',
        notes: ['A♭', 'B', 'C', 'D', 'E♭', 'F', 'G'],
      },
      {
        root: 'E♭',
        notes: ['E♭', 'F#', 'G', 'A', 'B♭', 'C', 'D'],
      },
      { root: 'B♭', notes: ['B♭', 'C#', 'D', 'E', 'F', 'G', 'A'] },
      { root: 'F', notes: ['F', 'G#', 'A', 'B', 'C', 'D', 'E'] },
    ],
  },

  // ── Mode 7: Altered Diminished ────────────────────────────────────────
  {
    modeName: 'Altered Diminished',
    modeSlug: 'altereddiminished',
    intervals: '1, ♭2, ♭3, ♭4, ♭5, ♭6, 𝄫7',
    keys: [
      {
        root: 'C',
        notes: ['C', 'D♭', 'E♭', 'F♭', 'G♭', 'A♭', 'B𝄫'],
      },
      {
        root: 'G',
        notes: ['G', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭'],
      },
      {
        root: 'D',
        notes: ['D', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭'],
      },
      {
        root: 'A',
        notes: ['A', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G♭'],
      },
      {
        root: 'E',
        notes: ['E', 'F', 'G', 'A♭', 'B♭', 'C', 'D♭'],
      },
      { root: 'B', notes: ['B', 'C', 'D', 'E♭', 'F', 'G', 'A♭'] },
      { root: 'F#', notes: ['F#', 'G', 'A', 'B♭', 'C', 'D', 'E♭'] },
      { root: 'D♭', notes: ['D♭', 'E𝄫', 'F♭', 'G𝄫', 'A𝄫', 'B𝄫', 'C𝄫'] },
      { root: 'A♭', notes: ['A♭', 'B𝄫', 'C♭', 'D𝄫', 'E𝄫', 'F♭', 'G𝄫'] },
      { root: 'E♭', notes: ['E♭', 'F♭', 'G♭', 'A𝄫', 'B𝄫', 'C♭', 'D𝄫'] },
      { root: 'B♭', notes: ['B♭', 'C♭', 'D♭', 'E𝄫', 'F♭', 'G♭', 'A𝄫'] },
      {
        root: 'F',
        notes: ['F', 'G♭', 'A♭', 'B𝄫', 'C♭', 'D♭', 'E𝄫'],
      },
    ],
  },
];
