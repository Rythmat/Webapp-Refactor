/**
 * The bass Theory lessons (Learn → Bass → Theory, key-parameterized; C
 * Ionian free, the rest Premium, as on guitar): Ionian (Major) from The Bass
 * Atlas: Book One, and every other Theory scale on its own bass center
 * (data/bass).
 *
 * It keeps the guitar lesson's shape — the same sections, subsections,
 * titles, assessments and tag suffixes, Section A word for word — and plays
 * the bass's material in them. A bass plays one note at a time, so the
 * Chords chapter becomes Arpeggios and nothing carries chordTargets: every
 * step is scored note by note.
 *
 * - Arpeggiate: the chord's tones from its root, one per beat (R 3 5 (7)).
 * - Play in time: one chord a bar, the tones a bass player picks for the
 *   number of notes the bar holds — whole notes play the root, halves root
 *   and 5th, quarters R 3 5 3 (R 3 5 7 for a 7th chord). Music Maps do the
 *   same for each bar's rhythm: Example 1 is a whole-note root, Example 3
 *   R 3 5 3 in quarters.
 * - Progressions (B4): the root of each chord, in the rhythm named — the
 *   bassist's first job.
 *
 * Every note is a fret on a string of the bass (TargetNote.fretPosition) at
 * its sounding pitch (fretToMidi(…, BASS)), so the TAB, the neck and
 * scoring agree.
 */

import { fretToMidi } from '@/lib/guitar/fretboard';
import { BASS } from '@/lib/guitar/instrument';
import type { FretPosition } from '@/lib/guitar/types';
import {
  SCALE_LESSONS,
  type ScaleProgressionChord,
} from '@/lib/learn/scaleLessons';
import type {
  ActivityFlowV2,
  ActivitySectionV2,
  ActivityStepV2,
  BackingParts,
  BassStepMeta,
  TargetNote,
} from '../../types/activity.v2';
import {
  bassArpeggioId,
  bassMapBarId,
  bassScaleEntry,
  getBassCenter,
  type BassArpeggio,
  type BassArpeggioKind,
  type BassBox,
  type BassCenter,
  type BassMusicMap,
} from '../bass';
import { toBookKey } from '../guitar/bookOne';
import { centerId, chordSymbol } from '../guitar/centers';
import { GUITAR_MODE_NAME, isGuitarMode } from '../guitar/modes';
import { isPentatonicScale } from '../guitar/scales';
import type {
  BookChordQuality,
  GuitarMode,
  GuitarPentatonicScale,
  GuitarScaleKey,
  GuitarScaleSlot,
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
import {
  MELODY_STEPS,
  MUSIC_MAP_PASSES,
  RHYTHM,
  SCALE_STEPS,
  pairDegree,
  type Direction,
} from './guitarAppliedTheoryFundamentals';

const MODULE = 'applied_theory_bass_l1';
/** Out of time, a root per chord this far apart (as guitar spaces its strums). */
const OOT_SPACING = 960;

type Assessment = ActivityStepV2['assessment'];

function tag(suffix: string): string {
  return `bass_fund:${suffix} | applied_theory_bass`;
}

// ── Notes ─────────────────────────────────────────────────────────────────

function note(
  position: FretPosition,
  onset: number,
  duration: number,
): TargetNote {
  return {
    midi: fretToMidi(position, BASS),
    onset,
    duration,
    fretPosition: position,
  };
}

/** The box's notes in the order generateScale plays piano's. */
function scaleNotes(box: BassBox, direction: Direction) {
  const up = [...box.playOrder];
  const order =
    direction === 'ascending'
      ? up
      : direction === 'descending'
        ? [...up].reverse()
        : [...up, ...up.slice(0, -1).reverse()];
  return order.map((p, i) => note(p, i * TICKS_PER_BEAT, NORMAL_DURATION));
}

/** Scale degrees 1-7 of the center's scale box (degree 8 = its top note). */
function contourNotes(
  box: BassBox,
  degrees: readonly number[],
  durations: readonly number[],
) {
  return degrees.map((degree, i) =>
    note(
      box.playOrder[degree - 1],
      i * TICKS_PER_BEAT,
      durations[i] ?? NORMAL_DURATION,
    ),
  );
}

// ── Arpeggios ─────────────────────────────────────────────────────────────

/** An arpeggio the flow plays: its box, its id and its chord symbol. */
interface Arp {
  id: string;
  box: BassArpeggio;
  symbol: string;
}

function arp(center: BassCenter, kind: BassArpeggioKind, index: number): Arp {
  const list =
    kind === 'triad'
      ? center.triads
      : kind === 'seventh'
        ? center.sevenths
        : center.chords;
  const box = list[index - 1];
  if (!box) throw new Error(`${center.id} has no ${kind} ${index}`);
  return {
    id: bassArpeggioId(center, kind, index),
    box,
    symbol: chordSymbol(center.theory, box.degree, box.quality),
  };
}

const triad = (center: BassCenter, degree: number) =>
  arp(center, 'triad', degree);
const seventh = (center: BassCenter, box: number) =>
  arp(center, 'seventh', box);

/**
 * The chord tones a bar of `attacks` notes plays, as indexes into the
 * arpeggio (R 0, 3rd 1, 5th 2, 7th 3): R; R 5; R 3 5; R 3 5 3 or R 3 5 7.
 * Longer bars repeat the four-note figure.
 */
export function barPattern(attacks: number, toneCount: number): number[] {
  const fifth = Math.min(2, toneCount - 1);
  if (attacks === 1) return [0];
  if (attacks === 2) return [0, fifth];
  if (attacks === 3) return [0, 1, fifth];
  const four = toneCount >= 4 ? [0, 1, 2, 3] : [0, 1, fifth, 1];
  return Array.from({ length: attacks }, (_, i) => four[i % 4]);
}

/** The arpeggio from its root, one tone per beat. */
function arpeggioNotes(box: BassArpeggio, start = 0) {
  return box.playOrder.map((p, i) =>
    note(p, start + i * TICKS_PER_BEAT, NORMAL_DURATION),
  );
}

/** Arpeggios back to back, each from its root, one tone per beat. */
function arpeggiosOutOfTime(arps: readonly Arp[]) {
  const notes: TargetNote[] = [];
  let onset = 0;
  for (const a of arps) {
    notes.push(...arpeggioNotes(a.box, onset));
    onset += a.box.playOrder.length * TICKS_PER_BEAT;
  }
  return notes;
}

/**
 * One chord a bar, each bar `value` ticks a note: the tones barPattern picks.
 * `sounding` overrides each note's length (articulations).
 */
function arpeggioBars(
  arps: readonly Arp[],
  value: number,
  sounding?: (i: number) => number,
) {
  const attacks = Math.max(1, Math.round(WHOLE_NOTE / value));
  const notes: TargetNote[] = [];
  arps.forEach((a, bar) => {
    const tones = a.box.playOrder;
    barPattern(attacks, tones.length).forEach((tone, i) => {
      const n = notes.length;
      notes.push(
        note(
          tones[tone],
          bar * WHOLE_NOTE + i * value,
          sounding?.(n) ?? value - 20,
        ),
      );
    });
  });
  return notes;
}

/** Each chord's root, each held for `durations[i]` (the progression drills). */
function rootNotes(arps: readonly Arp[], durations: readonly number[]) {
  let onset = 0;
  return arps.map((a, i) => {
    const spacing = durations[i] ?? durations[durations.length - 1];
    const n = note(a.box.playOrder[0], onset, spacing - 20);
    onset += spacing;
    return n;
  });
}

/** A map played `passes` times: each bar's rhythm on its arpeggio, rests silent. */
function mapNotes(map: BassMusicMap, passes = MUSIC_MAP_PASSES) {
  const notes: TargetNote[] = [];
  let barStart = 0;
  for (let pass = 0; pass < passes; pass++) {
    for (const bar of map.bars) {
      const sounding = bar.rhythm.filter((v) => !RHYTHM[v].rest);
      const pattern = barPattern(
        sounding.length,
        bar.arpeggio.playOrder.length,
      );
      let onset = barStart;
      let attack = 0;
      for (const value of bar.rhythm) {
        const { ticks, rest } = RHYTHM[value];
        if (!rest) {
          const tone = bar.arpeggio.playOrder[pattern[attack++]];
          notes.push(note(tone, onset, ticks - 20));
        }
        onset += ticks;
      }
      barStart += WHOLE_NOTE;
    }
  }
  return notes;
}

// ── Steps ─────────────────────────────────────────────────────────────────

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
  bass: BassStepMeta;
  grooveId?: string;
  swing?: number;
  backing_parts?: BackingParts;
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
    bass: input.bass,
    ...(input.grooveId ? { grooveId: input.grooveId } : {}),
    ...(input.swing ? { swing: input.swing } : {}),
    ...(input.backing_parts ? { backing_parts: input.backing_parts } : {}),
  });
}

type Step = ReturnType<typeof createStepFactory>;

const arpMeta = (center: BassCenter, arps: readonly Arp[]): BassStepMeta => ({
  keyCenter: center.id,
  arpeggioIds: arps.map((a) => a.id),
});

/** The band without a bass: the student is the bass player. */
const NO_BASS: BackingParts = {
  engine_generates: ['drums', 'chords'],
  student_plays: ['bass'],
};
/** The band without a bass, the student playing the melody on bass. */
const NO_BASS_MELODY: BackingParts = {
  engine_generates: ['drums', 'chords'],
  student_plays: ['melody'],
};

// ── Section A: Melody ─────────────────────────────────────────────────────

function scaleTitle(center: BassCenter): string {
  const theory = center.theory;
  if (theory.mode === 'ionian') return 'Major Scale';
  return theory.family === 'diatonic'
    ? `${GUITAR_MODE_NAME[theory.mode]} Scale`
    : `${bassScaleEntry(theory.mode).name} Scale`;
}

function buildScaleSteps(center: BassCenter, step: Step) {
  const title = scaleTitle(center);
  return SCALE_STEPS.map((s, i) =>
    step({
      section: 'A',
      subsection: `A1: ${title}`,
      activity: `A1.${i + 1}: ${title} ${s.title}`,
      direction: s.majorDirection,
      suffix: `major_scale_${s.suffix}`,
      assessment: s.timed ? 'pitch_order_timing' : 'pitch_only',
      successFeedback: s.feedback,
      targetNotes: scaleNotes(center.scale, s.direction),
      bass: { keyCenter: center.id, scalePosition: 'major' },
    }),
  );
}

function buildMelodySteps(center: BassCenter, step: Step) {
  const bass: BassStepMeta = { keyCenter: center.id, scalePosition: 'major' };
  return MELODY_STEPS.map((m) =>
    step({
      section: 'A',
      subsection: m.subsection,
      activity: m.activity,
      direction: m.direction,
      suffix: m.suffix,
      assessment: m.assessment,
      successFeedback: m.successFeedback,
      targetNotes: contourNotes(center.scale, m.degrees, m.durations),
      bass,
    }),
  );
}

function buildPentatonicSteps(center: BassCenter, step: Step) {
  return center.pentatonics.flatMap((pentatonic, p) => {
    const label = `A${4 + p}`;
    const slot: GuitarScaleSlot = p === 0 ? 'pentatonic' : 'pentatonic2';
    const subsection =
      center.theory.mode === 'ionian'
        ? 'A4: Major Pentatonic Scale'
        : `${label}: ${pentatonic.name}`;
    return SCALE_STEPS.map((s, i) =>
      step({
        section: 'A',
        subsection,
        activity: `${label}.${i + 1}: ${pentatonic.name} ${s.title}`,
        direction: s.pentatonicDirection,
        suffix: `${p === 0 ? 'pentatonic' : 'pentatonic2'}_scale_${s.suffix}`,
        assessment: s.timed ? 'pitch_order_timing' : 'pitch_only',
        successFeedback: s.feedback.replace('scale', 'pentatonic scale'),
        targetNotes: scaleNotes(pentatonic, s.direction),
        bass: { keyCenter: center.id, scalePosition: slot },
      }),
    );
  });
}

// ── Section B: Arpeggios ──────────────────────────────────────────────────

function arpeggioSteps(
  center: BassCenter,
  step: Step,
  subsection: string,
  label: string,
  items: { arp: Arp; degree: number; suffix: string }[],
  titleNoun: string,
) {
  const steps: ActivityStepV2[] = [];
  let sub = 1;
  for (const { arp: a, degree, suffix } of items) {
    const tones =
      a.box.playOrder.length === 4
        ? 'root, 3rd, 5th and 7th'
        : 'root, 3rd and 5th';
    for (const timed of [false, true]) {
      steps.push(
        step({
          section: 'B',
          subsection,
          activity: `${label}.${sub++}: Arpeggiate The ${degree} ${titleNoun}(${timed ? 'In Time' : 'Out of Time'})`,
          direction: timed
            ? `In a steady tempo, play the ${a.symbol} arpeggio — ${tones} — one note per beat.`
            : `Play the ${a.symbol} arpeggio shown — ${tones} — one note at a time, from the root up.`,
          suffix: `${suffix}_${timed ? 'it' : 'oot'}`,
          assessment: timed ? 'pitch_order_timing' : 'pitch_only',
          successFeedback: timed
            ? `Well done — you played ${a.symbol} right in time.`
            : `Well done. You played the ${a.symbol} arpeggio!`,
          targetNotes: arpeggioNotes(a.box),
          chordSymbols: [a.symbol],
          bass: arpMeta(center, [a]),
        }),
      );
    }
  }
  return steps;
}

const PLAY_FEEDBACK = {
  oot: 'Well done. Now play those arpeggios in time!',
  whole: 'Locked in, a root a bar — great work.',
  half: 'Nice — root and fifth, right in time.',
  quarter: 'Every chord tone, clean and in time — great work.',
};

function playArpeggioSteps(
  center: BassCenter,
  step: Step,
  subsection: string,
  label: string,
  arps: Arp[],
  numbers: string,
  suffix: string,
) {
  const symbols = arps.map((a) => a.symbol);
  const list = symbols.join(', ');
  const sevenths = arps.some((a) => a.box.playOrder.length === 4);
  const bass = arpMeta(center, arps);
  const make = (
    n: number,
    title: string,
    direction: string,
    tagSuffix: string,
    assessment: Assessment,
    successFeedback: string,
    targetNotes: TargetNote[],
  ) =>
    step({
      section: 'B',
      subsection,
      activity: `${label}.${n}: Play ${title}`,
      direction,
      suffix: tagSuffix,
      assessment,
      successFeedback,
      targetNotes,
      chordSymbols: symbols,
      bass,
    });
  return [
    make(
      1,
      `${numbers} (Out of Time)`,
      `Play the arpeggios of ${list}, one after another, at your own pace.`,
      `${suffix}_oot`,
      'pitch_only',
      PLAY_FEEDBACK.oot,
      arpeggiosOutOfTime(arps),
    ),
    make(
      2,
      `${numbers} (Whole Notes)`,
      `In a steady tempo, play the root of ${list} in whole notes, one chord a bar.`,
      `${suffix}_whole`,
      'pitch_order_timing_duration',
      PLAY_FEEDBACK.whole,
      arpeggioBars(arps, WHOLE_NOTE),
    ),
    make(
      3,
      `${numbers} (Half Notes)`,
      `In a steady tempo, play the root and 5th of ${list} in half notes, one chord a bar.`,
      `${suffix}_half`,
      'pitch_order_timing_duration',
      PLAY_FEEDBACK.half,
      arpeggioBars(arps, HALF_NOTE),
    ),
    make(
      4,
      `${numbers} (Quarter Notes)`,
      sevenths
        ? `In a steady tempo, play root, 3rd, 5th and 7th of ${list} in quarter notes, one chord a bar.`
        : `In a steady tempo, play root, 3rd, 5th and 3rd of ${list} in quarter notes, one chord a bar.`,
      `${suffix}_quarter`,
      'pitch_order_timing_duration',
      PLAY_FEEDBACK.quarter,
      arpeggioBars(arps, QUARTER_NOTE),
    ),
  ];
}

function buildArticulationSteps(center: BassCenter, step: Step) {
  const two = [1, pairDegree(center.theory)].map((d) => triad(center, d));
  const four = PROGRESSION_DEGREES.map((d) => triad(center, d));
  const twoList = two.map((a) => a.symbol).join(', ');
  const fourList = four.map((a) => a.symbol).join(', ');
  const make = (
    n: number,
    title: string,
    direction: string,
    suffix: string,
    successFeedback: string,
    arps: Arp[],
    sounding: (i: number) => number,
  ) =>
    step({
      section: 'B',
      subsection: 'B3: Arpeggio Articulations',
      activity: `B3.${n}: ${title}`,
      direction,
      suffix,
      assessment: 'pitch_order_timing_duration',
      successFeedback,
      targetNotes: arpeggioBars(arps, QUARTER_NOTE, sounding),
      chordSymbols: arps.map((a) => a.symbol),
      bass: arpMeta(center, arps),
    });
  return [
    make(
      1,
      'Two Chords (Staccato)',
      `In a steady tempo, play ${twoList} as R 3 5 3 in quarter notes, muting each note right after you play it (short, "staccato").`,
      'chord_articulation_staccato',
      'Well done. Controlling how long each note rings is half of a great bass line!',
      two,
      () => STACCATO_DURATION,
    ),
    make(
      2,
      'Two Chords (Legato)',
      `In a steady tempo, play ${twoList} as R 3 5 3 in quarter notes, letting each note ring into the next (long, "legato").`,
      'chord_articulation_legato',
      'Well done. Now mix and match short and long notes.',
      two,
      () => LEGATO_DURATION,
    ),
    make(
      3,
      'Four Chords (Mixed Articulation)',
      `In a steady tempo, play ${fourList} as R 3 5 3, mixing short and long notes.`,
      'chord_articulation_mixed',
      'Well done! Ready to follow some chord progressions?',
      four,
      (i) => (i % 2 === 0 ? STACCATO_DURATION : LEGATO_DURATION),
    ),
  ];
}

function buildProgressionSteps(center: BassCenter, step: Step) {
  const arps = SHUFFLED_PROGRESSION_DEGREES.map((d) => triad(center, d));
  const symbols = arps.map((a) => a.symbol);
  const list = symbols.join(', ');
  const bass = arpMeta(center, arps);
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
      subsection: 'B4: Play Chord Progressions (Roots)',
      activity: `B4.${n}: ${title}`,
      direction,
      suffix,
      assessment,
      successFeedback,
      targetNotes: rootNotes(arps, durations),
      chordSymbols: symbols,
      bass,
    });
  const four = (d: number) => [d, d, d, d];
  return [
    make(
      1,
      'Four Chords Random Order of 1,2,3,4 (Out of Time)',
      `Play the root of ${list}, one chord at a time, letting each note ring.`,
      'progression_random_oot',
      'pitch_only',
      'Nice — you followed the progression’s roots in order.',
      four(OOT_SPACING),
    ),
    make(
      2,
      'Four Chords Random Order of 1,2,3,4 (Half Notes)',
      `In a steady tempo, play the root of ${list}, each held for a half note.`,
      'progression_random_half',
      'pitch_order_timing_duration',
      'Great — those roots are locked in.',
      four(HALF_NOTE),
    ),
    make(
      3,
      'Four Chords Random Order of 1,2,3,4 (Quarter Notes)',
      `In a steady tempo, play the root of ${list}, each held for a quarter note.`,
      'progression_random_quarter',
      'pitch_order_timing_duration',
      'Great — those roots are locked in.',
      four(QUARTER_NOTE),
    ),
    make(
      4,
      'Four Chords Random Order of 1,2,3,4 (Eighth Notes)',
      `In a steady tempo, play the root of ${list}, each an eighth note.`,
      'progression_random_eighth',
      'pitch_order_timing_duration',
      'Great — those roots are locked in.',
      four(EIGHTH_NOTE),
    ),
    make(
      5,
      'Four Chords Random Order, Random Rhythms',
      `In a steady tempo, play the root of ${list} — the rhythm changes chord to chord.`,
      'progression_random_rhythms',
      'pitch_order_timing_duration',
      'Great control across changing rhythms — nice work.',
      [HALF_NOTE, QUARTER_NOTE, EIGHTH_NOTE, QUARTER_NOTE],
    ),
  ];
}

function buildArpeggioSteps(center: BassCenter, step: Step) {
  // Book One teaches triads 1-6; a mode teaches all seven.
  const ionian = center.theory.mode === 'ionian';
  const upper = ionian ? [5, 6] : [5, 6, 7];
  const all = ionian ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
  const triadItems = (degrees: number[]) =>
    degrees.map((d) => ({
      arp: triad(center, d),
      degree: d,
      suffix: `arpeggio_degree${d}`,
    }));
  return [
    ...arpeggioSteps(
      center,
      step,
      'B1: Arpeggiate Chords (Triads)',
      'B1',
      triadItems([1, 2, 3, 4]),
      'Chord ',
    ),
    ...playArpeggioSteps(
      center,
      step,
      'B2: Play Arpeggios (Triads)',
      'B2',
      PROGRESSION_DEGREES.map((d) => triad(center, d)),
      'Arpeggios 1,2,3,4',
      'play_chords',
    ),
    ...buildArticulationSteps(center, step),
    ...buildProgressionSteps(center, step),
    ...arpeggioSteps(
      center,
      step,
      ionian
        ? 'B5: Arpeggiate Chords 5 and 6 (Triads)'
        : 'B5: Arpeggiate Chords 5, 6 and 7 (Triads)',
      'B5',
      triadItems(upper),
      'Chord ',
    ),
    ...playArpeggioSteps(
      center,
      step,
      `B6: Play Arpeggios 1-${all.length} (Triads)`,
      'B6',
      all.map((d) => triad(center, d)),
      `Arpeggios ${all.join(',')}`,
      `play_chords_1to${all.length}`,
    ),
    ...arpeggioSteps(
      center,
      step,
      'B7: Arpeggiate 7th Chords',
      'B7',
      [1, 2, 3, 4, 5, 6, 7].map((d) => ({
        arp: seventh(center, d),
        degree: d,
        suffix: `arpeggio_7th_degree${d}`,
      })),
      '7th Chord ',
    ),
    ...playArpeggioSteps(
      center,
      step,
      'B8: Play 7th Arpeggios',
      'B8',
      [1, 2, 3, 4, 5, 6, 7, 8].map((box) => seventh(center, box)),
      '7th Arpeggios 1-7 and 1',
      'play_sevenths',
    ),
  ];
}

// ── Section D: Play-Along ─────────────────────────────────────────────────

function melodyPlayAlong(center: BassCenter, step: Step) {
  const bass: BassStepMeta = { keyCenter: center.id, scalePosition: 'major' };
  return [
    step({
      section: 'A',
      subsection: 'D1: Melody with Play Along',
      activity: 'D1.1: Three Note Contour — Play Along',
      direction: 'In a steady tempo, play this melody along with the track!',
      suffix: 'melody_playalong_3note',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Nice — right in the pocket with the track.',
      targetNotes: contourNotes(center.scale, CONTOUR_A_DEGREES, [
        NORMAL_DURATION,
        NORMAL_DURATION,
        NORMAL_DURATION,
      ]),
      bass,
      backing_parts: NO_BASS_MELODY,
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
        center.scale,
        CONTOUR_CONNECTED_DEGREES,
        Array(6).fill(NORMAL_DURATION) as number[],
      ),
      bass,
      backing_parts: NO_BASS_MELODY,
    }),
  ];
}

function buildPlayAlongSteps(center: BassCenter, step: Step) {
  const two = [1, pairDegree(center.theory)].map((d) => triad(center, d));
  const four = PROGRESSION_DEGREES.map((d) => triad(center, d));
  // Piano's chord builder files D2 under section 'B'; mirrored as guitar does.
  const lines = [
    step({
      section: 'B',
      subsection: 'D2: Bass Lines with Play Along',
      activity: 'D2.1: Two Chords — Play Along',
      direction: `Now play root and 5th of ${two.map((a) => a.symbol).join(', ')} in half notes, one chord a bar, along with the track!`,
      suffix: 'chords_playalong_two',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Locked in with the track — nice work.',
      targetNotes: arpeggioBars(two, HALF_NOTE),
      chordSymbols: two.map((a) => a.symbol),
      bass: arpMeta(center, two),
      backing_parts: NO_BASS,
    }),
    step({
      section: 'B',
      subsection: 'D2: Bass Lines with Play Along',
      activity: 'D2.2: Four Chords — Play Along',
      direction: `Now play R 3 5 3 through ${four.map((a) => a.symbol).join(', ')}, one chord a bar, along with the track!`,
      suffix: 'chords_playalong_four',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Full progression, right in time with the track.',
      targetNotes: arpeggioBars(four, QUARTER_NOTE),
      chordSymbols: four.map((a) => a.symbol),
      bass: arpMeta(center, four),
      backing_parts: NO_BASS,
    }),
  ];
  return [
    ...melodyPlayAlong(center, step),
    ...lines,
    ...buildMapSteps(center, step),
  ];
}

/** D3: the center's Music Maps, each played twice. */
function buildMapSteps(center: BassCenter, step: Step) {
  const BAR_WORDS = ['', 'One Bar', 'Two Bars', '', 'Four Bars'];
  return center.musicMaps.map((map) =>
    step({
      section: 'D',
      subsection: 'D3: Music Maps',
      activity: `D3.${map.example}: Music Map — Example ${map.example} (${BAR_WORDS[map.bars.length]})`,
      direction:
        'Play this Music Map in the rhythm shown, from each chord’s root, and play it twice (it has a repeat sign). Rests mean silence, so mute the string.',
      suffix: `music_map_ex${map.example}`,
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Music Map complete — twice through, right in time.',
      targetNotes: mapNotes(map),
      chordSymbols: map.bars.map((bar) =>
        chordSymbol(center.theory, bar.degree, bar.quality),
      ),
      bass: {
        keyCenter: center.id,
        arpeggioIds: map.bars.map((_, b) =>
          bassMapBarId(center, map.example, b + 1),
        ),
        musicMap: { example: map.example, passes: MUSIC_MAP_PASSES },
      },
      backing_parts: NO_BASS,
    }),
  );
}

// ── Pentatonic and blues ──────────────────────────────────────────────────
// No Arpeggios chapter, as on piano and guitar: Melody, then a Play-Along on
// the scale's own progression over a backing track with no bass in it.

const SCALE_GROOVE = 'groove_pop_01';
const BLUES_SWING = 62;

const PROGRESSION_QUALITY: Readonly<
  Record<ScaleProgressionChord['quality'], BookChordQuality>
> = {
  major: 'maj',
  minor: 'min',
  major7: 'maj7',
  dominant7: 'dom7',
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The piano lesson's progression, one chord a bar, as the center's boxes. */
function progressionArps(
  center: BassCenter,
  scale: GuitarPentatonicScale,
): Arp[] {
  return SCALE_LESSONS[scale].progression.map((bar) => {
    const semitones = MAJOR_SCALE_INTERVALS[bar.degree - 1] + bar.accidental;
    const degree = center.theory.chordSteps.indexOf(mod12(semitones)) + 1;
    const quality = PROGRESSION_QUALITY[bar.quality];
    const index = center.chords.findIndex(
      (c) => c.degree === degree && c.quality === quality,
    );
    if (index < 0) {
      throw new Error(`${scale}: no box for ${bar.degree} ${bar.quality}`);
    }
    return arp(center, 'chord', index + 1);
  });
}

function buildScalePlayAlongSteps(
  center: BassCenter,
  scale: GuitarPentatonicScale,
  step: Step,
) {
  const progression = progressionArps(center, scale);
  const symbols = progression.map((a) => a.symbol);
  const swing = scale.endsWith('blues') ? { swing: BLUES_SWING } : {};
  const band = (parts: BackingParts) => ({
    grooveId: SCALE_GROOVE,
    ...swing,
    backing_parts: parts,
  });
  const bassMelody: BassStepMeta = {
    keyCenter: center.id,
    scalePosition: 'major',
  };
  /** A phrase played from the start of each of the progression's bars. */
  const everyBar = (degrees: readonly number[], barsPerPhrase: 1 | 2) =>
    [0, 1, 2, 3]
      .filter((bar) => bar % barsPerPhrase === 0)
      .flatMap((bar) =>
        degrees.map((degree, i) =>
          note(
            center.scale.playOrder[degree - 1],
            bar * WHOLE_NOTE +
              (barsPerPhrase === 2 && i >= 3
                ? WHOLE_NOTE + (i - 3) * TICKS_PER_BEAT
                : i * TICKS_PER_BEAT),
            NORMAL_DURATION,
          ),
        ),
      );
  const distinct = progression.filter(
    (a, i) => progression.findIndex((b) => b.id === a.id) === i,
  );
  const two = distinct.slice(0, 2);

  return [
    step({
      section: 'A',
      subsection: 'D1: Melody with Play Along',
      activity: 'D1.1: Three Note Contour — Play Along',
      direction: `In a steady tempo, play this phrase at the start of every bar while the band plays ${symbols.join(', ')}.`,
      suffix: 'melody_playalong_3note',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Nice — right in the pocket with the band.',
      targetNotes: everyBar(CONTOUR_A_DEGREES, 1),
      chordSymbols: symbols,
      bass: bassMelody,
      ...band(NO_BASS_MELODY),
    }),
    step({
      section: 'A',
      subsection: 'D1: Melody with Play Along',
      activity: 'D1.2: Connect Two 3 Note Contours — Play Along',
      direction: `In a steady tempo, play this longer phrase twice while the band plays ${symbols.join(', ')}.`,
      suffix: 'melody_playalong_connected',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Great — the full phrase, right in time with the band.',
      targetNotes: everyBar(CONTOUR_CONNECTED_DEGREES, 2),
      chordSymbols: symbols,
      bass: bassMelody,
      ...band(NO_BASS_MELODY),
    }),
    step({
      section: 'B',
      subsection: 'D2: Bass Lines with Play Along',
      activity: 'D2.1: Two Chords — Play Along',
      direction: `Now play root and 5th of ${two.map((a) => a.symbol).join(', ')} in half notes, one chord a bar, along with the drums and chords!`,
      suffix: 'chords_playalong_two',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'Locked in with the band — nice work.',
      targetNotes: arpeggioBars(two, HALF_NOTE),
      chordSymbols: two.map((a) => a.symbol),
      bass: arpMeta(center, two),
      ...band(NO_BASS),
    }),
    step({
      section: 'B',
      subsection: 'D2: Bass Lines with Play Along',
      activity: 'D2.2: The Progression — Play Along',
      direction: `Now play R 3 5 3 through the progression, ${symbols.join(', ')}, one chord a bar, along with the drums and chords!`,
      suffix: 'chords_playalong_progression',
      assessment: 'pitch_order_timing_duration',
      successFeedback: 'The whole progression, right in time with the band.',
      targetNotes: arpeggioBars(progression, QUARTER_NOTE),
      chordSymbols: symbols,
      bass: arpMeta(center, progression),
      ...band(NO_BASS),
    }),
  ];
}

// ── Builders ──────────────────────────────────────────────────────────────

/**
 * Builds the bass lesson for any Theory scale in a key.
 * @param keyName - ASCII key name, e.g. 'C', 'F#', 'Db' (other spellings of a
 *   book key resolve to it; anything else falls back to C).
 * @param scale - The scale's engine key: 'ionian', 'dorian', 'minorblues'.
 */
export function buildBassScaleFlow(
  keyName: string,
  scale: GuitarScaleKey,
): ActivityFlowV2 {
  const key = toBookKey(keyName) ?? 'C';
  const center = getBassCenter(centerId(key, scale));
  const entry = bassScaleEntry(scale);
  const ionian = scale === 'ionian';
  const step = createStepFactory();
  const melody = [
    ...buildScaleSteps(center, step),
    ...buildMelodySteps(center, step),
  ];

  let sections: ActivitySectionV2[];
  let practiceChords: string[];
  if (!isGuitarMode(scale) && isPentatonicScale(scale)) {
    sections = [
      { id: 'A', name: 'Melody', steps: melody },
      {
        id: 'D',
        name: 'Play-Along',
        steps: [
          ...buildScalePlayAlongSteps(center, scale, step),
          ...buildMapSteps(center, step),
        ],
      },
    ];
    practiceChords = progressionArps(center, scale).map((a) => a.symbol);
  } else {
    sections = [
      {
        id: 'A',
        name: 'Melody',
        steps: [...melody, ...buildPentatonicSteps(center, step)],
      },
      { id: 'B', name: 'Arpeggios', steps: buildArpeggioSteps(center, step) },
      { id: 'D', name: 'Play-Along', steps: buildPlayAlongSteps(center, step) },
    ];
    practiceChords = center.musicMaps[4].bars.map((bar) =>
      chordSymbol(center.theory, bar.degree, bar.quality),
    );
  }

  const modeName = isGuitarMode(scale)
    ? GUITAR_MODE_NAME[scale as GuitarMode]
    : entry.name;
  return {
    genre: entry.genre,
    level: 1,
    version: 'v2',
    title: `${entry.title} — Bass`,
    params: {
      defaultKey: ionian ? `${key} Major (Ionian)` : `${key} ${modeName}`,
      defaultScale: ionian ? MAJOR_SCALE_INTERVALS : [...center.theory.steps],
      defaultScaleId: ionian ? 'major' : scale,
      tempoRange: [60, 100],
      swing: 0,
      grooves: [],
      instrument: 'bass',
      practiceTrack: { chords: practiceChords },
    },
    sections,
  };
}

/** Builds the bass Ionian (Major) lesson, The Bass Atlas: Book One's, for a key. */
export function buildBassModeFlow(
  keyName: string,
  mode: GuitarMode,
): ActivityFlowV2 {
  return buildBassScaleFlow(keyName, mode);
}
