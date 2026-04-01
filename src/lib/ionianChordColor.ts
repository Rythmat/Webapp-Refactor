import { KEY_OF_COLORS } from '@/constants/theme';

type NoteEvent = {
  id: string;
  pitchName: string;
  startTicks: number;
  durationTicks: number;
  velocity?: number;
  color?: string;
};

/** ASCII-normalized key labels indexed by pitch class 0–11 */
const PC_TO_KEY: string[] = [
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
];

/**
 * Offsets from chord root pitch class to parent Ionian key root, grouped by quality.
 * major chords are I, IV, or V → parent key is root-0, root-5, root-7
 * minor chords are ii, iii, or vi → parent key is root-2, root-4, root-9
 * diminished chords are vii° → parent key is root-11
 */
const PARENT_KEY_OFFSETS: Record<string, number[]> = {
  major: [0, 5, 7],
  minor: [2, 4, 9],
  diminished: [11],
};

function detectQuality(midis: number[]): string {
  if (midis.length < 3) return 'major';
  const root = midis[0];
  const i1 = (((midis[1] - root) % 12) + 12) % 12;
  const i2 = (((midis[2] - root) % 12) + 12) % 12;
  if (i1 === 3 && i2 === 6) return 'diminished';
  if (i1 === 3 && i2 === 7) return 'minor';
  return 'major';
}

/**
 * Given a chord's MIDI notes, determine which Ionian keys contain it
 * as a diatonic chord, and return a randomly chosen parent key's color.
 */
export function ionianChordColor(chordMidis: number[]): string {
  if (chordMidis.length === 0) return KEY_OF_COLORS.C;

  const rootPc = ((chordMidis[0] % 12) + 12) % 12;
  const quality = detectQuality(chordMidis);
  const offsets = PARENT_KEY_OFFSETS[quality] ?? [0];

  const parentColors = offsets.map((offset) => {
    const keyPc = (((rootPc - offset) % 12) + 12) % 12;
    const keyName = PC_TO_KEY[keyPc];
    return (
      (KEY_OF_COLORS as Record<string, string>)[keyName] ?? KEY_OF_COLORS.C
    );
  });

  return parentColors[Math.floor(Math.random() * parentColors.length)];
}

/**
 * Build a stable color map for an array of triads.
 * Call inside useMemo so colors don't re-randomize on every render.
 */
export function buildChordColorMap(triads: number[][]): string[] {
  return triads.map((chord) => ionianChordColor(chord));
}

/**
 * Apply per-chord colors to a sequence of NoteEvents.
 * Events are divided evenly among chords based on chordOrder length.
 */
export function applyChordColors(
  events: NoteEvent[],
  chordOrder: number[],
  chordColors: string[],
): NoteEvent[] {
  const numChords = chordOrder.length;
  if (numChords === 0 || events.length === 0) return events;
  const groupSize = Math.ceil(events.length / numChords);
  return events.map((e, i) => {
    const chordPos = Math.min(Math.floor(i / groupSize), numChords - 1);
    const triadIdx = chordOrder[chordPos];
    return { ...e, color: chordColors[triadIdx] ?? e.color };
  });
}
