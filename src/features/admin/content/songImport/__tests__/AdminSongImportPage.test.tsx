// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTENT_KEY } from '@/hooks/data/admin/useAdminContent';
import { exportQueryKey } from '@/hooks/data/admin/useContentExport';
import { AdminSongImportPage } from '../AdminSongImportPage';

/**
 * The song import writes through `contentRequest`, not the save hook, so it
 * invalidates the content queries itself: once the run ends, and only if it
 * wrote something. Otherwise the Table, the mind map, Integrity and the
 * queues would show the store as it was before the import until they
 * remounted a minute later.
 */

const store = vi.hoisted(() => ({
  writes: [] as string[],
  failWrites: false,
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));
// Two charts in the repo, none in the store: both are to be created.
vi.mock('@/curriculum/data/songs/bundled', () => ({
  BUNDLED_SONGS: {
    africa: { id: 'africa', title: 'Africa', artist: 'Toto' },
    rosanna: { id: 'rosanna', title: 'Rosanna', artist: 'Toto' },
  },
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  return {
    ...actual,
    contentRequest: async (
      path: string,
      _token: string,
      init?: RequestInit,
    ) => {
      if (path.startsWith('/items?kind=song')) {
        return { items: [], nextCursor: null };
      }
      if (path === '/items' && init?.method === 'PUT') {
        if (store.failWrites) throw new Error('500');
        store.writes.push(JSON.parse(String(init.body)).slug);
        return {};
      }
      throw new Error(`unexpected ${path}`);
    },
  };
});
vi.mock('../../publishing/publishRun', () => ({
  usePublishRun: () => ({ status: 'idle' }),
  usePublishActions: () => ({ publish: vi.fn() }),
}));
vi.mock('../../publishing/PublishKindsSection', () => ({
  RunSummary: () => null,
}));

afterEach(() => {
  cleanup();
  store.writes = [];
  store.failWrites = false;
});

/** A client holding a content export and something else, neither stale. */
const mount = () => {
  const client = new QueryClient();
  const exported = exportQueryKey('song', 'export');
  const elsewhere = ['admin', 'users'];
  client.setQueryData(exported, []);
  client.setQueryData(elsewhere, []);
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <AdminSongImportPage />
    </QueryClientProvider>,
  );
  return { client, exported, elsewhere, invalidate };
};

const runImport = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Write 2 songs' }));
  await screen.findByText(/^Wrote 2 of 2\./);
};

describe('the song import', () => {
  it('invalidates the content queries once, after the run', async () => {
    const { client, exported, elsewhere, invalidate } = mount();
    await runImport();
    expect(store.writes).toEqual(['africa', 'rosanna']);
    await waitFor(() =>
      expect(client.getQueryState(exported)?.isInvalidated).toBe(true),
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CONTENT_KEY });
    expect(client.getQueryState(elsewhere)?.isInvalidated).toBe(false);
  });

  it('leaves them alone when nothing was written', async () => {
    store.failWrites = true;
    const { client, exported, invalidate } = mount();
    await runImport();
    expect(screen.getByText(/2 failed\./)).toBeTruthy();
    expect(invalidate).not.toHaveBeenCalled();
    expect(client.getQueryState(exported)?.isInvalidated).toBe(false);
  });
});
