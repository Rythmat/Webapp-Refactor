import { isRightChordNote } from '@/curriculum/engine/musicLiteracy/chordGrading';
import type {
  CreatePass,
  Transcription,
} from '@/curriculum/engine/musicLiteracy/createPass';
import {
  challengeTargets,
  isRightNote,
  RESPONSE_EARLY_TICKS,
} from '@/curriculum/engine/musicLiteracy/grading';
import type {
  ChordAttack,
  StepNotes,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { LiteracyPass } from '@/curriculum/engine/musicLiteracy/passes';

// ── Which keys are right, and which chord is sounding ──────────────────────
// The player colors a key the student presses by the pass it's in (the
// key's color, or gray), and names the chord a chord step is on. Pure.

export const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/** What a key is judged against. */
export interface RightKeyContext {
  /** The pass the key is played in (a run's, or the one on screen). */
  pass: LiteracyPass | null;
  notes: StepNotes;
  /** The create pass, when that's the pass. */
  create: CreatePass | null;
  /** The create pass's call, once transcribed. */
  transcription: Transcription | null;
}

/**
 * Whether a key pressed at `tick` (null: out of a run) is right:
 *
 *   echo       the answer's pitch in the response bars; nothing is wrong in
 *              the teacher's turn (grading.ts isRightNote)
 *   challenge  every note is the student's: the nearest note's pitch in
 *              its segment
 *   chords     a note of the chord answered now (chordGrading.ts); a replay,
 *              any note of its chords
 *   create     nothing wrong in the count-in; in the call, the step's notes
 *              (a chord call: that bar's chord); in the repeat, the student's
 *              own call as transcribed
 */
export function isRightKey(
  midi: number,
  tick: number | null,
  { pass, notes, create, transcription }: RightKeyContext,
): boolean {
  if (pass === 'challenge') {
    return isRightNote(midi, tick, challengeTargets(notes), notes.timeline, {
      challenge: true,
    });
  }
  if (pass === 'create' && create) {
    return isRightCreateKey(midi, tick, create, transcription);
  }
  if (notes.chords) {
    const answer = notes.chords.response;
    return answer.length
      ? isRightChordNote(midi, tick, answer, notes.timeline)
      : isRightChordNote(midi, null, notes.chords.call, notes.timeline);
  }
  if (!notes.response.length && !notes.call.length) return true;
  return isRightNote(midi, tick, notes.response, notes.timeline);
}

function isRightCreateKey(
  midi: number,
  tick: number | null,
  create: CreatePass,
  transcription: Transcription | null,
): boolean {
  const { timeline: t, material } = create;
  if (tick !== null && tick < t.call.start - RESPONSE_EARLY_TICKS) {
    return true;
  }
  // From half an eighth before the repeat's downbeat, the repeat's.
  const repeat =
    tick !== null && tick >= t.response.start - RESPONSE_EARLY_TICKS / 2;
  if (repeat && transcription && !transcription.empty) {
    return material.kind === 'chords'
      ? isRightChordNote(midi, tick, transcription.attacks, t)
      : isRightNote(midi, tick, transcription.targets, t);
  }
  if (material.kind === 'notes') {
    return material.notes.some((m) => m.midi === midi);
  }
  if (tick === null) {
    return material.chords.some((c) =>
      c.pitchClasses.includes(pitchClass(midi)),
    );
  }
  const from = repeat ? t.response.start : t.call.start;
  const bar = Math.max(
    0,
    Math.min(
      material.chords.length - 1,
      Math.floor((tick - from) / t.barTicks),
    ),
  );
  return material.chords[bar].pitchClasses.includes(pitchClass(midi));
}

/** The attack sounding at `tick`, else the last begun; null before any. */
export function attackAt(
  attacks: readonly ChordAttack[],
  tick: number,
): { attack: ChordAttack; sounding: boolean } | null {
  let last: ChordAttack | null = null;
  for (const attack of attacks) {
    if (attack.onset > tick) break;
    last = attack;
  }
  if (!last) return null;
  return { attack: last, sounding: tick < last.onset + last.duration };
}

/** Each bar's chord label ("1 maj", "4 maj"), from a figure's attacks. */
export function chordLabelsByBar(attacks: readonly ChordAttack[]): string[] {
  const labels: string[] = [];
  for (const attack of attacks) labels[attack.bar] ??= attack.chord.label;
  return labels;
}
