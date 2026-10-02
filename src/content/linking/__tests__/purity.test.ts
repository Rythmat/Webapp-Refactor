import { describe, expect, it, vi } from 'vitest';

/**
 * The planners stay pure: the Table runs them over the working graph in a
 * lazy chunk, on data handed in. So they must never pull in the content
 * store (and its CDN loader), the globe's artist index, React, or the
 * console's kind specs — not directly, and not through anything they import
 * (modelled on content/suggestions/__tests__/purity.test.ts).
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`planner code loaded ${what}`);
  },
}));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));
vi.mock('@/features/admin/content/kinds', forbid('the kind specs'));
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));

const MODULES: Record<string, () => Promise<unknown>> = {
  index: () => import('..'),
  types: () => import('../types'),
  plan: () => import('../plan'),
  placeBook: () => import('../placeBook'),
  samePlace: () => import('../samePlace'),
  eventArtists: () => import('../eventArtists'),
  eventSongs: () => import('../eventSongs'),
  eventPlaces: () => import('../eventPlaces'),
  hometowns: () => import('../hometowns'),
  progressionSongs: () => import('../progressionSongs'),
  songYears: () => import('../songYears'),
};

describe('the pure planner modules', () => {
  it.each(Object.keys(MODULES))(
    '%s loads without the store, the globe artist index, the kind specs or React',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
  );

  it('would notice if one did', async () => {
    await expect(import('@/content/contentStore')).rejects.toThrow();
    await expect(import('react')).rejects.toThrow();
  });
});
