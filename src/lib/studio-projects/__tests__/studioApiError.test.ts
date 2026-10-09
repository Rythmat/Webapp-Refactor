import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { studioProjectsApi } from '../projectsClient';
import {
  classifyStudioFailure,
  failureKindOfStatus,
  isStudioApiError,
  StudioApiError,
} from '../studioApiError';

// ── Typed failures from the Studio projects API (milestone 1.4) ────────────
// request() throws a StudioApiError with the status, the JSON error's code,
// the method and the path, so saveProject and openSession can word a failure
// for a student (no ids, no HTTP codes) and decide what to retry.

vi.mock('@/constants/env', () => ({
  Env: { get: () => 'https://api.example.test' },
}));

const fetchMock = vi.fn<typeof fetch>();

function answer(status: number, body: unknown): void {
  fetchMock.mockResolvedValueOnce(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
    }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request() failures', () => {
  it('throw a StudioApiError with the status, code, method and path', async () => {
    answer(404, { error: 'Studio project p1 not found', code: 'NOT_FOUND' });

    const error = await studioProjectsApi
      .update('tok', 'p1', {} as never)
      .catch((e: unknown) => e);

    expect(isStudioApiError(error)).toBe(true);
    const typed = error as StudioApiError;
    expect(typed).toBeInstanceOf(StudioApiError);
    expect(typed.status).toBe(404);
    expect(typed.code).toBe('NOT_FOUND');
    expect(typed.method).toBe('PUT');
    expect(typed.path).toBe('/api/studio/projects/p1');
    // Today's message, for logs.
    expect(typed.message).toBe(
      'PUT /api/studio/projects/p1 failed (404): Studio project p1 not found',
    );
    expect(classifyStudioFailure(typed)).toBe('not-found');
  });

  it('keep a non-JSON body in the message, with no code', async () => {
    answer(502, '<html>Bad gateway</html>');
    const error = (await studioProjectsApi
      .list('tok')
      .catch((e: unknown) => e)) as StudioApiError;
    expect(error.status).toBe(502);
    expect(error.code).toBeNull();
    expect(error.message).toContain('failed (502)');
    expect(classifyStudioFailure(error)).toBe('server');
  });

  it('turn a fetch that never got an answer into status 0, offline', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = (await studioProjectsApi
      .get('tok', 'p1')
      .catch((e: unknown) => e)) as StudioApiError;
    expect(isStudioApiError(error)).toBe(true);
    expect(error.status).toBe(0);
    expect(error.method).toBe('GET');
    expect(classifyStudioFailure(error)).toBe('offline');
  });

  it('pass an abort through as it came, classified as a timeout', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(
              new DOMException('The operation timed out.', 'TimeoutError'),
            ),
          );
        }),
    );
    const reading = studioProjectsApi
      .get('tok', 'p1', { signal: controller.signal })
      .catch((e: unknown) => e);
    controller.abort();
    const error = await reading;

    expect(isStudioApiError(error)).toBe(false);
    expect((error as DOMException).name).toBe('TimeoutError');
    expect(classifyStudioFailure(error)).toBe('timeout');
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it('send the signal with list() too', async () => {
    answer(200, []);
    const controller = new AbortController();
    await studioProjectsApi.list('tok', { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});

describe('classifyStudioFailure', () => {
  it.each([
    [0, 'offline'],
    [401, 'signed-out'],
    [403, 'no-access'],
    [404, 'not-found'],
    [409, 'conflict'],
    [413, 'too-large'],
    [500, 'server'],
    [503, 'server'],
    [400, 'unknown'],
  ] as const)('status %i is %s', (status, kind) => {
    expect(failureKindOfStatus(status)).toBe(kind);
    expect(
      classifyStudioFailure(
        new StudioApiError({ status, method: 'GET', path: '/x', message: '' }),
      ),
    ).toBe(kind);
  });

  it('reads aborts as timeouts and anything else as unknown', () => {
    expect(classifyStudioFailure(new DOMException('', 'AbortError'))).toBe(
      'timeout',
    );
    expect(classifyStudioFailure(new Error('boom'))).toBe('unknown');
    expect(classifyStudioFailure('boom')).toBe('unknown');
    expect(classifyStudioFailure(null)).toBe('unknown');
  });
});
