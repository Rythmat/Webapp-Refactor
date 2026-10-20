import { echoLevel, type EchoLevelNumber } from '@/curriculum/engine/echo';

// ── The tempo climbs as the student does well ──────────────────────────────
// The owner's rule: a game starts at its level's tempo, rises 4 BPM after
// every 2 good echoes in a row and falls 4 after a miss, never below the
// level's tempo nor more than 16 above it. It changes only between calls,
// never during one. The Final Boss plays at the highest tempo the game
// reached.
//
// LOCAL STAND-IN: the engine is adding this rule (nextEchoTempo and its
// constants, in engine/echo). Until it lands, the play screens keep their
// own copy here; swap these for the engine's when it does.

/** BPM a step moves the tempo. */
export const ECHO_TEMPO_STEP = 4;
/** The most the tempo climbs above the level's. */
export const ECHO_TEMPO_RISE = 16;
/** Good echoes in a row for one step up. */
export const ECHO_TEMPO_PASSES = 2;

export interface EchoTempo {
  /** BPM now: what the next call plays at. */
  bpm: number;
  /** Good echoes in a row toward the next step up. */
  passes: number;
  /** The highest BPM the game has reached (the boss plays at it). */
  top: number;
}

/** A level's tempo, and the most it climbs to. */
export function tempoRange(level: EchoLevelNumber): {
  low: number;
  high: number;
} {
  const low = echoLevel(level).tempo;
  return { low, high: low + ECHO_TEMPO_RISE };
}

/** A game's tempo before its first call. */
export function startTempo(level: EchoLevelNumber): EchoTempo {
  const { low } = tempoRange(level);
  return { bpm: low, passes: 0, top: low };
}

/** The tempo after an echo: up a step every two good ones, down after a miss. */
export function nextTempo(
  tempo: EchoTempo,
  level: EchoLevelNumber,
  { passed }: { passed: boolean },
): EchoTempo {
  const { low, high } = tempoRange(level);
  const clamp = (bpm: number) => Math.max(low, Math.min(high, bpm));
  if (!passed) {
    return { ...tempo, bpm: clamp(tempo.bpm - ECHO_TEMPO_STEP), passes: 0 };
  }
  const passes = tempo.passes + 1;
  if (passes < ECHO_TEMPO_PASSES) return { ...tempo, passes };
  const bpm = clamp(tempo.bpm + ECHO_TEMPO_STEP);
  return { bpm, passes: 0, top: Math.max(tempo.top, bpm) };
}

/** The Final Boss's tempo: the highest the game reached. */
export const bossTempo = (tempo: EchoTempo): number => tempo.top;
