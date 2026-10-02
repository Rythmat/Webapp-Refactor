import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Repo mode's switch on the console side (mockSwitch.ts): with
 * VITE_CONTENT_REPO=1 every content request goes to the dev server's repo
 * content server, same origin, under `/__repo-content`; the offline mock
 * takes precedence; and with neither, the content API as before. The
 * switch is read as the modules load, so each case loads them afresh.
 */

const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const fetch = vi.fn(
    async () =>
      new Response('{"json":{"ok":true}}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const [content, flags] = await Promise.all([
    import('../useAdminContent'),
    import('@/features/admin/content/mock/mockSwitch'),
  ]);
  return { content, flags, fetch, warn };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('where the console’s content requests go', () => {
  it('goes to the repo content server, same origin, in repo mode', async () => {
    const { content, flags, fetch } = await load({ VITE_CONTENT_REPO: '1' });
    expect(flags.CONTENT_REPO).toBe(true);
    expect(flags.REPO_CONTENT_BASE).toBe('/__repo-content');

    await content.contentRequest('/capabilities', 'token');

    expect(fetch).toHaveBeenCalledWith(
      '/__repo-content/api/admin/content/capabilities',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  it('goes to the content API without the switch', async () => {
    const { content, flags, fetch } = await load({});
    expect(flags.CONTENT_REPO).toBe(false);

    await content.contentRequest('/capabilities', 'token');

    const [url] = fetch.mock.calls[0] as unknown as [string];
    expect(url).not.toContain('__repo-content');
    expect(url.endsWith('/api/admin/content/capabilities')).toBe(true);
  });

  it('lets the offline mock win when both are set, and says so', async () => {
    const { flags, warn } = await load({
      VITE_CONTENT_REPO: '1',
      VITE_CONTENT_MOCK: '1',
    });
    expect(flags.CONTENT_MOCK).toBe(true);
    expect(flags.CONTENT_REPO).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('the offline mock answers'),
    );
  });
});
