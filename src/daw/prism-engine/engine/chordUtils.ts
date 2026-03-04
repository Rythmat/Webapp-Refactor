import type { ModeName } from '../types';
import { CHORDS } from '../data/chords';
import { MODES, TRIADS, TETRADS } from '../data/modes';

/**
 * Build diatonic triad chords for a given mode.
 * Returns 7 chords, each as an array of semitone offsets from the tonic.
 */
export function findTriadChords(scale: ModeName): number[][] {
  const chordNames = TRIADS[scale];
  const steps = MODES[scale];
  const result: number[][] = [];
  for (let i = 0; i < chordNames.length; i++) {
    const step = steps[i];
    const chord = CHORDS[chordNames[i]].map((x) => x + step);
    result.push(chord);
  }
  return result;
}

/**
 * Build diatonic seventh chords for a given mode.
 * Returns 7 chords, each as an array of semitone offsets from the tonic.
 */
export function findSeventhChords(scale: ModeName): number[][] {
  const chordNames = TETRADS[scale];
  const steps = MODES[scale];
  const result: number[][] = [];
  for (let i = 0; i < chordNames.length; i++) {
    const step = steps[i];
    const chord = CHORDS[chordNames[i]].map((x) => x + step);
    result.push(chord);
  }
  return result;
}

/**
 * Given a root MIDI note and a chord quality name, returns the pitched MIDI chord.
 * Returns [0] if the chord name is not found in the dictionary.
 */
export function generateChord(root: number, chordName: string): number[] {
  const intervals = CHORDS[chordName];
  if (!intervals) {
    return [0];
  }
  return intervals.map((x) => x + root);
}

/**
 * Adjusts octaves of a chord sequence to prevent jumps > 6 semitones
 * between the highest notes of consecutive chords.
 */
export function normalizeSequence(chords: number[][]): number[][] {
  const result: number[][] = [];
  for (const chord of chords) {
    if (result.length > 0) {
      const thisMax = Math.max(...chord);
      const lastMax = Math.max(...result[result.length - 1]);
      if (thisMax - lastMax > 6) {
        result.push(shiftOctave(chord, -1));
      } else if (thisMax - lastMax < -6) {
        result.push(shiftOctave(chord, 1));
      } else {
        result.push(chord);
      }
    } else {
      result.push(chord);
    }
  }
  return result;
}

/**
 * Shifts all notes in a chord up or down by `differential` octaves (12 semitones each).
 */
export function shiftOctave(chord: number[], differential: number): number[] {
  return chord.map((note) => note + differential * 12);
}

/**
 * Returns the root (first element) of a chord array.
 */
export function findRoot(chord: number[]): number {
  return chord[0];
}
