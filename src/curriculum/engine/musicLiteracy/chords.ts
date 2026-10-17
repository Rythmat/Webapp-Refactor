/**
 * Music Literacy Part 2's chords: the diatonic chords of natural major and
 * minor by the app's hybrid numbering ("4 maj", "♭6 maj", "5 dom7"), the
 * palette a student picks an X from, root-position voicings with every
 * root in D3–C♯4, and progressions built from a template and the picks.
 *
 *   Major  1 maj  2 min  3 min  4 maj  5 maj  6 min      (7 dim: left out)
 *          1 maj7 2 min7 3 min7 4 maj7 5 dom7 6 min7
 *   Minor  1 min  ♭3 maj 4 min  5 min  ♭6 maj ♭7 maj     (2 dim: left out)
 *          1 min7 ♭3 maj7 4 min7 5 min7 ♭6 maj7 ♭7 dom7
 *
 * A chord is named by its root's degree of the mode ('3' in minor is the ♭3
 * chord), as scale-numbered lessons write it; its label shows the root's
 * chromatic number, so minor's '3' reads "♭3 maj". Never Roman numerals.
 * Pure, no React.
 */

import {
  LITERACY_DIMINISHED_DEGREE,
  LITERACY_SCALE_DEGREES,
  type LiteracyHarmony,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyTemplateBar,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import {
  DEGREE_OF_SEMITONE,
  SCALE_SEMITONES,
  degreeLabel,
  pitchClassOf,
} from './pitch';

/** A triad's or a 7th chord's quality, as its label writes it. */
export type ChordQuality = 'maj' | 'min' | 'maj7' | 'min7' | 'dom7';

/** A diatonic chord of a mode, in a harmony. */
export interface LiteracyChord {
  /** Its root as a degree of the mode: '3' in minor is the ♭3 chord. */
  degree: LiteracyScaleDegree;
  mode: LiteracyMode;
  harmony: LiteracyHarmony;
  /** The root's hybrid number: "4", "♭6". */
  number: string;
  quality: ChordQuality;
  /** "4 maj", "♭6 maj", "5 dom7": how the app names it. */
  label: string;
  /** The root, in semitones above the 1. */
  rootSemitones: number;
  /** Its notes in semitones above the root, low to high: [0, 4, 7]. */
  intervals: readonly number[];
}

/** A chord voiced in the series' register: root position, root in D3–C♯4. */
export interface VoicedChord extends LiteracyChord {
  /** The root's MIDI note, 50–61. */
  root: number;
  /** Every note, low to high. */
  midis: readonly number[];
  /** The notes' pitch classes (C = 0), root first: what a student must play. */
  pitchClasses: readonly number[];
}

/** The lowest and highest a chord's root sits: D3 and C♯4. */
export const CHORD_ROOT_LOW = 50;
export const CHORD_ROOT_HIGH = 61;

const QUALITY: Readonly<Record<string, ChordQuality>> = {
  '0,4,7': 'maj',
  '0,3,7': 'min',
  '0,4,7,11': 'maj7',
  '0,3,7,10': 'min7',
  '0,4,7,10': 'dom7',
};

/**
 * A mode's chord on a degree, stacked in thirds from the mode's own notes;
 * null for the diminished one (major's 7, minor's 2), which Part 2 leaves
 * out.
 */
export function diatonicChord(
  mode: LiteracyMode,
  degree: LiteracyScaleDegree,
  harmony: LiteracyHarmony = 'triads',
): LiteracyChord | null {
  if (degree === LITERACY_DIMINISHED_DEGREE[mode]) return null;
  const scale = SCALE_SEMITONES[mode];
  const index = LITERACY_SCALE_DEGREES.indexOf(degree);
  const root = scale[index];
  const stack = harmony === 'sevenths' ? [0, 2, 4, 6] : [0, 2, 4];
  const intervals = stack.map(
    (third) => (scale[(index + third) % 7] - root + 12) % 12,
  );
  const quality = QUALITY[intervals.join(',')];
  const number = degreeLabel(DEGREE_OF_SEMITONE[root]);
  return {
    degree,
    mode,
    harmony,
    number,
    quality,
    label: `${number} ${quality}`,
    rootSemitones: root,
    intervals,
  };
}

/** "4 maj", "♭6 maj7": a chord's label, or null for the left-out one. */
export function chordLabel(
  mode: LiteracyMode,
  degree: LiteracyScaleDegree,
  harmony: LiteracyHarmony = 'triads',
): string | null {
  return diatonicChord(mode, degree, harmony)?.label ?? null;
}

/** A mode's six chords, the 1 first: the table above. */
export function diatonicChords(
  mode: LiteracyMode,
  harmony: LiteracyHarmony = 'triads',
): LiteracyChord[] {
  return LITERACY_SCALE_DEGREES.map((degree) =>
    diatonicChord(mode, degree, harmony),
  ).filter((chord): chord is LiteracyChord => chord !== null);
}

/**
 * The chords an X may be: the mode's chords but the 1. Major 2, 3, 4, 5,
 * 6; minor ♭3, 4, 5, ♭6, ♭7.
 */
export function chordPalette(
  mode: LiteracyMode,
  harmony: LiteracyHarmony = 'triads',
): LiteracyChord[] {
  return diatonicChords(mode, harmony).filter((chord) => chord.degree !== '1');
}

/** Whether a degree is an X the mode offers. */
export const inPalette = (
  mode: LiteracyMode,
  degree: LiteracyScaleDegree,
): boolean => degree !== '1' && diatonicChord(mode, degree) !== null;

/** A chord's root in D3–C♯4, for the key's 1. */
export function chordRootMidi(
  tonic: LiteracyTonic,
  rootSemitones: number,
): number {
  const pitchClass = (pitchClassOf(tonic) + rootSemitones) % 12;
  return CHORD_ROOT_LOW + ((pitchClass - (CHORD_ROOT_LOW % 12) + 12) % 12);
}

/** A chord in a key, in root position with its root in D3–C♯4. */
export function voiceChord(
  chord: LiteracyChord,
  tonic: LiteracyTonic,
): VoicedChord {
  const root = chordRootMidi(tonic, chord.rootSemitones);
  const midis = chord.intervals.map((interval) => root + interval);
  return {
    ...chord,
    root,
    midis,
    pitchClasses: midis.map((midi) => midi % 12),
  };
}

/** A key's chord on a degree, voiced; null for the left-out one. */
export function voicedChord(
  key: { tonic: LiteracyTonic; mode: LiteracyMode },
  degree: LiteracyScaleDegree,
  harmony: LiteracyHarmony = 'triads',
): VoicedChord | null {
  const chord = diatonicChord(key.mode, degree, harmony);
  return chord && voiceChord(chord, key.tonic);
}

// ── Progressions ───────────────────────────────────────────────────────────

/** Where a template's X bars are, in order: what each pick fills. */
export function xBars(template: readonly LiteracyTemplateBar[]): number[] {
  return template.flatMap((bar, b) => (bar === 'X' ? [b] : []));
}

/**
 * A template with its X bars filled, one pick each in order: the
 * progression, a chord a bar. Null until every X has a pick.
 */
export function fillTemplate(
  template: readonly LiteracyTemplateBar[],
  picks: readonly (LiteracyScaleDegree | null | undefined)[],
): LiteracyScaleDegree[] | null {
  let next = 0;
  const chords: LiteracyScaleDegree[] = [];
  for (const bar of template) {
    if (bar === '1') {
      chords.push('1');
      continue;
    }
    const pick = picks[next++];
    if (!pick) return null;
    chords.push(pick);
  }
  return chords;
}

/** Why a set of picks doesn't make the template's progression yet. */
export interface ProgressionProblem {
  code: 'unfilled' | 'notInPalette' | 'tooFew' | 'tooMany';
  /** For the student, short. */
  message: string;
  /** The pick it's about (an index into the picks), when it's one. */
  pick?: number;
}

const chordsWord = (n: number) => (n === 1 ? 'chord' : 'chords');

/**
 * What's wrong with the picks for a template that wants `distinct`
 * different X chords; none once they make its progression. Picks are one
 * per X bar, in order, each from the mode's palette.
 */
export function progressionProblems(
  template: readonly LiteracyTemplateBar[],
  distinct: number,
  picks: readonly (LiteracyScaleDegree | null | undefined)[],
  mode: LiteracyMode,
): ProgressionProblem[] {
  const problems: ProgressionProblem[] = [];
  const slots = xBars(template).length;
  const chosen: LiteracyScaleDegree[] = [];
  for (let pick = 0; pick < slots; pick++) {
    const degree = picks[pick];
    if (!degree) {
      problems.push({
        code: 'unfilled',
        message: 'Choose a chord for every X.',
        pick,
      });
    } else if (!inPalette(mode, degree)) {
      problems.push({
        code: 'notInPalette',
        message: `Choose from the palette: the ${degree} chord isn’t in it.`,
        pick,
      });
    } else {
      chosen.push(degree);
    }
  }
  const different = new Set(chosen).size;
  if (different > distinct) {
    problems.push({
      code: 'tooMany',
      message: `Use just ${distinct} different ${chordsWord(distinct)}.`,
    });
  } else if (different < distinct && problems.length === 0) {
    // Only once every X has a chord from the palette.
    problems.push({
      code: 'tooFew',
      message: `Use ${distinct} different ${chordsWord(distinct)}.`,
    });
  }
  return problems;
}

/** The most-used chords first: what a preview fills X's with. */
const SAMPLE_ORDER: Readonly<Record<LiteracyMode, LiteracyScaleDegree[]>> = {
  major: ['4', '5', '6', '2', '3'],
  minor: ['4', '5', '6', '7', '3'],
};

/**
 * A progression a template could make, for a preview before the student
 * has chosen (the editor, Listen with nothing saved): `distinct` common
 * chords taking the X bars in turn.
 */
export function sampleProgression(
  template: readonly LiteracyTemplateBar[],
  distinct: number,
  mode: LiteracyMode,
): LiteracyScaleDegree[] {
  const pool = SAMPLE_ORDER[mode].slice(0, Math.max(1, distinct));
  const picks = xBars(template).map((_, n) => pool[n % pool.length]);
  return fillTemplate(template, picks)!;
}

/** "1 maj", "4 maj", …: a progression's chords as the app names them. */
export function progressionLabels(
  chords: readonly LiteracyScaleDegree[],
  mode: LiteracyMode,
  harmony: LiteracyHarmony = 'triads',
): string[] {
  return chords.map(
    (degree) => chordLabel(mode, degree, harmony) ?? `${degree} dim`,
  );
}
