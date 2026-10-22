/**
 * Grading a chord echo: the student plays a chord call back, chord for
 * chord, in its rhythm.
 *
 * ATTACKS
 * Notes struck together are one attack: a note within CHORD_CLUSTER_TICKS
 * of an attack's first note joins it, so a beginner's ragged chord is still
 * one chord. Each target attack is answered by one struck attack at most,
 * the closest pairs first, within a beat, and only by one with a note of
 * its chord in it.
 *
 * RIGHT CHORD
 * An attack answers its target when it has every pitch class of the chord,
 * in any octave and any order (an inversion, a doubled root: all fine).
 * One missing a chord tone is wrong: no pitch and no timing for it, as a
 * wrong melodic note. Notes outside the chord in an attack are extras, and
 * so is an attack that answers nothing: each costs what a wrong note does
 * (the house wrong-note penalty).
 *
 * TIMING
 * The attack's onset (its first note) against the target's, scored by the
 * house Gaussian timing exactly as a melodic note's. Same blend (pitch 0.6,
 * timing 0.4), same pass rule (70%, and timing 50%).
 */

import {
  applyWrongNotePenalty,
  assessPitchAndTiming,
  type AssessmentResult,
  type TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import {
  MATCH_WINDOW_TICKS,
  ON_TIME,
  meetsPassRule,
  responseWindow,
  type PlayedNote,
} from './grading';
import type { ChordAttack, StepTimeline } from './literacy';

/** Notes struck within this many ticks of an attack's first note join it. */
export const CHORD_CLUSTER_TICKS = 100;

/** Notes the student struck together: one attack. */
export interface StruckChord<T extends PlayedNote = PlayedNote> {
  /** Its first note's onset. */
  onset: number;
  notes: T[];
}

/** The student's notes as attacks, in time order. */
export function clusterChords<T extends PlayedNote>(
  played: readonly T[],
  spread = CHORD_CLUSTER_TICKS,
): StruckChord<T>[] {
  const attacks: StruckChord<T>[] = [];
  for (const note of [...played].sort((a, b) => a.onset - b.onset)) {
    const last = attacks.at(-1);
    if (last && note.onset - last.onset < spread) last.notes.push(note);
    else attacks.push({ onset: note.onset, notes: [note] });
  }
  return attacks;
}

/** How one target attack went. */
export interface ChordAttackOutcome {
  /**
   * hit: every chord tone; wrong: struck, but a chord tone missing;
   * missed: nothing answered it.
   */
  status: 'hit' | 'wrong' | 'missed';
  /** The attack that answered it. */
  struck: StruckChord | null;
  /** The chord's pitch classes the attack lacks. */
  missing: number[];
  /** Notes in the attack outside the chord. */
  extras: PlayedNote[];
  /** The attack's onset − the target's (negative: early). */
  timingDevTicks?: number;
}

export interface LiteracyChordResult extends AssessmentResult {
  /** The overall score as the result shows it, 0–100. */
  percent: number;
  passMark: number;
  /** Per target attack. */
  attacks: ChordAttackOutcome[];
  /** Every note that cost points: outside its chord, or in no attack's place. */
  extras: PlayedNote[];
  /** Attacks that answered no target. */
  extraAttacks: StruckChord[];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const has = (chord: ChordAttack, midi: number) =>
  chord.chord.pitchClasses.includes(((midi % 12) + 12) % 12);

/**
 * The chords answered in the response window. With the call's attacks, a
 * note in the window's early eighth that belongs to the call's last chord
 * and not the first answer's is the call played along, not an answer.
 */
export function inChordResponse<T extends PlayedNote>(
  played: readonly T[],
  timeline: StepTimeline,
  targets: readonly ChordAttack[],
  call?: readonly ChordAttack[],
): T[] {
  const { start, end } = responseWindow(timeline);
  const lastCall = call?.at(-1);
  const first = targets[0];
  return played.filter((note) => {
    if (note.onset < start || note.onset >= end) return false;
    if (!lastCall || note.onset >= timeline.response.start) return true;
    return !(has(lastCall, note.midi) && !(first && has(first, note.midi)));
  });
}

function chordFeedback(
  missed: number,
  wrong: number,
  extras: number,
  timing: number,
  passed: boolean,
): string {
  if (passed) {
    if (missed + wrong + extras > 0) {
      return 'Passed. Next time, every note of each chord and nothing else.';
    }
    return timing >= ON_TIME
      ? 'Right chords, right on time.'
      : 'Right chords. Now land each one on its beat.';
  }
  if (wrong > 0) {
    return `${wrong} chord${wrong > 1 ? 's' : ''} missing a note. Play every note of each chord together${extras ? ', and nothing extra' : ''}.`;
  }
  if (missed > 0) {
    return `${missed} chord${missed > 1 ? 's' : ''} missed. Play every chord back, in its rhythm.`;
  }
  if (extras > 0) {
    return `${extras} extra note${extras > 1 ? 's' : ''}. Play just the chords of the call.`;
  }
  return 'The right chords, but off the beat: strike each one in time.';
}

/**
 * The student's chords, graded. `targets` are the attacks to answer (a
 * chord echo's response attacks, or a create pass's repeat); `played` is
 * everything played during the run, the response window taken here.
 */
export function gradeChordResponse(
  targets: readonly ChordAttack[],
  played: readonly PlayedNote[],
  {
    timeline,
    tempo,
    passMark,
    call,
  }: {
    timeline: StepTimeline;
    tempo: number;
    passMark: number;
    call?: readonly ChordAttack[];
  },
): LiteracyChordResult {
  const struck = clusterChords(
    inChordResponse(played, timeline, targets, call),
  );

  // One attack answers one target, the closest first, within a beat.
  const candidates: { target: number; attack: number; distance: number }[] = [];
  targets.forEach((target, t) =>
    struck.forEach((attack, a) => {
      const distance = Math.abs(attack.onset - target.onset);
      if (
        distance <= MATCH_WINDOW_TICKS &&
        attack.notes.some((note) => has(target, note.midi))
      ) {
        candidates.push({ target: t, attack: a, distance });
      }
    }),
  );
  candidates.sort((a, b) => a.distance - b.distance || a.target - b.target);
  const answer: (number | null)[] = targets.map(() => null);
  const used = new Set<number>();
  for (const { target, attack } of candidates) {
    if (answer[target] !== null || used.has(attack)) continue;
    answer[target] = attack;
    used.add(attack);
  }

  const pitch: number[] = [];
  const timing: number[] = [];
  const extras: PlayedNote[] = [];
  const attacks: ChordAttackOutcome[] = targets.map((target, t) => {
    const a = answer[t];
    if (a === null) {
      pitch.push(0);
      timing.push(0);
      return { status: 'missed', struck: null, missing: [], extras: [] };
    }
    const attack = struck[a];
    const classes = new Set(attack.notes.map((n) => ((n.midi % 12) + 12) % 12));
    const missing = target.chord.pitchClasses.filter((pc) => !classes.has(pc));
    const outside = attack.notes.filter((n) => !has(target, n.midi));
    extras.push(...outside);
    const timingDevTicks = attack.onset - target.onset;
    if (missing.length) {
      pitch.push(0);
      timing.push(0);
      return {
        status: 'wrong',
        struck: attack,
        missing,
        extras: outside,
        timingDevTicks,
      };
    }
    // The house timing maths, on the root as a stand-in for the chord.
    const scored = assessPitchAndTiming(
      [
        {
          midi: target.chord.root,
          onset: target.onset,
          duration: target.duration,
        },
      ],
      [{ midi: target.chord.root, onset: attack.onset, duration: 0 }],
      tempo,
      'pitch_order_timing',
    );
    pitch.push(1);
    timing.push(scored.timingAccuracy ?? 0);
    return {
      status: 'hit',
      struck: attack,
      missing: [],
      extras: outside,
      timingDevTicks,
    };
  });
  const extraAttacks = struck.filter((_, a) => !used.has(a));
  for (const attack of extraAttacks) extras.push(...attack.notes);

  const pitchAccuracy = mean(pitch);
  const timingAccuracy = mean(timing);
  // Each note outside its chord, and each attack in no target's place, is
  // one wrong note.
  const wrongCount =
    attacks.reduce((n, a) => n + a.extras.length, 0) + extraAttacks.length;
  const overallScore = applyWrongNotePenalty(
    pitchAccuracy * 0.6 + timingAccuracy * 0.4,
    targets.length,
    wrongCount,
  );
  const percent = Math.round(overallScore * 100);
  const passed = meetsPassRule(percent, timingAccuracy, passMark);
  const outcomes: TargetOutcome[] = attacks.map((a, i) => ({
    targetIndex: i,
    onsetTick: targets[i].onset,
    status: a.status,
    ...(a.timingDevTicks !== undefined
      ? { timingDevTicks: a.timingDevTicks }
      : {}),
  }));
  const missedNotes = targets
    .filter((_, i) => attacks[i].status !== 'hit')
    .map((t) => t.chord.root);

  return {
    passed,
    pitchAccuracy,
    timingAccuracy,
    durationAccuracy: null,
    overallScore,
    missedNotes,
    wrongNotes: extras.map((note) => note.midi),
    xpEarned: Math.round(overallScore * 30),
    skillTagsEarned: [],
    feedbackText: chordFeedback(
      attacks.filter((a) => a.status === 'missed').length,
      attacks.filter((a) => a.status === 'wrong').length,
      wrongCount,
      timingAccuracy,
      passed,
    ),
    outcomes,
    percent,
    passMark,
    attacks,
    extras,
    extraAttacks,
  };
}

/**
 * Whether a key pressed now is right, for the keyboard's color: in the
 * response window, a note of the chord whose attack is nearest in time;
 * before it, the teacher's turn, nothing is wrong; out of a run (null) and
 * after the answer, a note of any of the chords.
 */
export function isRightChordNote(
  midi: number,
  tick: number | null,
  targets: readonly ChordAttack[],
  timeline: StepTimeline,
): boolean {
  const { start, end } = responseWindow(timeline);
  if (tick !== null && tick < start) return true;
  if (tick === null || tick >= end || targets.length === 0) {
    return targets.some((target) => has(target, midi));
  }
  const nearest = targets.reduce((a, b) =>
    Math.abs(b.onset - tick) < Math.abs(a.onset - tick) ? b : a,
  );
  return has(nearest, midi);
}
