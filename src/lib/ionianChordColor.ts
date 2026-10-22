import type { PrismModeSlug } from '@/hooks/data';
import { colorForKeyMode } from '@/lib/modeColorShift';

/** Key labels indexed by pitch class 0–11, as colorForKeyMode reads them. */
const PC_TO_KEY = [
  'C',
  'Db',
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
] as const;

/**
 * A chord with no key around it takes the color of the mode its quality
 * makes of its root, which is the color of that mode's parent Ionian key, as
 * the Studio's Prism colors a chord on its own root: a major or major 7th
 * chord is its own key's (F → F), a dominant 7th Mixolydian's (F7 → B♭), a
 * minor or minor 7th Aeolian's (Am → C), a diminished triad Locrian's
 * (B° → C), an augmented one Lydian's.
 */
const QUALITY_MODES: { intervals: number[]; mode: PrismModeSlug }[] = [
  { intervals: [0, 4, 7, 10], mode: 'mixolydian' },
  { intervals: [0, 4, 7, 11], mode: 'ionian' },
  { intervals: [0, 3, 7, 10], mode: 'aeolian' },
  { intervals: [0, 3, 6, 10], mode: 'locrian' },
  { intervals: [0, 4, 7], mode: 'ionian' },
  { intervals: [0, 3, 7], mode: 'aeolian' },
  { intervals: [0, 3, 6], mode: 'locrian' },
  { intervals: [0, 4, 8], mode: 'lydian' },
];

const pc = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * The chord's root and the mode its quality names, in any inversion: the
 * root is the pitch class the notes stack in thirds from, not the bass.
 */
export function chordRootMode(
  chordMidis: number[],
): { rootPc: number; mode: PrismModeSlug } | null {
  const pcs = [...new Set(chordMidis.map(pc))];
  for (const { intervals, mode } of QUALITY_MODES) {
    if (intervals.length !== pcs.length) continue;
    for (const root of pcs) {
      const shape = pcs.map((p) => pc(p - root)).sort((a, b) => a - b);
      if (shape.every((s, i) => s === intervals[i]))
        return { rootPc: root, mode };
    }
  }
  return null;
}

/**
 * A chord's color in the Atlas color scheme: its mode's parent Ionian key
 * (F7, F Mixolydian, in B♭'s color). Inversions take their root's color; a
 * chord the scheme can't name takes its bass note's key.
 */
export function ionianChordColor(chordMidis: number[]): string {
  if (chordMidis.length === 0) return colorForKeyMode('C', 'ionian');
  const found = chordRootMode(chordMidis);
  if (found) return colorForKeyMode(PC_TO_KEY[found.rootPc], found.mode);
  const bass = Math.min(...chordMidis);
  return colorForKeyMode(PC_TO_KEY[pc(bass)], 'ionian');
}
