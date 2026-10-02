import { describe, expect, it, vi } from 'vitest';

/**
 * The student app reads one vocabulary: the session instruments, for the
 * song page's Instruments pills and credit tooltips (`SongCredits`, through
 * `curriculum/data/instruments.ts`). That module reads `instruments.json`
 * and nothing else here, so a student never downloads the genres, the
 * subgenres, the tag lists, the table builders or the console's schemas
 * (and zod with them). Each of those throws the moment anything loads it,
 * whatever the path, as in eagerBoundary.test.ts.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`the student app loaded ${what}`);
  },
}));
vi.mock('@/content/vocabulary/repo', forbid('the repo vocabulary'));
vi.mock('@/content/vocabulary/tables', forbid('the table builders'));
vi.mock('@/content/vocabulary/schemas', forbid('the vocabulary schemas'));
vi.mock('@/content/vocabulary/validate', forbid('the vocabulary checks'));
vi.mock('@/content/vocabulary/genres.json', forbid('the genre file'));
vi.mock('@/content/vocabulary/subgenres.json', forbid('the subgenre file'));
vi.mock('@/content/vocabulary/genreTagLists.json', forbid('the tag lists'));
vi.mock('@/content/graph/genres', forbid('genres.ts'));
vi.mock('@/content/graph/genreTags', forbid('genreTags.ts'));
vi.mock('@/content/graph/instrumentGenres', forbid('instrumentGenres.ts'));
vi.mock('zod', forbid('zod'));

const MODULES: Record<string, () => Promise<unknown>> = {
  instruments: () => import('@/curriculum/data/instruments'),
  SongCredits: () => import('@/components/songLibrary/SongCredits'),
};

describe('the student app’s instruments', () => {
  it.each(Object.keys(MODULES))(
    '%s loads without the genre data or the schemas',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
    30_000,
  );

  it('still has every instrument, without its genres', async () => {
    const { SESSION_INSTRUMENTS, getInstrument } = await import(
      '@/curriculum/data/instruments'
    );
    expect(SESSION_INSTRUMENTS.length).toBeGreaterThan(50);
    expect(getInstrument('piano')).toEqual({
      id: 'piano',
      name: 'Piano',
      section: 'keys',
    });
    expect(SESSION_INSTRUMENTS.some((i) => 'typicalIn' in i)).toBe(false);
  });

  it('would notice if it did', async () => {
    await expect(import('@/content/vocabulary/repo')).rejects.toThrow();
    await expect(import('@/content/vocabulary/genres.json')).rejects.toThrow();
    await expect(import('zod')).rejects.toThrow();
  });
});
