// @vitest-environment jsdom
/**
 * Capabilities and their fallbacks, over a real fetch (msw): what the console
 * turns on against the contract's API, against today's API (no
 * /capabilities), and against an API it can learn nothing from.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import SuperJSON from 'superjson';
import { describe, expect, it, vi } from 'vitest';
import { artifactsVersion as CLIENT_ARTIFACTS_VERSION } from '@/scripts/apiContract/manifest.json';
import { API_BASE, mockApi, startMockApi } from '@/test/mockApi';
import { contentRequest, noteServerArtifactsVersion } from '../useAdminContent';
import {
  capabilityHelpers,
  LEGACY_KINDS,
  loadCapabilities,
  useCapabilities,
} from '../useCapabilities';

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));

const url = (path: string) => `${API_BASE}/api/admin/content${path}`;
const superjson = (payload: unknown) =>
  new HttpResponse(SuperJSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
const notFound = () =>
  HttpResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

const CAPABILITIES = {
  kinds: [
    {
      kind: 'song',
      schemaVersion: 1,
      bundle: 'songs',
      identity: 'id',
      authoritative: false,
    },
    {
      kind: 'artist',
      schemaVersion: 1,
      bundle: 'artists',
      identity: 'slug',
      authoritative: true,
    },
  ],
  features: {
    export: true,
    lookup: true,
    create: true,
    rename: false,
    merge: false,
    asset: true,
    teachUsage: false,
    suggestions: true,
  },
  artifactsVersion: 2,
};

const OVERVIEW = ['song', 'globe_event', 'globe_city'].map((kind) => ({
  kind,
  total: 1,
  published: 1,
  changedSincePublish: 0,
  pendingReview: 0,
  liveVersion: 1,
  livePublishedAt: null,
}));

describe('loadCapabilities', () => {
  startMockApi();

  it('reads /capabilities when the server has it', async () => {
    mockApi.use(http.get(url('/capabilities'), () => superjson(CAPABILITIES)));
    const caps = await loadCapabilities('token');
    expect(caps.source).toBe('capabilities');
    expect(caps.artifactsVersion).toBe(2);

    const helpers = capabilityHelpers(caps);
    expect(helpers.isServed('artist')).toBe(true);
    expect(helpers.isServed('studio')).toBe(false);
    expect(helpers.identityOf('artist')).toBe('slug');
    expect(helpers.isAuthoritative('artist')).toBe(true);
    expect(helpers.feature('create')).toBe(true);
    expect(helpers.feature('rename')).toBe(false);
    // Suggestions and the decisions log (contract §10).
    expect(helpers.feature('suggestions')).toBe(true);
    expect(helpers.songSchemaLevel).toBe(1);
  });

  it('reads a song v2 server as song level 2', async () => {
    // What the offline mock reports in its `all` mode (mockKinds.ts).
    mockApi.use(
      http.get(url('/capabilities'), () =>
        superjson({
          ...CAPABILITIES,
          kinds: [
            { ...CAPABILITIES.kinds[0], schemaVersion: 2 },
            {
              kind: 'globe_event',
              schemaVersion: 2,
              bundle: 'globe-events',
              identity: 'id',
              authoritative: false,
            },
          ],
        }),
      ),
    );
    const helpers = capabilityHelpers(await loadCapabilities('token'));
    expect(helpers.songSchemaLevel).toBe(2);
    expect(helpers.schemaVersionOf('song')).toBe(2);
    // The event body v2, which E's event links wait for.
    expect(helpers.schemaVersionOf('globe_event')).toBe(2);
    expect(helpers.schemaVersionOf('artist')).toBe(0);
  });

  it('reads where saves land: the repo server says so, anything else is the API', async () => {
    mockApi.use(
      http.get(url('/capabilities'), () =>
        superjson({ ...CAPABILITIES, store: 'repo' }),
      ),
    );
    const repo = await loadCapabilities('token');
    expect(repo.store).toBe('repo');
    expect(capabilityHelpers(repo).store).toBe('repo');

    mockApi.use(
      http.get(url('/capabilities'), () =>
        superjson({ ...CAPABILITIES, store: 'somewhere else' }),
      ),
    );
    expect((await loadCapabilities('token')).store).toBe('api');
    mockApi.use(http.get(url('/capabilities'), () => superjson(CAPABILITIES)));
    expect((await loadCapabilities('token')).store).toBe('api');
    expect(capabilityHelpers(null).store).toBe('api');
  });

  it('falls back to /overview rows on a 404: song level 0, nothing on', async () => {
    mockApi.use(
      http.get(url('/capabilities'), notFound),
      http.get(url('/overview'), () => superjson(OVERVIEW)),
    );
    const caps = await loadCapabilities('token');
    expect(caps.source).toBe('overview');
    expect(caps.kinds.map((entry) => entry.kind)).toEqual([
      'song',
      'globe_event',
      'globe_city',
    ]);
    expect(caps.kinds.every((entry) => !entry.authoritative)).toBe(true);
    expect(Object.values(caps.features).some(Boolean)).toBe(false);
    expect(caps.artifactsVersion).toBeNull();
    expect(caps.store).toBe('api');

    const helpers = capabilityHelpers(caps);
    expect(helpers.songSchemaLevel).toBe(0);
    expect(helpers.isServed('artist_location')).toBe(false);
    // Identity is the contract's even when the server does not say.
    expect(helpers.identityOf('globe_city')).toBe('id');
  });

  it('assumes the six legacy kinds when /overview fails too', async () => {
    mockApi.use(
      http.get(url('/capabilities'), notFound),
      http.get(url('/overview'), () =>
        HttpResponse.json({ error: 'Down' }, { status: 500 }),
      ),
    );
    const caps = await loadCapabilities('token');
    expect(caps.source).toBe('legacy');
    expect(caps.kinds.map((entry) => entry.kind)).toEqual([...LEGACY_KINDS]);
    expect(capabilityHelpers(caps).songSchemaLevel).toBe(0);
  });

  it('surfaces any other /capabilities failure as the error it is', async () => {
    mockApi.use(
      http.get(url('/capabilities'), () =>
        HttpResponse.json({ error: 'Boom', code: 'INTERNAL' }, { status: 500 }),
      ),
    );
    await expect(loadCapabilities('token')).rejects.toMatchObject({
      status: 500,
      message: 'Boom',
    });
  });

  it('sends X-Content-Artifacts only to a server that reported a version', async () => {
    const seen: (string | null)[] = [];
    mockApi.use(
      http.get(url('/overview'), ({ request }) => {
        seen.push(request.headers.get('X-Content-Artifacts'));
        return superjson([]);
      }),
      http.get(url('/capabilities'), () => superjson(CAPABILITIES)),
    );
    noteServerArtifactsVersion(null);
    await contentRequest('/overview', 'token');
    await loadCapabilities('token');
    await contentRequest('/overview', 'token');
    noteServerArtifactsVersion(null);
    // The header carries this client's copy of the contract, not the server's.
    expect(seen).toEqual([null, String(CLIENT_ARTIFACTS_VERSION)]);
  });
});

describe('useCapabilities', () => {
  startMockApi();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );

  it('serves nothing while loading, then what the server serves', async () => {
    mockApi.use(http.get(url('/capabilities'), () => superjson(CAPABILITIES)));
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    expect(result.current.isServed('song')).toBe(false);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isServed('artist')).toBe(true);
    expect(result.current.servedKinds).toEqual(['song', 'artist']);
    noteServerArtifactsVersion(null);
  });

  it('falls back to the legacy six when /capabilities errors outright', async () => {
    mockApi.use(
      http.get(url('/capabilities'), () =>
        HttpResponse.json({ error: 'Boom' }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.servedKinds).toEqual([...LEGACY_KINDS]);
    expect(result.current.feature('export')).toBe(false);
  });
});
