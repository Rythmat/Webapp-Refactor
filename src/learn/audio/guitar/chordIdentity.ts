/**
 * chordIdentity.ts — Chord identity for guitar lessons (pure).
 *
 * Guitar chords are judged by pitch-class set, never exact MIDI: a strummed
 * open C (C3 E3 G3 C4 E4) is {C E G} and matches any C major target however
 * it is voiced, and label ambiguities the detector can produce (Am7 vs C6,
 * Bm7♭5 vs Dm6) vanish because the sets are equal. Chord names are limited
 * to what AudioChordDetector can report, so MIDI guitar and audio input are
 * judged against the same table.
 */

import { CHORDS } from '@prism/engine';
import {
  MIDI_ROOT_TO_KEY,
  buildSpellingMap,
  spellChord,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  CHORD_PRIOR,
  DETECTABLE_CHORD_QUALITIES,
} from '@/daw/audio/AudioChordDetector';

/** Identity score at which a chord counts as played (OOT hold and hit). */
export const IDENTITY_PASS = 0.8;
/** Identity score at which a chord pairs with a target at all (IT). */
export const IDENTITY_MATCH = 0.6;

export interface ChordIdentity {
  rootPc: number;
  /** A key of @prism/engine's CHORDS, within DETECTABLE_CHORD_QUALITIES. */
  quality: string;
}

/** A chord as pitch classes. Only a target's root affects identity scores. */
export interface PitchClassChord {
  pcs: Iterable<number>;
  rootPc: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Pitch-class set as a 12-bit mask (bit n = pitch class n). */
function pcMask(pcs: Iterable<number>): number {
  let mask = 0;
  for (const pc of pcs) mask |= 1 << mod12(pc);
  return mask;
}

function bitCount(mask: number): number {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

/** Pitch classes of a chord, root first, in CHORDS interval order. */
export function chordPcs(rootPc: number, quality: string): number[] {
  const intervals = CHORDS[quality];
  if (!intervals) return [];
  return [...new Set(intervals.map((iv) => mod12(rootPc + iv)))];
}

/**
 * Every detectable chord, most likely first (the detector's CHORD_PRIOR, with
 * its 0.8 default); equal priors keep the detector's quality order.
 */
const CANDIDATES = [...DETECTABLE_CHORD_QUALITIES]
  .filter((quality) => CHORDS[quality])
  .sort((a, b) => (CHORD_PRIOR[b] ?? 0.8) - (CHORD_PRIOR[a] ?? 0.8))
  .flatMap((quality) =>
    Array.from({ length: 12 }, (_, rootPc) => ({
      rootPc,
      quality,
      mask: pcMask(chordPcs(rootPc, quality)),
    })),
  );

/**
 * Name a pitch-class set exactly. Several names can fit one set (Am7 = C6):
 * the one rooted on `bassPc` wins, otherwise the most common quality.
 */
export function identifyChordFromPitchClasses(
  pcs: Iterable<number>,
  bassPc?: number,
): ChordIdentity | null {
  const mask = pcMask(pcs);
  const bass = bassPc === undefined ? undefined : mod12(bassPc);
  let first: ChordIdentity | null = null;
  for (const { rootPc, quality, mask: candidate } of CANDIDATES) {
    if (candidate !== mask) continue;
    if (rootPc === bass) return { rootPc, quality };
    first ??= { rootPc, quality };
  }
  return first;
}

/**
 * How well a played chord matches a target, by pitch-class set:
 *   1.0  the same set (voicing, octave and label ambiguity don't matter);
 *   0.8  a subset of 3+ pitch classes that keeps the target root (e.g. the
 *        7th of a 7th chord wasn't heard);
 *   0.6  any other subset of 2+ pitch classes (rootless, or root plus one
 *        tone), or the whole target plus exactly one extra pitch class (an
 *        open string ringing);
 *   0    anything else, including a single pitch class.
 */
export function chordIdentityScore(
  target: PitchClassChord,
  played: PitchClassChord,
): number {
  return maskScore(pcMask(target.pcs), target.rootPc, pcMask(played.pcs));
}

function maskScore(target: number, rootPc: number, played: number): number {
  if (played === target) return played ? 1 : 0;
  if ((played & ~target) === 0) {
    const size = bitCount(played);
    if (size >= 3 && played & (1 << mod12(rootPc))) return 0.8;
    return size >= 2 ? 0.6 : 0;
  }
  return (target & ~played) === 0 && bitCount(played & ~target) === 1 ? 0.6 : 0;
}

/**
 * The detectable chord a pitch-class set is closest to when no name fits it
 * exactly (e.g. a MIDI guitar with a stray string held): the best
 * chordIdentityScore of the set against each chord, if at least
 * IDENTITY_MATCH, with the same tie-breaks as identifyChordFromPitchClasses.
 */
export function nearestChordForPitchClasses(
  pcs: Iterable<number>,
  bassPc?: number,
): ChordIdentity | null {
  const played = pcMask(pcs);
  const bass = bassPc === undefined ? undefined : mod12(bassPc);
  let best: (ChordIdentity & { score: number }) | null = null;
  for (const { rootPc, quality, mask } of CANDIDATES) {
    const score = maskScore(mask, rootPc, played);
    if (score < IDENTITY_MATCH) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && rootPc === bass && best.rootPc !== bass)
    ) {
      best = { rootPc, quality, score };
    }
  }
  return best && { rootPc: best.rootPc, quality: best.quality };
}

function maskPcs(mask: number): number[] {
  return Array.from({ length: 12 }, (_, pc) => pc).filter(
    (pc) => mask & (1 << pc),
  );
}

/** A chroma bin counts as heard at this fraction of the loudest bin. */
const CHROMA_HEARD_RATIO = 0.25;

export interface ChordToneDiagnostics {
  /** Target tones not heard, in order up from the root. */
  missingPcs: number[];
  /** Tones heard outside the target, in order up from the root. */
  extraPcs: number[];
}

/**
 * Which chord tones were missing or extra. `heard` is either the pitch
 * classes played (MIDI) or a 12-bin chroma (AudioChordDetector.getLastChroma).
 */
export function chordToneDiagnostics(
  targetPcs: number[],
  rootPc: number,
  heard: number[] | Float64Array,
): ChordToneDiagnostics {
  let heardMask = 0;
  if (heard instanceof Float64Array) {
    const threshold = Math.max(...heard) * CHROMA_HEARD_RATIO;
    heard.forEach((energy, pc) => {
      if (energy > 0 && energy >= threshold) heardMask |= 1 << pc;
    });
  } else {
    heardMask = pcMask(heard);
  }
  const targetMask = pcMask(targetPcs);
  const fromRoot = (a: number, b: number) =>
    mod12(a - rootPc) - mod12(b - rootPc);
  return {
    missingPcs: maskPcs(targetMask & ~heardMask).sort(fromRoot),
    extraPcs: maskPcs(heardMask & ~targetMask).sort(fromRoot),
  };
}

const IONIAN = [0, 2, 4, 5, 7, 9, 11];

/** Chord-formula name of each interval above the root. */
const DEGREE_NAMES = [
  'root',
  '♭9',
  '9',
  '♭3',
  '3',
  '4',
  '♭5',
  '5',
  '♯5',
  '6',
  '♭7',
  '7',
];

/** A pitch class spelled for the lesson key (MIDI root or pitch class). */
export function pitchClassName(pc: number, keyRoot: number): string {
  const key = MIDI_ROOT_TO_KEY[mod12(keyRoot)];
  return buildSpellingMap(key, IONIAN).get(mod12(pc)) ?? '';
}

/**
 * A chord tone for feedback, e.g. 'the 3 (G♯)' or 'the root (E)'. The root
 * is spelled in the key, the tone from the root, so E major in C still reads
 * G♯, never A♭.
 */
export function describeChordTone(
  pc: number,
  rootPc: number,
  keyRoot: number,
): string {
  const interval = mod12(pc - rootPc);
  const rootName = pitchClassName(rootPc, keyRoot);
  const name =
    interval === 0 ? rootName : spellChord(rootName, [0, interval])[1];
  return `the ${DEGREE_NAMES[interval]} (${name})`;
}
