/**
 * Global test setup.
 *
 * Deliberately minimal and side-effect-light: it runs for EVERY test file,
 * including the ~220 pure node-environment suites that need none of it. The
 * msw server is created here but only listens for files that opt in via
 * `startMockApi()`, so a pure suite pays nothing but the import.
 */
import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no ResizeObserver, and `useStageScale` — which every slide surface
 * now renders through — constructs one on mount. Without this, any component
 * test touching a slide dies in the commit phase with a bare ReferenceError
 * that points at react-dom rather than at the cause.
 *
 * The stub never fires a callback, so a stage in jsdom keeps its initial
 * scale. That is fine for structure and gating assertions (what zones exist,
 * what the slots were asked for); it is not a substitute for measuring
 * anything, which the browser loop does.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
