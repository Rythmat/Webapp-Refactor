import {
  buildSpellingMap,
  MIDI_ROOT_TO_KEY,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type { KeyRoot } from './types';

export const PIANO_HEIGHT = 140;
export const FALL_SPEED = 300;

// --- Timeroll column layout ---
export const BUFFER_COLUMNS = 2; // empty buffer columns on each side of the timeroll
export const INPUT_WINDOW = 0.15;
export const HOLD_SCORE_INTERVAL = 0.25; // Award 1 point per 0.25s of hold

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const spellings = new Map<number, Map<number, string>>();

/**
 * A note's name as the major key it's played in spells it: F♯ in D, B♭ in
 * F, E♯ in F♯, with the ♭ and ♯ glyphs (the app's enharmonic engine).
 */
export function noteNameInKey(midi: number, keyRootVal: number): string {
  const key = ((keyRootVal % 12) + 12) % 12;
  let names = spellings.get(key);
  if (!names) {
    names = buildSpellingMap(MIDI_ROOT_TO_KEY[key], MAJOR_STEPS);
    spellings.set(key, names);
  }
  return names.get(((midi % 12) + 12) % 12) ?? '';
}

// Circle of Fifths clockwise from C
export const FIFTHS_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

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
