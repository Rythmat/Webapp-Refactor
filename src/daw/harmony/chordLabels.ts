/**
 * chordLabels.ts — the labels a chord-lane region stores for a chord, in the
 * lane's own dialect, written from what the chord is (its pitches) rather
 * than from whatever text named it.
 *
 *   name       the degree label, counted from the key's tonic: '2 min7',
 *              '5 maj/7' (G/B in C: the bass as a degree of the key, as
 *              hybrid notation writes it)
 *   noteName   the letter name: 'D min7', 'G maj/B' (always a letter bass,
 *              so it reads one way)
 *   degreeKey  the engine's key: '2 minor7', '5 major/3' (an engine slash
 *              quality when one voices that bass), which colours, Prism's
 *              suggestions and the Insight panel read
 *
 * Without a key there are no degrees: name and noteName are both the letter
 * name, and there is no degreeKey.
 */
import {
  CHORDS,
  NOTES,
  abbreviateSequence,
  getChordColor,
  noteNameInKey,
  resolveDegreeKey,
} from '@prism/engine';
import type { ChordPitches } from './chordIdentity';
import { pcToDegree, type KeyFrame } from './keyFrame';

export interface ChordLabels {
  name: string;
  noteName: string;
  degreeKey?: string;
  color: [number, number, number];
}

/** The colour of a chord the lane can't place in a key (insertChordRegion's). */
export const KEYLESS_CHORD_COLOR: [number, number, number] = [128, 128, 128];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * The engine slash quality that voices `pitches`' bass under its root
 * ('major/3' for G/B), if CHORDS has one. The first in CHORDS order wins, so
 * F/C is 'major/5', the chord's own fifth.
 */
export function engineSlashFor(pitches: ChordPitches): string | undefined {
  if (pitches.bassPc === pitches.rootPc) return undefined;
  const prefix = `${pitches.quality}/`;
  return Object.keys(CHORDS).find((quality) => {
    if (!quality.startsWith(prefix)) return false;
    const lowest = Math.min(...CHORDS[quality]);
    return lowest < 0 && mod12(pitches.rootPc + lowest) === pitches.bassPc;
  });
}

/** Letter spellings the writer chose ('Bb', 'D'), kept where they name the same notes. */
export interface ChordSpelling {
  root?: string;
  bass?: string;
}

function letter(
  pc: number,
  frame: KeyFrame | null,
  spelled: string | undefined,
  spelledPc: number | undefined,
): string {
  if (spelled && spelledPc === pc) return spelled;
  return frame ? noteNameInKey(pc, frame.tonicPc, frame.mode) : NOTES[pc];
}

/**
 * The labels and colour a region stores for `pitches` in `frame`. `spelling`
 * keeps the letters a student typed ('A#m' stays A♯, not B♭) when they name
 * the chord's own root and bass; `spelledPcs` says which pitch classes they
 * were read as.
 */
export function chordLabels(
  pitches: ChordPitches,
  frame: KeyFrame | null,
  spelling: ChordSpelling = {},
  spelledPcs: { root?: number; bass?: number } = {},
): ChordLabels {
  const { rootPc, quality, bassPc } = pitches;
  const slashed = bassPc !== rootPc;
  const rootLetter = letter(rootPc, frame, spelling.root, spelledPcs.root);
  const bassLetter = letter(bassPc, frame, spelling.bass, spelledPcs.bass);
  const noteName =
    abbreviateSequence(`${rootLetter} ${quality}`) +
    (slashed ? `/${bassLetter}` : '');
  if (!frame) {
    return { name: noteName, noteName, color: [...KEYLESS_CHORD_COLOR] };
  }
  const degree = resolveDegreeKey(rootPc, quality, frame.tonicPc)!.split(
    ' ',
  )[0];
  const degreeKey = `${degree} ${engineSlashFor(pitches) ?? quality}`;
  const name =
    abbreviateSequence(`${degree} ${quality}`) +
    (slashed ? `/${pcToDegree(bassPc, frame.tonicPc)}` : '');
  const [r, g, b] = getChordColor(degreeKey, 60 + frame.tonicPc, frame.mode);
  return { name, noteName, degreeKey, color: [r, g, b] };
}
