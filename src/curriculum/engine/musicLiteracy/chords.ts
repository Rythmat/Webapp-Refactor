/**
 * Music Literacy Part 2's chords: the diatonic chords of natural major and
 * minor by the app's hybrid numbering ("4 maj", "♭6 maj", "5 dom7"), the
 * palette a student picks an X from, root-position voicings in the treble
 * staff (THE VOICING below), and progressions built from a template and the
 * picks.
 *
 *   Major  1 maj  2 min  3 min  4 maj  5 maj  6 min      (7 dim: left out)
 *          1 maj7 2 min7 3 min7 4 maj7 5 dom7 6 min7
 *   Minor  1 min  ♭3 maj 4 min  5 min  ♭6 maj ♭7 maj     (2 dim: left out)
 *          1 min7 ♭3 maj7 4 min7 5 min7 ♭6 maj7 ♭7 dom7
 *
 * A chord is named by its root's degree of the mode ('3' in minor is the ♭3
 * chord), as scale-numbered lessons write it; its label shows the root's
 * chromatic number, so minor's '3' reads "♭3 maj". Never Roman numerals.
 *
 * THE VOICING (`voiceChords`)
 * The owner: "Just optimize for the fewest ledger lines ... with the
 * exception that we never want to jump further than a 4th in any
 * direction. So never jump down from a 6 chord to a 1 chord (like Amin down
 * to Cmaj — no, just go up to C from Amin, or vice versa. A couple ledger
 * lines are ok in these instances)."
 *
 * Every chord is in root position, a triad or a 7th as written. The chords
 * a step plays in order (a progression's bars; a replay's, its triads then
 * its 7ths) are voiced together, each one's octave chosen so that
 *
 *   1. one chord's root never moves more than a perfect 4th (5 semitones),
 *      up or down, to the next's;
 *   2. every note is in C3–C6 (MIDI 48–84), as near as the 4ths allow (a
 *      figure climbing by 4ths may need a note past it: the fewest
 *      semitones past, C2–C7 at the very most);
 *   3. the ledger lines on the treble staff, summed over the chords, are as
 *      few as they can be (counted as a melody's are, register.ts: a chord
 *      needs its lowest note's below the staff plus its highest's above);
 *   4. on a tie, the roots move least in all, then sit lowest.
 *
 * It is solved exactly, a chord at a time over the octaves each may take
 * (dynamic programming). Any two of the chords here are within a 4th one
 * way or the other (only a tritone is not, and of two chords a tritone
 * apart one is always the diminished chord, left out), so step 1 always
 * leaves a way. As one chord's root is within a 4th of the next one way
 * only, the first chord's octave sets the rest: the rule picks where a
 * figure starts.
 *
 * Where the figure starts over (a replay's 7ths after its triads: a
 * `restarts` index) it starts a new phrase, as a song does going back to
 * its top: the 4th rule holds within each pass, and the second pass takes
 * its own fewest ledger lines. It stays within a 4th of where the first
 * ended only when that costs no lines, so a progression that climbs as it
 * goes round (4 5 6 2) is not pushed low to come round again. A chord
 * alone (the chooser playing one, a step of one chord) takes the fewest
 * ledger lines, then the lower.
 *
 * Chords are graded by pitch class (chordGrading.ts): the octaves are only
 * what is shown and played. Pure, no React.
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
  type LiteracyKey,
} from './pitch';
import { ledgerLinesOf, staffPosition } from './register';

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

/** A chord voiced: in root position, in the treble staff (THE VOICING). */
export interface VoicedChord extends LiteracyChord {
  /** The root's MIDI note. */
  root: number;
  /** Every note, low to high. */
  midis: readonly number[];
  /** The notes' pitch classes (C = 0), root first: what a student must play. */
  pitchClasses: readonly number[];
}

/** The range a chord's notes keep: C3 to C6. */
export const CHORD_LOWEST_MIDI = 48;
export const CHORD_HIGHEST_MIDI = 84;

/**
 * As far as a figure may stretch past C3–C6 to keep its 4ths, when it must:
 * C2 to C7, which hold any figure the schema allows (eight bars at most)
 * climbing by 4ths all the way.
 */
const CHORD_FLOOR_MIDI = 36;
const CHORD_CEILING_MIDI = 96;

/** The furthest a chord's root moves to the next's: a perfect 4th. */
export const MAX_ROOT_MOVE = 5;

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

/** A chord with its root at `root`: root position, each note above it. */
export function chordAt(chord: LiteracyChord, root: number): VoicedChord {
  const midis = chord.intervals.map((interval) => root + interval);
  return {
    ...chord,
    root,
    midis,
    pitchClasses: midis.map((midi) => midi % 12),
  };
}

/**
 * The ledger lines a chord needs on the treble staff with its root at
 * `root`, its notes spelled the key's way: each a third (two letters) above
 * the last, from the root's letter, the 1's letter plus its degree.
 */
export function chordLedgerLines(
  chord: LiteracyChord,
  tonic: LiteracyTonic,
  root: number,
): number {
  const one = root - chord.rootSemitones;
  const key: LiteracyKey = { tonic, mode: chord.mode };
  const bottom = staffPosition({ degree: chord.degree }, one, key);
  return ledgerLinesOf(chord.intervals.map((_, third) => bottom + 2 * third));
}

/**
 * The roots a chord may have in a key, low to high: every octave keeping
 * it in C3–C6; with `stretch`, as far as C2–C7 (`chordOutside`: how far
 * past C3–C6 each goes).
 */
export function chordRoots(
  chord: LiteracyChord,
  tonic: LiteracyTonic,
  { stretch = false }: { stretch?: boolean } = {},
): number[] {
  const pitchClass = (pitchClassOf(tonic) + chord.rootSemitones) % 12;
  const top = chord.intervals.at(-1) ?? 0;
  const [low, high] = stretch
    ? [CHORD_FLOOR_MIDI, CHORD_CEILING_MIDI]
    : [CHORD_LOWEST_MIDI, CHORD_HIGHEST_MIDI];
  const roots: number[] = [];
  for (
    let root = low + ((pitchClass - low + 120) % 12);
    root + top <= high;
    root += 12
  )
    roots.push(root);
  return roots;
}

/** How far a chord with its root at `root` goes past C3–C6, in semitones. */
export function chordOutside(chord: LiteracyChord, root: number): number {
  const top = root + (chord.intervals.at(-1) ?? 0);
  return (
    Math.max(0, CHORD_LOWEST_MIDI - root) +
    Math.max(0, top - CHORD_HIGHEST_MIDI)
  );
}

/**
 * What a voicing costs, compared in order: roots leaping past a 4th within
 * a pass (never, in any figure the schema allows), semitones past C3–C6,
 * ledger lines, leaps where the figure starts over, the roots' movement,
 * their height.
 */
type Cost = readonly number[];

const plus = (a: Cost, b: Cost): Cost => a.map((x, i) => x + b[i]);

function cheaper(a: Cost, b: Cost): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/**
 * Chords played in order, voiced together (THE VOICING above): each one's
 * root chosen so no root moves past a 4th to the next, every note in
 * C3–C6 as far as it can be, with the fewest ledger lines in all; on a tie,
 * the least movement, then the lowest. `restarts` are where the figure
 * starts over (a replay's second pass): a new phrase, kept within a 4th of
 * the last only when that costs no ledger lines.
 */
export function voiceChords(
  chords: readonly LiteracyChord[],
  tonic: LiteracyTonic,
  { restarts = [] }: { restarts?: readonly number[] } = {},
): VoicedChord[] {
  const options = chords.map((chord) =>
    chordRoots(chord, tonic, { stretch: true }).map((root) => ({
      root,
      outside: chordOutside(chord, root),
      ledgerLines: chordLedgerLines(chord, tonic, root),
    })),
  );
  if (options.length === 0) return [];
  // For each chord and each root it may take: the cheapest voicing of the
  // chords up to it that ends there, and the previous chord's root in it.
  const table: { cost: Cost; from: number }[][] = [
    options[0].map(({ root, outside, ledgerLines }) => ({
      cost: [0, outside, ledgerLines, 0, 0, root],
      from: -1,
    })),
  ];
  for (let i = 1; i < options.length; i++) {
    const restart = restarts.includes(i);
    table.push(
      options[i].map(({ root, outside, ledgerLines }) => {
        let best = { cost: [Infinity] as Cost, from: -1 };
        for (let from = 0; from < options[i - 1].length; from++) {
          const move = Math.abs(root - options[i - 1][from].root);
          const leap = move > MAX_ROOT_MOVE ? 1 : 0;
          const cost = plus(table[i - 1][from].cost, [
            restart ? 0 : leap,
            outside,
            ledgerLines,
            restart ? leap : 0,
            move,
            root,
          ]);
          if (cheaper(cost, best.cost)) best = { cost, from };
        }
        return best;
      }),
    );
  }
  let at = 0;
  const last = table[table.length - 1];
  last.forEach((cell, j) => {
    if (cheaper(cell.cost, last[at].cost)) at = j;
  });
  const roots: number[] = [];
  for (let i = table.length - 1; i >= 0; i--) {
    roots[i] = options[i][at].root;
    at = table[i][at].from;
  }
  return chords.map((chord, i) => chordAt(chord, roots[i]));
}

/** A chord on its own: the fewest ledger lines, the lower on a tie. */
export function voiceChord(
  chord: LiteracyChord,
  tonic: LiteracyTonic,
): VoicedChord {
  return voiceChords([chord], tonic)[0];
}

/** A key's chord on a degree, voiced on its own; null for the left-out one. */
export function voicedChord(
  key: { tonic: LiteracyTonic; mode: LiteracyMode },
  degree: LiteracyScaleDegree,
  harmony: LiteracyHarmony = 'triads',
): VoicedChord | null {
  const chord = diatonicChord(key.mode, degree, harmony);
  return chord && voiceChord(chord, key.tonic);
}

/** One pass of a figure: its chords' degrees, in one harmony. */
export interface ChordPass {
  degrees: readonly LiteracyScaleDegree[];
  harmony: LiteracyHarmony;
}

/**
 * A figure's passes played one after another (a replay's triads, then its
 * 7ths), voiced together: each pass's chords, in order. A degree the mode
 * leaves out (the schema keeps them out) plays the 1.
 */
export function voicedPasses(
  key: { tonic: LiteracyTonic; mode: LiteracyMode },
  passes: readonly ChordPass[],
): VoicedChord[][] {
  const chords = passes.flatMap(({ degrees, harmony }) =>
    degrees.map(
      (degree) =>
        diatonicChord(key.mode, degree, harmony) ??
        diatonicChord(key.mode, '1', harmony)!,
    ),
  );
  const restarts: number[] = [];
  let start = 0;
  for (const { degrees } of passes) {
    if (start > 0) restarts.push(start);
    start += degrees.length;
  }
  const voiced = voiceChords(chords, key.tonic, { restarts });
  let next = 0;
  return passes.map(({ degrees }) =>
    voiced.slice(next, (next += degrees.length)),
  );
}

/** A key's chords on `degrees`, played in order, voiced together. */
export function voicedProgression(
  key: { tonic: LiteracyTonic; mode: LiteracyMode },
  degrees: readonly LiteracyScaleDegree[],
  harmony: LiteracyHarmony = 'triads',
): VoicedChord[] {
  return voicedPasses(key, [{ degrees, harmony }])[0];
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
