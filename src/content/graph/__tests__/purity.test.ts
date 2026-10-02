import { describe, expect, it, vi } from 'vitest';

/**
 * The graph modules stay pure: the console loads them in a lazy chunk and the
 * API contract copies from them, so they must never pull in the content store
 * (and its CDN loader), the globe's artist index or arc drawing (both read the
 * store), or React — not directly, and not through anything they import.
 *
 * The other suites check each file's own import lines, which cannot see a
 * transitive import or a relative spelling (`../contentStore`), and
 * deriveGraph.test.ts stubs the store for its own fixtures, so a store pulled
 * in by accident would load there without a sound. Here each forbidden module
 * throws the moment anything loads it, whatever the path.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`graph code loaded ${what}`);
  },
}));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));
vi.mock(
  '@/components/atlas/data/eventConnections',
  forbid('the globe influence arcs module'),
);
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));

const MODULES: Record<string, () => Promise<unknown>> = {
  deriveGraph: () => import('../deriveGraph'),
  deriveEdges: () => import('../deriveEdges'),
  integrity: () => import('../integrity'),
  ids: () => import('../ids'),
  places: () => import('../places'),
  slugs: () => import('../slugs'),
  types: () => import('../types'),
  genres: () => import('../genres'),
  genreTags: () => import('../genreTags'),
  time: () => import('../time'),
  instrumentGenres: () => import('../instrumentGenres'),
  eventMatches: () => import('../eventMatches'),
  // The Mind Map's local graph walk, which the console's lazy chunk runs.
  localGraph: () => import('../localGraph'),
  // The vocabulary files the genre and instrument modules are built from,
  // and the schemas, checks and writer a console save to them goes through.
  vocabularyRepo: () => import('@/content/vocabulary/repo'),
  vocabularyTables: () => import('@/content/vocabulary/tables'),
  vocabularySchemas: () => import('@/content/vocabulary/schemas'),
  vocabularySerialize: () => import('@/content/vocabulary/serialize'),
  vocabularyValidate: () => import('@/content/vocabulary/validate'),
};

describe('the pure graph modules', () => {
  it.each(Object.keys(MODULES))(
    '%s loads without the store, the globe artist index or React',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
  );

  it('would notice if one did', async () => {
    // The guard itself: a forbidden module really does refuse to load (vitest
    // wraps the factory's error in its own mocking message).
    await expect(import('@/content/contentStore')).rejects.toThrow();
    await expect(import('react')).rejects.toThrow();
  });
});
