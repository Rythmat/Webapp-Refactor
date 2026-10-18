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
//
// Part 1's challenge ("play ALL the notes") says PLAY ALONG where LISTEN
// was, then GET READY and GO! as ever. Part 2's create pass (the student's
// own call, then their repeat of it) has cues of its own:
//
//   Get Ready  the count-in
//   Your Call  their own call's bars
//   Go!        its last beat and the repeat's first, as above
//   Repeat It  the rest of the repeat
//
// A replay (the student's chords played back) counts in with LISTEN, then
// says which harmony is playing: TRIADS, then WITH 7THS.

import type { LiteracyHarmony } from '@/content/musicLiteracy/schemas';
import type {
  Span,
  StepTimeline,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { RunMode } from '@/curriculum/engine/musicLiteracy/run';

export type TurnCue =
  | 'listen'
  | 'getReady'
  | 'go'
  | 'playAlong'
  | 'yourCall'
  | 'repeatIt';

/** The words a child reads. */
export const TURN_CUE_TEXT: Readonly<Record<TurnCue, string>> = {
  listen: 'Listen',
  getReady: 'Get Ready',
  go: 'Go!',
  playAlong: 'Play Along',
  yourCall: 'Your Call',
  repeatIt: 'Repeat It',
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
): Record<'listen' | 'getReady' | 'go', Span> {
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

const cueHeadline = (cue: TurnCue): HubHeadline => ({
  kind: 'cue',
  cue,
  text: TURN_CUE_TEXT[cue],
});

/**
 * The hub's headline at `tick` (the last cue drawn; -1 before the first):
 * a cue, else whose turn it is, else, out of a run or before its first
 * click, `idle` ("The call"). In the challenge the teacher's turn says PLAY
 * ALONG instead of LISTEN.
 */
export function hubHeadline(
  timeline: StepTimeline,
  tick: number,
  beatsPerBar: number,
  run: RunMode | null,
  {
    challenge = false,
    idle = 'The call',
  }: { challenge?: boolean; idle?: string } = {},
): HubHeadline {
  if (run === null || tick < 0) return { kind: 'idle', text: idle };
  const cue = turnCueAt(timeline, tick, beatsPerBar);
  if (cue) {
    return cueHeadline(challenge && cue === 'listen' ? 'playAlong' : cue);
  }
  // Past Go!: the answer's bars, and a groove's final downbeat after them.
  return { kind: 'turn', text: run === 'listen' ? 'Like this' : 'Your turn' };
}

/**
 * The create pass's cue at `tick` (its timeline's `call` is the student's
 * call, `response` their repeat): Get Ready over the count-in, Your Call
 * over the call, Go! on its last beat and the repeat's first, then Repeat
 * It to the end (a groove's final downbeat too). Null before the run.
 */
export function createCueAt(
  timeline: StepTimeline,
  tick: number,
  beatsPerBar: number,
): TurnCue | null {
  if (tick < 0) return null;
  const { go } = turnCueSpans(timeline, beatsPerBar);
  if (tick < timeline.call.start) return 'getReady';
  if (tick < go.start) return 'yourCall';
  if (tick < go.start + go.length) return 'go';
  return 'repeatIt';
}

/** The hub's headline in a create run: its cue, or out of one, `idle`. */
export function createHubHeadline(
  timeline: StepTimeline,
  tick: number,
  beatsPerBar: number,
  running: boolean,
  idle = 'Your rhythm',
): HubHeadline {
  const cue = running ? createCueAt(timeline, tick, beatsPerBar) : null;
  return cue ? cueHeadline(cue) : { kind: 'idle', text: idle };
}

/** What each of a replay's passes is called in the hub. */
export const HARMONY_HEADLINE: Readonly<Record<LiteracyHarmony, string>> = {
  triads: 'Triads',
  sevenths: 'With 7ths',
};

/**
 * A replay's headline: LISTEN through the count-in, then the harmony of the
 * pass playing (`harmonies` in order, each as long as the others).
 */
export function replayHubHeadline(
  timeline: StepTimeline,
  tick: number,
  harmonies: readonly LiteracyHarmony[],
  running: boolean,
): HubHeadline {
  if (!running || tick < 0) return { kind: 'idle', text: 'Your chords' };
  if (tick < timeline.call.start) return cueHeadline('listen');
  const once = timeline.call.length / Math.max(1, harmonies.length);
  const pass = Math.max(
    0,
    Math.min(
      harmonies.length - 1,
      Math.floor((tick - timeline.call.start) / Math.max(1, once)),
    ),
  );
  return { kind: 'turn', text: HARMONY_HEADLINE[harmonies[pass]] };
}
