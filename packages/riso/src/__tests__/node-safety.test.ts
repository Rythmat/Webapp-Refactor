// @vitest-environment node

/**
 * Every canvas module must be IMPORTABLE in Node, where there is no `document`.
 *
 * Upstream declares its scratch canvases and its baked paper at module scope. Transcribed
 * literally, `const scratch = cv(W, W)` would call `document.createElement` the moment the module
 * is imported — which does not merely fail in Node, it fails at import time, taking down any test
 * that so much as touches the barrel. Every such singleton was therefore turned into a lazy
 * accessor (`paperOf()`, `screenOf()`).
 *
 * That is a design constraint the type system cannot express and the parity harness cannot see,
 * because the harness runs in a browser where `document` exists. This test is the only thing
 * standing between that constraint and a silent regression, so the Node environment above is
 * load-bearing: under a simulated DOM this file would pass while proving nothing.
 *
 * Beware when editing the prose here. Vitest finds its environment pragma by scanning the file, so
 * writing the token followed by "jsdom" anywhere — even inside a comment saying NOT to use it —
 * silently switches this file to a simulated DOM. That is exactly what happened when this test was
 * first written: `typeof document` came back "object" and the suite's premise quietly evaporated.
 */
import { describe, expect, it } from 'vitest';

describe('canvas modules in a DOM-less environment', () => {
  it('has no document to fall back on', () => {
    expect(typeof globalThis.document).toBe('undefined');
  });

  it.each([
    ['surface', () => import('../canvas/surface.ts')],
    ['screens', () => import('../canvas/screens.ts')],
    ['paper', () => import('../canvas/paper.ts')],
    ['coverage', () => import('../canvas/coverage.ts')],
    ['marks', () => import('../canvas/marks.ts')],
    ['paint', () => import('../canvas/paint.ts')],
    ['shapes', () => import('../canvas/shapes.ts')],
    ['scene', () => import('../canvas/scene.ts')],
    ['studies/film', () => import('../studies/film.ts')],
    ['studies/frame', () => import('../studies/frame.ts')],
    ['paint', () => import('../canvas/paint.ts')],
    ['canvas barrel', () => import('../canvas/index.ts')],
    ['root barrel', () => import('../index.ts')],
    ['film/mount', () => import('../film/mount.ts')],
  ])('imports %s without touching the DOM', async (_name, load) => {
    const mod = await load();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('defers the DOM to call time, not import time', async () => {
    const { paperOf } = await import('../canvas/paper.ts');
    /* Importing was fine; CALLING this is what reaches for document, and it must fail loudly here
       rather than silently returning something unusable. */
    expect(() => paperOf()).toThrow();
  });

  /* screenOf is Node-safe even when called, and that is a real property worth pinning: it returns
     buildScreenTile's pure math plus an empty pattern cache, and no canvas exists until dotPattern
     is asked for one. It is why the halftone lattice can be golden-tested in Node at all. */
  it('builds a screen without a canvas, deferring only the pattern tiles', async () => {
    const { screenOf } = await import('../canvas/screens.ts');
    const sc = screenOf('blue');
    expect(sc.S).toBe(19);
    expect(sc.th).toBeInstanceOf(Float32Array);
    expect(sc.patterns.size).toBe(0);
  });
});
