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
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router-dom';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { buildGraph, type GraphSnapshot } from '@/content/graph/deriveGraph';
import type { GraphNode } from '@/content/graph/types';
import type { Song } from '@/curriculum/types/songLibrary';
import { CONTENT_KEY } from '@/hooks/data/admin/useAdminContent';
import { BESIDE } from '../../../table/panel/PanelFrame';
import {
  GuardOutlet,
  useUnsavedChanges,
} from '../../mirror/UnsavedChangesGuard';
import { EntitySearch, rankNodes } from '../EntitySearch';
import { IntegrityPage } from '../IntegrityPage';
import { GraphShell, MindMapPage, NO_WEBGL_MESSAGE } from '../MindMapPage';
import { GraphSettingsPanel } from '../map/GraphSettingsPanel';
import { ALPHA, SIMULATION } from '../map/layout/forceLayout';
import { worldToScreen } from '../map/model/camera';
import { presetGroups } from '../map/model/colorGroups';
import {
  defaultGraphSettings,
  GRAPH_SETTINGS_KEY,
  type GraphSettings,
} from '../map/model/graphSettings';
import {
  NODE_STATE_HOVERED,
  NODE_STATE_LIT,
} from '../map/render/GraphRenderer';
import type { WebglGraphRenderer } from '../map/render/webglRenderer';

/**
 * The graph pages over a three-song snapshot, so the tests read the pages and
 * not the repo's 640 charts. The repo graph itself is pinned by
 * deriveGraph.test.ts and integrity.test.ts.
 *
 * Both pages read the working graph (`useWorkingGraph`): the repo snapshot
 * while the API has no `/export` (most tests here), the API's items over it
 * once it has (`api.export`).
 */

const api = vi.hoisted(() => ({
  export: false,
  /** The kinds the API serves, once it serves /export. */
  served: ['artist'] as string[],
  artists: [] as {
    slug: string;
    name: string;
    basedInPlaceId?: string;
    status?: string;
  }[],
  places: [] as { id: string; name: string; status?: string }[],
  /** Song pins: their key (the act's name in lowercase) and store id. */
  pins: [] as { key: string; id: string }[],
  fail: false,
}));

const song = (id: string, title: string, artist: string, extra = {}) =>
  ({
    id,
    title,
    artist,
    year: 1982,
    key: 'B',
    mode: 'major',
    genreTags: ['rock'],
    ...extra,
  }) as unknown as Song;

const snapshot: GraphSnapshot = {
  songs: [
    song('africa', 'Africa', 'Toto'),
    song('rosanna', 'Rosanna', 'Toto'),
    song('thriller', 'Thriller', 'Michael Jackson'),
  ],
  artists: [
    { slug: 'toto', name: 'Toto' },
    { slug: 'michael-jackson', name: 'Michael Jackson' },
    // Connected to nothing: integrity's orphan row.
    { slug: 'the-nobodies', name: 'The Nobodies' },
    // 61 acts linked to Detroit by id: a hub by its size, not its kind.
    ...Array.from({ length: 61 }, (_, i) => ({
      slug: `detroit-act-${String(i).padStart(2, '0')}`,
      name: `Detroit Act ${String(i).padStart(2, '0')}`,
      basedInPlaceId: 'detroit',
    })),
    // 61 acts in Memphis only by their song pins: guesses, every one.
    ...Array.from({ length: 61 }, (_, i) => ({
      slug: `memphis-act-${String(i).padStart(2, '0')}`,
      name: `Memphis Act ${String(i).padStart(2, '0')}`,
    })),
  ] as GraphSnapshot['artists'],
  // Only their names: no region, so everything on them is the acts.
  places: [
    { id: 'detroit', name: 'Detroit' },
    { id: 'memphis', name: 'Memphis' },
  ] as unknown as GraphSnapshot['places'],
  artistLocations: Array.from({ length: 61 }, (_, i) => ({
    id: `memphis act ${String(i).padStart(2, '0')}`,
    city: 'Memphis',
    country: 'US',
  })),
};

/**
 * jsdom has no WebGL, no Worker and no 2D canvas, so the graph draws through
 * a renderer that keeps what it was last told (how many dots, where they
 * are, the camera, the canvas's size and the hover state), and the layout
 * runs inline on the page, as it does where a Worker cannot start. The
 * tests read what a reader can: the region's name, the List view, the live
 * region and the URL; they point and click where the renderer was told to
 * draw a dot, and read back what it was told to light.
 */
const renderer = vi.hoisted(() => ({
  made: 0,
  /** No WebGL2 here: the renderer cannot be made. */
  unavailable: false,
  /** What the latest renderer was told last. */
  count: 0,
  positions: null as Float32Array | null,
  camera: null as { x: number; y: number; zoom: number } | null,
  size: { width: 0, height: 0 },
  highlight: null as {
    hovered: number;
    state: Uint8Array;
    fade: number;
  } | null,
}));
vi.mock('../map/render/webglRenderer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../map/render/webglRenderer')>();
  return {
    ...actual,
    createWebglRenderer: (): WebglGraphRenderer | null => {
      if (renderer.unavailable) return null;
      renderer.made += 1;
      let dirty = true;
      const mark = () => {
        dirty = true;
      };
      return {
        get isDirty() {
          return dirty;
        },
        isLost: false,
        stats: { frames: 0, lastFrameMs: 0 },
        gpu: 'none',
        setGraph(g) {
          renderer.count = g.count;
          mark();
        },
        setPositions(xy) {
          renderer.positions = xy.slice();
          mark();
        },
        setColors: mark,
        setNodeFlags: mark,
        setHighlight(h) {
          renderer.highlight = { ...h, state: h.state.slice() };
          mark();
        },
        setCamera(c) {
          renderer.camera = { ...c };
          mark();
        },
        setStyle: mark,
        resize(width, height) {
          renderer.size = { width, height };
          mark();
        },
        render() {
          dirty = false;
        },
        destroy() {},
      };
    },
  };
});
vi.mock('../map/render/labelLayer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../map/render/labelLayer')>();
  return { ...actual, createLabelLayer: () => null };
});
vi.mock('../repoSnapshot', () => ({
  loadRepoGraph: async () => ({ snapshot, graph: buildGraph(snapshot) }),
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));
// Every helper the pages and the row drawer read: a row opened by a click
// or by Enter loads the Table's panel, which asks for the kinds' levels.
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    capabilities: {},
    feature: (name: string) => name === 'export' && api.export,
    isServed: (kind: string) => api.export && api.served.includes(kind),
    isAuthoritative: () => false,
    identityOf: () => 'slug',
    songSchemaLevel: 0,
    schemaVersionOf: () => 0,
    servedKinds: [],
    store: 'api',
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  const row = (
    id: string,
    slug: string,
    body: Record<string, unknown>,
    status = 'draft',
  ) => ({ id, slug, status, editState: null, updatedAt: new Date(), body });
  return {
    ...actual,
    contentRequest: async (path: string) => {
      if (api.fail) throw new actual.ContentApiError(500, { error: 'Down' });
      const kind = /^\/export\?kind=(\w+)/.exec(path)?.[1];
      if (kind === 'artist') {
        return {
          items: api.artists.map(({ status, ...body }) =>
            row(`db-${body.slug}`, body.slug, body, status),
          ),
          nextCursor: null,
        };
      }
      if (kind === 'globe_city') {
        return {
          items: api.places.map(({ status, ...body }) =>
            row(`db-${body.id}`, body.id, body, status),
          ),
          nextCursor: null,
        };
      }
      if (kind === 'artist_location') {
        return {
          items: api.pins.map((pin) =>
            row(
              pin.id,
              pin.key,
              { id: pin.key, city: 'Memphis', country: 'US' },
              'published',
            ),
          ),
          nextCursor: null,
        };
      }
      throw new Error(`unexpected ${path}`);
    },
  };
});

afterEach(() => {
  cleanup();
  api.export = false;
  api.served = ['artist'];
  api.artists = [];
  api.places = [];
  api.pins = [];
  api.fail = false;
  // The Local switch remembers the tab's last focus here.
  window.sessionStorage.clear();
  // The settings panel and the camera are kept here.
  window.localStorage.clear();
  renderer.made = 0;
  renderer.unavailable = false;
  renderer.count = 0;
  renderer.positions = null;
  renderer.camera = null;
  renderer.size = { width: 0, height: 0 };
  renderer.highlight = null;
  vi.restoreAllMocks();
});

let lastLocation = '';
const Where = () => {
  const { pathname, search } = useLocation();
  lastLocation = `${pathname}${search}`;
  return null;
};

const renderAt = (
  path: string,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/console/cortex" element={<MindMapPage />}>
            <Route path=":table/:row" element={null} />
          </Route>
          <Route path="/console/cortex/integrity" element={<IntegrityPage />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** The graph region, by the name the page gives it. */
const region = (name: RegExp) => screen.findByRole('application', { name });

/** What the graph draws now, through the canvas's dev hook. */
const counts = () => window.__atlasGraphDebug!.counts;
const drawn = (id: string) =>
  window.__atlasGraphDebug!.screenPositionOf(id) !== null;

/** Wait for the inline layout to settle and the first frame to show it. */
const settled = () =>
  waitFor(() => {
    const hook = window.__atlasGraphDebug;
    expect(hook?.settled).toBe(true);
    const hub = hook?.hub();
    expect(hub && hook?.screenPositionOf(hub.id)).toBeTruthy();
  });

/** jsdom measures nothing: give the stage 800 × 600 at the page's corner. */
const measureStage = () =>
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  } as DOMRect);

/**
 * A screen wide enough for a row's panel to sit beside the graph (`BESIDE`,
 * from xl up), as on the owner's screen, until the test ends. jsdom has no
 * `matchMedia`, so without this the panel opens as a modal sheet, which
 * hides the rest of the page from a reader the moment its lazy code
 * arrives; a test that reads the page with a row open would then pass or
 * fail on how fast that code loaded.
 */
const besideTheGraph = () => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query === BESIDE,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  onTestFinished(() => {
    window.matchMedia = original;
  });
};

/**
 * The open row's panel beside the graph, once its code has loaded and the
 * row is read: from then on nothing still loading can cover the page.
 */
// The row panel loads lazily (the drawer, the table's model and its
// editors come with the first row opened), which under a busy test run can
// take longer than findBy's one-second default.
const rowBeside = (name: string) =>
  screen.findByRole('complementary', { name }, { timeout: 8000 });

/**
 * Where the renderer was told to draw the dot at `index` (the drawn graph
 * holds its items in id order), in client pixels: its position through the
 * renderer's camera, on a canvas of the size the renderer was given.
 */
const drawnAt = (index: number) => {
  const { positions, camera, size } = renderer;
  if (!positions || !camera) throw new Error('nothing drawn yet');
  return worldToScreen(camera, size, {
    x: positions[2 * index],
    y: positions[2 * index + 1],
  });
};

/** A mouse pointer event on the graph, as the region hears it. */
const pointer = (
  target: Element,
  type: 'pointermove' | 'pointerdown' | 'pointerup',
  at: { x: number; y: number },
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: at.x,
    clientY: at.y,
    button: 0,
    buttons: type === 'pointerdown' ? 1 : 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  act(() => {
    target.dispatchEvent(event);
  });
};

/** The settings panel's settings, kept as the page would keep them. */
const keepSettings = (change: (s: GraphSettings) => void) => {
  const settings = defaultGraphSettings();
  change(settings);
  window.localStorage.setItem(GRAPH_SETTINGS_KEY, JSON.stringify(settings));
};

describe('Cortex, the graph page', () => {
  it('draws the whole Atlas with no focus, named by what it holds', async () => {
    renderAt('/console/cortex');
    const graph = await region(/^Cortex: [\d,]+ items, [\d,]+ links$/);
    expect(graph).toHaveAttribute('aria-roledescription', 'graph');
    await settled();
    // Notes only: tags (genres, keys, years) and curriculum start hidden.
    expect(drawn('artist:toto')).toBe(true);
    expect(drawn('song:africa')).toBe(true);
    expect(drawn('genre:rock')).toBe(false);
    expect(drawn('year:1982')).toBe(false);
    const { items, links } = counts();
    expect(graph).toHaveAccessibleName(
      `Cortex: ${items.toLocaleString('en-US')} items, ${links.toLocaleString('en-US')} links`,
    );
    // Drawn on the app's own background, never a navy of its own.
    const stage = document.querySelector('[data-graph-stage]')!;
    expect(stage.className).toContain('bg-[hsl(var(--ui-background))]');
    expect(renderer.made).toBe(1);
  });

  it('draws the local graph round the focus, and lists its connections', async () => {
    renderAt('/console/cortex?focus=artist:toto&list=1');
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    // Two songs performed by Toto, both guessed from the display name.
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Africa'),
      expect.stringContaining('Rosanna'),
    ]);
    expect(rows.every((r) => r.textContent?.includes('Guessed'))).toBe(true);
    // "Stated by" names the item that states each one, linked to its row in
    // the Table, and the field it is stated in.
    expect(
      within(rows[0]).getByRole('link', { name: 'Africa artist' }),
    ).toHaveAttribute('href', '/console/table/songs/africa');
    expect(
      within(rows[1]).getByRole('link', { name: 'Rosanna artist' }),
    ).toHaveAttribute('href', '/console/table/songs/rosanna');

    fireEvent.click(screen.getByRole('button', { name: 'Graph' }));
    await region(/^Cortex around Toto: 3 items, 2 links$/);
  });

  it('says so where code states a connection, with no row to link to', async () => {
    keepSettings((s) => {
      s.local.filters.tags = true;
    });
    renderAt('/console/cortex?focus=year:1982&list=1');
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    const decade = rows.find((r) => /1980s/.test(r.textContent ?? ''));
    expect(decade).toBeTruthy();
    const code = within(decade!).getByText('Code: time.ts');
    expect(code).toHaveAttribute('title', 'src/content/graph/time.ts');
    expect(within(decade!).queryByRole('link')).toBeNull();
    // A song's year is stated by the song, and links to it.
    const africa = rows.find((r) => /Africa/.test(r.textContent ?? ''));
    expect(
      within(africa!).getByRole('link', { name: 'Africa year' }),
    ).toHaveAttribute('href', '/console/table/songs/africa');
  });

  it('follows a "To" from the List view with a row open beside the graph', async () => {
    besideTheGraph();
    renderAt('/console/cortex/songs/africa?focus=song:africa&list=1');
    expect(
      await screen.findByRole('heading', { name: 'Connections of Africa' }),
    ).toBeTruthy();
    await rowBeside('Africa');
    const table = screen.getByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Toto/ }));
    expect(lastLocation).toBe(
      '/console/cortex/songs/africa?focus=artist%3Atoto&list=1',
    );
    // The list is about Toto now, though Africa's row is still open.
    const toto = await screen.findByRole('heading', {
      name: 'Connections of Toto',
    });
    await waitFor(() => expect(document.activeElement).toBe(toto));
    expect(screen.getByTestId('graph-live-region').textContent).toMatch(
      /^Toto, artist, \d+ links?$/,
    );
    expect(screen.getByRole('complementary', { name: 'Africa' })).toBeTruthy();
  });

  it('keeps the local graph’s depth from one visit to the next', async () => {
    renderAt('/console/cortex?focus=artist:toto&depth=2');
    await region(/^Cortex around Toto: /);
    fireEvent.click(screen.getByRole('button', { name: 'Global' }));
    expect(lastLocation).toBe('/console/cortex');
    await region(/^Cortex: /);
    fireEvent.click(screen.getByRole('button', { name: 'Local' }));
    // Back at the depth it had, not 1.
    expect(lastLocation).toBe('/console/cortex?focus=artist%3Atoto&depth=2');
    // Kept with the local graph's settings, in the browser.
    await waitFor(() =>
      expect(
        (
          JSON.parse(
            window.localStorage.getItem(GRAPH_SETTINGS_KEY) ?? '{}',
          ) as GraphSettings
        ).local?.filters.depth,
      ).toBe(2),
    );
  });

  it('leaves the current item alone when the unsaved-changes guard keeps a row open', async () => {
    measureStage();
    besideTheGraph();
    // A row with unsaved edits: every move to another path is asked about.
    const Unsaved = () => {
      useUnsavedChanges(true);
      return <Outlet />;
    };
    const router = createMemoryRouter(
      [
        {
          element: <GuardOutlet />,
          children: [
            {
              element: <Unsaved />,
              children: [
                {
                  path: '/console/cortex',
                  element: <MindMapPage />,
                  children: [{ path: ':table/:row', element: null }],
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ['/console/cortex/artists/toto?focus=artist:toto'] },
    );
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    const graph = await region(/^Cortex around Toto: 3 items, 2 links$/);
    await settled();
    await rowBeside('Toto');
    // A click on Africa (drawn second, in id order) asks first; Stay.
    const africa = drawnAt(1);
    pointer(graph, 'pointerdown', africa);
    pointer(graph, 'pointerup', africa);
    const ask = await screen.findByRole('alertdialog', {
      name: 'Leave without saving?',
    });
    fireEvent.click(within(ask).getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(router.state.location.pathname).toBe('/console/cortex/artists/toto');
    // Africa did not become current: the List view is still about Toto,
    // whose row is still open beside it.
    expect(screen.getByRole('complementary', { name: 'Toto' })).toBeTruthy();
    // The header's view switch can still be settling after the dialog
    // closes; wait for it rather than read it in the same tick.
    fireEvent.click(
      await screen.findByRole('button', { name: 'List' }, { timeout: 8000 }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Connections of Toto' }),
    ).toBeTruthy();
  });

  it('refocuses from the list, dropping the ring map’s old parameters', async () => {
    renderAt('/console/cortex?focus=artist:toto&hops=1&list=1');
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Rosanna/ }));
    expect(lastLocation).toBe('/console/cortex?focus=song%3Arosanna&list=1');
    expect(
      await screen.findByRole('heading', { name: 'Connections of Rosanna' }),
    ).toBeTruthy();
  });

  it('folds a song event onto its song', async () => {
    renderAt('/console/cortex?focus=event:song-africa');
    expect(await region(/^Cortex around Africa: /)).toBeTruthy();
  });

  it('walks as many steps as the depth says, and reads an old link’s hops as depth', async () => {
    renderAt('/console/cortex?focus=song:africa');
    await region(/^Cortex around Africa: 2 items, 1 links$/);
    cleanup();
    // Two steps: through Toto to his other song.
    renderAt('/console/cortex?focus=song:africa&depth=2');
    await region(/^Cortex around Africa: 3 items, 2 links$/);
    cleanup();
    renderAt('/console/cortex?focus=song:africa&hops=2');
    await region(/^Cortex around Africa: 3 items, 2 links$/);
  });

  it('follows only the directions the local graph allows', async () => {
    // Africa is performed by Toto: an outgoing link, from the song.
    keepSettings((s) => {
      s.local.filters.outgoing = false;
    });
    renderAt('/console/cortex?focus=song:africa&depth=2');
    await region(/^Cortex around Africa: 1 items, 0 links$/);
    cleanup();
    // From Toto the songs are incoming.
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: 3 items, 2 links$/);
    cleanup();
    keepSettings((s) => {
      s.local.filters.incoming = false;
    });
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: 1 items, 0 links$/);
  });

  it('shows tags only with Tags on: a genre and a year join the graph', async () => {
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    const notes = counts().items;
    expect(drawn('genre:rock')).toBe(false);
    cleanup();

    keepSettings((s) => {
      s.global.filters.tags = true;
    });
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    expect(counts().items).toBeGreaterThan(notes);
    expect(drawn('genre:rock')).toBe(true);
    expect(drawn('year:1982')).toBe(true);
    cleanup();

    // A family switched off hides its tags only.
    keepSettings((s) => {
      s.global.filters.tags = true;
      s.global.filters.tagFamilies.time = false;
    });
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    expect(drawn('genre:rock')).toBe(true);
    expect(drawn('year:1982')).toBe(false);
  });

  it('hides guessed links when asked, and the local graph with them', async () => {
    keepSettings((s) => {
      s.local.filters.guessed = false;
    });
    renderAt('/console/cortex?focus=artist:toto');
    // Both songs were linked by name only: a guess.
    await region(/^Cortex around Toto: 1 items, 0 links$/);
  });

  it('hides missing items with Existing items only', async () => {
    api.export = true;
    // His City names a place that is nowhere: a missing item.
    api.artists = [
      {
        slug: 'jeff-porcaro',
        name: 'Jeff Porcaro',
        basedInPlaceId: 'atlantis',
      },
    ];
    renderAt('/console/cortex?focus=artist:jeff-porcaro');
    await screen.findByText('Working copy');
    await region(/^Cortex around Jeff Porcaro: 2 items, 1 links$/);
    cleanup();
    keepSettings((s) => {
      s.local.filters.existingOnly = true;
    });
    renderAt('/console/cortex?focus=artist:jeff-porcaro');
    await screen.findByText('Working copy');
    await region(/^Cortex around Jeff Porcaro: 1 items, 0 links$/);
  });

  it('hides what a saved search does not match, and says so with a chip', async () => {
    keepSettings((s) => {
      s.global.filters.search = 'kind:song';
    });
    renderAt('/console/cortex');
    await region(/^Cortex: 3 items, 0 links$/);
    const chip = screen.getByRole('button', { name: 'Filtered' });
    fireEvent.click(chip);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Filtered' })).toBeNull(),
    );
    await region(/^Cortex: (?!3 items)/);
  });

  it('lights a hovered dot’s neighbours and opens a clicked dot’s row, without a new renderer', async () => {
    measureStage();
    renderAt('/console/cortex?focus=artist:toto');
    const graph = await region(/^Cortex around Toto: 3 items, 2 links$/);
    await settled();
    // Three dots, in id order: Toto, then Africa and Rosanna.
    expect(renderer.count).toBe(3);
    const toto = drawnAt(0);
    // The canvas puts Toto where the renderer was told to draw him.
    const said = window.__atlasGraphDebug!.screenPositionOf('artist:toto')!;
    expect(toto.x).toBeCloseTo(said.x, 6);
    expect(toto.y).toBeCloseTo(said.y, 6);

    // Pointing at him lights him and his two songs; nothing else is drawn.
    pointer(graph, 'pointermove', toto);
    await waitFor(() => expect(renderer.highlight?.hovered).toBe(0));
    expect([...renderer.highlight!.state]).toEqual([
      NODE_STATE_HOVERED,
      NODE_STATE_LIT,
      NODE_STATE_LIT,
    ]);
    expect(graph.style.cursor).toBe('pointer');

    // Pointing at empty stage lets the light fade out: at a fade of 0 the
    // renderer draws every dot as it is, lit or not.
    pointer(graph, 'pointermove', { x: 2, y: 2 });
    await waitFor(() => expect(renderer.highlight?.fade).toBe(0));
    expect(graph.style.cursor).not.toBe('pointer');

    // A click on him opens his row beside the graph.
    pointer(graph, 'pointerdown', toto);
    pointer(graph, 'pointerup', toto);
    expect(lastLocation).toBe(
      '/console/cortex/artists/toto?focus=artist%3Atoto',
    );
    expect(screen.getByTestId('graph-live-region').textContent).toBe(
      'Opened Toto, artist, beside the graph',
    );
    expect(renderer.made).toBe(1);

    // A click on a song opens the song's row in its place.
    const rosanna = drawnAt(2);
    pointer(graph, 'pointerdown', rosanna);
    pointer(graph, 'pointerup', rosanna);
    expect(lastLocation).toBe(
      '/console/cortex/songs/rosanna?focus=artist%3Atoto',
    );
    expect(renderer.made).toBe(1);
  });

  it('drops guessed links from the whole Atlas with Guessed links off, and keeps their items', async () => {
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    const all = counts();
    cleanup();

    keepSettings((s) => {
      s.global.filters.guessed = false;
    });
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    // Each song's act was guessed from its display name (Toto twice,
    // Michael Jackson once), and each Memphis act's city from its song pins
    // (61): the 64 links go, and their items stay on as orphans.
    expect(counts().links).toBe(all.links - 64);
    expect(counts().items).toBe(all.items);
    expect(drawn('song:africa')).toBe(true);
  });

  it('says which copy of the Atlas it shows', async () => {
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: /);
    const badge = screen.getByText('Repo snapshot');
    expect(badge.getAttribute('title')).toMatch(/does not serve \/export/);
    expect(screen.queryByText('Refreshing…')).toBeNull();
    // All this API has, and the map loses nothing by it: no notice.
    expect(screen.queryByText(/did not load|read-only/)).toBeNull();
  });

  it('says so over the map when the working copy did not load, and tries again', async () => {
    api.export = true;
    api.fail = true;
    renderAt('/console/cortex?focus=artist:toto');
    const notice = await screen.findByText('The working copy did not load');
    expect(notice.parentElement?.textContent).toContain(
      '(Down). The map is drawn from the repo’s copy of the Atlas.',
    );
    // The repo's map, still drawn under it.
    expect(await region(/^Cortex around Toto: /)).toBeTruthy();
    expect(screen.getByText('Repo snapshot').getAttribute('title')).toMatch(
      /the working copy did not load/,
    );

    api.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Working copy')).toBeTruthy();
    expect(screen.queryByText('The working copy did not load')).toBeNull();
  });

  it('says so over the map when a refresh of the working copy failed', async () => {
    api.export = true;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderAt('/console/cortex?focus=artist:toto', client);
    await screen.findByText('Working copy');

    // A save elsewhere, and the refetch after it fails.
    api.fail = true;
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    const notice = await screen.findByText('The latest changes did not load');
    expect(notice.parentElement?.textContent).toContain(
      'The map is drawn from the last working copy that did',
    );
    expect(screen.getByText('Working copy').getAttribute('title')).toMatch(
      /the latest changes did not load/,
    );

    api.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(screen.queryByText('The latest changes did not load')).toBeNull(),
    );
    expect(screen.getByText('Working copy').getAttribute('title')).toBe(
      'The API’s working items merged over the repo',
    );
  });

  it('draws the working copy once the API serves one', async () => {
    api.export = true;
    api.artists = [
      { slug: 'toto', name: 'TOTO' },
      // Only the API has him: a new record, not yet in the repo.
      { slug: 'jeff-porcaro', name: 'Jeff Porcaro' },
    ];
    renderAt('/console/cortex?focus=artist:jeff-porcaro');
    // While the working copy is on its way, the repo's graph says so, and a
    // focus only the working copy has is waited for, not reported missing.
    await waitFor(() => {
      expect(screen.getByText('Refreshing…')).toBeTruthy();
      expect(screen.getByText('Repo snapshot').getAttribute('title')).toMatch(
        /while the working copy loads/,
      );
    });
    expect(screen.queryByText(/Nothing in the graph is called/)).toBeNull();
    expect(await region(/^Cortex around Jeff Porcaro: /)).toBeTruthy();
    expect(screen.queryByText(/Nothing in the graph is called/)).toBeNull();
    expect(screen.getByText('Working copy')).toBeTruthy();
    expect(screen.queryByText('Refreshing…')).toBeNull();

    // The API's copy of Toto, over the repo's.
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: 'toto' } });
    expect(await screen.findByRole('option', { name: /TOTO/ })).toBeTruthy();
  });

  it('says so when the focus is nothing', async () => {
    renderAt('/console/cortex?focus=artist:nobody');
    expect(
      await screen.findByText(/Nothing in the graph is called/),
    ).toBeTruthy();
  });

  it('names a song pin as the pin, and opens its own item', async () => {
    renderAt('/console/cortex?focus=artist:memphis-act-00&list=1');
    const table = await screen.findByRole('table');
    const pin = within(table).getByRole('link', { name: /Song pins/ });
    expect(pin.textContent).toBe('Song pins ‘memphis act 00’ city');
    expect(pin.getAttribute('href')).toBe(
      '/console/content/records/artist_location?q=memphis+act+00',
    );
    expect(within(table).getByText('Guessed').getAttribute('title')).toBe(
      "Guessed from where the globe pins the act's songs, not its City",
    );
  });

  it('opens a song pin’s own item where the API lists it', async () => {
    api.export = true;
    api.served = ['artist', 'artist_location'];
    api.pins = [{ key: 'memphis act 00', id: 'db-pin-00' }];
    renderAt('/console/cortex?focus=artist:memphis-act-00&list=1');
    await screen.findByText('Working copy');
    const table = await screen.findByRole('table');
    const pin = within(table).getByRole('link', { name: /Song pins/ });
    // The item itself, by its store id: no search that could find others.
    expect(pin.getAttribute('href')).toBe(
      '/console/content/records/artist_location/db-pin-00',
    );
    expect(pin.textContent).toBe('Song pins ‘memphis act 00’ city');
  });
});

describe('the shell around the graph', () => {
  /** Whether a switch in one of the header's groups is pressed. */
  const pressedIn = (group: string, name: string) =>
    within(screen.getByRole('group', { name: group }))
      .getByRole('button', { name })
      .getAttribute('aria-pressed');
  const local = () =>
    within(screen.getByRole('group', { name: 'Graph scope' })).getByRole(
      'button',
      { name: 'Local' },
    );

  it('is the whole page: a slim header over the graph', async () => {
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: /);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cortex' }),
    ).toBeTruthy();
    const header = screen.getByRole('combobox').closest('header')!;
    expect(header.className).toContain('h-11');
    // Find, Global | Local, the badge, Graph | List and the page pills.
    expect(
      within(header).getByRole('group', { name: 'Graph scope' }),
    ).toBeTruthy();
    expect(within(header).getByText('Repo snapshot')).toBeTruthy();
    expect(within(header).getByRole('group', { name: 'Show as' })).toBeTruthy();
    const pills = within(header).getByRole('navigation', {
      name: 'Graph views',
    });
    expect(within(pills).getByText('Map').getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      within(pills)
        .getByRole('link', { name: 'Integrity' })
        .getAttribute('href'),
    ).toBe('/console/cortex/integrity');
    // The keys the graph answers to, which its region points at.
    const help = screen.getByText(/^Keys on the graph:/);
    expect(help.className).toContain('sr-only');
    expect(screen.getByRole('application')).toHaveAttribute(
      'aria-describedby',
      help.id,
    );
    // The settings and the zoom buttons float over the graph.
    expect(
      screen.getByRole('button', { name: 'Open graph settings' }),
    ).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Zoom' })).toBeTruthy();
  });

  it('opens global with no focus, and local around one', async () => {
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    expect(pressedIn('Graph scope', 'Global')).toBe('true');
    expect(pressedIn('Graph scope', 'Local')).toBe('false');
    // Nothing to centre on yet: no selection, and no focus this tab has had.
    expect(local().hasAttribute('disabled')).toBe(true);
    cleanup();

    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: /);
    expect(pressedIn('Graph scope', 'Local')).toBe('true');
    expect(pressedIn('Graph scope', 'Global')).toBe('false');
  });

  it('goes global, and back to the last focus', async () => {
    renderAt('/console/cortex?focus=artist:toto&hops=1&list=1');
    await screen.findByRole('heading', { name: 'Connections of Toto' });
    fireEvent.click(screen.getByRole('button', { name: 'Global' }));
    // The view stays; the focus and its hops go.
    expect(lastLocation).toBe('/console/cortex?list=1');
    expect(pressedIn('Graph scope', 'Global')).toBe('true');

    expect(local().hasAttribute('disabled')).toBe(false);
    fireEvent.click(local());
    expect(lastLocation).toBe('/console/cortex?focus=artist%3Atoto&list=1');
    expect(pressedIn('Graph scope', 'Local')).toBe('true');
  });

  it('finds an item: makes it current, says so, and offers Local around it', async () => {
    renderAt('/console/cortex');
    const graph = await region(/^Cortex: /);
    await settled();
    expect(local().hasAttribute('disabled')).toBe(true);
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: 'toto' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Toto/ }));
    expect(screen.getByTestId('graph-live-region').textContent).toBe(
      'Toto, artist, 2 links',
    );
    // The keyboard is on the graph now, on Toto.
    expect(document.activeElement).toBe(graph);
    expect(local().hasAttribute('disabled')).toBe(false);
    fireEvent.click(local());
    expect(lastLocation).toBe('/console/cortex?focus=artist%3Atoto');
    await region(/^Cortex around Toto: /);
  });

  it('walks the graph with the keys and says where it is', async () => {
    renderAt('/console/cortex?focus=artist:toto');
    const graph = await region(/^Cortex around Toto: /);
    await settled();
    // The layout's own news first, so it cannot talk over the keys'.
    await waitFor(() =>
      expect(screen.getByTestId('graph-live-region').textContent).toBe(
        'Layout settled',
      ),
    );
    const press = (key: string) =>
      act(() => {
        graph.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true }),
        );
      });
    // From the focus, then through its neighbours.
    press(']');
    expect(screen.getByTestId('graph-live-region').textContent).toBe(
      'Toto, artist, 2 links',
    );
    press(']');
    expect(screen.getByTestId('graph-live-region').textContent).toBe(
      'Africa, song, 1 link, 1 of 2 neighbours of Toto',
    );
    press('Enter');
    expect(lastLocation).toBe(
      '/console/cortex/songs/africa?focus=artist%3Atoto',
    );
    press('l');
    expect(lastLocation).toBe(
      '/console/cortex/songs/africa?focus=song%3Aafrica',
    );
  });

  it('says when the layout has settled', async () => {
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await waitFor(() =>
      expect(screen.getByTestId('graph-live-region').textContent).toBe(
        'Layout settled',
      ),
    );
  });

  it('shows the List view, and walks it one item at a time', async () => {
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: /);
    expect(pressedIn('Show as', 'Graph')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(lastLocation).toBe('/console/cortex?focus=artist%3Atoto&list=1');
    expect(pressedIn('Show as', 'List')).toBe('true');
    expect(
      screen.getByRole('region', { name: 'Connections of Toto' }),
    ).toBeTruthy();
    // The picture steps aside; the list is the page.
    expect(screen.queryByRole('application')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Open graph settings' }),
    ).toBeNull();

    // In the local graph a "To" moves the focus there, and says where.
    const table = screen.getByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Rosanna/ }));
    expect(lastLocation).toBe('/console/cortex?focus=song%3Arosanna&list=1');
    const rosanna = await screen.findByRole('heading', {
      name: 'Connections of Rosanna',
    });
    // The pressed "To" went with Toto's list; the keyboard lands here.
    await waitFor(() => expect(document.activeElement).toBe(rosanna));
    expect(screen.getByTestId('graph-live-region').textContent).toMatch(
      /^Rosanna, song, \d+ links?$/,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Graph' }));
    expect(lastLocation).toBe('/console/cortex?focus=song%3Arosanna');
    await region(/^Cortex around Rosanna: /);
    // The same canvas throughout: the List view only hid it.
    expect(renderer.made).toBe(1);
  });

  it('skips to the list and lands on its heading', async () => {
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: /);
    const skip = screen.getByRole('link', {
      name: 'Skip to the list of connections',
    });
    expect(skip.className).toContain('sr-only');
    fireEvent.click(skip);
    expect(lastLocation).toBe('/console/cortex?focus=artist%3Atoto&list=1');
    const heading = await screen.findByRole('heading', {
      name: 'Connections of Toto',
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    // Already in the list: no skip link.
    expect(
      screen.queryByRole('link', { name: 'Skip to the list of connections' }),
    ).toBeNull();
  });

  it('puts the settings panel straight on the stage, in its corner, above the banner and zoom', () => {
    render(
      <MemoryRouter>
        <GraphShell
          find={null}
          scope={null}
          badge={null}
          view={null}
          keyHelpId="graph-keys"
          banner={<p>A notice</p>}
          zoom={<button type="button">Zoom in</button>}
          settings={
            <GraphSettingsPanel
              mode="global"
              settings={defaultGraphSettings().global}
              groups={presetGroups()}
              onChange={() => {}}
              onGroupsChange={() => {}}
              onGroupHover={() => {}}
              onRestoreDefaults={() => {}}
            />
          }
        >
          <div data-testid="stage-body" />
        </GraphShell>
      </MemoryRouter>,
    );
    // The stage is the panel's positioned parent, with nothing between: a
    // box between them would have no height, and the open panel's height
    // limit (a share of its parent's) would shrink it to nothing.
    const stage = screen.getByTestId('stage-body').parentElement!;
    expect(stage.className).toMatch(/(^| )relative( |$)/);
    expect(stage.className).toContain('overflow-hidden');
    const closed = document.querySelector('[data-graph-settings="closed"]')!;
    expect(closed.parentElement).toBe(stage);
    expect(closed.className).toMatch(/(^| )absolute( |$)/);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open graph settings' }),
    );
    const panel = screen.getByRole('region', { name: 'Graph settings' });
    expect(panel.parentElement).toBe(stage);
    for (const c of [
      'absolute',
      'right-3',
      'top-3',
      'z-30',
      'max-h-[calc(100%-24px)]',
    ]) {
      expect(panel.className.split(/\s+/)).toContain(c);
    }
    // The banner keeps clear of the panel's 240 px column (12 + 240 + 12),
    // and it and the zoom buttons sit under the panel.
    const banner = screen.getByText('A notice').parentElement!.parentElement!;
    expect(banner.className).toContain('right-[264px]');
    expect(banner.className).toContain('z-20');
    expect(
      screen.getByRole('button', { name: 'Zoom in' }).parentElement!.className,
    ).toContain('z-20');
  });

  it('lists nothing in the global graph until something is chosen', async () => {
    renderAt('/console/cortex?list=1');
    expect(await screen.findByText(/Nothing is chosen yet/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('when the graph cannot move or draw', () => {
  /** The layout's own numbers, through the canvas's dev hook. */
  const layout = () =>
    (
      window.__atlasGraphDebug!.stats() as {
        layout: {
          starts: number;
          ticks: number;
          changes: number;
          mode: string;
        };
      }
    ).layout;

  it('shows the List view with a callout where WebGL2 is missing, and lays nothing out', async () => {
    renderer.unavailable = true;
    renderAt('/console/cortex?focus=artist:toto');
    expect(await screen.findByText(NO_WEBGL_MESSAGE)).toBeTruthy();
    expect(
      await screen.findByRole('heading', { name: 'Connections of Toto' }),
    ).toBeTruthy();
    // List is the view; Graph stays in sight but cannot be chosen, and says why.
    const graphButton = screen.getByRole('button', { name: 'Graph' });
    expect(graphButton).toBeDisabled();
    expect(graphButton.getAttribute('title')).toMatch(/cannot draw the graph/);
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The canvas went with the picture: no region, no layout left running.
    expect(screen.queryByRole('application')).toBeNull();
    await waitFor(() => expect(window.__atlasGraphDebug).toBeUndefined());
    expect(renderer.made).toBe(0);
    expect(lastLocation).not.toContain('list=1');
  });

  it('redraws a save without a new run: the same structure keeps every place, a new link reheats the same run to 0.1', async () => {
    api.export = true;
    api.artists = [{ slug: 'toto', name: 'Toto' }];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderAt('/console/cortex', client);
    await screen.findByText('Working copy');
    await region(/^Cortex: /);
    await settled();
    const before = layout();
    const where = window.__atlasGraphDebug!.screenPositionOf('artist:toto');
    const { links } = counts();

    // Saved in the drawer: Toto renamed. The same items and links.
    api.artists = [{ slug: 'toto', name: 'Toto (band)' }];
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'band' },
    });
    expect(
      await screen.findByRole('option', { name: /Toto \(band\)/ }),
    ).toBeTruthy();
    expect(layout()).toMatchObject({
      starts: before.starts,
      changes: before.changes,
      ticks: before.ticks,
    });
    expect(window.__atlasGraphDebug!.settled).toBe(true);
    expect(window.__atlasGraphDebug!.screenPositionOf('artist:toto')).toEqual(
      where,
    );

    // Saved again: Toto now based in Detroit. One more link, so the run
    // that is going carries it over and cools from a save's 0.1: 200 ticks,
    // where a new run would take 300.
    api.artists = [
      { slug: 'toto', name: 'Toto (band)', basedInPlaceId: 'detroit' },
    ];
    await act(() => client.invalidateQueries({ queryKey: CONTENT_KEY }));
    await waitFor(() => expect(counts().links).toBe(links + 1));
    await settled();
    expect(layout()).toMatchObject({
      starts: before.starts,
      changes: before.changes + 1,
      ticks: Math.ceil(
        Math.log(SIMULATION.alphaMin / ALPHA.structure) /
          Math.log(1 - SIMULATION.alphaDecay),
      ),
    });
    expect(renderer.made).toBe(1);
  });

  it('lays the graph out out of sight under reduced motion, and still says when it has settled', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      renderAt('/console/cortex');
      await region(/^Cortex: /);
      await settled();
      expect(layout().mode).toBe('converge');
      await waitFor(() =>
        expect(screen.getByTestId('graph-live-region').textContent).toBe(
          'Layout settled',
        ),
      );
      expect(screen.queryByRole('progressbar')).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('the timelapse', () => {
  const live = () => screen.getByTestId('graph-live-region').textContent;

  /** Pretend the reader asked for reduced motion; returns the undo. */
  const reduceMotion = () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    return () => {
      window.matchMedia = original;
    };
  };

  it('plays from the wand with a year counter, and Stop brings the graph back as it was', async () => {
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    const whole = counts();
    const toto = window.__atlasGraphDebug!.screenPositionOf('artist:toto');

    fireEvent.click(
      screen.getByRole('button', { name: 'Start timelapse animation' }),
    );
    const counter = await screen.findByRole('group', { name: 'Timelapse' });
    // Every song of the snapshot is from 1982, its one dated year.
    expect(counter).toHaveTextContent('1982');
    expect(live()).toBe(
      'Timelapse playing: the Atlas grows year by year, all of it from 1982. Stop, or Escape on the graph, brings the graph back as it was.',
    );
    // It starts with the first year's batch, not the whole Atlas.
    expect(counts().items).toBeLessThan(whole.items);
    // The region keeps its name: the whole Atlas is still what it holds.
    expect(screen.getByRole('application')).toHaveAccessibleName(
      `Cortex: ${whole.items.toLocaleString('en-US')} items, ${whole.links.toLocaleString('en-US')} links`,
    );

    fireEvent.click(within(counter).getByRole('button', { name: 'Stop' }));
    expect(screen.queryByRole('group', { name: 'Timelapse' })).toBeNull();
    expect(live()).toBe('Timelapse stopped. The graph is back as it was.');
    await waitFor(() => expect(counts()).toEqual(whole));
    // Back exactly where it had settled, and nothing talks over the news.
    await waitFor(() =>
      expect(window.__atlasGraphDebug!.screenPositionOf('artist:toto')).toEqual(
        toto,
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(live()).toBe('Timelapse stopped. The graph is back as it was.');
  });

  it('plays from Display’s Animate too, and stops when the List view is chosen', async () => {
    renderAt('/console/cortex');
    await region(/^Cortex: /);
    await settled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open graph settings' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Display' }));
    fireEvent.click(screen.getByRole('button', { name: 'Animate' }));
    expect(
      await screen.findByRole('group', { name: 'Timelapse' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'Timelapse' })).toBeNull(),
    );
    expect(live()).toBe('Timelapse stopped. The graph is back as it was.');
  });

  it('is the global graph’s alone, and is off under reduced motion', async () => {
    renderAt('/console/cortex?focus=artist:toto');
    await region(/^Cortex around Toto: /);
    expect(
      screen.queryByRole('button', { name: 'Start timelapse animation' }),
    ).toBeNull();
    cleanup();

    const restore = reduceMotion();
    try {
      renderAt('/console/cortex');
      await region(/^Cortex: /);
      expect(
        screen.getByRole('button', { name: 'Start timelapse animation' }),
      ).toBeDisabled();
      fireEvent.click(
        screen.getByRole('button', { name: 'Open graph settings' }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Display' }));
      expect(screen.getByRole('button', { name: 'Animate' })).toBeDisabled();
    } finally {
      restore();
    }
  });
});

describe('the integrity page', () => {
  it('checks the working copy, and sends each fix to its row in the Table', async () => {
    api.export = true;
    api.artists = [
      // Only the API has him, and his City names a place that is nowhere.
      {
        slug: 'jeff-porcaro',
        name: 'Jeff Porcaro',
        basedInPlaceId: 'atlantis',
      },
    ];
    renderAt('/console/cortex/integrity');
    await screen.findByText('Working copy');
    const fix = await screen.findByRole('link', { name: /^Open Jeff Porcaro/ });
    expect(fix.getAttribute('href')).toBe(
      '/console/table/artists/jeff-porcaro',
    );
    // An artist's row edits it, in its panel's Details.
    expect(fix.textContent).not.toContain('not editable');
    expect(fix.getAttribute('title')).toBe(
      'Open its row in the Table, which edits it',
    );
    // Every fix opens a row in the Table, and every row there edits its item.
    for (const link of screen.getAllByRole('link', { name: /^Open / })) {
      expect(link.getAttribute('href')).toMatch(/^\/console\/table\//);
      expect(link.textContent).not.toContain('not editable');
    }
  });

  it('sends a song pin’s fix to the pin, not the artist it is filed under', async () => {
    api.export = true;
    api.served = ['artist', 'globe_city', 'artist_location'];
    // A published act whose song pins name a city that is still a draft.
    api.artists = [
      { slug: 'memphis-act-00', name: 'Memphis Act 00', status: 'published' },
    ];
    api.places = [{ id: 'memphis', name: 'Memphis', status: 'draft' }];
    api.pins = [{ key: 'memphis act 00', id: 'db-pin-00' }];
    renderAt('/console/cortex/integrity?check=draft-reference');
    await screen.findByText('Working copy');
    const pin = await screen.findByRole('link', {
      name: /^Song pins ‘memphis act 00’/,
    });
    expect(pin.getAttribute('href')).toBe(
      '/console/content/records/artist_location/db-pin-00',
    );
    expect(
      screen.queryByRole('link', { name: /^Open Memphis Act 00/ }),
    ).toBeNull();
  });

  it('says so when the working copy did not load, over the repo’s checks', async () => {
    api.export = true;
    api.fail = true;
    renderAt('/console/cortex/integrity');
    const notice = await screen.findByText('The working copy did not load');
    expect(notice.parentElement?.textContent).toContain(
      'These checks are of the repo’s copy of the Atlas.',
    );
    expect(await screen.findByText('How much is linked')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows coverage and problem rows linked to the map', async () => {
    renderAt('/console/cortex/integrity');
    expect(await screen.findByText('How much is linked')).toBeTruthy();
    const coverage = screen.getAllByRole('table')[0];
    expect(coverage.textContent).toContain('origin.artistGlobeId');
    const focusLinks = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h) => h?.startsWith('/console/cortex?focus='));
    expect(focusLinks).toContain('/console/cortex?focus=artist%3Athe-nobodies');
  });
});

describe('finding a node', () => {
  const node = (id: string, label: string): GraphNode =>
    ({
      id,
      kind: id.split(':')[0],
      label,
      status: 'code',
      origin: 'code',
    }) as GraphNode;
  const entries = [
    node('artist:stevie-wonder', 'Stevie Wonder'),
    node('song:superstition', 'Superstition'),
    node('artist:wonder-mike', 'Wonder Mike'),
    node('genre:soul', 'Soul'),
    node('song:wonderwall', 'Wonderwall'),
  ].map((n) => ({ node: n, name: n.label.toLowerCase() }));

  it('ranks exact, then prefix, then word, then anywhere', () => {
    expect(rankNodes(entries, 'wonder').map((n) => n.label)).toEqual([
      'Wonderwall',
      'Wonder Mike',
      'Stevie Wonder',
    ]);
  });

  it('finds an id typed in full', () => {
    expect(rankNodes(entries, 'genre:soul')[0]?.id).toBe('genre:soul');
  });

  it('finds nothing for nothing', () => {
    expect(rankNodes(entries, '   ')).toEqual([]);
  });

  it('colours each match as the graph’s groups do', () => {
    render(
      <EntitySearch
        nodes={new Map(entries.map((e) => [e.node.id, e.node]))}
        onPick={() => {}}
        colorOf={(n) => (n.kind === 'song' ? 'rgb(1, 2, 3)' : 'rgb(4, 5, 6)')}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'wonder' },
    });
    const dot = (name: RegExp) =>
      screen
        .getByRole('option', { name })
        .querySelector<HTMLElement>('span[aria-hidden]')!.style.background;
    expect(dot(/Wonderwall/)).toBe('rgb(1, 2, 3)');
    expect(dot(/Stevie Wonder/)).toBe('rgb(4, 5, 6)');
  });
});
