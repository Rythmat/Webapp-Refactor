import { describe, expect, it, vi } from 'vitest';
import { apiViewerLookup } from '../repoHttp';

/**
 * A real sign-in in repo mode (owner, 2026-11-15): its token is Auth0's,
 * with no role in it, so the repo server asks the app's API, as the app
 * does, who it is.
 */

const response = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe('who a real sign-in is', () => {
  it('reads the role from /auth/me, in SuperJSON’s envelope or plain', async () => {
    const fetcher = vi.fn(async () =>
      response(200, {
        json: { id: 'u1', role: 'admin', fullName: 'Peter' },
        meta: { values: {} },
      }),
    );
    const lookup = apiViewerLookup('https://api.example/', fetcher);
    expect(await lookup('Bearer abc', 'sess-1')).toEqual({
      role: 'admin',
      userId: 'u1',
      name: 'Peter',
    });
    expect(fetcher).toHaveBeenCalledWith('https://api.example/auth/me', {
      headers: { Authorization: 'Bearer abc', 'X-App-Session': 'sess-1' },
    });

    const plain = apiViewerLookup(
      'https://api.example',
      vi.fn(async () => response(200, { id: 'u2', role: 'editor' })),
    );
    expect((await plain('Bearer x', undefined))?.role).toBe('editor');
  });

  it('asks once per token', async () => {
    const fetcher = vi.fn(async () =>
      response(200, { id: 'u1', role: 'admin' }),
    );
    const lookup = apiViewerLookup('https://api.example', fetcher);
    await lookup('Bearer abc', undefined);
    await lookup('Bearer abc', undefined);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('says nothing when the API will not', async () => {
    const refused = apiViewerLookup(
      'https://api.example',
      vi.fn(async () => response(401, { error: 'no' })),
    );
    expect(await refused('Bearer abc', undefined)).toBeNull();
    const down = apiViewerLookup(
      'https://api.example',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await down('Bearer abc', undefined)).toBeNull();
  });
});
