/**
 * Grading an echo: the student's answer to a call, by Music Literacy's own
 * graders (grading.ts `gradeResponse` for a melody, chordGrading.ts
 * `gradeChordResponse` for chords), on a run laid out as Music Literacy
 * lays out a step:
 *
 *   count-in → the call (2 bars) → the response (2 bars)
 *
 * The run is a StepTimeline (literacy.ts) with no words, so the graders,
 * `isRightNote` and the player's cues read it as they read a lesson's.
 * The response is the call again on the response's bars: an echo. The pass
 * rule is the series': 70% overall, and timing at least 50%.
 *
 * THE TEMPO
 * A run is laid out at a tempo: the one asked for, else the call's, else
 * its level's base. Ticks are a 480th of a quarter whatever the tempo, so
 * the response window and pairing (an eighth early, a beat either side)
 * follow it; the timing score and the chord strikes' spread are in time,
 * and read the run's tempo.
 *
 * CHORDS A 16TH APART
 * A chord echo is graded as Music Literacy grades one (`gradeChordResponse`:
 * the same pairing, scores, penalty and pass rule), but on the strikes Echo
 * hears (strikes.ts `chordStrikes`), whose spread follows the tempo: so two
 * chords a 16th apart are two, a rolled one is one, and a chord held under a
 * re-struck note is the chord struck again (`gradeChordStrikes`).
 *
 * Played notes are in ticks from the run's first count-in click (or from
 * wherever the timeline starts: `start`, for the boss's calls played back
 * to back). Pure, no React.
 */

import {
  applyWrongNotePenalty,
  assessPitchAndTiming,
  type TargetOutcome,
} from '@/curriculum/hooks/useGenreAssessment';
import {
  inChordResponse,
  type ChordAttackOutcome,
  type LiteracyChordResult,
} from '../musicLiteracy/chordGrading';
import {
  LITERACY_PASS_MARK,
  MATCH_WINDOW_TICKS,
  ON_TIME,
  gradeResponse,
  meetsPassRule,
  type LiteracyResult,
  type PlayedNote,
} from '../musicLiteracy/grading';
import {
  chordNotes,
  type ChordAttack,
  type StepTimeline,
  type TimedNote,
} from '../musicLiteracy/literacy';
import type { ChordCall, EchoCall, EchoNote, MelodyCall } from './calls';
import { echoLevel } from './levels';
import { chordStrikes, type ChordStrike } from './strikes';

export type { PlayedNote };

export interface EchoTimelineOptions {
  /**
   * Quarter notes a minute: the game's tempo now (tempo.ts). The call's
   * when left out, else its level's base.
   */
  tempo?: number;
  /** Bars of count-in before the call; the level's (1) when left out. */
  countInBars?: number;
  /** Where the run starts, in ticks: 0 for a call on its own. */
  start?: number;
}

/** A call's run: count-in, the call, the response its length. */
export function echoTimeline(
  call: Pick<EchoCall, 'bars' | 'barTicks' | 'level'> & { tempo?: number },
  { tempo, countInBars, start = 0 }: EchoTimelineOptions = {},
): StepTimeline {
  const level = echoLevel(call.level);
  const bar = call.barTicks;
  const countIn = {
    start,
    length: (countInBars ?? level.countInBars) * bar,
  };
  const callStart = countIn.start + countIn.length;
  const length = call.bars * bar;
  return {
    countIn,
    pickup: { start: callStart, length: 0 },
    words: { start: callStart, length: 0 },
    call: { start: callStart, length },
    response: { start: callStart + length, length },
    // The run's end, as a tick (run.ts reads it so): past every earlier call.
    total: callStart + 2 * length,
    barTicks: bar,
    tempo: tempo ?? call.tempo ?? level.tempo,
  };
}

/**
 * The boss's four calls back to back: the first after a count-in, each of
 * the rest straight after the last one's response. One tempo for all four:
 * the boss's (tempo.ts `echoBossTempo`), else the first call's.
 */
export function bossTimelines(
  calls: readonly EchoCall[],
  { tempo, countInBars }: Omit<EchoTimelineOptions, 'start'> = {},
): StepTimeline[] {
  const timelines: StepTimeline[] = [];
  const bpm = tempo ?? calls[0]?.tempo;
  let start = 0;
  calls.forEach((call, i) => {
    const timeline = echoTimeline(call, {
      tempo: bpm,
      countInBars: i === 0 ? countInBars : 0,
      start,
    });
    timelines.push(timeline);
    start = timeline.response.start + timeline.response.length;
  });
  return timelines;
}

/** A melody call's notes on its run: the call, then the response to play. */
export function melodyEchoNotes(
  call: MelodyCall,
  timeline: StepTimeline,
): { call: EchoNote[]; response: EchoNote[] } {
  const at = (start: number) =>
    call.notes.map((note) => ({ ...note, onset: start + note.onset }));
  return {
    call: at(timeline.call.start),
    response: at(timeline.response.start),
  };
}

/** A chord call's strikes on its run, and their notes for the roll. */
export function chordEchoNotes(
  call: ChordCall,
  timeline: StepTimeline,
): {
  call: ChordAttack[];
  response: ChordAttack[];
  callNotes: TimedNote[];
  responseNotes: TimedNote[];
} {
  const at = (start: number) =>
    call.attacks.map((attack) => ({ ...attack, onset: start + attack.onset }));
  const callAttacks = at(timeline.call.start);
  const response = at(timeline.response.start);
  return {
    call: callAttacks,
    response,
    callNotes: chordNotes(callAttacks, call.tonic),
    responseNotes: chordNotes(response, call.tonic),
  };
}

export interface EchoGradeOptions extends EchoTimelineOptions {
  /**
   * The run the student played on; one is laid out when left out. Given,
   * its tempo is the one graded at.
   */
  timeline?: StepTimeline;
  /** The pass mark, in percent: the series' 70 when left out. */
  passMark?: number;
  /** A chord strike's spread in ticks, instead of the tempo's (strikes.ts). */
  strikeSpread?: number;
}

const runOf = (call: EchoCall, options: EchoGradeOptions) =>
  options.timeline ?? echoTimeline(call, options);

/** The student's echo of a melody call, graded (gradeResponse). */
export function gradeMelodyEcho(
  call: MelodyCall,
  played: readonly PlayedNote[],
  options: EchoGradeOptions = {},
): LiteracyResult {
  const timeline = runOf(call, options);
  const notes = melodyEchoNotes(call, timeline);
  return gradeResponse(notes.response, played, {
    timeline,
    tempo: timeline.tempo,
    passMark: options.passMark ?? LITERACY_PASS_MARK,
    call: notes.call,
  });
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

const has = (target: ChordAttack, midi: number) =>
  target.chord.pitchClasses.includes(pitchClass(midi));

/** Music Literacy's chord feedback, word for word (chordGrading.ts). */
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
 * The student's chords against `targets`, graded as Music Literacy grades
 * them (chordGrading.ts `gradeChordResponse`: one strike answers one
 * target, the closest first, within a beat, with a note of its chord; the
 * house timing on its onset; pitch 0.6, timing 0.4; the wrong-note
 * penalty; 70% and timing 50%), on Echo's strikes (CHORDS A 16TH APART
 * above). A strike's held notes count only toward its chord's tones.
 * `played` is everything played during the run; the response window is
 * taken here.
 */
export function gradeChordStrikes(
  targets: readonly ChordAttack[],
  played: readonly PlayedNote[],
  {
    timeline,
    tempo,
    passMark,
    call,
    spread,
  }: {
    timeline: StepTimeline;
    tempo: number;
    passMark: number;
    call?: readonly ChordAttack[];
    /** The strikes' spread in ticks; the tempo's when left out. */
    spread?: number;
  },
): LiteracyChordResult {
  const makesATarget = (midis: readonly number[]) => {
    const classes = new Set(midis.map(pitchClass));
    return targets.some((target) =>
      target.chord.pitchClasses.every((pc) => classes.has(pc)),
    );
  };
  const struck: ChordStrike[] = chordStrikes(
    inChordResponse(played, timeline, targets, call),
    { tempo, spread, complete: makesATarget },
  );

  // One strike answers one target, the closest first, within a beat.
  const candidates: { target: number; strike: number; distance: number }[] = [];
  targets.forEach((target, t) =>
    struck.forEach((strike, s) => {
      const distance = Math.abs(strike.onset - target.onset);
      if (
        distance <= MATCH_WINDOW_TICKS &&
        strike.notes.some((note) => has(target, note.midi))
      ) {
        candidates.push({ target: t, strike: s, distance });
      }
    }),
  );
  candidates.sort((a, b) => a.distance - b.distance || a.target - b.target);
  const answer: (number | null)[] = targets.map(() => null);
  const used = new Set<number>();
  for (const { target, strike } of candidates) {
    if (answer[target] !== null || used.has(strike)) continue;
    answer[target] = strike;
    used.add(strike);
  }

  const pitch: number[] = [];
  const timing: number[] = [];
  const extras: PlayedNote[] = [];
  const attacks: ChordAttackOutcome[] = targets.map((target, t) => {
    const s = answer[t];
    if (s === null) {
      pitch.push(0);
      timing.push(0);
      return { status: 'missed', struck: null, missing: [], extras: [] };
    }
    const strike = struck[s];
    const sounding = [
      ...strike.notes,
      ...strike.held.filter((note) => has(target, note.midi)),
    ];
    const classes = new Set(sounding.map((note) => pitchClass(note.midi)));
    const missing = target.chord.pitchClasses.filter((pc) => !classes.has(pc));
    const outside = strike.notes.filter((note) => !has(target, note.midi));
    extras.push(...outside);
    const timingDevTicks = strike.onset - target.onset;
    if (missing.length) {
      pitch.push(0);
      timing.push(0);
      return {
        status: 'wrong',
        struck: strike,
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
      [{ midi: target.chord.root, onset: strike.onset, duration: 0 }],
      tempo,
      'pitch_order_timing',
    );
    pitch.push(1);
    timing.push(scored.timingAccuracy ?? 0);
    return {
      status: 'hit',
      struck: strike,
      missing: [],
      extras: outside,
      timingDevTicks,
    };
  });
  const extraAttacks = struck.filter((_, s) => !used.has(s));
  for (const strike of extraAttacks) extras.push(...strike.notes);

  const pitchAccuracy = mean(pitch);
  const timingAccuracy = mean(timing);
  // Each note outside its chord, and each strike in no target's place, is
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
    .map((target) => target.chord.root);

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
 * The student's echo of a chord call, graded on Echo's strikes at the
 * run's tempo (gradeChordStrikes).
 */
export function gradeChordEcho(
  call: ChordCall,
  played: readonly PlayedNote[],
  options: EchoGradeOptions = {},
): LiteracyChordResult {
  const timeline = runOf(call, options);
  const strikes = chordEchoNotes(call, timeline);
  return gradeChordStrikes(strikes.response, played, {
    timeline,
    tempo: timeline.tempo,
    passMark: options.passMark ?? LITERACY_PASS_MARK,
    call: strikes.call,
    spread: options.strikeSpread,
  });
}

/** Either kind of echo, graded: what the boss's mixed calls need. */
export function gradeEcho(
  call: EchoCall,
  played: readonly PlayedNote[],
  options: EchoGradeOptions = {},
): LiteracyResult | LiteracyChordResult {
  return call.kind === 'melody'
    ? gradeMelodyEcho(call, played, options)
    : gradeChordEcho(call, played, options);
}
