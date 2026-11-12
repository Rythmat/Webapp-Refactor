import { getNoteSpelling } from '@/components/learn/noteSpellingLookup';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';

// A played note's name, for what a take says about it. Spelled as the key spells
// it where it's in the key, and otherwise as that key's accidentals lean.

const SHARPS = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
];
const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const FLAT_KEYS = new Set(['F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭']);
const PITCH: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const pitchClassOf = (name: string) => {
  const base = PITCH[name[0]] ?? 0;
  const shift = [...name.slice(1)].reduce(
    (sum, mark) => sum + (mark === '♯' ? 1 : mark === '♭' ? -1 : 0),
    0,
  );
  return (((base + shift) % 12) + 12) % 12;
};

export function noteNameInKey(midi: number, key: string): string {
  const pc = ((midi % 12) + 12) % 12;
  const label = formatAccidentalsForDisplay(key);
  const inKey = getNoteSpelling('ionian', label)?.find(
    (name) => pitchClassOf(name) === pc,
  );
  if (inKey) return inKey;
  return (FLAT_KEYS.has(label) ? FLATS : SHARPS)[pc];
}
