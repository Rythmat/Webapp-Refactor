/**
 * playheadClock.ts — Deciding where the playhead sits on each frame.
 *
 * An in-time lesson has two clocks. The transport is the truth: the backing
 * track, the metronome and the practice guide are all scheduled on it. The
 * animation frame is only a camera pointed at it. This module is the rule for
 * reconciling them, kept out of the component so it can be tested directly —
 * a playhead that stalls or jumps is the kind of bug you cannot see in a unit
 * test unless the decision is a function.
 *
 * WHY A CLOCK READ CAN BE NULL
 * The transport is read through the student's ears: the position asked for is
 * the audio clock now, less the output latency, so the playhead shows the music
 * they are actually hearing rather than what has been queued. In the first
 * moments of a run that lands BEFORE the transport started, and there is no
 * honest tick for it. The reader returns null, and the playhead waits at the
 * start — silence has not reached the speakers yet, so the playhead has not
 * moved yet either. That is correct, and it is why null must never be confused
 * with "the transport is at tick 0", which is a real position a bar of count-in
 * later.
 *
 * WHY THERE IS A GRACE PERIOD
 * If the transport never starts — a dropped context, a failed sample load — the
 * lesson must not freeze. After GRACE_SECONDS of no usable reading the playhead
 * runs on its own clock so the student can still play, and says so in dev.
 */

/** A clock that never moves this far is not running. */
const ALIVE_TICKS = 30;

/** How long to wait for the transport before running free. */
const GRACE_SECONDS = 1;

export interface PlayheadClockState {
  /** First genuine reading, to measure movement against. */
  firstTicks: number | null;
  /** The transport has demonstrably moved; follow it from here on. */
  alive: boolean;
  /** Time spent without a live transport, for the grace period. */
  waited: number;
}

export const initialClockState = (): PlayheadClockState => ({
  firstTicks: null,
  alive: false,
  waited: 0,
});

export interface PlayheadFrame {
  /** Playhead position on the previous frame, in roll ticks. */
  prev: number;
  /** Seconds since the previous frame. */
  deltaSeconds: number;
  /**
   * Transport position in 480-PPQ ticks; null when the transport has not
   * reached the moment being asked about, undefined when this roll has no
   * transport to follow and should free-run.
   */
  clockTicks: number | null | undefined;
  /** Ticks between the transport's zero and the roll's zero. */
  countInTicks: number;
  /** Free-running speed, for when there is no transport to follow. */
  ticksPerSecond: number;
}

export interface PlayheadDecision {
  tick: number;
  state: PlayheadClockState;
  /** True when the transport was given up on and the playhead is free-running. */
  freeRunning: boolean;
  /** True on the frame the grace period expires — for a one-time dev warning. */
  justGaveUp: boolean;
}

/** Where the playhead goes this frame. */
export function advancePlayhead(
  state: PlayheadClockState,
  frame: PlayheadFrame,
): PlayheadDecision {
  const { prev, deltaSeconds, clockTicks, countInTicks, ticksPerSecond } =
    frame;
  const freeRun = prev + deltaSeconds * ticksPerSecond;

  // No transport at all — this roll owns its own clock.
  if (clockTicks === undefined) {
    return { tick: freeRun, state, freeRunning: true, justGaveUp: false };
  }

  let next = { ...state };

  // Only a genuine reading counts toward proving the transport is running.
  if (clockTicks !== null && !next.alive) {
    if (next.firstTicks === null) next.firstTicks = clockTicks;
    else if (clockTicks - next.firstTicks > ALIVE_TICKS) next.alive = true;
  }

  if (next.alive) {
    // Following the transport. A null here means it has stopped: the run is
    // over, so hold rather than drift past the end.
    return {
      tick: clockTicks !== null ? clockTicks - countInTicks : prev,
      state: next,
      freeRunning: false,
      justGaveUp: false,
    };
  }

  const wasWithinGrace = next.waited <= GRACE_SECONDS;
  next = { ...next, waited: next.waited + deltaSeconds };

  if (next.waited > GRACE_SECONDS) {
    return {
      tick: freeRun,
      state: next,
      freeRunning: true,
      justGaveUp: wasWithinGrace,
    };
  }

  // Still waiting for the first sound to reach the speakers — hold at the start.
  return { tick: prev, state: next, freeRunning: false, justGaveUp: false };
}
