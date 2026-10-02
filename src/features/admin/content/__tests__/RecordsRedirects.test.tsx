// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { type ReactElement, Suspense } from 'react';
import {
  createMemoryRouter,
  type RouteObject,
  RouterProvider,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminPages } from '@/features/admin/AdminPages';
import { GuardOutlet } from '@/features/admin/content/mirror/UnsavedChangesGuard';
import {
  isOtherRecordKind,
  OTHER_RECORD_KINDS,
} from '@/features/admin/content/otherRecords';
import { TABLE_FOR_CONTENT_KIND } from '@/features/admin/table/tableIds';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';

/**
 * The content area's old per-kind lists, now that the Table holds eight of
 * the kinds: `records/:kind` and the older `/console/content/<kind>` land on
 * the kind's table keeping the search, the three kinds with no category stay
 * as "Other records", and anything else goes to the Table. An item's full
 * editor (`records/:kind/:id`) is untouched.
 */

const auth = vi.hoisted(() => ({ role: 'admin' as string }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role }),
}));
vi.mock('@/features/admin/content/publishing/ChangesButton', () => ({
  ChangesButton: () => <button type="button">Changes</button>,
}));
// A table needs the Atlas and the API for its rows; here it only has to
// open, and it does at once, titled, with its skeleton.
vi.mock('@/features/admin/table/data/useTableModel', () => ({
  useTableModel: () => ({
    mode: 'repo',
    status: 'no-export',
    isLoading: true,
    isRefreshing: false,
    error: null,
  }),
}));
// The editor needs the API; a marker says it opened.
vi.mock('@/features/admin/content/AdminContentEditPage', () => ({
  AdminContentEditPage: () => <h1>Item editor</h1>,
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  // The bar's Table link on an item's editor reads the item for its row.
  useContentItem: () => ({ data: undefined }),
  useContentItems: () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useValidateContent: () => ({ data: undefined }),
}));

afterEach(cleanup);

type RouteLike = { element?: ReactElement; children?: RouteLike[] };

/** The content area and the Table under their one guard, as AdminPages has them. */
const guarded = () =>
  (adminPages().children as RouteLike[]).find(
    (route) => route.element?.type === GuardOutlet,
  ) as RouteObject;

const mount = async (path: string) => {
  const router = createMemoryRouter([guarded()], { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>,
  );
  // The pages are lazy, and the first to open a heavy one (the other
  // records' list reads every kind spec) waits for it to load cold.
  await screen.findByRole('heading', { level: 1 }, { timeout: 10_000 });
  return router;
};

const where = (router: Awaited<ReturnType<typeof mount>>) =>
  `${router.state.location.pathname}${router.state.location.search}`;

const TABLE_KINDS = Object.entries(TABLE_FOR_CONTENT_KIND) as [
  ContentKind,
  string,
][];

describe('the content kinds', () => {
  it('are each in the Table or among the other records, never both', () => {
    // Every kind the API serves, checked by the compiler.
    const all = {
      song: true,
      globe_event: true,
      globe_city: true,
      artist_location: true,
      activity_flow: true,
      fundamentals_flow: true,
      artist: true,
      release: true,
      studio: true,
      label: true,
      chord_progression: true,
      genre: true,
      subgenre: true,
      instrument: true,
    } satisfies Record<ContentKind, true>;
    // The vocabulary kinds, which only the dev repo content server serves:
    // their rows are the Genres and Instruments tables' (TABLE_FOR_NODE_KIND),
    // and the Table takes them as record kinds of its own in plan P5. Until
    // TABLE_FOR_CONTENT_KIND names them they are in neither list, and they
    // are never among the other records.
    const vocabulary = new Set(['genre', 'subgenre', 'instrument']);
    for (const kind of Object.keys(all)) {
      const inTable = kind in TABLE_FOR_CONTENT_KIND;
      if (vocabulary.has(kind) && !inTable) {
        expect(isOtherRecordKind(kind), kind).toBe(false);
        continue;
      }
      expect(inTable !== isOtherRecordKind(kind), kind).toBe(true);
    }
  });
});

describe('records/:kind', () => {
  it.each(TABLE_KINDS)(
    'sends %s to its table, keeping the search',
    async (kind, table) => {
      const router = await mount(
        `/console/content/records/${kind}?q=abba&status=draft`,
      );
      expect(where(router)).toBe(`/console/table/${table}?q=abba`);
    },
  );

  it('sends a list asked for without a search to the bare table', async () => {
    expect(where(await mount('/console/content/records/song'))).toBe(
      '/console/table/songs',
    );
  });

  it.each(OTHER_RECORD_KINDS)(
    'keeps %s as one of the other records',
    async (kind) => {
      const router = await mount(`/console/content/records/${kind}?q=x`);
      expect(where(router)).toBe(`/console/content/records/${kind}?q=x`);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'Other records',
      );
      expect(
        screen
          .getAllByRole('link')
          .filter((a) => a.getAttribute('href')?.includes('/records/'))
          .filter((a) => a.closest('nav:not([aria-label])'))
          .map((a) => a.textContent),
      ).toEqual(['Lessons', 'Fundamentals', 'Artist locations']);
      expect(
        screen
          .getByRole('link', { name: 'Everything else is in the Table' })
          .getAttribute('href'),
        // The first table: the bare /console/table opens Cortex's graph now.
      ).toBe('/console/table/artists');
    },
  );

  it.each(['nonsense', 'constructor', 'vocabularies'])(
    'sends a kind it does not know (%s) to the Table',
    async (kind) => {
      const router = await mount(`/console/content/records/${kind}?q=x`);
      await waitFor(() =>
        expect(router.state.location.pathname).toBe('/console/table/artists'),
      );
    },
  );

  it('leaves the full editor where it is', async () => {
    const router = await mount('/console/content/records/song/db-africa');
    expect(where(router)).toBe('/console/content/records/song/db-africa');
    expect(screen.getByRole('heading', { name: 'Item editor' })).toBeDefined();
  });
});

describe('the older /console/content/<kind> links', () => {
  it('go straight to the table for a kind the Table holds', async () => {
    expect(where(await mount('/console/content/song?q=africa'))).toBe(
      '/console/table/songs?q=africa',
    );
    cleanup();
    expect(where(await mount('/console/content/globe_city'))).toBe(
      '/console/table/locations',
    );
  });

  it('go to the other records for the rest', async () => {
    expect(where(await mount('/console/content/artist_location?q=x'))).toBe(
      '/console/content/records/artist_location?q=x',
    );
  });

  it('still open an item in its full editor', async () => {
    const router = await mount('/console/content/globe_event/db-1?tab=json');
    expect(where(router)).toBe(
      '/console/content/records/globe_event/db-1?tab=json',
    );
  });
});
