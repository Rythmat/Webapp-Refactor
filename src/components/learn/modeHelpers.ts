import type { PlaybackEvent } from '@/contexts/PlaybackContext';

export interface ModeKeyEntry {
  root: string;
  notes: string[];
}

export interface ScaleFamilyMode {
  modeName: string;
  modeSlug: string;
  intervals: string;
  keys: ModeKeyEntry[];
}

export const MODE_NAMES = [
  'Ionian',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Aeolian',
  'Locrian',
] as const;

export const MODE_INTERVAL_LABELS = [
  '1, 2, 3, 4, 5, 6, 7',
  '1, 2, ♭3, 4, 5, 6, ♭7',
  '1, ♭2, ♭3, 4, 5, ♭6, ♭7',
  '1, 2, 3, #4, 5, 6, 7',
  '1, 2, 3, 4, 5, 6, ♭7',
  '1, 2, ♭3, 4, 5, ♭6, ♭7',
  '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',
] as const;

export const MODE_STEPS: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'harmonic-major': [0, 2, 4, 5, 7, 8, 11],
  'ionian-sharp5': [0, 2, 4, 5, 8, 9, 11],
  'mixolydian-flat6': [0, 2, 4, 5, 7, 8, 10],
};

export const NOTE_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  'E#': 5,
  Fb: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  'B#': 0,
  Cb: 11,
  FX: 7,
  CX: 2,
  Bbb: 9,
};

const BASE_C4 = 60;

export const rootToMidi = (root: string): number => {
  const pc = NOTE_TO_PITCH_CLASS[root];
  return pc !== undefined ? BASE_C4 + pc : BASE_C4;
};

export const buildScaleMidis = (rootMidi: number, steps: number[]): number[] =>
  steps.map((s) => rootMidi + s);

export const buildPlaybackEvents = (
  midis: number[],
  prefix: string,
): PlaybackEvent[] =>
  midis.map((midi, i) => ({
    id: `${prefix}-${midi}-${i}`,
    type: 'note',
    midi,
    time: Date.now(),
    duration: 0,
    velocity: 1,
  }));
