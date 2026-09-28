/**
 * Applied Theory Fundamentals — Guitar (Technique tab, free, key-parameterized).
 *
 * The guitar twin of appliedTheoryFundamentals.ts, built from The Guitar
 * Atlas: Book One. It keeps the piano flow's logic step for step — the same
 * sections, subsections, titles, assessments, tag suffixes, onsets and
 * durations — and plays the book's own material in them: its major-scale
 * position instead of a keyboard octave, its chord boxes instead of close
 * triads. Where the book has more than the piano flow (the pentatonic
 * position, triads 5-6, the 7th chords, the Music Maps) it adds subsections
 * built with the same builders; the Music Maps take the place of piano's
 * two-hand steps.
 *
 * Every note is explicit: a fret on a string (TargetNote.fretPosition) at its
 * sounding pitch, so resolveStepContent passes it through untouched (Priority
 * 1, and the register rules are skipped for guitar). Chord steps also carry
 * chordTargets, which the guitar evaluator scores by chord identity.
 *
 * One deliberate difference: B3's articulated chords sit one per beat. The
 * piano builder spaces them by their own length (staccato chords 140 ticks
 * apart), which a guitarist cannot strum and the chord detector cannot hear.
 */

import {
  fretToMidi,
  shapeNotes,
  shapePitchClasses,
} from '@/lib/guitar/fretboard';
import type { FretPosition } from '@/lib/guitar/types';
import type {
  ActivityFlowV2,
  ActivitySectionV2,
  ActivityStepV2,
  ChordTarget,
  DetectorChordQuality,
  TargetNote,
} from '../../types/activity.v2';
import {
  GUITAR_ATLAS_BOOK_ONE,
  chordRootPc,
  chordSymbol,
  mapBarShapeId,
  seventhShapeId,
  toBookKey,
  triadShapeId,
} from '../guitar/bookOne';
import type {
  BookChordQuality,
  GuitarKeyCenter,
  GuitarKeyName,
  GuitarMusicMap,
  GuitarScalePosition,
  MusicMapRhythm,
  ScaleDegree,
} from '../guitar/types';
import {
  CONTOUR_A_DEGREES,
  CONTOUR_CONNECTED_DEGREES,
  EIGHTH_NOTE,
  HALF_NOTE,
  LEGATO_DURATION,
  MAJOR_SCALE_INTERVALS,
  NORMAL_DURATION,
  PROGRESSION_DEGREES,
  QUARTER_NOTE,
  SHUFFLED_PROGRESSION_DEGREES,
  STACCATO_DURATION,
  TICKS_PER_BEAT,
  WHOLE_NOTE,
} from './appliedTheoryFundamentals';

export const GUITAR_APPLIED_THEORY_GENRE = 'guitar-applied-theory-fundamentals';
const MODULE = 'applied_theory_guitar_l1';
const OOT_SPACING = 960; // out-of-time chord spacing, as piano's B2.1/B4.1
/** Music Maps are played twice: the book prints repeat signs around them. */
export const MUSIC_MAP_PASSES = 2;

const ENGINE_QUALITY: Record<BookChordQuality, DetectorChordQuality> = {
  maj: 'major',
  min: 'minor',
  maj7: 'major7',
  min7: 'minor7',
  dom7: 'dominant7',
  min7b5: 'minor7b5',
};

type Assessment = ActivityStepV2['assessment'];

function tag(suffix: string): string {
  return `guitar_fund:${suffix} | applied_theory_guitar`;
}

// ── Chords ────────────────────────────────────────────────────────────────

/** A chord the flow plays: its book shape and what to call it. */
interface GuitarChord {
  shapeId: string;
  frets: string;
  degree: ScaleDegree;
  quality: BookChordQuality;
  symbol: string;
}

function triad(center: GuitarKeyCenter, degree: number): GuitarChord {
  const shape = center.triads[degree - 1];
  return {
    shapeId: triadShapeId(center.key, degree),
    frets: shape.frets,
    degree: shape.degree,
    quality: shape.quality,
    symbol: chordSymbol(center.key, shape.degree, shape.quality),
  };
}

/** A box from the 7th-chord page; box 8 is the closing "1". */
function seventh(center: GuitarKeyCenter, box: number): GuitarChord {
  const shape = center.sevenths[box - 1];
  return {
    shapeId: seventhShapeId(center.key, box),
    frets: shape.frets,
    degree: shape.degree,
    quality: shape.quality,
    symbol: chordSymbol(center.key, shape.degree, shape.quality),
  };
}

function chordTarget(
  key: GuitarKeyName,
  chord: GuitarChord,
  onsetTick: number,
  durationTicks: number,
  attack: ChordTarget['attack'],
): ChordTarget {
  const notes = shapeNotes(chord.frets);
  return {
    rootPc: chordRootPc(key, chord.degree),
    quality: ENGINE_QUALITY[chord.quality],
    pitchClasses: shapePitchClasses(chord.frets),
    bassPc: Math.min(...notes.map((n) => n.midi)) % 12,
    onsetTick,
    durationTicks,
    symbol: chord.symbol,
    shapeId: chord.shapeId,
    attack,
  };
}

function note(
  position: FretPosition,
  onset: number,
  duration: number,
): TargetNote {
  return {
    midi: fretToMidi(position),
    onset,
    duration,
    fretPosition: position,
  };
}

/** Every string of a shape at once — a strum. */
function strumNotes(chord: GuitarChord, onset: number, duration: number) {
  return shapeNotes(chord.frets).map((n) => note(n.position, onset, duration));
}

/**
 * Chords back to back. `durations[i]` is each chord's spacing; the notes ring
 * for `sounding[i]` (default: the spacing less 20 ticks, as piano's
 * chordBlockNotes does).
 */
function chordSequence(
  key: GuitarKeyName,
  chords: readonly GuitarChord[],
  durations: readonly number[],
  sounding?: readonly number[],
) {
  const targetNotes: TargetNote[] = [];
  const chordTargets: ChordTarget[] = [];
  let onset = 0;
  chords.forEach((chord, i) => {
    const spacing = durations[i] ?? durations[durations.length - 1];
    const length = sounding?.[i] ?? spacing - 20;
    targetNotes.push(...strumNotes(chord, onset, length));
    chordTargets.push(chordTarget(key, chord, onset, length, 'strum'));
    onset += spacing;
  });
  return { targetNotes, chordTargets };
}

/** Pick a shape string by string, lowest first, one note per beat. */
function arpeggio(key: GuitarKeyName, chord: GuitarChord) {
  const notes = shapeNotes(chord.frets);
  const targetNotes = notes.map((n, i) =>
    note(n.position, i * TICKS_PER_BEAT, NORMAL_DURATION),
  );
  return {
    targetNotes,
    chordTargets: [
      chordTarget(key, chord, 0, notes.length * TICKS_PER_BEAT, 'arpeggio'),
    ],
  };
}

// ── Scales and melodies ───────────────────────────────────────────────────

type Direction = 'ascending' | 'descending' | 'ascending_descending';

/** The position's notes in the order generateScale plays piano's. */
function scaleNotes(position: GuitarScalePosition, direction: Direction) {
  const up = [...position.playOrder];
  const order =
    direction === 'ascending'
      ? up
      : direction === 'descending'
        ? [...up].reverse()
        : [...up, ...up.slice(0, -1).reverse()];
  return order.map((p, i) => note(p, i * TICKS_PER_BEAT, NORMAL_DURATION));
}

/** Scale degrees 1-7 of the major-scale position (degree 8 = its top note). */
function contourNotes(
  position: GuitarScalePosition,
  degrees: readonly number[],
  durations: readonly number[],
) {
  return degrees.map((degree, i) =>
    note(
      position.playOrder[degree - 1],
      i * TICKS_PER_BEAT,
      durations[i] ?? NORMAL_DURATION,
    ),
  );
}

// ── Music Maps ────────────────────────────────────────────────────────────

const RHYTHM: Record<MusicMapRhythm, { ticks: number; rest: boolean }> = {
  whole: { ticks: WHOLE_NOTE, rest: false },
  'dotted-half': { ticks: HALF_NOTE + QUARTER_NOTE, rest: false },
  half: { ticks: HALF_NOTE, rest: false },
  'dotted-quarter': { ticks: QUARTER_NOTE + EIGHTH_NOTE, rest: false },
  quarter: { ticks: QUARTER_NOTE, rest: false },
  eighth: { ticks: EIGHTH_NOTE, rest: false },
  'half-rest': { ticks: HALF_NOTE, rest: true },
  'quarter-rest': { ticks: QUARTER_NOTE, rest: true },
  'eighth-rest': { ticks: EIGHTH_NOTE, rest: true },
};

/** A map played `passes` times: every strum in its rhythm, rests silent. */
function mapNotes(
  center: GuitarKeyCenter,
  map: GuitarMusicMap,
  passes = MUSIC_MAP_PASSES,
) {
  const targetNotes: TargetNote[] = [];
  const chordTargets: ChordTarget[] = [];
  let barStart = 0;
  for (let pass = 0; pass < passes; pass++) {
    map.bars.forEach((bar, b) => {
      const chord: GuitarChord = {
        shapeId: mapBarShapeId(center.key, map.example, b + 1),
        frets: bar.frets,
        degree: bar.degree,
        quality: bar.quality,
        symbol: chordSymbol(center.key, bar.degree, bar.quality),
      };
      let onset = barStart;
      for (const value of bar.rhythm) {
        const { ticks, rest } = RHYTHM[value];
        if (!rest) {
          targetNotes.push(...strumNotes(chord, onset, ticks - 20));
          chordTargets.push(
            chordTarget(center.key, chord, onset, ticks - 20, 'strum'),
          );
        }
        onset += ticks;
      }
      barStart += WHOLE_NOTE;
    });
  }
  return { targetNotes, chordTargets };
}

// ── Step builders ─────────────────────────────────────────────────────────

interface StepInput {
  section: 'A' | 'B' | 'D';
  subsection: string;
  activity: string;
  direction: string;
  suffix: string;
  assessment: Assessment;
  successFeedback: string;
  targetNotes: TargetNote[];
  chordSymbols?: string[];
  chordTargets?: ChordTarget[];
  guitar: ActivityStepV2['guitar'];
}

function createStepFactory() {
  let stepNumber = 0;
  return (input: StepInput): ActivityStepV2 => ({
    stepNumber: ++stepNumber,
    module: MODULE,
    section: input.section,
    subsection: input.subsection,
    activity: input.activity,
    direction: input.direction,
    assessment: input.assessment,
    tag: tag(input.suffix),
    styleRef: 'l1a',
    successFeedback: input.successFeedback,
    targetNotes: input.targetNotes,
    ...(input.chordSymbols ? { chordSymbols: input.chordSymbols } : {}),
    ...(input.chordTargets ? { chordTargets: input.chordTargets } : {}),
    guitar: input.guitar,
  });
}

type Step = ReturnType<typeof createStepFactory>;

// ── Section A: Melody ─────────────────────────────────────────────────────

const SCALE_STEPS: {
  direction: Direction;
  timed: boolean;
  suffix: string;
  title: string;
  majorDirection: string;
  pentatonicDirection: string;
  feedback: string;
}[] = [
  {
    direction: 'ascending',
    timed: false,
    suffix: 'ascending_oot',
    title: 'Ascending (Out of Time)',
    majorDirection:
      'Play the notes of the scale from the lowest note to the highest, at your own pace, using the position shown.',
    pentatonicDirection:
      'Play the notes of the pentatonic scale from the lowest note to the highest, at your own pace, using the position shown.',
    feedback: 'Solid — you nailed the scale shape.',
  },
  {
    direction: 'ascending',
    timed: true,
    suffix: 'ascending_it',
    title: 'Ascending (In Time)',
    majorDirection: 'In a steady tempo, play the notes of the scale going up.',
    pentatonicDirection:
      'In a steady tempo, play the notes of the pentatonic scale going up.',
    feedback: 'Right in the pocket — that scale is locked in.',
  },
  {
    direction: 'descending',
    timed: false,
    suffix: 'descending_oot',
    title: 'Descending (Out of Time)',
    majorDirection:
      'Play the notes of the scale from the highest note to the lowest, at your own pace.',
    pentatonicDirection:
      'Play the notes of the pentatonic scale from the highest note to the lowest, at your own pace.',
    feedback: 'Solid — you nailed the scale shape coming down.',
  },
  {
    direction: 'descending',
    timed: true,
    suffix: 'descending_it',
    title: 'Descending (In Time)',
    majorDirection:
      'In a steady tempo, play the notes of the scale going down.',
    pentatonicDirection:
      'In a steady tempo, play the notes of the pentatonic scale going down.',
    feedback: 'Right in the pocket — coming down clean.',
  },
  {
    direction: 'ascending_descending',
    timed: false,
    suffix: 'ascending_descending_oot',
    title: 'Ascending & Descending (Out of Time)',
    majorDirection:
      'Play the notes of the scale going up and then back down, at your own pace.',
    pentatonicDirection:
      'Play the notes of the pentatonic scale going up and then back down, at your own pace.',
    feedback: 'You played the full scale up and down — nice work.',
  },
  {
    direction: 'ascending_descending',
    timed: true,
    suffix: 'ascending_descending_it',
    title: 'Ascending & Descending (In Time)',
    majorDirection:
      'In a steady tempo, play the notes of the scale going up and then back down.',
    pentatonicDirection:
      'In a steady tempo, play the notes of the pentatonic scale going up and then back down.',
    feedback: 'Full scale, up and down, right in time — great work.',
  },
];

function buildScaleSteps(center: GuitarKeyCenter, step: Step) {
  return SCALE_STEPS.map((s, i) =>
    step({
      section: 'A',
      subsection: 'A1: Major Scale',
      activity: `A1.${i + 1}: Major Scale ${s.title}`,
      direction: s.majorDirection,
      suffix: `major_scale_${s.suffix}`,
      assessment: s.timed ? 'pitch_order_timing' : 'pitch_only',
      successFeedback: s.feedback,
      targetNotes: scaleNotes(center.majorScale, s.direction),
      guitar: { keyCenter: center.key, scalePosition: 'major' },
    }),
  );
}

function buildPentatonicSteps(center: GuitarKeyCenter, step: Step) {
  return SCALE_STEPS.map((s, i) =>
    step({
      section: 'A',
      subsection: 'A4: Major Pentatonic Scale',
      activity: `A4.${i + 1}: Major Pentatonic ${s.title}`,
      direction: s.pentatonicDirection,
      suffix: `pentatonic_scale_${s.suffix}`,
      assessment: s.timed ? 'pitch_order_timing' : 'pitch_only',
      successFeedback: s.feedback.replace('scale', 'pentatonic scale'),
      targetNotes: scaleNotes(center.pentatonic, s.direction),
      guitar: { keyCenter: center.key, scalePosition: 'pentatonic' },
    }),
  );
}

function buildMelodySteps(center: GuitarKeyCenter, step: Step) {
  const position = center.majorScale;
  const normal3 = [NORMAL_DURATION, NORMAL_DURATION, NORMAL_DURATION];
  const normal6 = Array(6).fill(NORMAL_DURATION) as number[];
  const staccato3 = Array(3).fill(STACCATO_DURATION) as number[];
  const legato3 = Array(3).fill(LEGATO_DURATION) as number[];
  const mixed3 = [STACCATO_DURATION, LEGATO_DURATION, STACCATO_DURATION];
  const mixed6 = [
    STACCATO_DURATION,
    LEGATO_DURATION,
    STACCATO_DURATION,
    LEGATO_DURATION,
    STACCATO_DURATION,
    LEGATO_DURATION,
  ];
  const guitar = { keyCenter: center.key, scalePosition: 'major' as const };
  const melody = (
    subsection: string,
    activity: string,
    direction: string,
    suffix: string,
    assessment: Assessment,
    successFeedback: string,
    degrees: readonly number[],
    durations: readonly number[],
  ) =>
    step({
      section: 'A',
      subsection,
      activity,
      direction,
      suffix,
      assessment,
      successFeedback,
      targetNotes: contourNotes(position, degrees, durations),
      guitar,
    });

  return [
    melody(
      'A2: Melody',
      'A2.1: 3 Note Contour (Out of Time)',
      'Play this short melodic phrase, at your own pace.',
      'contour_a_oot',
      'pitch_only',
      'Nice shape — that melodic phrase is yours now.',
      CONTOUR_A_DEGREES,
      normal3,
    ),
    melody(
      'A2: Melody',
      'A2.2: 3 Note Contour (In Time)',
      'In a steady tempo, play this short melodic phrase.',
      'contour_a_it',
      'pitch_order_timing',
      'Right in time — that phrase locked in nicely.',
      CONTOUR_A_DEGREES,
      normal3,
    ),
    melody(
      'A2: Melody',
      'A2.3: Connect Two 3 Note Contours (Out of Time)',
      'Play this longer melodic phrase, at your own pace.',
      'contour_connected_oot',
      'pitch_only',
      'You connected both phrases smoothly — nice work.',
      CONTOUR_CONNECTED_DEGREES,
      normal6,
    ),
    melody(
      'A2: Melody',
      'A2.4: Connect Two 3 Note Contours (In Time)',
      'In a steady tempo, play this longer melodic phrase.',
      'contour_connected_it',
      'pitch_order_timing',
      'Both phrases, locked in time — great work.',
      CONTOUR_CONNECTED_DEGREES,
      normal6,
    ),
    melody(
      'A3: Melody Articulation',
      'A3.1: 3 Note Contour (Staccato)',
      'In a steady tempo, play this short melodic phrase with short, detached articulations ("staccato") — lift the finger or mute each note after you pick it.',
      'contour_a_staccato',
      'pitch_order_timing_duration',
      'Crisp and detached — that’s staccato.',
      CONTOUR_A_DEGREES,
      staccato3,
    ),
    melody(
      'A3: Melody Articulation',
      'A3.2: 3 Note Contour (Legato)',
      'In a steady tempo, play this short melodic phrase with long, connected articulations ("legato").',
      'contour_a_legato',
      'pitch_order_timing_duration',
      'Smooth and connected — that’s legato.',
      CONTOUR_A_DEGREES,
      legato3,
    ),
    melody(
      'A3: Melody Articulation',
      'A3.3: 3 Note Contour (Mixed Articulation)',
      'In a steady tempo, play this short melodic phrase with mixed articulations (staccato and legato).',
      'contour_a_mixed',
      'pitch_order_timing_duration',
      'Nice control mixing short and long notes.',
      CONTOUR_A_DEGREES,
      mixed3,
    ),
    melody(
      'A3: Melody Articulation',
      'A3.4: Connect Two 3 Note Contours (Mixed Articulation)',
      'In a steady tempo, play this longer melodic phrase with mixed articulations.',
      'contour_connected_mixed',
      'pitch_order_timing_duration',
      'Great control over the full phrase, short and long notes alike.',
      CONTOUR_CONNECTED_DEGREES,
      mixed6,
    ),
  ];
}

// ── Section B: Chords ─────────────────────────────────────────────────────

function arpeggioSteps(
  center: GuitarKeyCenter,
  step: Step,
  subsection: string,
  label: string,
  chords: { chord: GuitarChord; degree: number; suffix: string }[],
  titleNoun: string,
) {
  const steps: ActivityStepV2[] = [];
  let sub = 1;
  for (const { chord, degree, suffix } of chords) {
    for (const timed of [false, true]) {
      const { targetNotes, chordTargets } = arpeggio(center.key, chord);
      steps.push(
        step({
          section: 'B',
          subsection,
          activity: `${label}.${sub++}: Arpeggiate The ${degree} ${titleNoun}(${timed ? 'In Time' : 'Out of Time'})`,
          direction: timed
            ? `In a steady tempo, pick each string of the ${chord.symbol} shape one at a time, lowest to highest.`
            : `Fret the ${chord.symbol} shape shown, then pick each string one at a time, from the lowest string to the highest.`,
          suffix: `${suffix}_${timed ? 'it' : 'oot'}`,
          assessment: timed ? 'pitch_order_timing' : 'pitch_only',
          successFeedback: timed
            ? `Well done — you arpeggiated ${chord.symbol} right in time.`
            : `Well done. You arpeggiated ${chord.symbol}!`,
          targetNotes,
          chordSymbols: [chord.symbol],
          chordTargets,
          guitar: { keyCenter: center.key, shapeIds: [chord.shapeId] },
        }),
      );
    }
  }
  return steps;
}

function playChordSteps(
  center: GuitarKeyCenter,
  step: Step,
  subsection: string,
  label: string,
  chords: GuitarChord[],
  numbers: string,
  suffix: string,
  feedback: { oot: string; whole: string; half: string; quarter: string },
) {
  const symbols = chords.map((c) => c.symbol);
  const list = symbols.join(', ');
  const guitar = {
    keyCenter: center.key,
    shapeIds: chords.map((c) => c.shapeId),
  };
  const make = (
    n: number,
    title: string,
    direction: string,
    tagSuffix: string,
    assessment: Assessment,
    successFeedback: string,
    duration: number,
  ) =>
    step({
      section: 'B',
      subsection,
      activity: `${label}.${n}: Play ${title}`,
      direction,
      suffix: tagSuffix,
      assessment,
      successFeedback,
      ...chordSequence(
        center.key,
        chords,
        chords.map(() => duration),
      ),
      chordSymbols: symbols,
      guitar,
    });
  return [
    make(
      1,
      `${numbers} (Out of Time)`,
      `Strum ${list} one chord at a time, letting each chord ring before you move to the next shape.`,
      `${suffix}_oot`,
      'pitch_only',
      feedback.oot,
      OOT_SPACING,
    ),
    make(
      2,
      `${numbers} (Whole Notes)`,
      `In a steady tempo, strum ${list} in whole notes.`,
      `${suffix}_whole`,
      'pitch_order_timing_duration',
      feedback.whole,
      WHOLE_NOTE,
    ),
    make(
      3,
      `${numbers} (Half Notes)`,
      `In a steady tempo, strum ${list} in half notes.`,
      `${suffix}_half`,
      'pitch_order_timing_duration',
      feedback.half,
      HALF_NOTE,
    ),
    make(
      4,
      `${numbers} (Quarter Notes)`,
      `In a steady tempo, strum ${list} in quarter notes.`,
      `${suffix}_quarter`,
      'pitch_order_timing_duration',
      feedback.quarter,
      QUARTER_NOTE,
    ),
  ];
}

const PIANO_B2_FEEDBACK = {
  oot: 'Well done. Now play those chords in time!',
  whole: 'Locked in, whole notes and all — great work.',
  half: 'Nice — half notes, right in time.',
  quarter: 'Quarter notes, clean and in time — great work.',
};

function buildArticulationSteps(center: GuitarKeyCenter, step: Step) {
  const two = [1, 4].map((d) => triad(center, d));
  const four = PROGRESSION_DEGREES.map((d) => triad(center, d));
  const twoList = two.map((c) => c.symbol).join(', ');
  const fourList = four.map((c) => c.symbol).join(', ');
  // Piano's actual sounding lengths (its 140/440 spacing less 20), one chord
  // per beat — see the header.
  const staccato = STACCATO_DURATION;
  const legato = QUARTER_NOTE - 40 - 20;
  const beat = (n: number) => Array(n).fill(QUARTER_NOTE) as number[];
  const make = (
    n: number,
    title: string,
    direction: string,
    suffix: string,
    successFeedback: string,
    chords: GuitarChord[],
    sounding: number[],
  ) =>
    step({
      section: 'B',
      subsection: 'B3: Chord Articulations',
      activity: `B3.${n}: ${title}`,
      direction,
      suffix,
      assessment: 'pitch_order_timing_duration',
      successFeedback,
      ...chordSequence(center.key, chords, beat(chords.length), sounding),
      chordSymbols: chords.map((c) => c.symbol),
      guitar: { keyCenter: center.key, shapeIds: chords.map((c) => c.shapeId) },
    });
  return [
    make(
      1,
      'Two Chords (Staccato)',
      `Strum ${twoList} in a steady tempo, muting the strings right after each strum (short, "staccato").`,
      'chord_articulation_staccato',
      'Well done. Being able to control the length of chords is an important part of mastering musical articulation!',
      two,
      [staccato, staccato],
    ),
    make(
      2,
      'Two Chords (Legato)',
      `Strum ${twoList} in a steady tempo, letting each chord ring into the next (long, "legato").`,
      'chord_articulation_legato',
      'Well done. Now mix and match short and long articulations.',
      two,
      [legato, legato],
    ),
    make(
      3,
      'Four Chords (Mixed Articulation)',
      `Strum ${fourList} in a steady tempo, mixing muted and ringing strums.`,
      'chord_articulation_mixed',
      'Well done! Ready to practice some more chord progressions?',
      four,
      [staccato, legato, staccato, legato],
    ),
  ];
}

function buildProgressionSteps(center: GuitarKeyCenter, step: Step) {
  const chords = SHUFFLED_PROGRESSION_DEGREES.map((d) => triad(center, d));
  const symbols = chords.map((c) => c.symbol);
  const list = symbols.join(', ');
  const guitar = {
    keyCenter: center.key,
    shapeIds: chords.map((c) => c.shapeId),
  };
  const make = (
    n: number,
    title: string,
    direction: string,
    suffix: string,
    assessment: Assessment,
    successFeedback: string,
    durations: number[],
  ) =>
    step({
      section: 'B',
      subsection: 'B4: Play Chord Progressions',
      activity: `B4.${n}: ${title}`,
      direction,
      suffix,
      assessment,
      successFeedback,
      ...chordSequence(center.key, chords, durations),
      chordSymbols: symbols,
      guitar,
    });
  const four = (d: number) => [d, d, d, d];
  return [
    make(
      1,
      'Four Chords Random Order of 1,2,3,4 (Out of Time)',
      `Strum ${list}, one chord at a time, letting each chord ring.`,
      'progression_random_oot',
      'pitch_only',
      'Nice — you played the progression in the right order.',
      four(OOT_SPACING),
    ),
    make(
      2,
      'Four Chords Random Order of 1,2,3,4 (Half Notes)',
      `In a steady tempo, strum ${list}, each chord held for a half note.`,
      'progression_random_half',
      'pitch_order_timing_duration',
      'Great — that progression is locked in.',
      four(HALF_NOTE),
    ),
    make(
      3,
      'Four Chords Random Order of 1,2,3,4 (Quarter Notes)',
      `In a steady tempo, strum ${list}, each chord held for a quarter note.`,
      'progression_random_quarter',
      'pitch_order_timing_duration',
      'Great — that progression is locked in.',
      four(QUARTER_NOTE),
    ),
    make(
      4,
      'Four Chords Random Order of 1,2,3,4 (Eighth Notes)',
      `In a steady tempo, strum ${list}, each chord held for an eighth note.`,
      'progression_random_eighth',
      'pitch_order_timing_duration',
      'Great — that progression is locked in.',
      four(EIGHTH_NOTE),
    ),
    make(
      5,
      'Four Chords Random Order, Random Rhythms',
      `In a steady tempo, strum ${list} — the rhythm changes chord to chord.`,
      'progression_random_rhythms',
      'pitch_order_timing_duration',
      'Great control across changing rhythms — nice work.',
      [HALF_NOTE, QUARTER_NOTE, EIGHTH_NOTE, QUARTER_NOTE],
    ),
  ];
}

function buildChordSteps(center: GuitarKeyCenter, step: Step) {
  return [
    // B1: arpeggiate triads 1-4 (piano).
    ...arpeggioSteps(
      center,
      step,
      'B1: Arpeggiate Chords (Triads)',
      'B1',
      [1, 2, 3, 4].map((d) => ({
        chord: triad(center, d),
        degree: d,
        suffix: `arpeggio_degree${d}`,
      })),
      'Chord ',
    ),
    // B2: play chords 1-4 (piano).
    ...playChordSteps(
      center,
      step,
      'B2: Play Chord (Triads)',
      'B2',
      PROGRESSION_DEGREES.map((d) => triad(center, d)),
      'Chords 1,2,3,4',
      'play_chords',
      PIANO_B2_FEEDBACK,
    ),
    // B3, B4 (piano).
    ...buildArticulationSteps(center, step),
    ...buildProgressionSteps(center, step),
    // B5: arpeggiate triads 5-6 (book).
    ...arpeggioSteps(
      center,
      step,
      'B5: Arpeggiate Chords 5 and 6 (Triads)',
      'B5',
      [5, 6].map((d) => ({
        chord: triad(center, d),
        degree: d,
        suffix: `arpeggio_degree${d}`,
      })),
      'Chord ',
    ),
    // B6: play all six triads (book).
    ...playChordSteps(
      center,
      step,
      'B6: Play Chords 1-6 (Triads)',
      'B6',
      [1, 2, 3, 4, 5, 6].map((d) => triad(center, d)),
      'Chords 1,2,3,4,5,6',
      'play_chords_1to6',
      PIANO_B2_FEEDBACK,
    ),
    // B7: arpeggiate the 7th chords 1-7 (book).
    ...arpeggioSteps(
      center,
      step,
      'B7: Arpeggiate 7th Chords',
      'B7',
      [1, 2, 3, 4, 5, 6, 7].map((d) => ({
        chord: seventh(center, d),
        degree: d,
        suffix: `arpeggio_7th_degree${d}`,
      })),
      '7th Chord ',
    ),
    // B8: play the 7th-chord page, boxes 1-7 and the closing 1 (book).
    ...playChordSteps(
      center,
      step,
      'B8: Play 7th Chords',
      'B8',
      [1, 2, 3, 4, 5, 6, 7, 8].map((box) => seventh(center, box)),
      '7th Chords 1-7 and 1',
      'play_sevenths',
      PIANO_B2_FEEDBACK,
    ),
  ];
}

// ── Section D: Play-Along ─────────────────────────────────────────────────

function buildPlayAlongSteps(center: GuitarKeyCenter, step: Step) {
  const position = center.majorScale;
  const guitarMelody = {
    keyCenter: center.key,
    scalePosition: 'major' as const,
  };
  const two = [1, 4].map((d) => triad(center, d));
  const four = PROGRESSION_DEGREES.map((d) => triad(center, d));

  // Piano builds D1 with its melody builder, which files the steps under
  // section 'A'; mirrored as-is (only the piano register rules read it).
  const melody = [
    step({
      section: 'A',
      subsection: 'D1: Melody with Play Along',
      activity: 'D1.1: Three Note Contour — Play Along',
      direction: 'In a steady tempo, play this melody along with the track!',
      suffix: 'melody_playalong_3note',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Nice — right in the pocket with the track.',
      targetNotes: contourNotes(position, CONTOUR_A_DEGREES, [
        NORMAL_DURATION,
        NORMAL_DURATION,
        NORMAL_DURATION,
      ]),
      guitar: guitarMelody,
    }),
    step({
      section: 'A',
      subsection: 'D1: Melody with Play Along',
      activity: 'D1.2: Connect Two 3 Note Contours — Play Along',
      direction:
        'In a steady tempo, play this longer melody along with the track!',
      suffix: 'melody_playalong_connected',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Great — the full phrase, right in time with the track.',
      targetNotes: contourNotes(
        position,
        CONTOUR_CONNECTED_DEGREES,
        Array(6).fill(NORMAL_DURATION) as number[],
      ),
      guitar: guitarMelody,
    }),
  ];

  // Likewise piano's chord builder files D2 under section 'B'.
  const chords = [
    step({
      section: 'B',
      subsection: 'D2: Chords with Play Along',
      activity: 'D2.1: Two Chords — Play Along',
      direction: `Now strum this chord progression, ${two.map((c) => c.symbol).join(', ')}, along with the track!`,
      suffix: 'chords_playalong_two',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Locked in with the track — nice work.',
      ...chordSequence(center.key, two, [HALF_NOTE, HALF_NOTE]),
      chordSymbols: two.map((c) => c.symbol),
      guitar: { keyCenter: center.key, shapeIds: two.map((c) => c.shapeId) },
    }),
    step({
      section: 'B',
      subsection: 'D2: Chords with Play Along',
      activity: 'D2.2: Four Chords — Play Along',
      direction: `Now strum this chord progression, ${four.map((c) => c.symbol).join(', ')}, along with the track!`,
      suffix: 'chords_playalong_four',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Full progression, right in time with the track.',
      ...chordSequence(center.key, four, [
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
        QUARTER_NOTE,
      ]),
      chordSymbols: four.map((c) => c.symbol),
      guitar: { keyCenter: center.key, shapeIds: four.map((c) => c.shapeId) },
    }),
  ];

  const BAR_WORDS = ['', 'One Bar', 'Two Bars', '', 'Four Bars'];
  const maps = center.musicMaps.map((map) =>
    step({
      section: 'D',
      subsection: 'D3: Music Maps',
      activity: `D3.${map.example}: Music Map — Example ${map.example} (${BAR_WORDS[map.bars.length]})`,
      direction:
        'Strum this Music Map in the rhythm shown and play it twice (it has a repeat sign). Rests mean silence, so mute the strings.',
      suffix: `music_map_ex${map.example}`,
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Music Map complete — twice through, right in time.',
      ...mapNotes(center, map),
      chordSymbols: map.bars.map((bar) =>
        chordSymbol(center.key, bar.degree, bar.quality),
      ),
      guitar: {
        keyCenter: center.key,
        shapeIds: map.bars.map((_, b) =>
          mapBarShapeId(center.key, map.example, b + 1),
        ),
        musicMap: { example: map.example, passes: MUSIC_MAP_PASSES },
      },
    }),
  );

  return [...melody, ...chords, ...maps];
}

// ── Builder ───────────────────────────────────────────────────────────────

/**
 * Builds the guitar Applied Theory Fundamentals flow for a key center.
 * @param keyName - ASCII key name, e.g. 'C', 'F#', 'Db'. Other spellings of a
 *   book key ('Gb', 'C#') resolve to it; anything else falls back to C, as
 *   the piano builder falls back to MIDI 60.
 */
export function buildGuitarAppliedTheoryFundamentalsFlow(
  keyName: string,
): ActivityFlowV2 {
  const key: GuitarKeyName = toBookKey(keyName) ?? 'C';
  const center = GUITAR_ATLAS_BOOK_ONE[key];
  const step = createStepFactory();

  const sectionA: ActivitySectionV2 = {
    id: 'A',
    name: 'Melody',
    steps: [
      ...buildScaleSteps(center, step),
      ...buildMelodySteps(center, step),
      ...buildPentatonicSteps(center, step),
    ],
  };
  const sectionB: ActivitySectionV2 = {
    id: 'B',
    name: 'Chords',
    steps: buildChordSteps(center, step),
  };
  const sectionD: ActivitySectionV2 = {
    id: 'D',
    name: 'Play-Along',
    steps: buildPlayAlongSteps(center, step),
  };

  return {
    genre: GUITAR_APPLIED_THEORY_GENRE,
    level: 1,
    version: 'v2',
    title: 'Applied Theory Fundamentals — Guitar',
    params: {
      defaultKey: `${key} Major (Ionian)`,
      defaultScale: MAJOR_SCALE_INTERVALS,
      defaultScaleId: 'major',
      tempoRange: [60, 100],
      swing: 0,
      grooves: [],
      instrument: 'guitar',
    },
    sections: [sectionA, sectionB, sectionD],
  };
}
