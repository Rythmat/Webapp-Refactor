/**
 * The mock switched on, end to end: the admin API client and the content
 * stores both reach the mock, and a publish through the console's own calls
 * changes what the app reads.
 *
 * `CONTENT_MOCK` is read once at module load, so the modules are re-imported
 * after the env is stubbed.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type {
  ContentApiError,
  ContentItemDetail,
  ContentListItem,
} from '@/hooks/data/admin/useAdminContent';
import { sessionToken } from './sessionToken';

describe('with VITE_CONTENT_MOCK=1', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_CONTENT_MOCK', '1');
    vi.resetModules();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('routes the CDN and the admin API through the mock', async () => {
    const manifest = await import('@/content/manifest');
    const songs = await import('@/content/songStore');
    const api = await import('@/hooks/data/admin/useAdminContent');
    const mock = await import('../handleMockRequest');

    expect(manifest.contentCdnUrl()).toBe('mock://cdn');
    expect((await manifest.fetchManifest()).kinds.songs?.itemCount).toBe(640);

    await songs.ensureSongContent();
    expect(songs.songContentSource()).toBe('cdn');
    expect(songs.getSong('africa')?.title).toBe('Africa');

    // The mock reads the caller's role from the token, as the API does.
    const admin = sessionToken({ role: 'admin', user_id: 'admin-1' });
    const request = <T>(path: string, init?: RequestInit) =>
      api.contentRequest<T>(path, admin, init);

    const anonymous = (await api
      .contentRequest('/overview', 'not-a-session')
      .catch((caught: unknown) => caught)) as ContentApiError;
    expect(anonymous.status).toBe(401);

    const found = await request<ContentListItem>(
      '/items/lookup?kind=song&slug=africa',
    );
    const detail = await request<ContentItemDetail>(`/items/${found.id}`);
    // SuperJSON revives dates, as it does for the real API.
    expect(detail.updatedAt).toBeInstanceOf(Date);

    const saved = api.unwrapSaveResponse(
      await request('/items', {
        method: 'PUT',
        body: JSON.stringify({
          kind: 'song',
          slug: 'africa',
          body: { ...detail.body, title: 'Africa (published)' },
        }),
      }),
    );
    expect(saved.item.body.title).toBe('Africa (published)');
    // Saved is not published: the app still reads the live release.
    expect(songs.getSong('africa')?.title).toBe('Africa');

    const created = await request<{ releaseId: string; parts: number[] }>(
      '/releases',
      { method: 'POST', body: JSON.stringify({ kind: 'song' }) },
    );
    for (const part of created.parts)
      await request(`/releases/${created.releaseId}/parts/${part}`, {
        method: 'POST',
      });
    await request(`/releases/${created.releaseId}/activate`, {
      method: 'POST',
    });
    expect(songs.getSong('africa')?.title).toBe('Africa (published)');
    expect((await manifest.fetchManifest()).kinds.songs?.version).toBe(2);

    // Errors come back typed, with the mock's real status and code.
    const taken = (await request('/items', {
      method: 'PUT',
      body: JSON.stringify({
        kind: 'song',
        slug: 'africa',
        body: detail.body,
        create: true,
      }),
    }).catch((caught: unknown) => caught)) as ContentApiError;
    expect(taken).toBeInstanceOf(api.ContentApiError);
    expect(taken.status).toBe(409);
    expect(taken.code).toBe('SLUG_TAKEN');

    // Uploads answer with a URL the page can use straight away.
    const form = new FormData();
    form.append('file', new File(['png'], 'cover.png', { type: 'image/png' }));
    const upload = await mock.handleMockRequest(
      'http://localhost:3000/api/admin/content/asset',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin}` },
        body: form,
      },
    );
    expect(upload.status).toBe(200);
    expect(((await upload.json()) as { url: string }).url).toMatch(/^blob:/);

    // Reset puts the seed back, in the app too.
    await mock.resetContentMock();
    expect(songs.getSong('africa')?.title).toBe('Africa');
  }, 60_000);
});
