/**
 * msw harness for hook tests that must exercise a REAL request path.
 *
 * The point is to test what the app actually sends — method, URL, body — not a
 * stubbed hook. `POST /classrooms/:id/teachers` is the first consumer: the
 * Phase-1 DoD asks to "invite a co-teacher as editor through the real endpoint
 * (mocked in tests)", and a hand-stubbed mutation would prove nothing about
 * whether the generated client is wired to the right route.
 */
import type { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

export const API_BASE =
  process.env.VITE_MUSIC_ATLAS_API_URL ?? 'http://localhost:3000';

export const mockApi = setupServer();

/** Call inside a `describe` to start msw for that file only. */
export const startMockApi = (...handlers: RequestHandler[]): void => {
  beforeAll(() => {
    mockApi.listen({ onUnhandledRequest: 'error' });
    if (handlers.length) mockApi.use(...handlers);
  });
  afterEach(() => mockApi.resetHandlers(...handlers));
  afterAll(() => mockApi.close());
};
