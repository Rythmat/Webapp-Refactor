import type {
  CreatePass,
  CreateResult,
  Transcription,
} from '@/curriculum/engine/musicLiteracy/createPass';
import {
  RESPONSE_EARLY_TICKS,
  type PlayedNote,
} from '@/curriculum/engine/musicLiteracy/grading';
import {
  degreeLabel,
  degreeOfMidi,
} from '@/curriculum/engine/musicLiteracy/pitch';
import {
  EARLY_LATE_TOLERANCE_TICKS,
  outcomeMistake,
} from '@/curriculum/practice/nextStepSuggestion';

// ── The create pass's result, side by side ─────────────────────────────────
// What the result shows after Pass 2: the student's call as transcribed
// (notes off the step's notes in gray, left out) beside their repeat as they
// played it, over where each note should have been, and each note of the
// call marked on time, early, late or missed. Pure: CreateResultPanel draws
// it.

export type CompareTone =
  /** A note of their call, as transcribed. */
  | 'call'
  /** A repeat note that answered one of the call's. */
  | 'hit'
  /** Played, but not taken: off the step's notes, or an extra. */
  | 'gray'
  /** Where a call note sits in the repeat: what to match. */
  | 'ghost';

export interface CompareNote {
  midi: number;
  /** Ticks from its half's downbeat (the call's, or the repeat's). */
  tick: number;
  duration: number;
  tone: CompareTone;
}

export type TimingStatus = 'onTime' | 'early' | 'late' | 'missed' | 'partial';

/** How one note (or chord) of the call was repeated. */
export interface TimingMark {
  /** "3", "♭3", or a chord: "4 maj". */
  label: string;
  status: TimingStatus;
  /** Where it is in the repeat, from its downbeat. */
  tick: number;
  /** The pitch the mark sits over (a chord's root). */
  midi: number;
}

export interface CreateComparison {
  /** Ticks in each half: the call's bars. */
  length: number;
  barTicks: number;
  /** Every pitch drawn, high to low, with its scale degree. */
  lanes: { midi: number; label: string }[];
  call: CompareNote[];
  repeat: CompareNote[];
  marks: TimingMark[];
  /** Some of the call was left out: off the step's notes. */
  leftOut: boolean;
}

export const TIMING_WORDS: Readonly<Record<TimingStatus, string>> = {
  onTime: 'on time',
  early: 'early',
  late: 'late',
  missed: 'missed',
  partial: 'missing a note',
};

/** The house marks: ✓ on time, ◀ early, ▶ late, ✗ missed. */
export const TIMING_GLYPHS: Readonly<Record<TimingStatus, string>> = {
  onTime: '✓',
  early: '◀',
  late: '▶',
  missed: '✗',
  partial: '≠',
};

/** A chord's timing, off its onset as a note's is. */
const chordTiming = (dev: number | undefined): TimingStatus =>
  dev === undefined || Math.abs(dev) <= EARLY_LATE_TOLERANCE_TICKS
    ? 'onTime'
    : dev < 0
      ? 'early'
      : 'late';

export function createComparison(
  pass: CreatePass,
  transcription: Transcription,
  outcome: Exclude<CreateResult, { kind: 'empty' }>,
  played: readonly PlayedNote[],
): CreateComparison {
  const { timeline, tonic } = pass;
  const callStart = timeline.call.start;
  const repeatStart = timeline.response.start;
  const used = new Set(transcription.used);
  const flagged = new Set(
    transcription.flags
      .filter((f) => f.reason !== 'missingChordTones')
      .flatMap((f) => f.notes),
  );

  const call: CompareNote[] = [];
  const ghosts: CompareNote[] = [];
  const marks: TimingMark[] = [];
  const answered = new Set<PlayedNote>();

  if (outcome.kind === 'notes') {
    transcription.targets.forEach((target, i) => {
      const tick = target.onset - repeatStart;
      call.push({
        midi: target.midi,
        tick,
        duration: target.duration,
        tone: 'call',
      });
      ghosts.push({
        midi: target.midi,
        tick,
        duration: target.duration,
        tone: 'ghost',
      });
      const pair = outcome.result.pairs[i];
      if (pair) answered.add(pair);
      const scored = outcome.result.outcomes?.[i];
      const mistake = scored ? outcomeMistake(scored) : 'missed';
      marks.push({
        label: degreeLabel(target.degree),
        status:
          mistake === null
            ? 'onTime'
            : mistake === 'early' || mistake === 'late'
              ? mistake
              : 'missed',
        tick: pair ? pair.onset - repeatStart : tick,
        midi: target.midi,
      });
    });
  } else {
    transcription.attacks.forEach((attack, i) => {
      const tick = attack.onset - repeatStart;
      for (const midi of attack.chord.midis) {
        call.push({ midi, tick, duration: attack.duration, tone: 'call' });
        ghosts.push({ midi, tick, duration: attack.duration, tone: 'ghost' });
      }
      const scored = outcome.result.attacks[i];
      const extras = new Set(scored.extras);
      for (const note of scored.struck?.notes ?? []) {
        if (!extras.has(note)) answered.add(note);
      }
      marks.push({
        label: attack.chord.label,
        status:
          scored.status === 'missed'
            ? 'missed'
            : scored.status === 'wrong'
              ? 'partial'
              : chordTiming(scored.timingDevTicks),
        tick: scored.struck ? scored.struck.onset - repeatStart : tick,
        midi: attack.chord.root,
      });
    });
  }

  // What they played in the call that was left out: gray.
  for (const note of played) {
    if (!flagged.has(note)) continue;
    call.push({
      midi: note.midi,
      tick: note.onset - callStart,
      duration: note.duration || 120,
      tone: 'gray',
    });
  }

  // The repeat as they played it: the call's notes answered, the rest gray.
  const repeat: CompareNote[] = [...ghosts];
  for (const note of played) {
    if (used.has(note)) continue;
    if (note.onset < repeatStart - RESPONSE_EARLY_TICKS) continue;
    if (note.onset >= timeline.total) continue;
    repeat.push({
      midi: note.midi,
      tick: note.onset - repeatStart,
      duration: note.duration || 120,
      tone: answered.has(note) ? 'hit' : 'gray',
    });
  }

  const midis = new Set([...call, ...repeat].map((n) => n.midi));
  if (pass.material.kind === 'notes') {
    for (const m of pass.material.notes) midis.add(m.midi);
  }
  const lanes = [...midis]
    .sort((a, b) => b - a)
    .map((midi) => ({
      midi,
      label: degreeLabel(degreeOfMidi(midi, tonic).degree),
    }));

  return {
    length: timeline.call.length,
    barTicks: timeline.barTicks,
    lanes,
    call,
    repeat,
    marks,
    leftOut: flagged.size > 0,
  };
}
