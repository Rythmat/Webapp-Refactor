// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkingGraphState } from '@/features/admin/content/graph/useWorkingGraph';
import { TablePage } from '../TablePage';
import { fixtureGraph, ITEMS, SNAPSHOT } from './tableFixtures';

/**
 * A row edited this session stays listed under the query it was edited in,
 * though it no longer matches it: the row panel says it saved the row (or
 * linked from it), the page keeps the row, and the grid lets it go when the
 * query changes — search, sort, filters — or the table does. What the URL
 * holds besides the query (a row opened, its `field`) changes nothing.
 *
 * The panel here is a stand-in that reports a save, so this is the page's
 * wiring alone; TableDetailPanel.test.tsx has the panel's own side.
 */

vi.mock('@/features/admin/content/graph/useWorkingGraph', async (actual) => ({
  ...(await actual<object>()),
  useWorkingGraph: (): WorkingGraphState => ({
    graph: fixtureGraph(),
    snapshot: SNAPSHOT,
    items: ITEMS as unknown as WorkingGraphState['items'],
    mode: 'working',
    fingerprint: 'fixture',
    isLoading: false,
    isRefreshing: false,
    error: null,
  }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    feature: (name: string) => name === 'export',
    isServed: () => false,
    isError: false,
    capabilities: null,
    isAuthoritative: () => false,
    identityOf: () => 'slug',
    schemaVersionOf: () => 0,
    songSchemaLevel: 0,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (actual) => ({
  ...(await actual<object>()),
  useValidateContent: () => ({ data: { ok: true, problems: [] } }),
}));
vi.mock('../data/useTableSuggestions', () => ({
  useTableSuggestions: () => ({
    suggestions: undefined,
    served: false,
    rows: undefined,
    batches: undefined,
    decisions: undefined,
    replay: null,
    error: null,
    loading: false,
    retry: () => {},
  }),
}));
vi.mock('@/hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 2400, height: 600 }),
}));
// The row panel, standing in: it saves its row when asked.
vi.mock('../panel/TableDetailPanel', async () => {
  const { createElement } = await import('react');
  return {
    TableDetailPanel: ({
      rowKey,
      onEdited,
    }: {
      rowKey: string;
      onEdited?(key: string): void;
    }) =>
      createElement(
        'button',
        { type: 'button', onClick: () => onEdited?.(rowKey) },
        `Save ${rowKey}`,
      ),
  };
});

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: query === '(min-width: 1280px)',
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

const mount = (path: string) => {
  const router = createMemoryRouter(
    [{ path: '/console/table/:table/:row?', element: <TablePage /> }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

const go = (router: ReturnType<typeof mount>, to: string) =>
  act(() => router.navigate(to));

const rowText = (key: string) =>
  screen.getAllByRole('row').find((row) => row.dataset.row === key)
    ?.textContent;

const listed = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.getAttribute('data-row'));

/** Toto, opened under "Missing City" (Toto has one), and saved. */
const savedUnderMissingCity = async () => {
  const router = mount('/console/table/artists/toto?f=missing-city');
  fireEvent.click(
    await screen.findByRole(
      'button',
      { name: 'Save toto' },
      { timeout: 10_000 },
    ),
  );
  // Closed: the row is no longer the open one, so only `keep` lists it.
  await go(router, '/console/table/artists?f=missing-city');
  return router;
};

describe('a row edited this session', () => {
  it('stays listed under the query it was edited in, marked so', async () => {
    const router = await savedUnderMissingCity();
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
    expect(rowText('toto')).toContain('No longer matches');

    // Another row opened, at a field: the query is the same.
    await go(
      router,
      '/console/table/artists/hall-and-oates?f=missing-city&field=city',
    );
    expect(listed()).toContain('toto');
    expect(rowText('toto')).toContain('No longer matches');
  });

  it('is let go when the query changes, and stays gone', async () => {
    const router = await savedUnderMissingCity();
    await go(router, '/console/table/artists?f=missing-city&sort=born');
    expect(listed()).not.toContain('toto');
    await go(router, '/console/table/artists?f=missing-city');
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor']);
  });

  it('is let go when the table changes', async () => {
    const router = await savedUnderMissingCity();
    await go(router, '/console/table/songs');
    await go(router, '/console/table/artists?f=missing-city');
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor']);
  });
});
