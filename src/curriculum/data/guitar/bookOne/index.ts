// ── The Guitar Atlas: Book One ────────────────────────────────────────────
// The twelve key centers, and the derived text the book prints around them.
// Hybrid Number System labels are computed from degree + quality rather than
// stored. Chord names and shape ids depend on the mode as well as the key, so
// they live with the centers (../centers.ts).

import { spellScale } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type {
  BookChordQuality,
  GuitarKeyCenter,
  GuitarKeyName,
  GuitarMusicMap,
  ScaleDegree,
} from '../types';
import { A_MAJOR } from './A';
import { AB_MAJOR } from './Ab';
import { B_MAJOR } from './B';
import { BB_MAJOR } from './Bb';
import { C_MAJOR } from './C';
import { D_MAJOR } from './D';
import { DB_MAJOR } from './Db';
import { E_MAJOR } from './E';
import { EB_MAJOR } from './Eb';
import { F_MAJOR } from './F';
import { FSHARP_MAJOR } from './Fsharp';
import { G_MAJOR } from './G';

export const GUITAR_ATLAS_BOOK_ONE: Readonly<
  Record<GuitarKeyName, GuitarKeyCenter>
> = {
  C: C_MAJOR,
  G: G_MAJOR,
  D: D_MAJOR,
  A: A_MAJOR,
  E: E_MAJOR,
  B: B_MAJOR,
  'F#': FSHARP_MAJOR,
  Db: DB_MAJOR,
  Ab: AB_MAJOR,
  Eb: EB_MAJOR,
  Bb: BB_MAJOR,
  F: F_MAJOR,
};

/** Book order: around the circle of fifths from C. */
export const GUITAR_KEY_ORDER: readonly GuitarKeyName[] = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
];

export function isGuitarKeyName(key: string): key is GuitarKeyName {
  return (GUITAR_KEY_ORDER as readonly string[]).includes(key);
}

/**
 * The book spells each key one way. Other spellings of the same pitch map to
 * the book's key, so /gflat opens F♯ rather than falling back to C.
 */
const ENHARMONIC_BOOK_KEY: Readonly<Record<string, GuitarKeyName>> = {
  Gb: 'F#',
  'C#': 'Db',
  'G#': 'Ab',
  'D#': 'Eb',
  'A#': 'Bb',
  Cb: 'B',
  Fb: 'E',
  'E#': 'F',
  'B#': 'C',
};

/** The book key for an ASCII key name ('F#', 'Gb', 'C#' …), or null. */
export function toBookKey(key: string): GuitarKeyName | null {
  const ascii = key.replace('♯', '#').replace('♭', 'b');
  if (isGuitarKeyName(ascii)) return ascii;
  return ENHARMONIC_BOOK_KEY[ascii] ?? null;
}

export function getGuitarKeyCenter(key: string): GuitarKeyCenter | undefined {
  const bookKey = toBookKey(key);
  return bookKey ? GUITAR_ATLAS_BOOK_ONE[bookKey] : undefined;
}

// ── Spelling ──────────────────────────────────────────────────────────────

export const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

const PITCH_CLASS: Readonly<Record<GuitarKeyName, number>> = {
  C: 0,
  G: 7,
  D: 2,
  A: 9,
  E: 4,
  B: 11,
  'F#': 6,
  Db: 1,
  Ab: 8,
  Eb: 3,
  Bb: 10,
  F: 5,
};

export function keyPitchClass(key: GuitarKeyName): number {
  return PITCH_CLASS[key];
}

function toAscii(name: string): string {
  return name.replace(/♯/g, '#').replace(/♭/g, 'b');
}

/** The major scale of a key, spelled in the key, ASCII accidentals. */
export function keyScaleSpelling(key: GuitarKeyName): string[] {
  const spelled = spellScale(key, [...MAJOR_SCALE_STEPS]);
  if (!spelled) throw new Error(`Cannot spell ${key} major`);
  return spelled.map(toAscii);
}

const QUALITY_HYBRID: Readonly<Record<BookChordQuality, string>> = {
  maj: 'maj',
  min: 'min',
  dim: 'dim',
  aug: 'aug',
  majb5: 'maj(b5)',
  sus2b5: 'sus2(b5)',
  maj7: 'maj7',
  min7: 'min7',
  dom7: 'dom7',
  min7b5: 'min7(b5)',
  dim7: 'dim7',
  minMaj7: 'min(maj7)',
  'maj7#5': 'maj7(#5)',
  dom7b5: 'dom7(b5)',
  min6: 'min6',
  sus2b5add6: 'sus2(b5)add6',
};

/** The Hybrid Number System label: '2 min7', '7 min7(b5)'. */
export function hybridLabel(
  degree: ScaleDegree,
  quality: BookChordQuality,
): string {
  return `${degree} ${QUALITY_HYBRID[quality]}`;
}

const BAR_WORDS: Readonly<Record<number, string>> = {
  1: 'One Bar',
  2: 'Two Bars',
  4: 'Four Bars',
};

/** 'Example 5: Four Bars'. */
export function mapLabel(map: GuitarMusicMap): string {
  const bars = BAR_WORDS[map.bars.length] ?? `${map.bars.length} Bars`;
  return `Example ${map.example}: ${bars}`;
}

/** '| 1 maj7 | 2 min7 |' — the progression line printed above each map. */
export function mapProgressionText(map: GuitarMusicMap): string {
  return `| ${map.bars.map((b) => hybridLabel(b.degree, b.quality)).join(' | ')} |`;
}
