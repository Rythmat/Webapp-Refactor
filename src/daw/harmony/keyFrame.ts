/**
 * keyFrame.ts — a key as the harmony code reads it: its tonic, its mode, and
 * the parent major key the progression graph is written in.
 *
 * Two degree systems meet here. The chord lane counts degrees from the key's
 * own tonic, on the major scale ("1 minor" is A minor in A aeolian, "♭3 major"
 * its C), and so do degreeKeys and every degree label the app shows. Prism's
 * progression graph counts from the parent major key ("6 minor" is the same
 * A minor). toGraph and fromGraph cross between them; only the seven diatonic
 * modes have a parent, so the others leave labels as they are.
 */
import {
  MODES,
  getModeOffset,
  ionianToModeLabel,
  isDiatonicMode,
  modeToIonianLabel,
} from '@prism/engine';

export interface KeyFrame {
  /** Tonic pitch class, 0–11 (the project's rootNote). */
  tonicPc: number;
  /** An ALL_MODES key: 'ionian', 'dorian', … 'harmonicMinor'. */
  mode: string;
  /**
   * The parent major key's tonic: C for A aeolian. The tonic itself outside
   * the seven diatonic modes, which have no parent.
   */
  parentPc: number;
  /** One of the seven diatonic modes, the ones the progression graph knows. */
  diatonic: boolean;
}

const IONIAN = MODES.ionian;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function keyFrame(tonicPc: number, mode: string): KeyFrame {
  const tonic = mod12(tonicPc);
  return {
    tonicPc: tonic,
    mode,
    parentPc: mod12(tonic - getModeOffset(mode)),
    diatonic: isDiatonicMode(mode),
  };
}

/** The project's key, or null when the student hasn't set one. */
export function keyFrameOf(
  rootNote: number | null | undefined,
  mode: string | null | undefined,
): KeyFrame | null {
  if (rootNote === null || rootNote === undefined) return null;
  return keyFrame(rootNote, mode || 'ionian');
}

/** A chord-lane degree label in the graph's terms: "1 minor" → "6 minor" in A aeolian. */
export const toGraph = (frame: KeyFrame, label: string): string =>
  modeToIonianLabel(label, frame.mode);

/** A graph chord in the lane's terms: "6 minor" → "1 minor" in A aeolian. */
export const fromGraph = (frame: KeyFrame, graphName: string): string =>
  ionianToModeLabel(graphName, frame.mode);

const DEGREE = /^([b#♭♯]?)([1-7])$/;

/**
 * The pitch class of a degree ("♭3", "#4", "5") counted on the major scale
 * from `fromPc`, or null when it isn't one.
 */
export function degreeToPc(degree: string, fromPc: number): number | null {
  const match = DEGREE.exec(degree.trim());
  if (!match) return null;
  const accidental = /[b♭]/.test(match[1]) ? -1 : /[#♯]/.test(match[1]) ? 1 : 0;
  return mod12(fromPc + IONIAN[Number(match[2]) - 1] + accidental);
}

/**
 * A pitch class as a degree of the major scale on `fromPc`, as the lane
 * writes degrees: a scale step, else a flat ("b3", "b6"), except the
 * tritone, which is "#4" (resolveDegreeKey's choice for chords without a
 * colour of their own).
 */
export function pcToDegree(pc: number, fromPc: number): string {
  const diff = mod12(pc - fromPc);
  const step = IONIAN.indexOf(diff);
  if (step >= 0) return `${step + 1}`;
  if (diff === 6) return '#4';
  return `b${IONIAN.indexOf(diff + 1) + 1}`;
}

/** A pitch class as a degree counted from the key's tonic: E in C → "3". */
export const tonicDegreeOf = (frame: KeyFrame, pc: number): string =>
  pcToDegree(pc, frame.tonicPc);
