// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  type DecisionCounts as MockDecisionCounts,
  type DecisionResult as MockDecisionResult,
  type DecisionsFile as MockDecisionsFile,
  decisionsFileText as mockFileText,
  parseDecisionsFile,
} from '@/features/admin/content/mock/decisions';
import type {
  BatchSummary,
  SuggestionRow as MockRow,
} from '@/features/admin/content/mock/suggestions';
import { CONTENT_KEY, ContentApiError } from '../useAdminContent';
import {
  type DecisionCounts,
  type DecisionResult,
  type DecisionsFile,
  decisionsFileText,
  loadSuggestions,
  plainRows,
  postDecisions,
  reopenable,
  SUGGESTIONS_KEY,
  type SuggestionBatch,
  type SuggestionRow,
  suggestionsPath,
  useDecideSuggestions,
  useReopenSuggestion,
  useSuggestions,
} from '../useSuggestions';

/**
 * The console's client for suggestions (contract §10): the query it sends,
 * every page read, decisions posted (a lone refusal read back as a result),
 * the decisions file in its committed shape — and its types held to what the
 * offline mock, the contract's reference server, answers.
 */

const net = vi.hoisted(() => ({
  calls: [] as { path: string; method: string; body?: unknown }[],
  answer: (() => undefined) as (path: string, method: string) => unknown,
  served: true,
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'test', role: 'admin' }),
}));
vi.mock('../useCapabilities', () => ({
  useCapabilities: () => ({
    feature: (name: string) => name === 'suggestions' && net.served,
  }),
}));
vi.mock('../useAdminContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useAdminContent')>();
  return {
    ...actual,
    contentRequest: async (
      path: string,
      _token: string,
      init?: RequestInit,
    ) => {
      const method = init?.method ?? 'GET';
      net.calls.push({
        path,
        method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return net.answer(path, method);
    },
  };
});

beforeEach(() => {
  net.calls = [];
  net.served = true;
  net.answer = () => undefined;
});

const decision = {
  suggestionId: 'a1',
  op: 'accept' as const,
  target: { kind: 'artist', slug: 'marvin-gaye' },
  path: 'born.date',
  value: '1939-04-02',
  valueHash: '0123456789abcdef',
  method: 'bulk' as const,
  by: 'admin-1',
  at: '2026-10-01T00:00:01.000Z',
};

const page = (items: unknown[], nextCursor: string | null) => ({
  items,
  nextCursor,
  total: 3,
  batches: [],
  decisions: { total: 0, notDownloaded: 0, proposed: 0 },
  replay: null,
  notServed: { artifacts: [], planners: null },
});

describe('the query', () => {
  it('names each filter as the server reads it', () => {
    expect(
      suggestionsPath({
        kind: 'globe_event',
        slugs: ['evt-a', 'evt-b'],
        path: 'placeId',
        provider: 'app',
        tier: 'sure',
        status: ['open', 'conflict'],
        decision: ['open'],
        unreviewed: true,
      }),
    ).toBe(
      '/suggestions?kind=globe_event&slug=evt-a%2Cevt-b&path=placeId&provider=app&tier=sure&status=open%2Cconflict&decision=open&unreviewed=1&limit=1000',
    );
    expect(suggestionsPath({}, { cursor: 'c2', limit: 5 })).toBe(
      '/suggestions?limit=5&cursor=c2',
    );
  });

  it('reads every page as one', async () => {
    const row = (id: string) => ({
      suggestion: {
        id,
        path: 'year',
        display: id,
        evidence: [],
        sources: [{ provider: 'app' }],
      },
      status: 'open',
    });
    net.answer = (path) =>
      path.includes('cursor=next')
        ? page([row('c')], null)
        : page([row('a'), row('b')], 'next');
    const all = await loadSuggestions('t', { kind: 'artist' });
    expect(all.rows).toEqual([row('a'), row('b'), row('c')]);
    expect(all.total).toBe(3);
    expect(net.calls.map((c) => c.path)).toEqual([
      '/suggestions?kind=artist&limit=1000',
      '/suggestions?kind=artist&limit=1000&cursor=next',
    ]);
  });

  it('shows rows in the site’s words, and never an outside id row', () => {
    const identity = {
      suggestion: {
        id: 'id1',
        path: 'externalIds.mbid',
        display: 'MusicBrainz: Marvin Gaye',
        evidence: ['name exact'],
        sources: [{ provider: 'musicbrainz' }],
      },
      status: 'open',
    } as unknown as SuggestionRow;
    const born = {
      suggestion: {
        id: 'b1',
        path: 'born',
        display: 'Born 2 Apr 1939',
        evidence: [
          'MusicBrainz life-span begins 1939-04-02',
          'Wikidata Q2831 names the same MusicBrainz artist (P434)',
          'release 535ab4b1-9e02-3fc2-a831-64f42c8740b4 on MusicBrainz',
        ],
        sources: [
          {
            provider: 'musicbrainz',
            url: 'https://musicbrainz.org/artist/afdb7919-059d-43c1-b668-ba1d265e7e42',
            label: 'life-span begin',
            externalId: 'afdb7919-059d-43c1-b668-ba1d265e7e42',
          },
          {
            provider: 'wikidata',
            url: 'https://www.wikidata.org/wiki/Q2831',
            label: 'P569',
          },
        ],
      },
      status: 'open',
      dependency: { id: 'id1', display: 'MusicBrainz: Marvin Gaye' },
    } as unknown as SuggestionRow;
    const rows = plainRows([identity, born]);
    expect(rows.map((row) => row.suggestion.id)).toEqual(['b1']);
    const [shown] = rows;
    expect(shown.suggestion.evidence).toEqual([
      'Outside life-span begins 1939-04-02',
      'The outside source names the same outside artist',
      'release on the outside source',
    ]);
    expect(shown.suggestion.sources).toEqual([
      { provider: 'musicbrainz', label: 'life-span begin' },
      { provider: 'wikidata' },
    ]);
    expect(shown.dependency?.display).toBe('Outside source: Marvin Gaye');
    expect(JSON.stringify(rows)).not.toMatch(
      /musicbrainz\.org|wikidata\.org|MusicBrainz|Wikidata|Q2831|535ab4b1/,
    );
  });

  it('asks nothing of a server without suggestions', async () => {
    net.served = false;
    const { result } = renderHook(() => useSuggestions({ kind: 'artist' }), {
      wrapper: wrapper(new QueryClient()),
    });
    expect(result.current.served).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(net.calls).toEqual([]);
  });
});

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('deciding', () => {
  it('posts the decisions and hands back one result each', async () => {
    const results: DecisionResult[] = [
      { suggestionId: 'a1', outcome: 'saved', decision, itemId: 'db-1' },
    ];
    net.answer = () => ({ results });
    await expect(
      postDecisions('t', [
        { suggestionId: 'a1', op: 'accept', method: 'bulk' },
      ]),
    ).resolves.toEqual({ results });
    expect(net.calls).toEqual([
      {
        path: '/suggestions/decisions',
        method: 'POST',
        body: {
          decisions: [{ suggestionId: 'a1', op: 'accept', method: 'bulk' }],
        },
      },
    ]);
  });

  it("sends a bulk accept's threshold with its decisions, and nothing when there is none", async () => {
    net.answer = () => ({ results: [] });
    const bulk = [
      { suggestionId: 'a1', op: 'accept' as const, method: 'bulk' as const },
    ];
    await postDecisions('t', bulk, { threshold: 0.75 });
    await postDecisions('t', bulk);
    expect(net.calls.map((c) => c.body)).toEqual([
      { decisions: bulk, threshold: 0.75 },
      { decisions: bulk },
    ]);
  });

  it('reopens a reject or a drop, and says which rows can be', async () => {
    expect(
      (['rejected', 'dropped', 'open', 'accepted', 'applied'] as const).map(
        (status) => reopenable({ status }),
      ),
    ).toEqual([true, true, false, false, false]);

    const results: DecisionResult[] = [
      {
        suggestionId: 'b2',
        outcome: 'recorded',
        decision: { ...decision, suggestionId: 'b2', op: 'reopen' },
      },
    ];
    net.answer = () => ({ results });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReopenSuggestion(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await expect(result.current.mutateAsync('b2')).resolves.toEqual({
        results,
      });
    });
    expect(net.calls).toEqual([
      {
        path: '/suggestions/decisions',
        method: 'POST',
        body: { decisions: [{ suggestionId: 'b2', op: 'reopen' }] },
      },
    ]);
    // Refreshed as after any decision.
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['admin', 'content'],
      refetchType: 'none',
    });
  });

  it('reads a lone refusal, answered as an error, back as its result', async () => {
    net.answer = () => {
      throw new ContentApiError(409, {
        error: 'placeId it holds something else.',
        code: 'SUGGESTION_CONFLICT',
        suggestionId: 'a1',
        current: 'memphis',
      });
    };
    await expect(
      postDecisions('t', [{ suggestionId: 'a1', op: 'accept' }]),
    ).resolves.toEqual({
      results: [
        {
          suggestionId: 'a1',
          outcome: 'refused',
          status: 409,
          code: 'SUGGESTION_CONFLICT',
          error: 'placeId it holds something else.',
          current: 'memphis',
        },
      ],
    });
    // Anything else is the request's own failure.
    net.answer = () => {
      throw new ContentApiError(403, { error: 'No.', code: 'FORBIDDEN' });
    };
    await expect(
      postDecisions('t', [{ suggestionId: 'a1', op: 'reject' }]),
    ).rejects.toThrow('No.');
  });

  it('refetches every content query once a decision is made, waiting only for the item and the row', async () => {
    net.answer = () => ({ results: [] });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const row = { kind: 'artist', slugs: ['marvin-gaye'] };
    const table = { kind: 'artist', status: ['open', 'conflict'] };
    const calls = { item: 0, row: 0, table: 0 };
    let release = () => {};
    const { result } = renderHook(
      () => {
        useQuery({
          queryKey: [...CONTENT_KEY, 'item', 'db-1'],
          queryFn: async () => ++calls.item,
        });
        useQuery({
          queryKey: [...SUGGESTIONS_KEY, row],
          queryFn: async () => ++calls.row,
        });
        // The table's whole list: its refetch takes as long as it takes.
        useQuery({
          queryKey: [...SUGGESTIONS_KEY, table],
          queryFn: () => {
            calls.table += 1;
            return calls.table === 1
              ? 1
              : new Promise<number>((resolve) => {
                  release = () => resolve(calls.table);
                });
          },
        });
        return useDecideSuggestions({ waitFor: row });
      },
      { wrapper: wrapper(client) },
    );
    await waitFor(() => expect(calls).toEqual({ item: 1, row: 1, table: 1 }));
    await act(async () => {
      await result.current.mutateAsync([{ suggestionId: 'a1', op: 'review' }]);
    });
    // Resolved once the item and the row's own list were read again, with
    // the table's list still on its way behind it.
    expect(calls).toEqual({ item: 2, row: 2, table: 2 });
    expect(client.getQueryState([...SUGGESTIONS_KEY, table])?.fetchStatus).toBe(
      'fetching',
    );
    // One invalidation of everything, as after any save.
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['admin', 'content'],
      refetchType: 'none',
    });
    await act(async () => release());
  });
});

describe('the decisions file', () => {
  const file: DecisionsFile = {
    artifactsVersion: 1,
    decisions: [decision, { ...decision, suggestionId: 'b2', op: 'reject' }],
  };

  it('downloads in the shape the repo commits: one decision a line', () => {
    const text = decisionsFileText(file);
    expect(text).toBe(mockFileText(file));
    // The opening lines, a line per decision, the closing ones.
    expect(text.split('\n')).toHaveLength(8);
    expect(parseDecisionsFile(text)).toEqual({
      decisions: file.decisions,
      refused: [],
      error: null,
    });
    expect(decisionsFileText({ artifactsVersion: 1, decisions: [] })).toBe(
      '{\n  "artifactsVersion": 1,\n  "decisions": []\n}\n',
    );
  });
});

describe('the shapes, held to the mock server', () => {
  it('reads what the server answers', () => {
    expectTypeOf<MockRow>().toMatchTypeOf<SuggestionRow>();
    expectTypeOf<BatchSummary>().toMatchTypeOf<SuggestionBatch>();
    expectTypeOf<MockDecisionCounts>().toMatchTypeOf<DecisionCounts>();
    expectTypeOf<MockDecisionResult>().toMatchTypeOf<DecisionResult>();
    expectTypeOf<MockDecisionsFile>().toMatchTypeOf<DecisionsFile>();
  });
});
