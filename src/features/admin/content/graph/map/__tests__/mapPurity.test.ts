import { describe, expect, it, vi } from 'vitest';

/**
 * The Mind Map's model and layout stay pure. The force layout runs in a Web
 * Worker, and the model is tested in node and loaded by the worker's inline
 * stand-in, so none of it may pull in React, the router, the content store
 * (and its CDN loader) or the globe's artist index — not directly, and not
 * through anything it imports. Each forbidden module below throws the
 * moment anything loads it, whatever the path.
 *
 * The DOM is held off by where this runs: node, with no `window` or
 * `document`, so a module that reached for either while loading would fail
 * here. The first test makes sure that stays true.
 *
 * Every file in `map/model/` is checked, found by a glob so a new model file
 * is held to the same rule without anyone adding it here, along with the
 * force layout, the theme's plain values and the local graph's walk.
 */

// Hoisted with the mocks, which run before anything else in this file.
const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`mind map model loaded ${what}`);
  },
}));
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));
vi.mock('react-dom', forbid('React DOM'));
vi.mock('react-dom/client', forbid('React DOM'));
vi.mock('react-router', forbid('the router'));
vi.mock('react-router-dom', forbid('the router'));
vi.mock('@/constants/routes', forbid('the route constants'));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));
vi.mock(
  '@/components/atlas/data/eventConnections',
  forbid('the globe influence arcs module'),
);

const MODEL = import.meta.glob('../model/*.ts');

const MODULES: Record<string, () => Promise<unknown>> = {
  ...Object.fromEntries(
    Object.entries(MODEL).map(([path, load]) => [
      `model/${path.slice(path.lastIndexOf('/') + 1, -'.ts'.length)}`,
      load,
    ]),
  ),
  'layout/forceLayout': () => import('../layout/forceLayout'),
  'layout/layoutProtocol': () => import('../layout/layoutProtocol'),
  'render/graphTheme': () => import('../render/graphTheme'),
  'content/graph/localGraph': () => import('@/content/graph/localGraph'),
};

describe('the pure Mind Map modules', () => {
  it('run where there is no DOM', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('include every model file', () => {
    const names = Object.keys(MODULES);
    for (const name of [
      'model/camera',
      'model/graphSettings',
      'model/hitTest',
      'model/nodeRoles',
      'model/renderGraph',
      'model/sizing',
    ]) {
      expect(names).toContain(name);
    }
  });

  it.each(Object.keys(MODULES))(
    '%s loads without React, the router, the DOM or the store',
    async (name) => {
      await expect(MODULES[name]()).resolves.toBeDefined();
    },
  );

  it('would notice if one did', async () => {
    // The guard itself: a forbidden module really does refuse to load.
    await expect(import('react')).rejects.toThrow();
    await expect(import('@/content/contentStore')).rejects.toThrow();
    await expect(import('@/constants/routes')).rejects.toThrow();
  });
});
