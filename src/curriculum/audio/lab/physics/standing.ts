import { SPEED_OF_SOUND_AIR } from './wave';

// ── What a string or a pipe can ring at ────────────────────────────────────
// Only patterns that fit between its two ends last: its standing waves. Each
// has its own pitch, set by the length. Idealised: a real pipe's air reaches a
// little past its ends, and a real clarinet's even harmonics are weak, not gone.

export type SoundSource = 'string' | 'flute' | 'clarinet';

/** A guitar's open A string. */
export const OPEN_STRING_HZ = 110;

/** The pipes' length, about a flute's or a clarinet's. */
export const PIPE_METRES = 0.6;

/** A stopped string's note: half the length, twice the frequency. */
export const stringHz = (length: number) => OPEN_STRING_HZ / length;

/** The lowest note each can ring at. A pipe closed at one end is an octave down. */
export const fundamentalHz = (source: SoundSource) =>
  source === 'string'
    ? OPEN_STRING_HZ
    : source === 'flute'
      ? SPEED_OF_SOUND_AIR / (2 * PIPE_METRES)
      : SPEED_OF_SOUND_AIR / (4 * PIPE_METRES);

/** The harmonics each can ring at: a pipe closed at one end has only the odd. */
export const modesOf = (source: SoundSource): readonly number[] =>
  source === 'clarinet' ? [1, 3, 5] : [1, 2, 3, 4, 5];

export const modeHz = (source: SoundSource, mode: number) =>
  fundamentalHz(source) * mode;

/**
 * How far a place moves at its widest, −1..1, at `u` (0..1) along it. A string
 * is held still at both ends. A pipe's air moves most at an open end and not at
 * all against a closed one (a clarinet's mouthpiece, at u = 0).
 */
export function standingAt(source: SoundSource, mode: number, u: number) {
  if (source === 'string') return Math.sin(mode * Math.PI * u);
  if (source === 'flute') return Math.cos(mode * Math.PI * u);
  return Math.sin((mode * Math.PI * u) / 2);
}

/** The places that never move, 0..1 along it. */
export function nodesOf(source: SoundSource, mode: number): number[] {
  if (source === 'string') {
    return Array.from({ length: mode + 1 }, (_, k) => k / mode);
  }
  if (source === 'flute') {
    return Array.from({ length: mode }, (_, k) => (k + 0.5) / mode);
  }
  return Array.from({ length: (mode + 1) / 2 }, (_, k) => (2 * k) / mode);
}
