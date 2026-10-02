// @vitest-environment jsdom
/**
 * The shared export loader, over a real fetch (msw): paging, the lean body,
 * the `/items` fallback, the fingerprint that says when content changed, and
 * the hook refetching under CONTENT_KEY like every other content query.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import SuperJSON from 'superjson';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE, mockApi, startMockApi } from '@/test/mockApi';
import { CONTENT_KEY } from '../useAdminContent';
import {
  type ExportRow,
  exportFingerprint,
  exportQueryKey,
  fnv1a,
  loadContentExport,
  useContentExport,
  useContentExports,
} from '../useContentExport';

const caps = vi.hoisted(() => ({
  export: true,
  served: ['artist', 'song'] as string[],
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));
vi.mock('../useCapabilities', () => ({
  useCapabilities: () => ({
    feature: (name: string) => name === 'export' && caps.export,
    isServed: (kind: string) => caps.served.includes(kind),
  }),
}));

const url = (path: string) => `${API_BASE}/api/admin/content${path}`;
const superjson = (payload: unknown) =>
  new HttpResponse(SuperJSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

const row = (
  slug: string,
  body: Record<string, unknown> | null,
  extra: Partial<ExportRow> = {},
): ExportRow => ({
  id: `db-${slug}`,
  slug,
  status: 'published',
  editState: null,
  updatedAt: new Date('2026-09-29T00:00:00Z'),
  body,
  ...extra,
});

describe('fnv1a', () => {
  it('is the standard 32-bit FNV-1a', () => {
    // The published test vectors.
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('extends a previous hash', () => {
    expect(fnv1a('bar', fnv1a('foo'))).toBe(fnv1a('foobar'));
  });
});

describe('exportFingerprint', () => {
  const rows = [
    row('toto', { slug: 'toto', name: 'Toto' }),
    row('the-nobodies', { slug: 'the-nobodies', name: 'The Nobodies' }),
  ];
  const fp = exportFingerprint(rows);

  it('is the same for the same content, whatever the objects', () => {
    expect(exportFingerprint(structuredClone(rows))).toBe(fp);
    // A save that changed nothing moves `updatedAt`, and rebuilds nothing.
    expect(
      exportFingerprint(
        rows.map((r) => ({ ...r, updatedAt: new Date('2026-10-01') })),
      ),
    ).toBe(fp);
  });

  it.each<[string, (r: ExportRow) => ExportRow]>([
    ['a body field', (r) => ({ ...r, body: { ...r.body, name: 'TOTO' } })],
    ['the status', (r) => ({ ...r, status: 'draft' })],
    ['the review state', (r) => ({ ...r, editState: 'pending' })],
    ['a proposal', (r) => ({ ...r, pendingBody: { name: 'Toto!' } })],
    ['the slug', (r) => ({ ...r, slug: 'toto-2' })],
    ['a list title', (r) => ({ ...r, body: null, title: 'Toto' })],
  ])('changes with %s', (_, change) => {
    expect(exportFingerprint([change(rows[0]), rows[1]])).not.toBe(fp);
  });

  it('changes when a row comes or goes', () => {
    expect(exportFingerprint(rows.slice(0, 1))).not.toBe(fp);
    expect(exportFingerprint([])).toBe(exportFingerprint([]));
    expect(exportFingerprint([])).not.toBe(fp);
  });
});

describe('loadContentExport', () => {
  startMockApi();

  it('pages through /export, lean by default', async () => {
    const seen: string[] = [];
    mockApi.use(
      http.get(url('/export'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        seen.push(params.toString());
        return superjson(
          params.get('cursor')
            ? { items: [row('toto', { slug: 'toto' })], nextCursor: null }
            : { items: [row('abba', { slug: 'abba' })], nextCursor: 'p2' },
        );
      }),
    );
    const data = await loadContentExport('artist', 'export', 'token');
    expect(data.source).toBe('export');
    expect(data.rows.map((r) => r.slug)).toEqual(['abba', 'toto']);
    expect(data.rows[0].updatedAt).toBeInstanceOf(Date);
    expect(data.fingerprint).toBe(exportFingerprint(data.rows));
    expect(seen).toEqual([
      'kind=artist&omit=sections%2CaudioSources&limit=500',
      'kind=artist&omit=sections%2CaudioSources&limit=500&cursor=p2',
    ]);
  });

  it('asks for the whole body, or the published view, when told to', async () => {
    const seen: string[] = [];
    mockApi.use(
      http.get(url('/export'), ({ request }) => {
        seen.push(new URL(request.url).search);
        return superjson({ items: [], nextCursor: null });
      }),
    );
    await loadContentExport('song', 'export', 'token', { lean: false });
    await loadContentExport('song', 'export', 'token', { view: 'published' });
    expect(seen).toEqual([
      '?kind=song&limit=500',
      '?kind=song&view=published&omit=sections,audioSources&limit=500',
    ]);
  });

  it('falls back to the /items list, which has no bodies', async () => {
    mockApi.use(
      http.get(url('/items'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('kind')).toBe('artist');
        expect(params.get('limit')).toBe('200');
        return superjson({
          items: [
            {
              id: 'db-toto',
              slug: 'toto',
              title: 'Toto',
              status: 'draft',
              editState: 'pending',
            },
          ],
          nextCursor: null,
        });
      }),
    );
    const data = await loadContentExport('artist', 'list', 'token');
    expect(data.source).toBe('list');
    expect(data.rows).toEqual([
      {
        id: 'db-toto',
        slug: 'toto',
        status: 'draft',
        editState: 'pending',
        updatedAt: null,
        body: null,
        title: 'Toto',
      },
    ]);
  });
});

describe('exportQueryKey', () => {
  it('sits under CONTENT_KEY, so every save invalidates it', () => {
    expect(exportQueryKey('song', 'export').slice(0, 2)).toEqual([
      ...CONTENT_KEY,
    ]);
  });

  it('keeps lean, full and listed rows apart', () => {
    const keys = [
      exportQueryKey('song', 'export'),
      exportQueryKey('song', 'export', { lean: false }),
      exportQueryKey('song', 'list'),
      exportQueryKey('song', 'export', { view: 'published' }),
    ].map((key) => key.join('/'));
    expect(new Set(keys).size).toBe(4);
  });
});

describe('useContentExports', () => {
  startMockApi();

  const setup = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
  };

  it('loads the served kinds once, and says when their content changed', async () => {
    caps.export = true;
    caps.served = ['artist', 'song'];
    let name = 'Toto';
    const requests: string[] = [];
    mockApi.use(
      http.get(url('/export'), ({ request }) => {
        const kind = new URL(request.url).searchParams.get('kind')!;
        requests.push(kind);
        return superjson({
          items:
            kind === 'artist'
              ? [row('toto', { slug: 'toto', name })]
              : [row('africa', { id: 'africa', title: 'Africa' })],
          nextCursor: null,
        });
      }),
    );
    const { client, wrapper } = setup();
    // Two readers of the same kinds, as the pickers and the Table are.
    const { result } = renderHook(
      () => ({
        a: useContentExports(['artist', 'song', 'label']),
        b: useContentExports(['artist']),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.a.ready).toBe(true));
    const { a } = result.current;
    // `label` is not served: never asked for, and not waited on.
    expect(requests.sort()).toEqual(['artist', 'song']);
    expect([...a.byKind.keys()]).toEqual(['artist', 'song']);
    expect(a.byKind.get('artist')?.source).toBe('export');
    expect(a.fingerprint).toContain('label:off');
    await waitFor(() => expect(result.current.b.ready).toBe(true));

    // A save elsewhere invalidates CONTENT_KEY; the same content comes back.
    const before = a.fingerprint;
    const byKind = a.byKind;
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() => expect(result.current.a.fetching).toBe(false));
    expect(requests).toHaveLength(4);
    expect(result.current.a.fingerprint).toBe(before);
    // Nothing new to read, so readers keyed on it are left alone.
    expect(result.current.a.byKind).toBe(byKind);

    // Now the content really changes.
    name = 'TOTO';
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() => expect(result.current.a.fingerprint).not.toBe(before));
    expect(result.current.a.byKind.get('artist')?.rows[0].body?.name).toBe(
      'TOTO',
    );
  });

  it('serves one kind on its own, whole bodies apart from lean ones', async () => {
    caps.export = true;
    caps.served = ['song'];
    const seen: string[] = [];
    mockApi.use(
      http.get(url('/export'), ({ request }) => {
        seen.push(new URL(request.url).search);
        return superjson({
          items: [row('africa', { id: 'africa', sections: [] })],
          nextCursor: null,
        });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({
        lean: useContentExport('song'),
        full: useContentExport('song', { lean: false }),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.full.data).toBeDefined());
    await waitFor(() => expect(result.current.lean.data).toBeDefined());
    // Two entries, two requests: a writer's full body never comes from the
    // lean cache, whose songs have no chart.
    expect(seen.sort()).toEqual([
      '?kind=song&limit=500',
      '?kind=song&omit=sections,audioSources&limit=500',
    ]);
    expect(result.current.full.data?.rows[0].slug).toBe('africa');
  });

  it('reads the /items list when the server has no /export', async () => {
    caps.export = false;
    caps.served = ['artist'];
    mockApi.use(
      http.get(url('/items'), () =>
        superjson({
          items: [
            {
              id: 'db-toto',
              slug: 'toto',
              title: 'Toto',
              status: 'published',
              editState: null,
            },
          ],
          nextCursor: null,
        }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useContentExports(['artist']), {
      wrapper,
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    const data = result.current.byKind.get('artist');
    expect(data?.source).toBe('list');
    expect(data?.rows[0]).toMatchObject({ slug: 'toto', body: null });
  });

  it('reports a failed kind without pretending to be ready', async () => {
    caps.export = true;
    caps.served = ['artist'];
    mockApi.use(
      http.get(url('/export'), () =>
        HttpResponse.json({ error: 'Down' }, { status: 500 }),
      ),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useContentExports(['artist']), {
      wrapper,
    });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.ready).toBe(false);
    expect(result.current.byKind.size).toBe(0);
  });
});
