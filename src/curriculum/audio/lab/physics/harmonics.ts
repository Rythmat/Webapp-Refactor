// ── Timbre as harmonics ────────────────────────────────────────────────────
// A note's sound is a stack of sine waves at whole-number multiples of its
// frequency, in some proportion: its recipe, `recipe[n - 1]` the nth harmonic.
// The picture and the sound are built from the same numbers, each scaled to the
// same peak (as a PeriodicWave scales itself).

export type Recipe = readonly number[];

export interface NamedRecipe {
  id: 'pure' | 'mellow' | 'hollow' | 'bright';
  name: string;
  /** What it's a simplified version of. */
  like: string;
  harmonics: Recipe;
}

export const RECIPES: readonly NamedRecipe[] = [
  { id: 'pure', name: 'Pure', like: 'a tuning fork', harmonics: [1] },
  {
    id: 'mellow',
    name: 'Mellow',
    like: 'a flute',
    harmonics: [1, 0.35, 0.12, 0.05],
  },
  {
    id: 'hollow',
    name: 'Hollow',
    like: 'a clarinet',
    harmonics: [1, 0, 0.45, 0, 0.25, 0, 0.14],
  },
  {
    id: 'bright',
    name: 'Bright',
    like: 'a bowed string',
    harmonics: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8],
  },
];

export const recipeNamed = (id: NamedRecipe['id']) =>
  RECIPES.find((recipe) => recipe.id === id) ?? RECIPES[0];

/** The stack's height `cycles` along, before scaling. */
export const recipeAt = (cycles: number, recipe: Recipe) =>
  recipe.reduce(
    (sum, amount, i) => sum + amount * Math.sin(2 * Math.PI * (i + 1) * cycles),
    0,
  );

/** Its highest point over a cycle, to scale it to a peak of 1. */
export function recipePeak(recipe: Recipe): number {
  let peak = 0;
  for (let i = 0; i < 1024; i++) {
    peak = Math.max(peak, Math.abs(recipeAt(i / 1024, recipe)));
  }
  return peak || 1;
}

/** The harmonics chosen by number, each at the 1/n a plucked or bowed string's
 *  fall off at. */
export function recipeOf(on: ReadonlySet<number>, count: number): Recipe {
  return Array.from({ length: count }, (_, i) =>
    on.has(i + 1) ? 1 / (i + 1) : 0,
  );
}
