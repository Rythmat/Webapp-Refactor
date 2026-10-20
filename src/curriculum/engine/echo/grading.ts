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
 * follow it; the timing score is in time, and reads the run's tempo.
 *
 * Played notes are in ticks from the run's first count-in click (or from
 * wherever the timeline starts: `start`, for the boss's calls played back
 * to back). Pure, no React.
 */

import {
  gradeChordResponse,
  type LiteracyChordResult,
} from '../musicLiteracy/chordGrading';
import {
  LITERACY_PASS_MARK,
  gradeResponse,
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

/** The student's echo of a chord call, graded (gradeChordResponse). */
export function gradeChordEcho(
  call: ChordCall,
  played: readonly PlayedNote[],
  options: EchoGradeOptions = {},
): LiteracyChordResult {
  const timeline = runOf(call, options);
  const strikes = chordEchoNotes(call, timeline);
  return gradeChordResponse(strikes.response, played, {
    timeline,
    tempo: timeline.tempo,
    passMark: options.passMark ?? LITERACY_PASS_MARK,
    call: strikes.call,
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
