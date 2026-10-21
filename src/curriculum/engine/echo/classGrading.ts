/**
 * Grading in class: quantized (docs/echo-classroom.md, Grading in Class).
 * Every note is right or wrong. A played note answers a note of the call
 * when its pitch is right (a chord: every note of it, in any octave) and it
 * lands within half the call's subdivision of it: it would round to that
 * note's place on the grid.
 *
 * THE SUBDIVISION
 * The smallest step the call's rhythm needs: a quarter, an eighth or a 16th
 * (`callSubdivision`). A call of quarters is on time within an eighth, one
 * of eighths within a 16th, one with 16ths within a 32nd.
 *
 * THE SCORE
 * The notes answered, less one for each played note (or chord strike) that
 * answers none, over the notes asked; a good echo scores 70% or more, the
 * series' mark (`LITERACY_PASS_MARK`). Mashing every pad doesn't pass.
 *
 * Played notes are heard from half a subdivision before the answer's first
 * bar to half a subdivision after its last. Chords are heard as strikes, as
 * a chord echo hears them (strikes.ts), at the run's tempo. A note answers
 * one target at most, the nearest of its pitch first.
 *
 * Pure, no React.
 */

import { LITERACY_PASS_MARK, type PlayedNote } from '../musicLiteracy/grading';
import type { StepTimeline } from '../musicLiteracy/literacy';
import type { ChordCall, EchoCall, MelodyCall } from './calls';
import { echoTimeline } from './grading';
import { BEAT_TICKS, EIGHTH_TICKS, SIXTEENTH_TICKS } from './levels';
import { chordStrikes } from './strikes';

/** The smallest step a rhythm's onsets need: a quarter, an eighth or a 16th. */
export function callSubdivision(onsets: readonly number[]): number {
  if (onsets.every((o) => o % BEAT_TICKS === 0)) return BEAT_TICKS;
  if (onsets.every((o) => o % EIGHTH_TICKS === 0)) return EIGHTH_TICKS;
  return SIXTEENTH_TICKS;
}

/** A call's subdivision, from its notes or its chord strikes. */
export const subdivisionOf = (call: EchoCall): number =>
  callSubdivision(
    call.kind === 'melody'
      ? call.notes.map((n) => n.onset)
      : call.attacks.map((a) => a.onset),
  );

export interface QuantizedEcho {
  passed: boolean;
  /** 0–100. */
  percent: number;
  /** Notes (or strikes) of the call answered. */
  hits: number;
  /** Notes (or strikes) the call asked for. */
  asked: number;
  /** Played notes (or strikes) that answered none. */
  extras: number;
  /** Ticks either side of a note that are on time: half the subdivision. */
  window: number;
  /** Each target: answered, or not. */
  answered: boolean[];
  /** Whether anything was played in the answer at all. */
  playedAny: boolean;
}

export interface QuantizedOptions {
  /** The run the student played on; one is laid out when left out. */
  timeline?: StepTimeline;
}

const pc = (midi: number) => ((midi % 12) + 12) % 12;

/** Greedy pairing, closest pairs first: which played item answers each target. */
function pair(
  targets: number,
  candidates: { target: number; item: number; distance: number }[],
): Map<number, number> {
  const answers = new Map<number, number>();
  const used = new Set<number>();
  for (const c of [...candidates].sort((a, b) => a.distance - b.distance)) {
    if (answers.has(c.target) || used.has(c.item)) continue;
    answers.set(c.target, c.item);
    used.add(c.item);
    if (answers.size === targets) break;
  }
  return answers;
}

function result(
  asked: number,
  answers: Map<number, number>,
  heard: number,
  window: number,
): QuantizedEcho {
  const hits = answers.size;
  const extras = heard - hits;
  const percent = asked
    ? Math.round((100 * Math.max(0, hits - extras)) / asked)
    : 0;
  return {
    passed: percent >= LITERACY_PASS_MARK,
    percent,
    hits,
    asked,
    extras,
    window,
    answered: Array.from({ length: asked }, (_, i) => answers.has(i)),
    playedAny: heard > 0,
  };
}

/** The answer's ticks, widened by the window either side. */
function heardSpan(timeline: StepTimeline, window: number) {
  return {
    from: timeline.response.start - window,
    to: timeline.response.start + timeline.response.length + window,
  };
}

function gradeMelody(
  call: MelodyCall,
  played: readonly PlayedNote[],
  timeline: StepTimeline,
): QuantizedEcho {
  const window = subdivisionOf(call) / 2;
  const { from, to } = heardSpan(timeline, window);
  const heard = played.filter((n) => n.onset >= from && n.onset < to);
  const targets = call.notes.map((n) => ({
    midi: n.midi,
    onset: timeline.response.start + n.onset,
  }));
  const candidates = targets.flatMap((t, target) =>
    heard.flatMap((n, item) => {
      const distance = Math.abs(n.onset - t.onset);
      return n.midi === t.midi && distance < window
        ? [{ target, item, distance }]
        : [];
    }),
  );
  return result(
    targets.length,
    pair(targets.length, candidates),
    heard.length,
    window,
  );
}

function gradeChords(
  call: ChordCall,
  played: readonly PlayedNote[],
  timeline: StepTimeline,
): QuantizedEcho {
  const window = subdivisionOf(call) / 2;
  const { from, to } = heardSpan(timeline, window);
  const strikes = chordStrikes(played, { tempo: timeline.tempo }).filter(
    (s) => s.onset >= from && s.onset < to,
  );
  const targets = call.attacks.map((a) => ({
    classes: a.chord.pitchClasses,
    onset: timeline.response.start + a.onset,
  }));
  const candidates = targets.flatMap((t, target) =>
    strikes.flatMap((s, item) => {
      const distance = Math.abs(s.onset - t.onset);
      const classes = new Set([...s.notes, ...s.held].map((n) => pc(n.midi)));
      return distance < window && t.classes.every((c) => classes.has(c))
        ? [{ target, item, distance }]
        : [];
    }),
  );
  return result(
    targets.length,
    pair(targets.length, candidates),
    strikes.length,
    window,
  );
}

/** An echo of a call, graded the class's way (above). */
export function gradeQuantizedEcho(
  call: EchoCall,
  played: readonly PlayedNote[],
  { timeline = echoTimeline(call) }: QuantizedOptions = {},
): QuantizedEcho {
  return call.kind === 'melody'
    ? gradeMelody(call, played, timeline)
    : gradeChords(call, played, timeline);
}
