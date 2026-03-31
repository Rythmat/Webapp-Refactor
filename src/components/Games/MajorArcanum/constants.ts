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
export const HARMONY_LABELS = [
  'A',
  'S',
  'D',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
];

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
