// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Suspense, useEffect } from 'react';
import {
  createMemoryRouter,
  Outlet,
  type RouteObject,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { EntityId } from '@/content/graph/types';
import { useWorkingGraph } from '@/features/admin/content/graph/useWorkingGraph';
import { GuardOutlet } from '@/features/admin/content/mirror/UnsavedChangesGuard';
import {
  api,
  detail,
  resetPanelApi,
} from '@/features/admin/table/__tests__/panelApi';
import {
  ARTISTS,
  fixtureInput,
  ITEMS,
  SONGS,
} from '@/features/admin/table/__tests__/tableFixtures';
import {
  getTableModel,
  type TableItem,
} from '@/features/admin/table/model/buildTableModel';
import { GRAPH_DRAWER_WIDTH_KEY } from '@/features/admin/table/panel/PanelFrame';
import {
  type DetailPanelContext,
  TableDetailPanel,
} from '@/features/admin/table/panel/TableDetailPanel';
import type { TableId } from '@/features/admin/table/tableIds';
import { GraphDrawerOutlet } from '../GraphDrawerOutlet';
import { type GraphUrlState, useGraphUrlState } from '../useGraphUrlState';

/**
 * A dot's row beside Cortex's graph (owner decision 3): the Table's own row
 * panel in its graph context — Local graph · Open page · Open in Table ·
 * Full editor, no next row to step to, closing back to the graph — opened
 * and switched without the map remounting, under the console's one
 * unsaved-changes guard; an item no table holds, read-only with its
 * connections; and the Table's panel, in its own context, as it was.
 *
 * The working graph is the Table's fixture Atlas, and the content API the
 * row panel tests' fake (`panelApi.ts`), so nothing reaches the network.
 */

const auth = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role, token: null, userId: 'me' }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) =>
  (await import('@/features/admin/table/__tests__/panelApi')).fakeItemHooks(
    await importOriginal<object>(),
  ),
);
vi.mock('@/hooks/data/admin/useCapabilities', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCapabilities: (await import('@/features/admin/table/__tests__/panelApi'))
    .fakeCapabilities,
}));
// Whether the server serves suggestions: none by default, as today's API.
const suggested = vi.hoisted(() => ({ served: false }));
vi.mock('@/hooks/data/admin/useSuggestions', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSuggestions: () => ({
    served: suggested.served,
    data: suggested.served ? { rows: [] } : undefined,
    isLoading: false,
    error: null,
    refetch: async () => undefined,
  }),
}));
// The working graph: the fixture Atlas, with Jeff Porcaro and Africa as API
// items too, so their rows can be edited.
vi.mock('@/features/admin/content/graph/useWorkingGraph', async () => {
  const { ARTISTS, fixtureGraph, ITEMS, SNAPSHOT, SONGS } = await import(
    '@/features/admin/table/__tests__/tableFixtures'
  );
  const items = new Map(ITEMS);
  items.set('artist:jeff-porcaro', {
    id: 'db-porcaro',
    status: 'published',
    editState: null,
    body: ARTISTS[1] as unknown as Record<string, unknown>,
  });
  items.set('song:africa', {
    id: 'db-africa',
    status: 'published',
    editState: null,
    body: SONGS[0] as unknown as Record<string, unknown>,
  });
  const state = {
    graph: fixtureGraph(),
    snapshot: SNAPSHOT,
    items,
    mode: 'working',
    fingerprint: 'fixture',
    isLoading: false,
    isRefreshing: false,
    error: null,
  };
  return { useWorkingGraph: () => state };
});

let wide = true;

beforeAll(() => {
  // cmdk scrolls the active option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  wide = true;
  auth.role = 'admin';
  suggested.served = false;
  resetPanelApi();
  // The items the rows' editing sessions load.
  api.items.set(
    'db-toto',
    detail('db-toto', 'artist', ITEMS.get('artist:toto')!.body as Body, {
      editState: 'pending',
      pendingBody: ITEMS.get('artist:toto')!.body as Body,
    }),
  );
  api.items.set(
    'db-porcaro',
    detail('db-porcaro', 'artist', ARTISTS[1] as unknown as Body),
  );
  api.items.set(
    'db-africa',
    detail('db-africa', 'song', SONGS[0] as unknown as Body),
  );
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: wide && query === '(min-width: 1280px)',
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

type Body = Record<string, unknown>;

/** How long the lazy drawer may take to load cold. */
const LAZY = { timeout: 10_000 };

const GRAPH = '/console/cortex';

const where = (router: { state: { location: Location } }) =>
  `${router.state.location.pathname}${router.state.location.search}`;
type Location = { pathname: string; search: string };

const panel = () => screen.getByRole('complementary');

/** The header's ways out, as their names read. */
const waysOut = () =>
  [
    ...within(panel())
      .getByRole('navigation', { name: 'Open elsewhere' })
      .querySelectorAll('a, button'),
  ].map((el) => el.textContent?.trim());

const hrefOf = (name: string | RegExp) =>
  within(panel()).getByRole('link', { name }).getAttribute('href');

/* ── The panel in each context ─────────────────────────────────────────── */

describe('the row panel, beside the grid or beside the graph', () => {
  /**
   * The panel alone, over the fixture with a suggestion on every row, at
   * the table's route or the graph's.
   */
  const mountPanel = (
    path: string,
    context: DetailPanelContext,
    over: {
      onLocalGraph?: (node: EntityId) => void;
      items?: ReadonlyMap<EntityId, TableItem>;
    } = {},
  ) => {
    const input = fixtureInput({
      ...(over.items ? { items: over.items } : {}),
      suggestions: { version: 'every-row', count: () => 1 },
    });
    const Harness = () => {
      const { table, row } = useParams();
      const model = getTableModel(input, table as TableId);
      return row ? (
        <TableDetailPanel
          context={context}
          model={model}
          rowKey={row}
          graph={input.graph}
          mode="working"
          onLocalGraph={over.onLocalGraph}
        />
      ) : (
        <p>Nothing open</p>
      );
    };
    const router = createMemoryRouter(
      [
        {
          element: <GuardOutlet />,
          children: [
            { path: '/console/table/:table/:row?', element: <Harness /> },
            {
              path: GRAPH,
              element: (
                <>
                  <p>The graph</p>
                  <Outlet />
                </>
              ),
              children: [{ path: ':table/:row', element: <Harness /> }],
            },
          ],
        },
      ],
      { initialEntries: [path] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
      </QueryClientProvider>,
    );
    return router;
  };

  it('beside the grid: Cortex, the page, and the next row with suggestions', () => {
    suggested.served = true;
    mountPanel('/console/table/artists/david-paich', 'table');
    expect(waysOut()).toEqual(['Open in Cortex', 'Open page']);
    expect(hrefOf('Open in Cortex')).toBe(
      `${GRAPH}?focus=artist%3Adavid-paich`,
    );
    expect(
      within(panel()).getByRole('button', { name: /^Next with suggestions/ }),
    ).toBeDefined();
  });

  it('beside the graph: Local graph · Open page · Open in Table, and no next row', () => {
    suggested.served = true;
    const onLocalGraph = vi.fn();
    const router = mountPanel(`${GRAPH}/artists/david-paich?focus=x`, 'graph', {
      onLocalGraph,
    });
    expect(waysOut()).toEqual(['Local graph', 'Open page', 'Open in Table']);
    expect(hrefOf('Open in Table')).toBe('/console/table/artists/david-paich');
    expect(hrefOf('Open page')).toBe(
      '/console/content/atlas/globe?artist=David%20Paich',
    );
    // The suggestions are there; the step to the next row is not.
    expect(
      within(panel()).getByRole('region', { name: /^Suggestions/ }),
    ).toBeDefined();
    expect(
      within(panel()).queryByRole('button', { name: /^Next with suggestions/ }),
    ).toBeNull();
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Local graph' }),
    );
    expect(onLocalGraph).toHaveBeenCalledWith('artist:david-paich');
    expect(where(router)).toBe(`${GRAPH}/artists/david-paich?focus=x`);
  });

  it('beside the graph, offers the full editor last where the panel edits only part', () => {
    const items = new Map(ITEMS);
    items.set('song:africa', {
      id: 'db-africa',
      status: 'published',
      editState: null,
      body: SONGS[0] as unknown as Body,
    });
    mountPanel(`${GRAPH}/songs/africa`, 'graph', {
      onLocalGraph: () => {},
      items,
    });
    expect(waysOut()).toEqual([
      'Local graph',
      'Open page',
      'Open in Table',
      'Full editor',
    ]);
    expect(hrefOf(/Full editor/)).toBe(
      '/console/content/records/song/db-africa',
    );
  });

  it('beside the graph without a handler, Local graph is a link, and closing goes back to the graph', () => {
    const router = mountPanel(
      `${GRAPH}/artists/toto?focus=song:africa&field=born`,
      'graph',
    );
    expect(hrefOf('Local graph')).toBe(`${GRAPH}?focus=artist%3Atoto`);
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica`);
    expect(screen.getByText('The graph')).toBeDefined();
  });

  it('beside Tesseract: Show in Cortex · Open page · Open in Table, and no next row', () => {
    suggested.served = true;
    const onLocalGraph = vi.fn();
    mountPanel(`${GRAPH}/artists/david-paich?key=Eb&depth=2`, 'tesseract', {
      onLocalGraph,
    });
    expect(waysOut()).toEqual(['Show in Cortex', 'Open page', 'Open in Table']);
    // Show in Cortex leaves the map for the row's local graph in Cortex.
    expect(hrefOf('Show in Cortex')).toBe(
      `${GRAPH}?focus=artist%3Adavid-paich`,
    );
    expect(hrefOf('Open in Table')).toBe('/console/table/artists/david-paich');
    expect(
      within(panel()).queryByRole('button', { name: /^Next with suggestions/ }),
    ).toBeNull();
    expect(onLocalGraph).not.toHaveBeenCalled();
  });
});

/* ── The drawer beside the map ────────────────────────────────────────── */

describe('the drawer beside the graph', () => {
  let url: GraphUrlState;
  const mounted = { map: 0 };

  /** The map's page, as the shell draws it: the canvas, then the drawer. */
  const MapStub = () => {
    url = useGraphUrlState();
    const working = useWorkingGraph({ items: false });
    useEffect(() => {
      mounted.map += 1;
    }, []);
    return (
      <div>
        <p>The map</p>
        <GraphDrawerOutlet graph={working.graph} pins={working.pins} />
      </div>
    );
  };

  const mountMap = async (path: string) => {
    mounted.map = 0;
    const router = createMemoryRouter(
      [
        {
          element: <GuardOutlet />,
          children: [
            {
              path: GRAPH,
              element: <MapStub />,
              children: [{ path: ':table/:row' }],
            },
          ] as RouteObject[],
        },
      ],
      { initialEntries: [path] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
      </QueryClientProvider>,
    );
    await screen.findByText('The map');
    return router;
  };

  const drawer = (name: string) =>
    screen.findByRole('complementary', { name }, LAZY);

  it('opens a clicked dot’s row beside the map, centres on it, and closes back', async () => {
    const router = await mountMap(`${GRAPH}?focus=song:africa`);
    act(() => url.openRow('artist:toto'));
    const aside = await drawer('Toto');
    expect(where(router)).toBe(`${GRAPH}/artists/toto?focus=song%3Aafrica`);
    expect(waysOut()).toEqual(['Local graph', 'Open page', 'Open in Table']);

    // Local graph re-centres the map; the drawer stays open.
    fireEvent.click(within(aside).getByRole('button', { name: 'Local graph' }));
    expect(where(router)).toBe(`${GRAPH}/artists/toto?focus=artist%3Atoto`);
    expect(screen.getByRole('complementary', { name: 'Toto' })).toBe(aside);

    // Another dot: in place, same map.
    act(() => url.openRow('song:africa'));
    await drawer('Africa');
    expect(router.state.historyAction).toBe('REPLACE');

    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull());
    expect(router.state.location.pathname).toBe(GRAPH);
    expect(mounted.map).toBe(1);
  });

  it('asks before leaving a row with unsaved changes for another dot, not for a new focus', async () => {
    const router = await mountMap(`${GRAPH}?focus=song:africa`);
    act(() => url.openRow('artist:jeff-porcaro'));
    await drawer('Jeff Porcaro');
    const born = () =>
      within(panel()).getByLabelText<HTMLInputElement>('Date of birth');
    fireEvent.change(born(), { target: { value: '1954-04-02' } });

    // Only the search changes: no question, and nothing lost.
    act(() => url.setFocus('artist:toto'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(where(router)).toBe(
      `${GRAPH}/artists/jeff-porcaro?focus=artist%3Atoto`,
    );
    expect(born().value).toBe('1954-04-02');

    // Another dot is another path: asked, and still here.
    act(() => url.openRow('artist:toto'));
    const ask = await screen.findByRole('alertdialog', {
      name: 'Leave without saving?',
    });
    expect(router.state.location.pathname).toBe(
      `${GRAPH}/artists/jeff-porcaro`,
    );
    fireEvent.click(within(ask).getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(born().value).toBe('1954-04-02');

    // An item with no row is leaving the row too.
    act(() => url.openRow('mode:minor'));
    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', {
          name: 'Leave without saving?',
        }),
      ).getByRole('button', { name: 'Leave' }),
    );
    await waitFor(() =>
      expect(where(router)).toBe(
        `${GRAPH}?focus=artist%3Atoto&node=mode%3Aminor`,
      ),
    );
    expect(mounted.map).toBe(1);
  });

  it('takes Escape on the question as Stay, and gives focus back to the field', async () => {
    const router = await mountMap(`${GRAPH}?focus=song:africa`);
    act(() => url.openRow('artist:jeff-porcaro'));
    await drawer('Jeff Porcaro');
    const born = () =>
      within(panel()).getByLabelText<HTMLInputElement>('Date of birth');
    fireEvent.change(born(), { target: { value: '1954-04-02' } });
    act(() => born().focus());

    act(() => url.openRow('artist:toto'));
    const ask = await screen.findByRole('alertdialog', {
      name: 'Leave without saving?',
    });
    await waitFor(() =>
      expect(within(ask).getByRole('button', { name: 'Stay' })).toHaveFocus(),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(router.state.location.pathname).toBe(
      `${GRAPH}/artists/jeff-porcaro`,
    );
    expect(born().value).toBe('1954-04-02');
    await waitFor(() => expect(born()).toHaveFocus());

    // The next question is a new one: Leave still leaves.
    act(() => url.openRow('artist:toto'));
    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', {
          name: 'Leave without saving?',
        }),
      ).getByRole('button', { name: 'Leave' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`${GRAPH}/artists/toto`),
    );
  });

  it('shows an item no table holds read-only, with its connections, each opening in turn', async () => {
    const router = await mountMap(`${GRAPH}?focus=song:africa`);
    act(() => url.openRow('mode:minor'));
    const aside = await drawer('Minor');
    expect(where(router)).toBe(
      `${GRAPH}?focus=song%3Aafrica&node=mode%3Aminor`,
    );
    expect(within(aside).getByText('Mode')).toBeDefined();
    expect(
      within(aside).getByRole('heading', { name: 'Connections of Minor' }),
    ).toBeDefined();
    // Nothing to edit, nowhere else to edit it.
    expect(within(aside).queryByRole('textbox')).toBeNull();
    expect(
      within(aside).queryByRole('link', { name: 'Open in Table' }),
    ).toBeNull();

    fireEvent.click(within(aside).getByRole('button', { name: 'Local graph' }));
    expect(where(router)).toBe(`${GRAPH}?focus=mode%3Aminor&node=mode%3Aminor`);

    // A connection opens beside the graph in its place: Rosanna's row.
    fireEvent.click(within(aside).getByRole('button', { name: /Rosanna/ }));
    await drawer('Rosanna');
    expect(where(router)).toBe(`${GRAPH}/songs/rosanna?focus=mode%3Aminor`);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('says so for a node the graph does not have', async () => {
    await mountMap(`${GRAPH}?node=vibe:nowhere`);
    const aside = await drawer('Not in the graph');
    expect(aside.textContent).toContain(
      'Nothing in the graph is called “vibe:nowhere”',
    );
  });

  it('sends a path naming no table back to the graph, its view kept', async () => {
    const router = await mountMap(`${GRAPH}/nothing/here?focus=song:africa`);
    await waitFor(() =>
      expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica`),
    );
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('keeps one width for both drawers, as it was left', async () => {
    await mountMap(`${GRAPH}/artists/toto`);
    const aside = await drawer('Toto');
    const handle = within(aside).getByRole('separator', {
      name: 'Resize the panel',
    });
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(aside.style.width).toBe('504px');
    expect(window.localStorage.getItem(GRAPH_DRAWER_WIDTH_KEY)).toBe('504');

    act(() => url.openRow('mode:minor'));
    expect((await drawer('Minor')).style.width).toBe('504px');
  });

  it('is a sheet over the map below xl', async () => {
    wide = false;
    await mountMap(`${GRAPH}/artists/toto`);
    const sheet = await screen.findByRole('dialog', { name: 'Toto' }, LAZY);
    expect(within(sheet).queryByRole('separator')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
