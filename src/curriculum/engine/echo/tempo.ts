/**
 * Echo's tempo (docs/echo-game.md, Tempo): each level starts at its base,
 * and the tempo climbs as the student does well.
 *
 *                  Level 1   Level 2   Level 3
 *   base           80        90        100
 *   highest        96        106       116
 *
 * THE RAMP (`nextEchoTempo`)
 * Two good echoes in a row put the tempo up 4 BPM; a miss takes it down 4.
 * It never goes below the level's base, nor more than 16 above it. It
 * changes only between calls, never during one: a call plays, and is
 * graded, at the tempo it started at.
 *
 * THE BOSS (`echoBossTempo`)
 * The Final Boss plays at the highest tempo the student reached in the
 * game, all four calls (they run back to back on one timeline). Its echoes
 * don't move the ramp, so a retry plays at the same tempo.
 *
 * Every tick in the engine is a 480th of a quarter note, whatever the
 * tempo; the tempo turns ticks into time (`msToTicks`). Pure, no React.
 */

import { BEAT_TICKS, echoLevel, type EchoLevelNumber } from './levels';

/** BPM a step of the ramp moves the tempo. */
export const ECHO_TEMPO_STEP = 4;

/** The most the tempo climbs above the level's base. */
export const ECHO_TEMPO_RISE = 16;

/** Good echoes in a row for one step up. */
export const ECHO_TEMPO_PASSES = 2;

/** A game's tempo, between calls. */
export interface EchoTempo {
  /** BPM now: what the next call plays at. */
  bpm: number;
  /** Good echoes in a row toward the next step up: 0 or 1. */
  passes: number;
  /** The highest BPM the game has reached: the boss's. */
  top: number;
}

/** A level's tempos: its base, and the most it climbs to. */
export function echoTempoRange(level: EchoLevelNumber): {
  low: number;
  high: number;
} {
  const low = echoLevel(level).tempo;
  return { low, high: low + ECHO_TEMPO_RISE };
}

/** A tempo kept in the level's range. */
export function clampEchoTempo(bpm: number, level: EchoLevelNumber): number {
  const { low, high } = echoTempoRange(level);
  return Math.max(low, Math.min(high, bpm));
}

/** A game's tempo before its first call: the level's base. */
export function newEchoTempo(level: EchoLevelNumber): EchoTempo {
  const { low } = echoTempoRange(level);
  return { bpm: low, passes: 0, top: low };
}

/**
 * The tempo after an echo (THE RAMP above): up a step every two good ones
 * in a row, down a step after a miss, inside the level's range.
 */
export function nextEchoTempo(
  current: EchoTempo,
  level: EchoLevelNumber,
  { passed }: { passed: boolean },
): EchoTempo {
  const bpm = clampEchoTempo(current.bpm, level);
  if (!passed) {
    return {
      bpm: clampEchoTempo(bpm - ECHO_TEMPO_STEP, level),
      passes: 0,
      top: Math.max(current.top, bpm),
    };
  }
  const passes = current.passes + 1;
  if (passes < ECHO_TEMPO_PASSES) {
    return { bpm, passes, top: Math.max(current.top, bpm) };
  }
  const up = clampEchoTempo(bpm + ECHO_TEMPO_STEP, level);
  return { bpm: up, passes: 0, top: Math.max(current.top, up) };
}

/** The Final Boss's tempo: the highest the game reached (THE BOSS above). */
export const echoBossTempo = (
  tempo: Pick<EchoTempo, 'top'>,
  level: EchoLevelNumber,
): number => clampEchoTempo(tempo.top, level);

/** How many ticks a stretch of milliseconds is, at a tempo. */
export const msToTicks = (ms: number, bpm: number): number =>
  (ms * bpm * BEAT_TICKS) / 60000;

/** How many milliseconds a stretch of ticks is, at a tempo. */
export const ticksToMs = (ticks: number, bpm: number): number =>
  (ticks * 60000) / (bpm * BEAT_TICKS);
