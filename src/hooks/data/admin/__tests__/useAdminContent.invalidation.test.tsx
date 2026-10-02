// @vitest-environment jsdom
/**
 * Every content write invalidates the whole CONTENT_KEY namespace, over a
 * real fetch (msw): the exports the Table, the mind map and Integrity build
 * their working graph from sit under it, so a save, a delete, a verdict on
 * a proposal, a publish, a cancelled release or a rollback made anywhere in
 * the console refreshes all three (Table review finding 16). The bulk write
 * loop (useBulkWrite.test.tsx) and the song import
 * (AdminSongImportPage.test.tsx) invalidate the same key once per run.
 */
import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import SuperJSON from 'superjson';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE, startMockApi } from '@/test/mockApi';
import {
  CONTENT_KEY,
  useApproveContentEdit,
  useCancelRelease,
  useDeleteContentItem,
  useDiscardContentEdit,
  usePublishContent,
  useRejectContentEdit,
  useRollbackContent,
  useSaveContentItem,
} from '../useAdminContent';
import { exportQueryKey } from '../useContentExport';

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));

const url = (path: string) => `${API_BASE}/api/admin/content${path}`;
const item = { id: 'db-africa', kind: 'song', slug: 'africa', body: {} };
const superjson = (payload: unknown) =>
  new HttpResponse(SuperJSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

/** What the content area and the working graph hold under the key. */
const HELD: readonly QueryKey[] = [
  exportQueryKey('song', 'export'),
  exportQueryKey('globe_event', 'export'),
  exportQueryKey('artist', 'list'),
  [...CONTENT_KEY, 'items', { kind: 'song' }],
  [...CONTENT_KEY, 'item', 'db-africa'],
  [...CONTENT_KEY, 'pending'],
];

/** Not content: a write must leave it alone. */
const ELSEWHERE: QueryKey = ['admin', 'users'];

describe('content writes', () => {
  startMockApi(
    http.put(url('/items'), () => superjson({ item, warnings: [] })),
    http.delete(url('/items/:id'), () => superjson({ ok: true })),
    http.post(url('/items/:id/approve'), () => superjson(item)),
    http.post(url('/items/:id/reject'), () => superjson(item)),
    http.post(url('/items/:id/discard-edit'), () => superjson(item)),
    http.post(url('/releases'), () =>
      superjson({ releaseId: 'rel-1', version: 7, itemCount: 1, parts: [0] }),
    ),
    http.post(url('/releases/:id/parts/:part'), () => superjson({ ok: true })),
    http.post(url('/releases/:id/activate'), () =>
      superjson({ id: 'rel-1', kind: 'song', version: 7, status: 'active' }),
    ),
    http.post(url('/releases/:id/cancel'), () => superjson({ ok: true })),
    http.post(url('/rollback'), () => superjson({ ok: true })),
  );

  /** A client holding every query above, none of them invalidated yet. */
  const freshClient = () => {
    const fresh = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    for (const key of [...HELD, ELSEWHERE]) fresh.setQueryData(key, []);
    return fresh;
  };
  let client = freshClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  /**
   * Each write's hook, rendered; the write it makes, to run against the
   * server above.
   */
  const WRITES = {
    save: () => {
      const { result } = renderHook(() => useSaveContentItem(), { wrapper });
      return () =>
        result.current.mutateAsync({
          kind: 'song',
          slug: 'africa',
          body: {},
        });
    },
    delete: () => {
      const { result } = renderHook(() => useDeleteContentItem(), { wrapper });
      return () => result.current.mutateAsync('db-africa');
    },
    approve: () => {
      const { result } = renderHook(() => useApproveContentEdit(), {
        wrapper,
      });
      return () => result.current.mutateAsync('db-africa');
    },
    reject: () => {
      const { result } = renderHook(() => useRejectContentEdit(), { wrapper });
      return () => result.current.mutateAsync({ id: 'db-africa', note: 'No' });
    },
    discard: () => {
      const { result } = renderHook(() => useDiscardContentEdit(), {
        wrapper,
      });
      return () => result.current.mutateAsync('db-africa');
    },
    publish: () => {
      const { result } = renderHook(() => usePublishContent(), { wrapper });
      return () => result.current.mutateAsync('song');
    },
    cancel: () => {
      const { result } = renderHook(() => useCancelRelease(), { wrapper });
      return () => result.current.mutateAsync('rel-1');
    },
    rollback: () => {
      const { result } = renderHook(() => useRollbackContent(), { wrapper });
      return () => result.current.mutateAsync({ kind: 'song', version: 6 });
    },
  } satisfies Record<string, () => () => Promise<unknown>>;

  it.each(Object.keys(WRITES) as (keyof typeof WRITES)[])(
    '%s invalidates every content query, the exports included',
    async (write) => {
      client = freshClient();
      const run = WRITES[write]();
      await act(() => run());
      for (const key of HELD) {
        await waitFor(() =>
          expect(client.getQueryState(key)?.isInvalidated, String(key)).toBe(
            true,
          ),
        );
      }
      expect(client.getQueryState(ELSEWHERE)?.isInvalidated).toBe(false);
    },
  );

  it('keeps the exports under the namespace it invalidates', () => {
    for (const key of HELD) {
      expect(key.slice(0, CONTENT_KEY.length)).toEqual([...CONTENT_KEY]);
    }
  });
});
