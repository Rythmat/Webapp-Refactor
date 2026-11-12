/**
 * harmonicRhythm.ts — how a band style changes chords (owner, 2026-11-10:
 * "chord rhythms are saved per band style … a rhythm can push a chord
 * early"). Trap holds a chord two bars, a jazz comp changes twice a bar, a
 * funk style pushes every change an eighth early: said once, on the style
 * (`BandVariation.harmony`), and true of any progression it plays.
 *
 * `layHarmony` lays a progression in a style's harmony as timed chord
 * changes (chordTimeline.ts `TimedChords`), which Prism, the Band editor's
 * preview and Tesseract's Play it all hand to the band engine, so the three
 * play the same changes.
 *
 * No audio and no React here.
 */

import type {
  ChordChange,
  TimedChords,
} from '../genreGeneration/chordTimeline';

/** Ticks a quarter note. */
const PPQ = 480;

/** How a band style changes chords. */
export interface StyleHarmony {
  /** Bars each chord holds: 0.5 (two a bar), 1 (the default), 2, 4. */
  barsPerChord?: number;
  /**
   * Beats each chord holds, by how many chords the loop has ('4': [8, 8, 4,
   * 12] holds a four-chord loop 2, 2, 1 and 3 bars); for that count, in
   * place of `barsPerChord`.
   */
  rhythms?: Record<string, readonly number[]>;
  /**
   * How early each change arrives, in ticks: 120 a sixteenth, 240 an eighth
   * before its beat. Left out, changes land on the beat.
   */
  push?: number;
}

/** The pushes a style can choose, for the editor. */
export const PUSHES = [
  { ticks: 0, label: 'On the beat' },
  { ticks: 120, label: 'A 16th early' },
  { ticks: 240, label: 'An 8th early' },
] as const;

/** The holds a style can choose, for the editor. */
export const BARS_PER_CHORD = [0.5, 1, 2, 4] as const;

/**
 * Bars each chord of a longer loop holds, filling an eight-bar phrase: the
 * first and last held, the middle moving. A loop of up to four holds a bar
 * a chord.
 */
export const PHRASE_HOLDS: Readonly<Record<number, readonly number[]>> = {
  5: [2, 2, 1, 1, 2],
  6: [2, 1, 1, 2, 1, 1],
  7: [1, 1, 1, 1, 1, 1, 2],
  8: [1, 1, 1, 1, 1, 1, 1, 1],
};

/**
 * Beats each chord of an `n`-chord loop holds in a style: its own rhythm for
 * that count when it has a sound one (one positive length a chord), else
 * the loop's phrase shape (PHRASE_HOLDS, a bar a chord up to four) scaled
 * by `barsPerChord`.
 */
export function holdsFor(
  n: number,
  harmony: StyleHarmony | undefined,
  beatsPerBar = 4,
): number[] {
  const own = harmony?.rhythms?.[String(n)];
  if (own && own.length === n && own.every((b) => b > 0)) return [...own];
  const scale =
    harmony?.barsPerChord && harmony.barsPerChord > 0
      ? harmony.barsPerChord
      : 1;
  const shape = PHRASE_HOLDS[n] ?? Array.from({ length: n }, () => 1);
  return shape.map((bars) => bars * scale * beatsPerBar);
}

/** Chords held a number of beats each, as changes from the downbeat. */
export function timedHolds(
  held: readonly (readonly [symbol: string, beats: number])[],
): TimedChords {
  const changes: ChordChange[] = [];
  let tick = 0;
  for (const [symbol, beats] of held) {
    if (changes.at(-1)?.symbol !== symbol) changes.push({ tick, symbol });
    tick += Math.round(beats * PPQ);
  }
  return { changes, length: tick };
}

/**
 * A timed loop with each change pushed `push` ticks early: a change on the
 * loop's downbeat arrives that early at the end of the pass before (the
 * loop's last chord gives way to its first), and none moves past the change
 * before it.
 */
export function pushed(
  timed: TimedChords,
  push: number | undefined,
): TimedChords {
  if (!push || push <= 0 || timed.changes.length < 2) return timed;
  const changes: ChordChange[] = [];
  for (const change of timed.changes) {
    if (change.tick === 0) {
      changes.push(change);
      continue;
    }
    const before = changes.at(-1)!.tick;
    changes.push({ ...change, tick: Math.max(before + 1, change.tick - push) });
  }
  const first = timed.changes[0];
  if (first.tick === 0 && changes.at(-1)!.symbol !== first.symbol) {
    const at = timed.length - push;
    if (at > changes.at(-1)!.tick)
      changes.push({ tick: at, symbol: first.symbol });
  }
  return { changes, length: timed.length };
}

/**
 * A progression in a style's harmony: each chord held as the style holds
 * it, the loop repeated to fill `bars` when it is shorter and goes into
 * them evenly, every change pushed as the style pushes.
 */
export function layHarmony(
  chords: readonly string[],
  harmony: StyleHarmony | undefined,
  bars: number,
  beatsPerBar = 4,
): TimedChords {
  if (!chords.length) return { changes: [], length: bars * beatsPerBar * PPQ };
  const holds = holdsFor(chords.length, harmony, beatsPerBar);
  const pass = holds.reduce((a, b) => a + b, 0);
  const wanted = bars * beatsPerBar;
  const passes = pass < wanted && wanted % pass === 0 ? wanted / pass : 1;
  const held: [string, number][] = [];
  for (let p = 0; p < passes; p++)
    chords.forEach((symbol, i) => held.push([symbol, holds[i]]));
  return pushed(timedHolds(held), harmony?.push);
}
