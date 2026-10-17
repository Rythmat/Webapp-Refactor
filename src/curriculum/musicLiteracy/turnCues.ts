// ── The turn cues: Listen, Get Ready, Go! ──────────────────────────────────
// What the hub says, big, as a run goes by, so a child always knows what's
// asked of them (the owner, a music teacher, watching his son):
//
//   Listen     from the first count-in click through the words: a pickup
//              sung over the count-in's end too
//   Get Ready  from the call's first beat: the call is the figure to copy,
//              its degrees lighting in the hub as it sounds
//   Go!        on the call's last beat, one beat before the student's turn,
//              held into the turn's first beat
//
// Then the hub says whose turn it is: YOUR TURN in Practice and Play, LIKE
// THIS in Listen, where Atlas plays the answer. The same in every mode, and
// a groove changes none of it: everything here is read off the step's
// timeline (literacy.ts stepTimeline), on its beats, so a cue changes on the
// beat cue that is drawn when it's heard, as the pulse dots do.

import type {
  Span,
  StepTimeline,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { RunMode } from '@/curriculum/engine/musicLiteracy/run';

export type TurnCue = 'listen' | 'getReady' | 'go';

/** The words a child reads. */
export const TURN_CUE_TEXT: Readonly<Record<TurnCue, string>> = {
  listen: 'Listen',
  getReady: 'Get Ready',
  go: 'Go!',
};

/** A beat, as the run counts it: the bar over the meter's top number. */
const beatTicksOf = (timeline: StepTimeline, beatsPerBar: number) =>
  timeline.barTicks / Math.max(1, beatsPerBar);

/**
 * When each cue shows, in ticks from the first count-in click. Go! takes
 * the call's last beat and the response's first (a call shorter than a
 * beat gives it all); Get Ready has the rest of the call.
 */
export function turnCueSpans(
  timeline: StepTimeline,
  beatsPerBar: number,
): Record<TurnCue, Span> {
  const beat = beatTicksOf(timeline, beatsPerBar);
  const turn = timeline.response.start;
  const go = Math.max(timeline.call.start, turn - beat);
  const goEnd = Math.min(timeline.total, turn + beat);
  return {
    listen: { start: 0, length: timeline.call.start },
    getReady: { start: timeline.call.start, length: go - timeline.call.start },
    go: { start: go, length: goEnd - go },
  };
}

/** The cue at `tick` on the timeline, or null (before the run, and past Go!). */
export function turnCueAt(
  timeline: StepTimeline,
  tick: number,
  beatsPerBar: number,
): TurnCue | null {
  if (tick < 0 || tick >= timeline.total) return null;
  const spans = turnCueSpans(timeline, beatsPerBar);
  for (const cue of ['listen', 'getReady', 'go'] as const) {
    const { start, length } = spans[cue];
    if (tick >= start && tick < start + length) return cue;
  }
  return null;
}

/** What the hub's headline says. */
export type HubHeadline =
  | { kind: 'idle'; text: string }
  | { kind: 'cue'; cue: TurnCue; text: string }
  | { kind: 'turn'; text: string };

/**
 * The hub's headline at `tick` (the last cue drawn; -1 before the first):
 * a cue, else whose turn it is, else, out of a run or before its first
 * click, what its degrees are.
 */
export function hubHeadline(
  timeline: StepTimeline,
  tick: number,
  beatsPerBar: number,
  run: RunMode | null,
): HubHeadline {
  if (run === null || tick < 0) return { kind: 'idle', text: 'The call' };
  const cue = turnCueAt(timeline, tick, beatsPerBar);
  if (cue) return { kind: 'cue', cue, text: TURN_CUE_TEXT[cue] };
  // Past Go!: the answer's bars, and a groove's final downbeat after them.
  return { kind: 'turn', text: run === 'listen' ? 'Like this' : 'Your turn' };
}
