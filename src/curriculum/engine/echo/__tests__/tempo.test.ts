import { describe, expect, it } from 'vitest';
import { bossCalls, chordCall, melodyCall } from '../calls';
import { bossTimelines, echoTimeline } from '../grading';
import { ECHO_LEVELS, ECHO_TEMPO, echoLevel } from '../levels';
import { echoRandom } from '../random';
import {
  ECHO_TEMPO_PASSES,
  ECHO_TEMPO_RISE,
  ECHO_TEMPO_STEP,
  clampEchoTempo,
  echoBossTempo,
  echoTempoRange,
  msToTicks,
  newEchoTempo,
  nextEchoTempo,
  ticksToMs,
  type EchoTempo,
} from '../tempo';

/**
 * The tempo: each level's base (80, 90, 100), up 4 after every two good
 * echoes in a row, down 4 after a miss, never below the base nor more than
 * 16 above it; the boss at the highest the game reached.
 */

const KEY = { tonic: 'D', mode: 'major' } as const;

/** The tempo after a run of echoes, `true` a good one. */
const after = (level: 1 | 2 | 3, echoes: boolean[]): EchoTempo =>
  echoes.reduce(
    (tempo, passed) => nextEchoTempo(tempo, level, { passed }),
    newEchoTempo(level),
  );

describe('the levels’ tempos', () => {
  it('starts each level at its base: 80, 90, 100', () => {
    expect([1, 2, 3].map((l) => echoLevel(l as 1 | 2 | 3).tempo)).toEqual([
      80, 90, 100,
    ]);
    expect(ECHO_TEMPO).toBe(ECHO_LEVELS[1].tempo);
    expect([ECHO_TEMPO_STEP, ECHO_TEMPO_RISE, ECHO_TEMPO_PASSES]).toEqual([
      4, 16, 2,
    ]);
    expect(echoTempoRange(3)).toEqual({ low: 100, high: 116 });
    expect(newEchoTempo(2)).toEqual({ bpm: 90, passes: 0, top: 90 });
  });
});

describe('the ramp', () => {
  it('goes up 4 after every two good echoes in a row', () => {
    expect(after(1, [true]).bpm).toBe(80);
    expect(after(1, [true, true]).bpm).toBe(84);
    expect(after(1, [true, true, true]).bpm).toBe(84);
    expect(after(1, [true, true, true, true]).bpm).toBe(88);
    // Not in a row: a miss between starts the count again.
    expect(after(1, [true, true, true, false, true]).bpm).toBe(80);
    expect(after(1, [true, true, true, false, true, true]).bpm).toBe(84);
  });

  it('goes down 4 after a miss', () => {
    const fast = after(2, [true, true, true, true]);
    expect(fast.bpm).toBe(98);
    const missed = nextEchoTempo(fast, 2, { passed: false });
    expect(missed).toEqual({ bpm: 94, passes: 0, top: 98 });
    expect(nextEchoTempo(missed, 2, { passed: false }).bpm).toBe(90);
  });

  it('never goes below the base, nor more than 16 above it', () => {
    expect(after(1, [false, false]).bpm).toBe(80);
    expect(after(3, Array(20).fill(true)).bpm).toBe(116);
    expect(after(3, [...Array(20).fill(true), false]).bpm).toBe(112);
    expect(clampEchoTempo(200, 1)).toBe(96);
    expect(clampEchoTempo(40, 2)).toBe(90);
    // A tempo from outside the range comes back into it.
    expect(
      nextEchoTempo({ bpm: 150, passes: 0, top: 150 }, 1, { passed: true }).bpm,
    ).toBe(96);
  });
});

describe('the boss’s tempo', () => {
  it('is the highest the game reached', () => {
    const tempo = after(1, [true, true, true, true, false, false, true]);
    expect(tempo.bpm).toBe(80);
    expect(tempo.top).toBe(88);
    expect(echoBossTempo(tempo, 1)).toBe(88);
    expect(echoBossTempo(newEchoTempo(3), 3)).toBe(100);
    expect(echoBossTempo(after(2, Array(30).fill(true)), 2)).toBe(106);
  });

  it('plays all four of the boss’s calls at it, back to back', () => {
    const calls = bossCalls(2, KEY, echoRandom('boss-tempo'), { tempo: 102 });
    expect(calls.map((call) => call.tempo)).toEqual([102, 102, 102, 102]);
    expect(bossTimelines(calls).map((t) => t.tempo)).toEqual([
      102, 102, 102, 102,
    ]);
    expect(bossTimelines(calls, { tempo: 110 }).map((t) => t.tempo)).toEqual([
      110, 110, 110, 110,
    ]);
  });
});

describe('a call’s tempo', () => {
  it('is the one asked for, else its level’s base; its run is laid out at it', () => {
    const rng = echoRandom('call-tempo');
    expect(melodyCall(2, KEY, rng).tempo).toBe(90);
    expect(chordCall(3, KEY, rng).tempo).toBe(100);
    const call = melodyCall(1, KEY, rng, { tempo: 92 });
    expect(call.tempo).toBe(92);
    expect(echoTimeline(call).tempo).toBe(92);
    // Asked for on the run, that wins.
    expect(echoTimeline(call, { tempo: 84 }).tempo).toBe(84);
    // The ticks are the same at any tempo.
    expect(echoTimeline(call).response).toEqual(
      echoTimeline(melodyCall(1, KEY, rng)).response,
    );
  });

  it('turns ticks into time: a 16th is 188 ms at 80, 129 at 116', () => {
    expect(ticksToMs(120, 80)).toBeCloseTo(187.5);
    expect(ticksToMs(120, 116)).toBeCloseTo(129.3, 1);
    expect(msToTicks(ticksToMs(333, 97), 97)).toBeCloseTo(333);
  });
});
