/**
 * Pass 2, "Now Create Your Own Rhythms!" (passes.ts): after echoing Atlas,
 * the student plays a call of their own on the step's material, Atlas
 * transcribes it, and the student repeats it exactly.
 *
 *   count-in → their call (`bars`) → their repeat (`bars`), one pulse
 *
 * MATERIAL
 * A melody's material is the pitches its answer uses: on 1-3-5, just 1, 3
 * and 5, in the octaves the step plays them (the step's melody placed in
 * the treble staff, literacy.ts `melodyTonic`). A chord call's is each
 * bar's chord: in bar 2 the student plays bar 2's chord, any rhythm.
 *
 * TRANSCRIPTION (after the call's last bar)
 * Their call is quantized to the 16th grid: an onset rounds to the nearest
 * 16th, so a note just before the call's downbeat is on it, and one just
 * before the repeat's is the repeat's first. An end rounds too, at least a
 * 16th after its onset, never past the call (a chord, never past its bar),
 * and a note lasts no longer than the next one starts. A note outside the
 * material is left out and flagged; so is a chord note outside its bar's
 * chord, and a chord missing a tone is kept (it's that bar's chord) but
 * flagged. With nothing left, the call is empty: try again.
 *
 * THE REPEAT
 * Graded against the transcription, placed on the repeat's bars, by the
 * existing graders (grading.ts, chordGrading.ts), with the same pass rule.
 * The notes the call took are never answers.
 *
 * THE BOUNDARY (bestCreateReading)
 * A note in the call's last eighth is either the call's last note or the
 * repeat's first, played a little early: the commonest slip there is. Which
 * one the student meant shows in the repeat, so both readings are graded
 * and the better kept: a note meant for the call comes back at the end of
 * the repeat too, and an early downbeat lines up with the repeat's first.
 */

import {
  isChordFigure,
  isEchoStep,
  type LiteracyDegree,
  type LiteracyFigure,
  type LiteracyNote,
  type LiteracyNumbering,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import type { LiteracyChoices } from './choices';
import {
  clusterChords,
  gradeChordResponse,
  type LiteracyChordResult,
} from './chordGrading';
import type { VoicedChord } from './chords';
import {
  gradeResponse,
  RESPONSE_EARLY_TICKS,
  type LiteracyResult,
  type PlayedNote,
} from './grading';
import {
  barTicks,
  melodyTonic,
  resolveChordFigure,
  stepKey,
  type ChordAttack,
  type StepTimeline,
  type TimedNote,
} from './literacy';
import { stepPasses } from './passes';
import {
  degreeLabel,
  modalDegree,
  tonicMidi,
  writtenDegree,
  type LiteracyKey,
} from './pitch';
import { pitchFrom } from './register';

/** The create pass's grid: a 16th note. */
export const CREATE_GRID_TICKS = 120;

/** A pitch of a melody's material. */
export interface MaterialNote {
  midi: number;
  /** As the lesson writes it: in scale numbering, minor's ♭3 is '3'. */
  written: Pick<LiteracyNote, 'degree' | 'octave'>;
  /** Its chromatic degree, for its label ('b3'). */
  degree: LiteracyDegree;
}

/** What the student may play their call on. */
export type CreateMaterial =
  | { kind: 'notes'; notes: MaterialNote[] }
  | { kind: 'chords'; chords: VoicedChord[] };

/** A step's create pass, in the key it's played in. */
export interface CreatePass {
  bars: number;
  key: LiteracyKey;
  /** The 1's pitch. */
  tonic: number;
  numbering: LiteracyNumbering;
  material: CreateMaterial;
  /**
   * The run: the count-in (at least a bar), then their call as `call` and
   * their repeat as `response`, no words. A StepTimeline, so the graders,
   * `isRightNote` and `phaseAt` take it as they take any.
   */
  timeline: StepTimeline;
}

/** The create pass of a step, or null when it has none. */
export function createPass(
  lesson: MusicLiteracyLesson,
  step: LiteracyStep,
  choices?: LiteracyChoices | null,
): CreatePass | null {
  const create = stepPasses(lesson, step).create;
  if (!create || !isEchoStep(step)) return null;
  const bar = barTicks(lesson.timeSignature);
  const countIn = Math.max(1, lesson.countInBars) * bar;
  const length = create.bars * bar;
  const timeline: StepTimeline = {
    countIn: { start: 0, length: countIn },
    pickup: { start: countIn, length: 0 },
    words: { start: countIn, length: 0 },
    call: { start: countIn, length },
    response: { start: countIn + length, length },
    total: countIn + 2 * length,
    barTicks: bar,
    tempo: step.tempo ?? lesson.tempo,
  };
  const numbering = lesson.numbering ?? 'chromatic';

  if (isChordFigure(step.call)) {
    const figure = resolveChordFigure(lesson, step.call, choices);
    return {
      bars: create.bars,
      key: figure.key,
      tonic: tonicMidi(figure.key.tonic),
      numbering,
      material: { kind: 'chords', chords: figure.chords },
      timeline,
    };
  }
  const key = stepKey(lesson, step, choices);
  // Where the step itself plays them: its melody placed as one.
  const tonic = melodyTonic(lesson, step, choices);
  const byMidi = new Map<number, MaterialNote>();
  for (const note of (step.response ?? step.call).notes) {
    const midi = pitchFrom(note, tonic, key, numbering);
    if (byMidi.has(midi)) continue;
    byMidi.set(midi, {
      midi,
      written: note.octave
        ? { degree: note.degree, octave: note.octave }
        : { degree: note.degree },
      degree: modalDegree(note.degree, key.mode, numbering),
    });
  }
  return {
    bars: create.bars,
    key,
    tonic,
    numbering,
    material: {
      kind: 'notes',
      notes: [...byMidi.values()].sort((a, b) => a.midi - b.midi),
    },
    timeline,
  };
}

/** A tick on the 16th grid: the nearest. */
export function quantizeTick(tick: number, grid = CREATE_GRID_TICKS): number {
  const on = Math.round(tick / grid) * grid;
  return on === 0 ? 0 : on; // never -0
}

export type CreateFlagReason =
  /** A melody note outside the material. */
  | 'offMaterial'
  /** A chord note outside its bar's chord (or a chord with none of it). */
  | 'notInChord'
  /** A chord missing one of its bar's chord tones (kept, as that chord). */
  | 'missingChordTones';

/** Something in the student's call the transcription left out or doubts. */
export interface CreateFlag {
  reason: CreateFlagReason;
  /** The played notes it's about. */
  notes: PlayedNote[];
  /** Where, on the grid: ticks from the call's downbeat. */
  tick: number;
  /** Its bar of the call, from 0. */
  bar: number;
  /** The bar's chord (chord material). */
  chord?: VoicedChord;
  /** The chord's pitch classes the attack lacks ('missingChordTones'). */
  missing?: number[];
  /** For the student, short. */
  message: string;
}

/** One chord of the student's call, quantized. */
export interface TranscribedChord {
  /** Ticks from the call's downbeat, on the grid. */
  tick: number;
  duration: number;
  bar: number;
  chord: VoicedChord;
}

/** The student's call, transcribed, and what the repeat must match. */
export interface Transcription {
  /** Nothing in the call to repeat: try again. */
  empty: boolean;
  /**
   * The call in the format's own note shape, ticks from its downbeat, read
   * the lesson's way (a chord call: every attack's chord notes): for the
   * roll and the staff. Null when empty.
   */
  figure: LiteracyFigure | null;
  /** A chord call's attacks; empty for a melody. */
  chords: TranscribedChord[];
  flags: CreateFlag[];
  /** Every played note the call took (the repeat's grading leaves them out). */
  used: PlayedNote[];
  /** The repeat's targets: a melody's notes, placed on the repeat's bars. */
  targets: TimedNote[];
  /** The repeat's targets: a chord call's attacks, placed on its bars. */
  attacks: ChordAttack[];
}

/** Where a played note falls in the call: its grid tick, or null outside. */
function callTick(note: PlayedNote, timeline: StepTimeline): number | null {
  const tick = quantizeTick(note.onset - timeline.call.start);
  return tick >= 0 && tick < timeline.call.length ? tick : null;
}

/** A played note's end on the grid, from the call's downbeat (held: the end). */
const endTick = (note: PlayedNote, timeline: StepTimeline, limit: number) =>
  note.duration > 0
    ? Math.min(
        limit,
        quantizeTick(note.onset + note.duration - timeline.call.start),
      )
    : limit;

/** "1, 3 and 5". */
const list = (labels: string[]) =>
  labels.length < 2
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * The student's call, quantized and transcribed (see the head of the
 * file). `played` is everything played in the run so far: run it once the
 * call's last bar is over, and pass the same notes to `gradeCreateRepeat`.
 */
export function transcribeCall(
  pass: CreatePass,
  played: readonly PlayedNote[],
  {
    early = false,
  }: {
    /** Read notes in the call's last eighth as the repeat's, played early. */
    early?: boolean;
  } = {},
): Transcription {
  const { timeline, material } = pass;
  const grid = CREATE_GRID_TICKS;
  const inCall = played
    .filter((note) => !(early && inBoundary(note, timeline)))
    .map((note) => ({ note, tick: callTick(note, timeline) }))
    .filter((n): n is { note: PlayedNote; tick: number } => n.tick !== null);
  const used = inCall.map((n) => n.note);
  const flags: CreateFlag[] = [];
  const length = timeline.call.length;

  if (material.kind === 'notes') {
    const byMidi = new Map(material.notes.map((m) => [m.midi, m]));
    const labels = [
      ...new Set(material.notes.map((m) => degreeLabel(m.degree))),
    ];
    const kept: { tick: number; end: number; midi: number }[] = [];
    for (const { note, tick } of inCall) {
      if (!byMidi.has(note.midi)) {
        const label = degreeLabel(
          writtenDegree(note.midi - pass.tonic, pass.key.mode).degree,
        );
        flags.push({
          reason: 'offMaterial',
          notes: [note],
          tick,
          bar: Math.floor(tick / timeline.barTicks),
          message: `${label} isn’t one of this step’s notes: play ${list(labels)}.`,
        });
        continue;
      }
      // The same key struck twice on one 16th is one note.
      if (kept.some((k) => k.tick === tick && k.midi === note.midi)) continue;
      kept.push({
        tick,
        end: Math.max(tick + grid, endTick(note, timeline, length)),
        midi: note.midi,
      });
    }
    kept.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
    // A note lasts no longer than the next one starts.
    for (const note of kept) {
      const next = kept.find((k) => k.tick > note.tick);
      if (next) note.end = Math.min(note.end, next.tick);
    }
    const figureNotes = kept.map(({ tick, end, midi }) => ({
      tick,
      duration: end - tick,
      ...byMidi.get(midi)!.written,
    }));
    const targets: TimedNote[] = kept.map(({ tick, end, midi }, index) => ({
      midi,
      onset: timeline.response.start + tick,
      duration: end - tick,
      degree: byMidi.get(midi)!.degree,
      index,
    }));
    return {
      empty: kept.length === 0,
      figure: kept.length ? { bars: pass.bars, notes: figureNotes } : null,
      chords: [],
      flags,
      used,
      targets,
      attacks: [],
    };
  }

  // Chords: notes struck together are one chord, checked against its bar's.
  const chords: TranscribedChord[] = [];
  for (const struck of clusterChords(inCall.map((n) => n.note))) {
    const tick = quantizeTick(struck.onset - timeline.call.start);
    if (tick < 0 || tick >= length) continue;
    const bar = Math.min(
      material.chords.length - 1,
      Math.floor(tick / timeline.barTicks),
    );
    const chord = material.chords[bar];
    const inChord = struck.notes.filter((n) =>
      chord.pitchClasses.includes(pitchClass(n.midi)),
    );
    const outside = struck.notes.filter((n) => !inChord.includes(n));
    if (outside.length) {
      flags.push({
        reason: 'notInChord',
        notes: outside,
        tick,
        bar,
        chord,
        message: inChord.length
          ? `A note outside ${chord.label} in bar ${bar + 1}: play just its notes.`
          : `That isn’t ${chord.label}, bar ${bar + 1}’s chord.`,
      });
    }
    if (!inChord.length) continue;
    const classes = new Set(inChord.map((n) => pitchClass(n.midi)));
    const missing = chord.pitchClasses.filter((pc) => !classes.has(pc));
    if (missing.length) {
      flags.push({
        reason: 'missingChordTones',
        notes: inChord,
        tick,
        bar,
        chord,
        missing,
        message: `${chord.label} in bar ${bar + 1} is missing a note: play all of it.`,
      });
    }
    if (chords.some((c) => c.tick === tick)) continue;
    const barEnd = (bar + 1) * timeline.barTicks;
    const end = Math.max(...inChord.map((n) => endTick(n, timeline, barEnd)));
    chords.push({
      tick,
      duration: Math.max(grid, Math.min(barEnd, end) - tick),
      bar,
      chord,
    });
  }
  chords.sort((a, b) => a.tick - b.tick);
  for (const chord of chords) {
    const next = chords.find((c) => c.tick > chord.tick);
    if (next) chord.duration = Math.min(chord.duration, next.tick - chord.tick);
  }
  const figureNotes = chords.flatMap(({ tick, duration, chord }) =>
    chord.midis.map((midi) => ({
      tick,
      duration,
      ...writtenDegree(midi - pass.tonic, pass.key.mode, pass.numbering),
    })),
  );
  return {
    empty: chords.length === 0,
    figure: chords.length ? { bars: pass.bars, notes: figureNotes } : null,
    chords,
    flags,
    used,
    targets: [],
    attacks: chords.map(({ tick, duration, bar, chord }, index) => ({
      index,
      bar,
      onset: timeline.response.start + tick,
      duration,
      chord,
    })),
  };
}

/** A note in the call's last eighth, before the repeat's downbeat. */
function inBoundary(note: PlayedNote, timeline: StepTimeline): boolean {
  const downbeat = timeline.response.start;
  return note.onset >= downbeat - RESPONSE_EARLY_TICKS && note.onset < downbeat;
}

/**
 * The call transcribed and the repeat graded, reading any note in the
 * call's last eighth whichever way fits the repeat better (see THE
 * BOUNDARY above). Run it once the repeat is over; the transcription shown
 * during the repeat is `transcribeCall`'s, which can't know yet.
 */
export function bestCreateReading(
  pass: CreatePass,
  played: readonly PlayedNote[],
  timing: { tempo: number; passMark: number },
): { transcription: Transcription; result: CreateResult } {
  const asCall = transcribeCall(pass, played);
  const asCallResult = gradeCreateRepeat(pass, asCall, played, timing);
  const boundary = asCall.used.some((note) => inBoundary(note, pass.timeline));
  if (!boundary) return { transcription: asCall, result: asCallResult };
  const asEarly = transcribeCall(pass, played, { early: true });
  if (asEarly.empty) return { transcription: asCall, result: asCallResult };
  const asEarlyResult = gradeCreateRepeat(pass, asEarly, played, timing);
  const score = (r: CreateResult) =>
    r.kind === 'empty' ? -1 : r.result.percent;
  return score(asEarlyResult) > score(asCallResult)
    ? { transcription: asEarly, result: asEarlyResult }
    : { transcription: asCall, result: asCallResult };
}

/** What the repeat came to. */
export type CreateResult =
  /** Nothing in the call to repeat: play a call first. */
  | { kind: 'empty'; passed: false; feedbackText: string }
  | { kind: 'notes'; passed: boolean; result: LiteracyResult }
  | { kind: 'chords'; passed: boolean; result: LiteracyChordResult };

/** The empty call's words. */
export const EMPTY_CALL_FEEDBACK =
  'We didn’t hear a call to repeat. Play your own rhythm on the notes, then repeat it.';

function repeatFeedback(passed: boolean, missed: number, extras: number) {
  if (passed) {
    return missed + extras > 0
      ? 'Passed. Next time, repeat your call note for note.'
      : 'You repeated your own rhythm. Nice!';
  }
  if (missed > 0) {
    return `${missed} ${missed > 1 ? 'parts' : 'part'} of your call missed. Repeat it exactly, right after you play it.`;
  }
  if (extras > 0)
    return 'Extra notes in your repeat: play just your call again.';
  return 'Your notes, but off the beat: repeat your rhythm in time.';
}

/**
 * The repeat, graded against the student's own call: `played` is what they
 * played over the whole run, the same notes `transcribeCall` was given.
 */
export function gradeCreateRepeat(
  pass: CreatePass,
  transcription: Transcription,
  played: readonly PlayedNote[],
  { tempo, passMark }: { tempo: number; passMark: number },
): CreateResult {
  if (transcription.empty) {
    return { kind: 'empty', passed: false, feedbackText: EMPTY_CALL_FEEDBACK };
  }
  const used = new Set(transcription.used);
  const repeat = played.filter((note) => !used.has(note));
  const options = { timeline: pass.timeline, tempo, passMark };
  if (pass.material.kind === 'chords') {
    const result = gradeChordResponse(transcription.attacks, repeat, options);
    const missed = result.attacks.filter((a) => a.status !== 'hit').length;
    result.feedbackText = repeatFeedback(
      result.passed,
      missed,
      result.extras.length,
    );
    return { kind: 'chords', passed: result.passed, result };
  }
  const result = gradeResponse(transcription.targets, repeat, options);
  result.feedbackText = repeatFeedback(
    result.passed,
    result.missedNotes.length,
    result.extras.length,
  );
  return { kind: 'notes', passed: result.passed, result };
}
