import { LOGO, type Curve } from '../motion/lissajous';

/** Phases below are counted in half-turns of the mark. */
const halfTurns = (n: number) => n * Math.PI;

/** "Production": unison at a quarter turn, a circle. */
export const PRODUCTION_CURVE: Curve = { ratio: [1, 1], phase: halfTurns(3.5) };

/**
 * The hero title's words, shown one at a time, each with its own Lissajous
 * curve for the mark: a ratio `[fx, fy]` at a phase. "Music Atlas" alone has
 * the logo (2:3 at phase 0), and no other word uses 2:3.
 *
 * Each word's phase sits about one more half-turn along than the last, so every
 * move turns roughly half a revolution (a quarter to three-quarters), and the
 * move home to Music Atlas turns a full one. The small offsets from each
 * half-turn vary the figures, and none lands on a flat, retraced phase.
 */
export const HERO_WORDS: readonly { text: string; curve: Curve }[] = [
  { text: 'Music Atlas', curve: LOGO },
  {
    text: 'Piano',
    // The octave standing up: a figure-8 with its loops stacked.
    curve: { ratio: [2, 1], phase: halfTurns(1) },
  },
  {
    text: 'Guitar',
    curve: { ratio: [1, 3], phase: halfTurns(2.5) },
  },
  { text: 'Production', curve: PRODUCTION_CURVE },
  {
    text: 'Creation',
    curve: { ratio: [3, 1], phase: halfTurns(4 + 1 / 6) },
  },
  {
    text: 'Harmony',
    curve: { ratio: [1, 2], phase: halfTurns(5) },
  },
  {
    text: 'Audio',
    curve: { ratio: [1, 1], phase: halfTurns(6.3) },
  },
  {
    text: 'Theory',
    // A pointed arch: 1:2 folded so its crossing sits in the apex.
    curve: { ratio: [1, 2], phase: halfTurns(7.34) },
  },
  {
    text: 'History',
    // An open, slanting "N": 1:3 at 0.7 of a half-turn off its flat phase.
    curve: { ratio: [1, 3], phase: halfTurns(8.7) },
  },
  {
    text: 'Classroom',
    // 3:2 repeats every third of a half-turn, so this is the same figure as
    // at 9, placed so the move in from History stays a sensible turn.
    curve: { ratio: [3, 2], phase: halfTurns(9 + 1 / 3) },
  },
  {
    text: 'Studio',
    // The octave turned into an open V: 1:2, a little past its figure-8.
    curve: { ratio: [1, 2], phase: halfTurns(10.2) },
  },
];
