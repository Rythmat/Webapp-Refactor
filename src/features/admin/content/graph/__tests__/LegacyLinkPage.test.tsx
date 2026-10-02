// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The Links page's "Apply the sure matches", end to end over a stubbed
 * content API: the dry run, one save per song with only the id fields
 * written, the progress line, and the lists refetched once at the end. It
 * pins the page's behaviour across the move of its write loop into
 * `useBulkWrite`.
 */

const api = vi.hoisted(() => ({
  puts: [] as { kind: string; slug: string; body: unknown; note?: string }[],
  exports: 0,
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: 'test' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({ feature: (name: string) => name === 'export' }),
}));
vi.mock('../../entities/useEntityIndex', () => ({
  useEntityIndex: () => ({
    entries: [
      {
        id: 'artist:toto',
        kind: 'artist',
        slug: 'toto',
        name: 'Toto',
        source: 'code',
      },
      {
        id: 'artist:jeff-porcaro',
        kind: 'artist',
        slug: 'jeff-porcaro',
        name: 'Jeff Porcaro',
        source: 'code',
      },
    ],
    loading: false,
  }),
}));
// The picker is cmdk over the whole registry; the page only needs a value.
vi.mock('../../entities/EntityPicker', () => ({
  EntityPicker: ({ value }: { value: string | null }) => (
    <span>{value ?? 'none'}</span>
  ),
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
      if (init?.method === 'PUT') {
        api.puts.push(JSON.parse(String(init.body)));
        return { item: {}, warnings: [] };
      }
      if (path.startsWith('/export?kind=song')) {
        api.exports += 1;
        return {
          items: [
            {
              slug: 'africa',
              editState: null,
              body: {
                id: 'africa',
                title: 'Africa',
                artist: 'Toto',
                credits: [{ name: 'Jeff Porcaro', role: 'performer' }],
              },
            },
            {
              slug: 'rosanna',
              editState: null,
              body: { id: 'rosanna', title: 'Rosanna', artist: 'Toto' },
            },
          ],
          nextCursor: null,
        };
      }
      throw new Error(`unexpected ${path}`);
    },
  };
});

let LegacyLinkPage: typeof import('../LegacyLinkPage').LegacyLinkPage;
beforeAll(async () => {
  ({ LegacyLinkPage } = await import('../LegacyLinkPage'));
});

afterEach(() => {
  cleanup();
  api.puts = [];
  api.exports = 0;
});

describe('the Links page', () => {
  it('dry-runs the sure matches, then writes each song once and refetches once', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LegacyLinkPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Apply the 2 sure matches…' }),
    );
    expect(screen.getByText(/2 songs change/)).toBeTruthy();
    expect(api.puts).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Write 2 songs' }));
    await screen.findByText(/Wrote 2 of 2\./);
    // Said once, when the run ends, for a screen reader.
    expect(screen.getByRole('status').textContent).toBe(
      '2 of 2 songs written.',
    );

    expect(api.puts).toEqual([
      {
        kind: 'song',
        slug: 'africa',
        body: {
          id: 'africa',
          title: 'Africa',
          artist: 'Toto',
          origin: { artistGlobeId: 'toto' },
          credits: [
            {
              name: 'Jeff Porcaro',
              role: 'performer',
              artistGlobeId: 'jeff-porcaro',
            },
          ],
        },
        note: 'Linked artist names to their records',
      },
      {
        kind: 'song',
        slug: 'rosanna',
        body: {
          id: 'rosanna',
          title: 'Rosanna',
          artist: 'Toto',
          origin: { artistGlobeId: 'toto' },
        },
        note: 'Linked artist names to their records',
      },
    ]);
    // The dry run closed, and the songs were read once more, not per save.
    expect(screen.queryByText(/songs change/)).toBeNull();
    await waitFor(() => expect(api.exports).toBe(2));
  });
});
