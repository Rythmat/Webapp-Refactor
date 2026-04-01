import type { KeyRoot } from './types';

export const PIANO_HEIGHT = 140;
export const FALL_SPEED = 300;
export const INPUT_WINDOW = 0.15;
export const HOLD_SCORE_INTERVAL = 0.25; // Award 1 point per 0.25s of hold

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

// Keyboard mappings per mode
export const MELODY_KEYS = [
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
];
export const MELODY_LABELS = ['A', 'S', 'D', 'F', 'H', 'J', 'K', 'L'];

export const HARMONY_KEYS = [
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
];
export const HARMONY_LABELS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

// Colors based on Circle of 5ths
export const KEY_COLORS: Record<number, string> = {
  0: '#E5585C', // C - Red
  1: '#5DA5EA', // Db - Sky Blue
  2: '#F2AA3C', // D - Yellow-Orange
  3: '#9E75D8', // Eb - Purple
  4: '#A8D06B', // E - Lime
  5: '#F68F9F', // F - Pink
  6: '#43B3A6', // F# - Teal
  7: '#EB8246', // G - Orange
  8: '#6B76D1', // Ab - Indigo
  9: '#F8CD2E', // A - Yellow
  10: '#DA8BC3', // Bb - Magenta
  11: '#72C374', // B - Green
};

// Circle of Fifths clockwise from C
export const FIFTHS_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

export const SCALE_DEFS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
};

export const ROOTS: KeyRoot[] = [
  { name: 'C', val: 0 },
  { name: 'Db', val: 1 },
  { name: 'D', val: 2 },
  { name: 'Eb', val: 3 },
  { name: 'E', val: 4 },
  { name: 'F', val: 5 },
  { name: 'F#', val: 6 },
  { name: 'G', val: 7 },
  { name: 'Ab', val: 8 },
  { name: 'A', val: 9 },
  { name: 'Bb', val: 10 },
  { name: 'B', val: 11 },
];

// --- Difficulty presets ---
export interface DifficultyPreset {
  label: string;
  bpm: number;
  totalBeats: number;
  eighthNoteChance: number; // 0-1, probability of 8th notes in generation
  holdNoteChance: number; // 0-1, probability of hold (duration >= 2) notes
  description: string;
}

export const DIFFICULTY_PRESETS: Record<number, DifficultyPreset> = {
  1: {
    label: 'Beginner',
    bpm: 80,
    totalBeats: 80,
    eighthNoteChance: 0,
    holdNoteChance: 0.05,
    description: 'Quarter notes only, slower tempo',
  },
  2: {
    label: 'Standard',
    bpm: 100,
    totalBeats: 100,
    eighthNoteChance: 0.15,
    holdNoteChance: 0.1,
    description: 'Some eighth notes, moderate tempo',
  },
  3: {
    label: 'Advanced',
    bpm: 120,
    totalBeats: 120,
    eighthNoteChance: 0.35,
    holdNoteChance: 0.15,
    description: 'Mixed rhythms, faster tempo',
  },
  4: {
    label: 'Expert',
    bpm: 140,
    totalBeats: 140,
    eighthNoteChance: 0.5,
    holdNoteChance: 0.2,
    description: 'Dense patterns, high speed',
  },
};

// --- Drum patterns ---
export interface DrumHit {
  beatOffset: number; // beat position within a bar (0-3.75)
  instrument: 'kick' | 'snare' | 'hat';
}

export const DRUM_PATTERNS: DrumHit[][] = [
  // Basic: kick 1,3 / snare 2,4 / hat every beat
  [
    { beatOffset: 0, instrument: 'kick' },
    { beatOffset: 0, instrument: 'hat' },
    { beatOffset: 1, instrument: 'snare' },
    { beatOffset: 1, instrument: 'hat' },
    { beatOffset: 2, instrument: 'kick' },
    { beatOffset: 2, instrument: 'hat' },
    { beatOffset: 3, instrument: 'snare' },
    { beatOffset: 3, instrument: 'hat' },
  ],
  // Offbeat: kick on 1, "and" of 2 / snare on 2,4 / hat on 8ths
  [
    { beatOffset: 0, instrument: 'kick' },
    { beatOffset: 0, instrument: 'hat' },
    { beatOffset: 0.5, instrument: 'hat' },
    { beatOffset: 1, instrument: 'snare' },
    { beatOffset: 1, instrument: 'hat' },
    { beatOffset: 1.5, instrument: 'kick' },
    { beatOffset: 1.5, instrument: 'hat' },
    { beatOffset: 2, instrument: 'kick' },
    { beatOffset: 2, instrument: 'hat' },
    { beatOffset: 2.5, instrument: 'hat' },
    { beatOffset: 3, instrument: 'snare' },
    { beatOffset: 3, instrument: 'hat' },
    { beatOffset: 3.5, instrument: 'hat' },
  ],
  // Driving: kick on every beat, snare 2,4, hats on 8ths
  [
    { beatOffset: 0, instrument: 'kick' },
    { beatOffset: 0, instrument: 'hat' },
    { beatOffset: 0.5, instrument: 'hat' },
    { beatOffset: 1, instrument: 'kick' },
    { beatOffset: 1, instrument: 'snare' },
    { beatOffset: 1, instrument: 'hat' },
    { beatOffset: 1.5, instrument: 'hat' },
    { beatOffset: 2, instrument: 'kick' },
    { beatOffset: 2, instrument: 'hat' },
    { beatOffset: 2.5, instrument: 'hat' },
    { beatOffset: 3, instrument: 'kick' },
    { beatOffset: 3, instrument: 'snare' },
    { beatOffset: 3, instrument: 'hat' },
    { beatOffset: 3.5, instrument: 'hat' },
  ],
];
