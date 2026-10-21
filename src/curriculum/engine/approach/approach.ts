/**
 * approach.ts — notes and chords that lead into a goal: a bass line's D E♭ E
 * into F, a comping hand's C9 B9 into B♭9. An approach is stored as where it
 * stands from its goal, never as pitches: steps above (+) or below (−),
 * chromatic (half steps) or diatonic (steps of a scale — the key's, or the
 * goal chord's own, for a passage that changes key). Wherever the goal lands
 * — another chart, another key, a student's progression — the approach
 * comes with it, so a chromatic approach stays chromatic and parallel.
 *
 * The console's menu writes approaches by pattern, in Peter's notation: a
 * number of notes from above (A) or below (B), farthest first. '2A 1B' is
 * two from above stepping in, then one from below: +2, +1, −1.
 *
 * An approach note can itself be a goal, so approaches chain: C♯ E E♭ C♯
 * into D, and that D one below E♭ with F E D between — C♯ E E♭ C♯ D F E D
 * E♭, every pitch worked out backward from the last goal.
 *
 * Bass lines (bassLine.ts), comping (chordComping.ts) and captured parts
 * (parts/followChords.ts) all approach this way.
 *
 * No audio and no React here.
 */

export type ApproachMotion = 'chromatic' | 'diatonic';

/** Which scale a diatonic approach steps through. */
export type ApproachScale = 'key' | 'goal';

/** Where a note (or chord) of an approach stands from its goal. */
export interface ApproachStep {
  /** Steps from the goal: +2 is two above, −1 one below. Never 0. */
  step: number;
  motion: ApproachMotion;
  /**
   * A diatonic step's scale: the key's (the default — A minor's D natural
   * into E7) or the goal chord's own (a passage that has changed key).
   */
  scale?: ApproachScale;
}

/** The most notes one approach has. */
export const MAX_APPROACH = 4;

/**
 * The menu's patterns: groups of notes from above (A) or below (B), each
 * group farthest first.
 */
export const APPROACH_PATTERNS = [
  '1A',
  '1B',
  '1A1B',
  '1B1A',
  '2A',
  '2B',
  '2A1B',
  '2B1A',
  '1B2A',
  '1A2B',
  '2B2A',
  '2A2B',
  '3A',
  '3B',
  '4A',
  '4B',
] as const;
export type ApproachPattern = (typeof APPROACH_PATTERNS)[number];

/** '2A1B' as the menu writes it: '2A 1B'. */
export const patternLabel = (pattern: string) =>
  pattern.replace(/([AB])(?=\d)/g, '$1 ');

/** A pattern's steps, first note first: '2A1B' is +2, +1, −1. */
export function patternSteps(pattern: string): number[] {
  const out: number[] = [];
  for (const [, n, side] of pattern.matchAll(/(\d)([AB])/g))
    for (let k = Number(n); k >= 1; k--) out.push(side === 'A' ? k : -k);
  return out;
}

/** The pattern a run of steps spells, or null when the menu has none. */
export function stepsPattern(steps: readonly number[]): ApproachPattern | null {
  return (
    APPROACH_PATTERNS.find((p) => {
      const own = patternSteps(p);
      return own.length === steps.length && own.every((s, i) => s === steps[i]);
    }) ?? null
  );
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * The pitch `step` steps from `goal`: half steps, or steps of `scale` (pitch
 * classes). From a goal outside the scale, the first scale note toward the
 * approach is its first step.
 */
export function approachPitch(
  goal: number,
  step: number,
  motion: ApproachMotion,
  scale?: readonly number[],
): number {
  if (motion === 'chromatic' || !scale?.length || step === 0)
    return goal + step;
  const pcs = new Set(scale.map(mod12));
  const dir = Math.sign(step);
  let m = goal;
  for (let k = 0; k < Math.abs(step); k++) {
    let guard = 0;
    do m += dir;
    while (!pcs.has(mod12(m)) && ++guard < 12);
  }
  return m;
}

/**
 * A chord `step` steps from its goal's voicing: chromatic moves every note
 * the same half steps (the shape exactly: B9 into B♭9); diatonic moves each
 * note to its own scale neighbour, as a hand planes through the key.
 */
export const approachVoicing = (
  goal: readonly number[],
  step: number,
  motion: ApproachMotion,
  scale?: readonly number[],
) => goal.map((m) => approachPitch(m, step, motion, scale));

/**
 * For each item of a line (notes or hits, in time order), the index of the
 * goal it leads into — its own index when it isn't an approach. An
 * approach's goal is the next item that isn't one, or that is one but is
 * marked a goal (a chain). Looping: an approach at the end leads into the
 * first goal from the start. −1 when the line has no goal at all.
 */
export function goalsOf(
  items: readonly { approach?: unknown; goal?: boolean }[],
): number[] {
  const isGoal = (i: number) => !items[i].approach || items[i].goal === true;
  const out = items.map((_, i) => (items[i].approach ? -1 : i));
  let next = -1;
  // Twice round, so the end's approaches find a goal from the start.
  for (let pass = 0; pass < 2; pass++)
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].approach && out[i] < 0 && next >= 0) out[i] = next;
      if (isGoal(i)) next = i;
    }
  return out;
}

/**
 * Every item's value, approaches placed from their goals: a goal's own
 * (`own`), an approach's from its goal's (`place`), a chain worked backward
 * from its last goal. An approach with no goal is undefined.
 */
export function resolveApproaches<T>(
  items: readonly { approach?: unknown; goal?: boolean }[],
  own: (i: number) => T,
  /** An approach's value from its goal's, and which item that goal is. */
  place: (i: number, goal: T, goalIndex: number) => T,
): (T | undefined)[] {
  const goals = goalsOf(items);
  const out: (T | undefined)[] = items.map(() => undefined);
  const done = items.map(() => false);
  const value = (i: number, depth = 0): T | undefined => {
    if (done[i]) return out[i];
    done[i] = true;
    if (!items[i].approach) out[i] = own(i);
    else if (goals[i] >= 0 && depth < items.length) {
      const goal = value(goals[i], depth + 1);
      out[i] = goal === undefined ? undefined : place(i, goal, goals[i]);
    }
    return out[i];
  };
  items.forEach((_, i) => value(i));
  return out;
}

/** A chord as its root and intervals (genreGeneration's ChordSymbolTones). */
interface ChordTones {
  rootPc: number;
  intervals: readonly number[];
}

/**
 * A chord's own scale, for approaches diatonic to the goal: its family's
 * mode — major Ionian, dominant Mixolydian, minor Dorian, half-diminished
 * Locrian, diminished the half-whole, augmented the whole tone — with its
 * own tones in place of the notes they alter (a 7♭9's ♭9 for the 9).
 */
export function chordScale(chord: ChordTones): number[] {
  const pcs = new Set(chord.intervals.map(mod12));
  const has = (i: number) => pcs.has(i);
  const minor = has(3) && !has(4);
  const base =
    minor && has(6)
      ? has(9) && !has(10)
        ? [0, 2, 3, 5, 6, 8, 9, 11]
        : [0, 1, 3, 5, 6, 8, 10]
      : has(4) && has(8) && !has(7)
        ? [0, 2, 4, 6, 8, 10]
        : minor
          ? has(8)
            ? [0, 2, 3, 5, 7, 8, 10]
            : [0, 2, 3, 5, 7, 9, 10]
          : has(10)
            ? [0, 2, 4, 5, 7, 9, 10]
            : [0, 2, 4, 5, 7, 9, 11];
  const scale = new Set(base);
  for (const tone of pcs) {
    if (scale.has(tone)) continue;
    // A chord tone outside the mode takes the place of the note beside it.
    for (const near of [tone - 1, tone + 1].map(mod12))
      if (scale.has(near) && !pcs.has(near)) {
        scale.delete(near);
        break;
      }
    scale.add(tone);
  }
  return [...scale].map((i) => mod12(chord.rootPc + i)).sort((a, b) => a - b);
}
