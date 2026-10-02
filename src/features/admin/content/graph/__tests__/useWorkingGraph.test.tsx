// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphSnapshot } from '@/content/graph/deriveGraph';
import { CONTENT_KEY } from '@/hooks/data/admin/useAdminContent';

/**
 * The working graph over a stubbed content API and a two-artist repo: repo
 * mode without `/export`, the merge with it, and the rebuild rule — a
 * refetch that brought back the same content rebuilds nothing, a change
 * rebuilds once while the previous graph stays on screen.
 */

const api = vi.hoisted(() => ({
  export: true,
  authoritative: [] as string[],
  capsKnown: true,
  capsFailed: false,
  served: ['artist'] as string[],
  artists: [] as Record<string, unknown>[],
  /** Song pins: their key (the act's name in lowercase) and store id. */
  pins: [] as { key: string; id: string; status?: string }[],
  fail: false,
  repoFail: false,
  requests: [] as string[],
}));

const builds = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/content/graph/deriveGraph', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/content/graph/deriveGraph')>();
  return {
    ...actual,
    buildGraph: (snapshot: GraphSnapshot) => {
      builds.count += 1;
      return actual.buildGraph(snapshot);
    },
  };
});

const REPO: GraphSnapshot = {
  artists: [
    { slug: 'toto', name: 'Toto' },
    { slug: 'the-nobodies', name: 'The Nobodies' },
  ],
};

vi.mock('../repoSnapshot', async () => {
  const { buildGraph } = await import('@/content/graph/deriveGraph');
  return {
    loadRepoGraph: async () => {
      if (api.repoFail) throw new Error('chunk failed');
      return { snapshot: REPO, graph: buildGraph(REPO) };
    },
  };
});

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  // A failed /capabilities falls back to the kinds every API has, with no
  // features — `/export` off — and says so in `isError`.
  useCapabilities: () => ({
    capabilities: api.capsKnown ? {} : null,
    feature: (name: string) =>
      name === 'export' && api.export && !api.capsFailed,
    isServed: (kind: string) => api.served.includes(kind),
    isAuthoritative: (kind: string) => api.authoritative.includes(kind),
    isError: api.capsFailed,
    error: api.capsFailed ? new Error('500 from /capabilities') : null,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  return {
    ...actual,
    contentRequest: async (path: string) => {
      api.requests.push(path);
      if (api.fail) throw new actual.ContentApiError(500, { error: 'Down' });
      if (path.startsWith('/export?kind=artist_location')) {
        return {
          items: api.pins.map((pin) => ({
            id: pin.id,
            slug: pin.key,
            status: pin.status ?? 'published',
            editState: null,
            updatedAt: new Date(),
            body: { id: pin.key, city: 'Memphis', country: 'US' },
          })),
          nextCursor: null,
        };
      }
      if (path.startsWith('/items?kind=artist_location')) {
        return {
          items: api.pins.map((pin) => ({
            id: pin.id,
            slug: pin.key,
            title: pin.key,
            status: pin.status ?? 'published',
            editState: null,
          })),
          nextCursor: null,
        };
      }
      if (path.startsWith('/export?kind=artist')) {
        return {
          items: api.artists.map((body) => ({
            id: `db-${String(body.slug)}`,
            slug: body.slug,
            status: body.status ?? 'published',
            editState: body.pending ? 'pending' : null,
            updatedAt: new Date(),
            body: { slug: body.slug, name: body.name },
          })),
          nextCursor: null,
        };
      }
      if (path.startsWith('/items?kind=artist')) {
        return {
          items: api.artists.map((body) => ({
            id: `db-${String(body.slug)}`,
            slug: body.slug,
            title: body.name,
            status: 'draft',
            editState: null,
          })),
          nextCursor: null,
        };
      }
      throw new Error(`unexpected ${path}`);
    },
  };
});

// Imported after the mocks.
const { useRetryWorkingGraph, useWorkingGraph } = await import(
  '../useWorkingGraph'
);

const setup = (options?: Parameters<typeof useWorkingGraph>[0]) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  // Every state the hook hands out, in order, for the in-between checks.
  const renders: ReturnType<typeof useWorkingGraph>[] = [];
  const hook = renderHook(
    () => {
      const state = useWorkingGraph(options);
      renders.push(state);
      return state;
    },
    { wrapper },
  );
  return { client, renders, wrapper, ...hook };
};

afterEach(() => {
  api.export = true;
  api.authoritative = [];
  api.capsKnown = true;
  api.capsFailed = false;
  api.served = ['artist'];
  api.artists = [];
  api.pins = [];
  api.fail = false;
  api.repoFail = false;
  api.requests = [];
  builds.count = 0;
});

describe('useWorkingGraph', () => {
  it('shows the repo graph, read-only, when the API has no /export', async () => {
    api.export = false;
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const { result } = setup();
    await waitFor(() => expect(result.current.items.size).toBe(1));
    expect(result.current.mode).toBe('repo');
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.fingerprint).toBeNull();
    expect(result.current.graph?.nodes.get('artist:toto')?.status).toBe('code');
    // The list still joins each row to its API id and state.
    expect(result.current.items.get('artist:toto')).toMatchObject({
      id: 'db-toto',
      status: 'draft',
      body: null,
    });
    expect(api.requests).toEqual(['/items?kind=artist&limit=200']);
    // The repo graph is the one the mind map builds; nothing else is built.
    expect(builds.count).toBe(1);
  });

  it('lays the exported items over the repo graph', async () => {
    api.authoritative = ['artist'];
    api.artists = [
      { slug: 'toto', name: 'TOTO' },
      { slug: 'jeff-porcaro', name: 'Jeff Porcaro', pending: true },
    ];
    const { result, renders } = setup();
    await waitFor(() => expect(result.current.mode).toBe('working'));
    // The repo graph showed first, saying a working copy was coming.
    expect(renders.find((state) => state.graph)).toMatchObject({
      mode: 'repo',
      isRefreshing: true,
    });
    const { graph, snapshot, atlas, items, fingerprint } = result.current;
    expect(graph?.nodes.get('artist:toto')).toMatchObject({
      label: 'TOTO',
      status: 'published',
      origin: 'api',
    });
    expect(graph?.nodes.get('artist:jeff-porcaro')?.status).toBe('pending');
    // Authoritative: the store deleted them, so they stay gone.
    expect(graph?.nodes.has('artist:the-nobodies')).toBe(false);
    expect(snapshot?.artists).toHaveLength(2);
    expect(atlas?.graph).toBe(graph);
    expect(items.get('artist:jeff-porcaro')?.id).toBe('db-jeff-porcaro');
    expect(fingerprint).toContain('artist:export:');
    expect(result.current.isRefreshing).toBe(false);
  });

  it('rebuilds when the content changes, and only then', async () => {
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const { client, result } = setup();
    await waitFor(() => expect(result.current.mode).toBe('working'));
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    const first = result.current.graph;
    const built = builds.count;

    // A save of something else: every content query refetches, and the
    // artists come back as they were.
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(api.requests).toHaveLength(2);
    expect(builds.count).toBe(built);
    expect(result.current.graph).toBe(first);

    // A save of Toto's name.
    api.artists = [{ slug: 'toto', name: 'Toto (edited)' }];
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() =>
      expect(result.current.graph?.nodes.get('artist:toto')?.label).toBe(
        'Toto (edited)',
      ),
    );
    expect(builds.count).toBe(built + 1);
    expect(result.current.mode).toBe('working');
  });

  it('keeps the previous graph on screen while the next one builds', async () => {
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const { client, result, renders } = setup();
    await waitFor(() => expect(result.current.mode).toBe('working'));
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    const first = result.current.graph;

    api.artists = [{ slug: 'toto', name: 'Toto (edited)' }];
    const from = renders.length;
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() => expect(result.current.graph).not.toBe(first));
    const since = renders.slice(from);
    // Never a blank or the repo graph in between: the old one, marked as
    // refreshing, until the new one replaces it.
    for (const state of since) {
      expect(state.mode).toBe('working');
      expect(state.graph).toBeDefined();
    }
    expect(
      since.some((state) => state.graph === first && state.isRefreshing),
    ).toBe(true);
    expect(since.at(-1)?.isRefreshing).toBe(false);
  });

  it('falls back to the repo graph, saying why, when the export fails', async () => {
    api.fail = true;
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.mode).toBe('repo');
    expect(result.current.graph?.nodes.has('artist:the-nobodies')).toBe(true);
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });

  it('waits for the capabilities before deciding', async () => {
    api.capsKnown = false;
    api.export = false;
    const { result } = setup();
    await waitFor(() => expect(result.current.graph).toBeDefined());
    expect(result.current.mode).toBe('repo');
    expect(result.current.isRefreshing).toBe(true);
  });
  it('reads only the song pins without /export, for a page that shows no items', async () => {
    api.export = false;
    api.served = ['artist', 'artist_location'];
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    api.pins = [
      { key: 'toto', id: 'db-pin-toto' },
      { key: 'the nobodies', id: 'db-pin-nobodies', status: 'archived' },
    ];
    const { result } = setup({ items: false });
    await waitFor(() => expect(result.current.pins).toBeDefined());
    expect(result.current.mode).toBe('repo');
    // No item lists but the pins': the map and Integrity show no states.
    expect(api.requests).toEqual(['/items?kind=artist_location&limit=200']);
    expect(result.current.items.size).toBe(0);
    // A pin's key → its item, for the links that open the pin; an archived
    // pin is not one to open.
    expect([...result.current.pins!]).toEqual([['toto', 'db-pin-toto']]);
  });

  it('knows the pins from their export in the working copy', async () => {
    api.served = ['artist', 'artist_location'];
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    api.pins = [{ key: 'toto', id: 'db-pin-toto' }];
    const { result } = setup({ items: false });
    await waitFor(() => expect(result.current.mode).toBe('working'));
    // With /export every kind is read either way: the copy is built from them.
    expect(api.requests).toEqual(
      expect.arrayContaining([
        '/export?kind=artist&omit=sections,audioSources&limit=500',
        '/export?kind=artist_location&omit=sections,audioSources&limit=500',
      ]),
    );
    expect(result.current.pins?.get('toto')).toBe('db-pin-toto');
  });

  it('says when /capabilities failed, rather than pass it off as no /export', async () => {
    api.capsFailed = true;
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const { result } = setup();
    await waitFor(() => expect(result.current.graph).toBeDefined());
    expect(result.current.mode).toBe('repo');
    expect(result.current.isRefreshing).toBe(false);
    expect(String(result.current.error)).toContain('500 from /capabilities');
  });

  it('is not loading, but failed, when the repo graph failed', async () => {
    api.repoFail = true;
    // An export failing too, before the repo graph: that one is for later.
    api.fail = true;
    const { result, renders } = setup();
    // Retried once by useAtlasGraph, then given up on.
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 5_000,
    });
    expect(result.current.graph).toBeUndefined();
    expect(String(result.current.error)).toContain('chunk failed');
    // While it was on its way, it was loading, whatever the export said.
    expect(
      renders.filter((state) => state.error && !state.graph).at(0)?.isLoading,
    ).toBe(true);
  });

  it('tries again only what failed: never what loaded, nor a build', async () => {
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const { client, result, wrapper } = setup();
    await waitFor(() => expect(result.current.mode).toBe('working'));
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    const built = builds.count;

    // A refresh fails: the working copy stays, marked stale by its error.
    api.fail = true;
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.mode).toBe('working');

    api.fail = false;
    api.requests = [];
    const retry = renderHook(() => useRetryWorkingGraph(), { wrapper });
    await act(async () => retry.result.current());
    await waitFor(() => expect(result.current.error).toBeNull());
    // The export that failed, once; not the repo graph, which loaded, and
    // no build — the content came back as it was.
    expect(api.requests).toEqual([
      '/export?kind=artist&omit=sections,audioSources&limit=500',
    ]);
    expect(builds.count).toBe(built);
  });

  it('lets an old build go soon after the content moves on', async () => {
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const { client, result } = setup();
    await waitFor(() => expect(result.current.mode).toBe('working'));
    api.artists = [{ slug: 'toto', name: 'Toto (edited)' }];
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() =>
      expect(result.current.graph?.nodes.get('artist:toto')?.label).toBe(
        'Toto (edited)',
      ),
    );
    const builtQueries = client
      .getQueryCache()
      .findAll({ queryKey: ['console', 'atlas-graph', 'working'] });
    expect(builtQueries.length).toBeGreaterThan(1);
    // Some 20 MB each: none is kept for minutes.
    for (const query of builtQueries) {
      expect(query.gcTime).toBeLessThanOrEqual(30_000);
    }
  });
});
