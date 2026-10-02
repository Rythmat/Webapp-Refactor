import { describe, expect, it, vi } from 'vitest';

/**
 * The suggestion modules stay pure: the importer (a Node script) computes
 * the same ids, the mock replays decisions through `apply.ts`, and the Table
 * loads them in a lazy chunk. So they must never pull in the content store
 * (and its CDN loader), the globe's artist index, React, or the console's
 * kind specs — not directly, and not through anything they import (modelled
 * on content/graph/__tests__/purity.test.ts).
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`suggestion code loaded ${what}`);
  },
}));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));
vi.mock('@/features/admin/content/kinds', forbid('the kind specs'));
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));

const MODULES: Record<string, () => Promise<unknown>> = {
  bodyPaths: () => import('@/content/bodyPaths'),
  types: () => import('../types'),
  keys: () => import('../keys'),
  apply: () => import('../apply'),
  status: () => import('../status'),
  merge: () => import('../merge'),
};

describe('the pure suggestion modules', () => {
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
