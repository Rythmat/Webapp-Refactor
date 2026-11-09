// ── Play it: checking a played harmonic ────────────────────────────────────
// A pure reducer over pitch readings from the microphone. First the open
// string is plucked, and its measured pitch becomes f0 (so a guitar a little
// off standard still passes). Then each target harmonic in turn (partials
// 2–6, at their first node: 12th, 7th, 5th, ~4th, ~3rd fret) must be heard
// within ±25 cents of n × f0 for 300 ms. Other things it can tell apart, and
// say so: the note pressed at that fret, another partial, the open string.
// After any verdict it waits for the string to fall silent.

import { harmonicNodes, midiToHz } from '@/lib/guitar/harmonics';

export const HOLD_MS = 300;
export const MATCH_CENTS = 25;
export const TUNE_CENTS = 50;
export const PLAY_TARGETS = [2, 3, 4, 5, 6] as const;

export type CheckPhase = 'tune' | 'play' | 'done';

export type Feedback =
  | { kind: 'tuned'; cents: number }
  | { kind: 'outOfTune'; cents: number }
  | { kind: 'match'; partial: number }
  | { kind: 'pressed'; partial: number; fret: number }
  | { kind: 'otherPartial'; partial: number; heard: number }
  | { kind: 'open'; partial: number };

export interface CheckState {
  phase: CheckPhase;
  openMidi: number;
  /** The open string as measured (standard until tuned). */
  f0: number;
  /** Index into PLAY_TARGETS. */
  target: number;
  passed: readonly number[];
  /** A verdict being held, and the readings since it began. */
  candidate: { key: string; since: number; hzs: number[] } | null;
  /** What was last decided, to show. */
  feedback: Feedback | null;
  /** A verdict was given: wait for silence before the next. */
  waitForSilence: boolean;
}

export type CheckEvent =
  | { type: 'reading'; hz: number; t: number }
  | { type: 'silence' }
  | { type: 'skipTuning' }
  | { type: 'skip' }
  | { type: 'restart'; openMidi: number };

export function initialCheck(openMidi: number): CheckState {
  return {
    phase: 'tune',
    openMidi,
    f0: midiToHz(openMidi),
    target: 0,
    passed: [],
    candidate: null,
    feedback: null,
    waitForSilence: false,
  };
}

export const centsBetween = (hz: number, ref: number) =>
  1200 * Math.log2(hz / ref);

/** The target partial now, or null when done. */
export function targetPartial(state: CheckState): number | null {
  return state.phase === 'play' ? (PLAY_TARGETS[state.target] ?? null) : null;
}

/** What a reading is, as a key ('match', 'pressed:7', 'partial:4', …). */
export function classify(state: CheckState, hz: number): string | null {
  if (state.phase === 'tune') {
    return Math.abs(centsBetween(hz, midiToHz(state.openMidi))) <= TUNE_CENTS
      ? 'tuned'
      : 'outOfTune';
  }
  const n = targetPartial(state);
  if (n == null) return null;
  const { f0 } = state;
  const expected = n * f0;
  if (Math.abs(centsBetween(hz, expected)) <= MATCH_CENTS) return 'match';
  // Pressed instead of touched: the fretted note round the node. (At the
  // 12th fret pressing sounds the same octave, so that one can't tell.)
  const nodeFret = harmonicNodes(n)[0].fret;
  const frets = [
    ...new Set([
      Math.floor(nodeFret),
      Math.ceil(nodeFret),
      Math.round(nodeFret),
    ]),
  ].filter((f) => f > 0);
  for (const fret of frets) {
    const pressedHz = f0 * 2 ** (fret / 12);
    if (Math.abs(centsBetween(pressedHz, expected)) <= MATCH_CENTS) continue;
    if (Math.abs(centsBetween(hz, pressedHz)) <= 35) return `pressed:${fret}`;
  }
  if (Math.abs(centsBetween(hz, f0)) <= 35) return 'open';
  for (let m = 2; m <= 12; m++) {
    if (m === n) continue;
    if (Math.abs(centsBetween(hz, m * f0)) <= MATCH_CENTS)
      return `partial:${m}`;
  }
  return null;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The decision a held key makes. */
function commit(state: CheckState, key: string, hzs: number[]): CheckState {
  const settled = { ...state, candidate: null, waitForSilence: true };
  if (key === 'tuned') {
    const f0 = median(hzs);
    return {
      ...settled,
      phase: 'play',
      f0,
      feedback: {
        kind: 'tuned',
        cents: centsBetween(f0, midiToHz(state.openMidi)),
      },
    };
  }
  if (key === 'outOfTune') {
    return {
      ...settled,
      feedback: {
        kind: 'outOfTune',
        cents: centsBetween(median(hzs), midiToHz(state.openMidi)),
      },
    };
  }
  const partial = targetPartial(state)!;
  if (key === 'match') {
    const target = state.target + 1;
    return {
      ...settled,
      target,
      passed: [...state.passed, partial],
      phase: target >= PLAY_TARGETS.length ? 'done' : 'play',
      feedback: { kind: 'match', partial },
    };
  }
  if (key === 'open')
    return { ...settled, feedback: { kind: 'open', partial } };
  const [kind, value] = key.split(':');
  if (kind === 'pressed') {
    return {
      ...settled,
      feedback: { kind: 'pressed', partial, fret: Number(value) },
    };
  }
  return {
    ...settled,
    feedback: { kind: 'otherPartial', partial, heard: Number(value) },
  };
}

export function checkReducer(state: CheckState, event: CheckEvent): CheckState {
  switch (event.type) {
    case 'restart':
      return initialCheck(event.openMidi);
    case 'skipTuning':
      return state.phase === 'tune'
        ? { ...state, phase: 'play', candidate: null, feedback: null }
        : state;
    case 'skip': {
      if (state.phase !== 'play') return state;
      const target = state.target + 1;
      return {
        ...state,
        target,
        phase: target >= PLAY_TARGETS.length ? 'done' : 'play',
        candidate: null,
        feedback: null,
      };
    }
    case 'silence':
      return state.candidate || state.waitForSilence
        ? { ...state, candidate: null, waitForSilence: false }
        : state;
    case 'reading': {
      if (state.phase === 'done' || state.waitForSilence) return state;
      const key = classify(state, event.hz);
      if (key == null) {
        return state.candidate ? { ...state, candidate: null } : state;
      }
      const held =
        state.candidate?.key === key
          ? {
              ...state.candidate,
              hzs: [...state.candidate.hzs, event.hz].slice(-30),
            }
          : { key, since: event.t, hzs: [event.hz] };
      if (event.t - held.since >= HOLD_MS) return commit(state, key, held.hzs);
      return { ...state, candidate: held };
    }
  }
}
