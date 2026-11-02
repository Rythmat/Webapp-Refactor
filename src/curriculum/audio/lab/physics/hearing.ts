import type { Recipe } from './harmonics';

// ── From air to nerve ──────────────────────────────────────────────────────
// Along the cochlea each place answers best to one frequency: high near its
// entrance, low at its far end. The map is Greenwood's, fitted to human hearing.
// `along` runs 0 at the entrance to 1 at the far end.

/** Where along the cochlea a frequency answers most. */
export const placeOf = (hz: number) => 1 - Math.log10(hz / 165.4 + 0.88) / 2.1;

/** The frequency a place answers to most. */
export const hzAtPlace = (along: number) =>
  165.4 * (10 ** (2.1 * (1 - along)) - 0.88);

/**
 * How far the membrane moves at a place for a tone, 0..1. The wave builds slowly
 * from the entrance, peaks at its place and dies quickly past it. Drawn in
 * outline: the real sharpness depends on how loud the tone is.
 */
export function membraneReach(along: number, hz: number): number {
  const distance = along - placeOf(hz);
  const width = distance < 0 ? 0.2 : 0.035;
  return Math.exp(-((distance / width) ** 2));
}

/** A rich note without its own frequency, for the brain to fill in. */
export const withoutFundamental = (recipe: Recipe): Recipe => [
  0,
  ...recipe.slice(1),
];

/** Which way a mark has to move to reach a tone's place, or that it's there. */
export function placeResult(
  mark: number,
  hz: number,
  within: number,
): 'match' | 'entrance' | 'far' {
  const distance = placeOf(hz) - mark;
  if (Math.abs(distance) <= within) return 'match';
  return distance < 0 ? 'entrance' : 'far';
}
