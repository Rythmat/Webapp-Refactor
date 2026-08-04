import type { SongMode } from '@/curriculum/types/songLibrary';
import { pitchClass } from './songDefaults';

/**
 * Hybrid Number System degree derivation — a faithful TypeScript port of
 * `computeDegree` from `src/scripts/parseSongPdfs.mjs`, the Node generator that
 * produced every `degree` in the shipped song library. Keeping it byte-identical
 * means the editor's auto-populated degrees match the ~8000 existing chords
 * (notably: a bare dominant is `7`, e.g. `5 7`, NOT `dom7`).
 */

// Comprehensive chord regex (root · quality · extension · alterations · bass).
const CHORD_RE =
  /^([A-G][#♯b♭]?)\s*(maj|min|m(?!a)|dim|aug|sus|add|dom|[Mm]aj|half-dim|hdim|ø|°|\+)?\s*(6|7|9|11|13)?\s*(?:([#♯b♭]\d+[#♯b♭]?\d*|\([^)]*\))*)\s*(\/\s*[A-G][#♯b♭]?)?$/;

const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const isNoChord = (name: string): boolean => /^N\.?C\.?$/i.test(name);

/** Chord root → pitch class 0–11, or null if it can't be parsed. */
function chordRootPc(chordName: string): number | null {
  if (isNoChord(chordName)) return null;
  const m = chordName.match(/^([A-G])([♯♭#b]?)/);
  if (!m) return null;
  const base = LETTER_PC[m[1]];
  if (base == null) return null;
  let pc = base;
  if (m[2] === '♯' || m[2] === '#') pc += 1;
  if (m[2] === '♭' || m[2] === 'b') pc -= 1;
  return ((pc % 12) + 12) % 12;
}

/** Degree-string quality token (`maj`, `min7`, `7`, `dim7`, `sus4`, …). */
function extractChordQuality(chordName: string): string {
  if (isNoChord(chordName)) return 'n.c.';
  const match = chordName.match(CHORD_RE);
  if (!match) return 'maj';

  const quality = (match[2] || '').toLowerCase();
  const extension = match[3] || '';

  let q = 'maj';
  if (quality === 'min' || quality === 'm') q = 'min';
  else if (quality === 'maj') q = 'maj';
  else if (['dim', '°', 'ø', 'half-dim', 'hdim'].includes(quality)) q = 'dim';
  else if (quality === 'aug' || quality === '+') q = 'aug';
  else if (quality === 'sus') q = 'sus';
  else if (quality === 'add') q = 'add';
  else if (quality === 'dom') q = 'dom';

  if (extension) {
    if (q === 'maj' && quality === 'maj') return `maj${extension}`;
    if (q === 'maj' && quality === '') return extension; // bare 7/9/11/13 = dominant
    if (q === 'min') return `min${extension}`;
    if (q === 'dim') return `dim${extension}`;
    if (q === 'aug') return `aug${extension}`;
    if (q === 'sus') return `sus${extension}`;
    if (q === 'dom') return extension; // inside `if (extension)`, so always set
    if (q === 'add') return `add${extension}`;
    return `${q}${extension}`;
  }

  if (q === 'min') return 'min';
  if (q === 'dim') return 'dim';
  if (q === 'aug') return 'aug';
  if (q === 'sus') return 'sus4';
  return 'maj';
}

interface DegreeSlot {
  degree: number;
  accidental: '' | '♭' | '♯';
}

// Semitone interval (0–11) → scale degree, relative to a major tonic.
const MAJOR_DEGREE_MAP: DegreeSlot[] = [
  { degree: 1, accidental: '' },
  { degree: 2, accidental: '♭' },
  { degree: 2, accidental: '' },
  { degree: 3, accidental: '♭' },
  { degree: 3, accidental: '' },
  { degree: 4, accidental: '' },
  { degree: 5, accidental: '♭' },
  { degree: 5, accidental: '' },
  { degree: 6, accidental: '♭' },
  { degree: 6, accidental: '' },
  { degree: 7, accidental: '♭' },
  { degree: 7, accidental: '' },
];

// Semitone interval (0–11) → scale degree, relative to a minor tonic.
const MINOR_DEGREE_MAP: DegreeSlot[] = [
  { degree: 1, accidental: '' },
  { degree: 2, accidental: '♭' },
  { degree: 2, accidental: '' },
  { degree: 3, accidental: '' },
  { degree: 3, accidental: '♯' },
  { degree: 4, accidental: '' },
  { degree: 5, accidental: '♭' },
  { degree: 5, accidental: '' },
  { degree: 6, accidental: '' },
  { degree: 6, accidental: '♯' },
  { degree: 7, accidental: '' },
  { degree: 7, accidental: '♯' },
];

// The generator only ever branched major-vs-minor; mirror that for every mode.
const MINOR_MODES: SongMode[] = [
  'minor',
  'aeolian',
  'dorian',
  'phrygian',
  'locrian',
];

/**
 * Compute the Hybrid Number System degree for a chord in a key.
 * @example degreeFromChord('B♭', 60, 'major') // → '♭7 maj'
 * @example degreeFromChord('G7', 60, 'major')  // → '5 7'
 * @example degreeFromChord('C/E', 60, 'major') // → '1 maj/3'
 */
export function degreeFromChord(
  chordName: string,
  keyRoot: number,
  mode: SongMode,
): string {
  if (isNoChord(chordName)) return 'n.c.';
  const rootPc = chordRootPc(chordName);
  if (rootPc == null) return '1 maj';

  const keyPc = pitchClass(keyRoot);
  const map = MINOR_MODES.includes(mode) ? MINOR_DEGREE_MAP : MAJOR_DEGREE_MAP;
  const interval = (((rootPc - keyPc) % 12) + 12) % 12;
  const { degree, accidental } = map[interval];
  const quality = extractChordQuality(chordName);

  const slash = chordName.match(/\/\s*([A-G][♯♭#b]?)\s*$/);
  if (slash) {
    const bassPc = chordRootPc(slash[1]);
    if (bassPc != null) {
      const bassInterval = (((bassPc - keyPc) % 12) + 12) % 12;
      const bass = map[bassInterval];
      return `${accidental}${degree} ${quality}/${bass.accidental}${bass.degree}`;
    }
  }

  return `${accidental}${degree} ${quality}`;
}
