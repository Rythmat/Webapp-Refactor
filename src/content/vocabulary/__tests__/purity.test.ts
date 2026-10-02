import { describe, expect, it, vi } from 'vitest';

/**
 * `tables.ts` builds the student app's instrument table as well as the
 * console's genre tables, so it must load nothing: no zod (the schemas are
 * the console's), no vocabulary JSON (the records are passed in), and none of
 * the modules it builds tables for, which will import it. Each of those
 * throws here the moment anything loads it.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`tables.ts loaded ${what}`);
  },
}));
vi.mock('zod', forbid('zod'));
vi.mock('../schemas', forbid('the schemas'));
vi.mock('../genres.json', forbid('the genre file'));
vi.mock('../subgenres.json', forbid('the subgenre file'));
vi.mock('../instruments.json', forbid('the instrument file'));
vi.mock('../genreTagLists.json', forbid('the tag lists file'));
vi.mock('@/content/graph/genres', forbid('genres.ts'));
vi.mock('@/content/graph/genreTags', forbid('genreTags.ts'));
vi.mock('@/content/graph/instrumentGenres', forbid('instrumentGenres.ts'));
vi.mock('@/curriculum/data/instruments', forbid('instruments.ts'));

describe('tables.ts', () => {
  it('loads nothing but itself', async () => {
    const tables = await import('../tables');
    const built = tables.instrumentTables([
      { id: 'piano', name: 'Piano', section: 'keys', typicalIn: [] },
    ]);
    expect(built.INSTRUMENT_IDS).toEqual(['piano']);
  });

  it('would notice if it did', async () => {
    await expect(import('zod')).rejects.toThrow();
    await expect(import('../schemas')).rejects.toThrow();
  });
});
