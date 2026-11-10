/**
 * Who plays a prompt (owner, 2026-11-10: "mostly very similar material"):
 * a band plays any of its styles, the ones the prompt points to likelier;
 * a style the prompt names, always.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { echoRandom } from '@/curriculum/engine/echo/random';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { parseMusicPrompt } from '../parseMusicPrompt';
import { planPrompt } from '../planPrompt';
import { recipeFor } from '../promptRecipes';

beforeAll(() => pairingsReady);

const styleOf = async (text: string, seed: number) => {
  const rng = echoRandom(seed);
  const recipe = await recipeFor(planPrompt(parseMusicPrompt(text), rng), rng);
  return recipe?.kind === 'band'
    ? recipe.style.variation
    : `${recipe?.band.layers.map((l) => (l.source as { id: string }).id).join('+')}`;
};

describe('recipeFor', () => {
  it.each(['pop', 'funk', 'hip hop', 'jazz', 'rock', 'neo soul'])(
    '“%s” plays more than one style',
    async (text) => {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 24; seed++)
        seen.add(await styleOf(text, seed));
      expect(seen.size, [...seen].join(' ')).toBeGreaterThan(1);
    },
  );

  it('plays the style a prompt names, every time', async () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(await styleOf('a trap beat', seed)).toBe('l1-trap');
      expect(await styleOf('boom bap', seed)).toBe('l2-boom-bap');
    }
  });

  it('plays a jazz prompt’s ii–V–I most often', async () => {
    let iiVI = 0;
    for (let seed = 1; seed <= 40; seed++)
      if ((await styleOf('jazz', seed)).startsWith('l3-i')) iiVI++;
    expect(iiVI).toBeGreaterThanOrEqual(12);
  });
});
