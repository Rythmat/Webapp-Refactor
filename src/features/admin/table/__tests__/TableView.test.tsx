// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkingGraphState } from '@/features/admin/content/graph/useWorkingGraph';
import { TablePage } from '../TablePage';
import { fixtureGraph, ITEMS, SNAPSHOT } from './tableFixtures';

/**
 * The Table page over the working graph's states: a skeleton until a graph
 * is built, the grid then, a notice when the rows are the repo's for good
 * (and why), "Refreshing…" while a newer build is on its way, and the row
 * panel beside the grid when the path names a row. Above the rows, what
 * would block a publish of the table's kind, and "New …", which makes a new
 * item in the panel.
 */

// The working graph as a little store, so a test can move it on (a build
// landing) and the page follows, as it does the real hook's query.
const working = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    state: null as unknown as WorkingGraphState,
    listeners,
    set(next: WorkingGraphState) {
      this.state = next;
      for (const listener of listeners) listener();
    },
  };
});
vi.mock(
  '@/features/admin/content/graph/useWorkingGraph',
  async (importOriginal) => {
    const { useSyncExternalStore } = await import('react');
    const subscribe = (listener: () => void) => {
      working.listeners.add(listener);
      return () => working.listeners.delete(listener);
    };
    return {
      // The real retry: "Try again" is checked against what it refetches.
      ...(await importOriginal<
        typeof import('@/features/admin/content/graph/useWorkingGraph')
      >()),
      useWorkingGraph: () =>
        useSyncExternalStore(subscribe, () => working.state),
    };
  },
);
// Whether the server serves /export: repo mode is a wait or a failure if it
// does, and all there is if it does not. And which kinds it serves, whose
// publish-blocking problems the table lists above its rows.
const caps = vi.hoisted(() => ({
  exportServed: true,
  served: [] as string[],
  failed: false,
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    feature: (name: string) => name === 'export' && caps.exportServed,
    isServed: (kind: string) => caps.served.includes(kind),
    isError: caps.failed,
    // What the row panel's editors and pickers read.
    capabilities: null,
    isAuthoritative: () => false,
    identityOf: () => 'slug',
    schemaVersionOf: () => 0,
    songSchemaLevel: 0,
  }),
}));
const validation = vi.hoisted(() => ({
  problems: [] as { code: string; slug: string; detail: string }[],
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useValidateContent: () => ({
    data: {
      ok: validation.problems.length === 0,
      problems: validation.problems,
    },
  }),
}));
// The table's suggestions: none served, unless a test says otherwise.
const tableSuggestions = vi.hoisted(() => ({
  served: false,
  loading: false,
  error: null as Error | null,
  retry: () => {},
}));
vi.mock('../data/useTableSuggestions', () => ({
  useTableSuggestions: () => ({
    suggestions: undefined,
    served: tableSuggestions.served,
    rows: undefined,
    batches: undefined,
    decisions: undefined,
    replay: null,
    error: tableSuggestions.error,
    loading: tableSuggestions.loading,
    retry: tableSuggestions.retry,
  }),
}));
// jsdom lays nothing out, so the grid is given a size to draw its rows in.
vi.mock('@/hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 2400, height: 600 }),
}));

const graph = fixtureGraph();
// The fixture's items are what a row reads of a working item (its id, state
// and body); the rest of a working item is the working graph's own business.
const items = ITEMS as unknown as WorkingGraphState['items'];

const built = (over: Partial<WorkingGraphState> = {}): WorkingGraphState => ({
  graph,
  snapshot: SNAPSHOT,
  items,
  mode: 'working',
  fingerprint: 'fixture',
  isLoading: false,
  isRefreshing: false,
  error: null,
  ...over,
});

const loading = (over: Partial<WorkingGraphState> = {}): WorkingGraphState => ({
  items: new Map(),
  mode: 'repo',
  fingerprint: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  ...over,
});

beforeEach(() => {
  working.state = built();
  caps.exportServed = true;
  caps.served = [];
  caps.failed = false;
  validation.problems = [];
  tableSuggestions.served = false;
  tableSuggestions.loading = false;
  tableSuggestions.error = null;
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
  const client = new QueryClient();
  const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue();
  const router = createMemoryRouter(
    [{ path: '/console/table/:table/:row?', element: <TablePage /> }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, refetch };
};

const rowsListed = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.getAttribute('data-row'));

describe('the Table page', () => {
  it('shows a skeleton with the table’s title until a graph is built', () => {
    working.state = loading();
    mount('/console/table/artists');
    const status = screen.getByRole('status', { name: 'Building the table…' });
    expect(within(status).getByRole('heading', { level: 1 }).textContent).toBe(
      'Artist',
    );
    expect(screen.queryByRole('grid')).toBeNull();

    act(() => working.set(built()));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('grid', { name: 'Artists' })).toBeDefined();
    expect(rowsListed()).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
  });

  it('says so when the Atlas could not be loaded, with a way to try again', () => {
    working.state = loading({
      isLoading: false,
      error: new Error('chunk failed'),
    });
    const { refetch } = mount('/console/table/artists');
    const alert = screen.getByText('The Atlas could not be loaded');
    expect(alert.parentElement?.textContent).toContain('chunk failed.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    // What failed of what the working graph reads: the repo graph, the
    // capabilities, the exports — never a build (useWorkingGraph.test.tsx
    // checks the predicate picks only the failed ones).
    const retried = refetch.mock.calls.map(([filters]) => filters?.queryKey);
    expect(retried).toEqual([
      ['console', 'atlas-graph', 'repo'],
      ['admin', 'content', 'capabilities'],
      ['admin', 'content', 'export'],
    ]);
    for (const [filters] of refetch.mock.calls) {
      expect(filters?.predicate).toBeTypeOf('function');
    }
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('shows the skeleton, not an error, while the repo graph is still loading', () => {
    // An export failed before the repo graph arrived: the notice over the
    // rows says so once there are rows.
    working.state = loading({ error: new Error('500 from /export') });
    mount('/console/table/artists');
    expect(
      screen.getByRole('status', { name: 'Building the table…' }),
    ).toBeDefined();
    expect(screen.queryByText('The Atlas could not be loaded')).toBeNull();
  });

  it('shows the working copy with no notice', () => {
    mount('/console/table/artists');
    expect(screen.getByText('Working copy')).toBeDefined();
    expect(screen.queryByText(/Repo snapshot, read-only/)).toBeNull();
    expect(screen.queryByText('Refreshing…')).toBeNull();
  });

  it('says why the rows are the repo’s when the API serves no /export', () => {
    caps.exportServed = false;
    working.state = built({ mode: 'repo', fingerprint: null });
    mount('/console/table/artists');
    expect(screen.getByText('Repo snapshot')).toBeDefined();
    const notice = screen.getByText('Repo snapshot, read-only.');
    expect(notice.parentElement?.textContent).not.toContain('did not load');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.getByRole('grid')).toBeDefined();
  });

  it('says so when, without /export, the item list failed too', () => {
    caps.exportServed = false;
    working.state = built({
      mode: 'repo',
      fingerprint: null,
      error: new Error('401 from /items'),
    });
    mount('/console/table/artists');
    const notice = screen.getByText('Repo snapshot, read-only.');
    expect(notice.parentElement?.textContent).toContain(
      'The item list did not load either (401 from /items), so the statuses are the repo’s too.',
    );
    expect(screen.queryByText('The working copy did not load')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('says nothing yet while the working copy is on its way behind the repo’s', () => {
    working.state = built({ mode: 'repo', isRefreshing: true });
    mount('/console/table/artists');
    expect(screen.getByText('Repo snapshot')).toBeDefined();
    expect(screen.getByText('Refreshing…')).toBeDefined();
    expect(screen.queryByText(/read-only/)).toBeNull();
  });

  it('says the working copy failed, over the repo’s rows', () => {
    working.state = built({
      mode: 'repo',
      error: new Error('500 from /export'),
    });
    const { refetch } = mount('/console/table/artists');
    const notice = screen.getByText('The working copy did not load');
    expect(notice.parentElement?.textContent).toContain('(500 from /export)');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(3);
    expect(rowsListed()).toHaveLength(3);
  });

  it('says when a refresh of the working copy failed, over the last rows', () => {
    working.state = built({ error: new Error('502 from /export') });
    const { refetch } = mount('/console/table/artists');
    expect(screen.getByText('Working copy')).toBeDefined();
    const notice = screen.getByText('The latest changes did not load');
    expect(notice.parentElement?.textContent).toContain('(502 from /export)');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(3);
    expect(rowsListed()).toHaveLength(3);
    // The badge says it too, as the mind map's and Integrity's do.
    expect(screen.getByText('Working copy').getAttribute('title')).toContain(
      'the latest changes did not load',
    );
  });

  it('says so when the API would not say what it serves', () => {
    // A failed /capabilities leaves the console on the kinds every API has,
    // /export not among them: not the same as an API without /export.
    caps.failed = true;
    caps.exportServed = false;
    working.state = built({
      mode: 'repo',
      fingerprint: null,
      error: new Error('500 from /capabilities'),
    });
    const { refetch } = mount('/console/table/artists');
    const notice = screen.getByText(
      'The content API did not say what it serves',
    );
    expect(notice.parentElement?.textContent).toContain(
      '(500 from /capabilities)',
    );
    expect(screen.queryByText(/does not serve/)).toBeNull();
    expect(screen.getByText('Repo snapshot').getAttribute('title')).toContain(
      'did not say what it serves',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['admin', 'content', 'capabilities'],
      }),
    );
  });

  it('names why the rows are the repo’s on the badge', () => {
    const title = () => screen.getByText('Repo snapshot').getAttribute('title');
    working.state = built({ mode: 'repo', isRefreshing: true });
    mount('/console/table/artists');
    expect(title()).toContain('while the working copy loads');
    cleanup();

    working.state = built({ mode: 'repo', error: new Error('500') });
    mount('/console/table/artists');
    expect(title()).toContain('the working copy did not load');
    cleanup();

    caps.exportServed = false;
    working.state = built({ mode: 'repo' });
    mount('/console/table/artists');
    expect(title()).toContain('does not serve /export');
  });

  it('lists what would block a publish of a served kind, each on its row', () => {
    validation.problems = [
      { code: 'DANGLING_REFERENCE', slug: 'africa', detail: 'names nothing' },
      { code: 'INVALID_BODY', slug: 'rosanna', detail: 'bad year' },
    ];
    // A kind the API does not serve is never asked about.
    mount('/console/table/songs');
    expect(screen.queryByText('2 problems would block a publish')).toBeNull();
    cleanup();

    caps.served = ['song'];
    mount('/console/table/songs');
    expect(screen.getByText('2 problems would block a publish')).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'africa' }).getAttribute('href'),
    ).toBe('/console/table/songs/africa');
  });

  it('says when the suggestions could not be loaded, rather than showing none', () => {
    tableSuggestions.served = true;
    tableSuggestions.error = new Error('The server is down');
    tableSuggestions.retry = vi.fn();
    mount('/console/table/artists');
    expect(
      screen.getByText('Suggestions could not be loaded').parentElement!
        .textContent,
    ).toContain('The server is down. Each row’s count');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(tableSuggestions.retry).toHaveBeenCalled();
  });

  it('says the suggestions are loading while they are', () => {
    tableSuggestions.served = true;
    tableSuggestions.loading = true;
    mount('/console/table/artists');
    expect(screen.getByText('Loading suggestions…')).toBeDefined();
  });

  it('makes a new item in its panel, named from the search, and closes back', async () => {
    const { router } = mount('/console/table/artists?q=Stevie');
    fireEvent.click(screen.getByRole('button', { name: 'New artist' }));
    expect(router.state.location.search).toBe('?q=Stevie&new=Stevie');
    // Lazy, as the row panel is.
    const panel = await screen.findByRole(
      'complementary',
      { name: 'New artist' },
      { timeout: 10_000 },
    );
    expect(within(panel).getByText(/^Id: artist:stevie/)).toBeDefined();
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(router.state.location.search).toBe('?q=Stevie');
    expect(screen.queryByRole('complementary')).toBeNull();
    cleanup();

    // Every table a content item stores makes its rows here; code does not.
    mount('/console/table/songs');
    expect(screen.getByRole('button', { name: 'New song' })).toBeDefined();
    cleanup();
    mount('/console/table/genres');
    expect(screen.queryByRole('button', { name: /^New / })).toBeNull();
  });

  it('makes nothing from the repo’s rows', () => {
    working.state = built({ mode: 'repo', fingerprint: null });
    mount('/console/table/artists');
    expect(screen.queryByRole('button', { name: /^New / })).toBeNull();
  });

  it('keeps the rows showing while a save’s rebuild is on its way', () => {
    working.state = built({ isRefreshing: true });
    mount('/console/table/artists');
    expect(screen.getByText('Refreshing…')).toBeDefined();
    expect(rowsListed()).toHaveLength(3);
  });

  it('opens the row the path names beside the grid, and closes it', async () => {
    const { router } = mount('/console/table/artists/toto?q=to');
    // The panel is lazy: loaded cold the first time, which is slow while
    // the whole suite runs in parallel.
    const panel = await screen.findByRole(
      'complementary',
      { name: 'Toto' },
      { timeout: 10_000 },
    );
    expect(within(panel).getByText('Open in Cortex')).toBeDefined();
    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(router.state.location.pathname).toBe('/console/table/artists');
    expect(router.state.location.search).toBe('?q=to');
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('narrows the Key table to a mode the graph has, and ignores one it has not', () => {
    mount('/console/table/keys?narrow=mode:minor');
    const picker = screen.getByRole('combobox', { name: 'Mode' });
    expect(picker.textContent).toContain('Minor');
    cleanup();

    mount('/console/table/keys?narrow=mode:nonsense');
    // The picker says what the counts are: every mode, not a blank.
    expect(
      screen.getByRole('combobox', { name: 'Mode' }).textContent,
    ).toContain('Every mode');
    expect(screen.getByRole('grid', { name: 'Keys' })).toBeDefined();
  });

  it('sends an unknown table to artists', () => {
    const { router } = mount('/console/table/nonsense');
    expect(router.state.location.pathname).toBe('/console/table/artists');
  });
});
