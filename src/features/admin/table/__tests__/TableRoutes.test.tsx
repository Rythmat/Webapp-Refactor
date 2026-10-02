// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { type ReactElement, Suspense } from 'react';
import {
  createMemoryRouter,
  Link,
  type RouteObject,
  RouterProvider,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRoutes } from '@/constants/routes';
import { adminPages } from '@/features/admin/AdminPages';
import { ContentAreaLayout } from '@/features/admin/content/ContentAreaLayout';
import {
  GuardOutlet,
  useUnsavedChanges,
} from '@/features/admin/content/mirror/UnsavedChangesGuard';

/**
 * The Cortex section's routes as AdminPages declares them, seen from the
 * Table (owner, 1 Oct 2026: the sidebar's Table renamed Cortex, the graph
 * its default view, the tables inside it): the redirects, the bar's Cortex
 * and category pills and the views, the grid and the row panel they open,
 * and the one unsaved-changes guard it shares with the content area.
 */

const auth = vi.hoisted(() => ({ role: 'admin' as string }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role }),
}));
// Changes reads the content overview from the API; a marker is enough here.
vi.mock('@/features/admin/content/publishing/ChangesButton', () => ({
  ChangesButton: () => <button type="button">Changes</button>,
}));
// The rows: the fixture Atlas in working mode, built once, as the working
// graph hands one build to every render.
vi.mock('@/features/admin/content/graph/useWorkingGraph', async () => {
  const { fixtureGraph, ITEMS, SNAPSHOT } = await import('./tableFixtures');
  const state = {
    graph: fixtureGraph(),
    snapshot: SNAPSHOT,
    items: ITEMS,
    mode: 'working',
    fingerprint: 'fixture',
    isLoading: false,
    isRefreshing: false,
    error: null,
  };
  return { useWorkingGraph: () => state };
});
// The graph is a stand-in: these tests are about the section's bar and the
// tables, and graphRoutes.test.tsx and graphPages.test.tsx cover the graph.
vi.mock('@/features/admin/content/graph/MindMapPage', () => ({
  MindMapPage: () => <p data-testid="graph">The graph</p>,
}));
// Tesseract too: here only its pill and which pill is lit on it matter.
vi.mock('@/features/admin/content/graph/tesseract/TesseractPage', () => ({
  TesseractPage: () => <p data-testid="tesseract">Tesseract</p>,
}));
// A server that serves /export, as the working graph above says.
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    feature: () => true,
    isServed: () => false,
    // What the row panel's editors read.
    capabilities: null,
    identityOf: () => 'slug',
    schemaVersionOf: () => 0,
    songSchemaLevel: 0,
  }),
}));
// jsdom lays nothing out, so the grid is given a size to draw its rows in.
vi.mock('@/hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 2400, height: 600 }),
}));

// A wide screen: the row panel sits beside the grid, not in a sheet over it.
beforeEach(() => {
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
  window.localStorage.clear();
});

afterEach(cleanup);

/** How long a lazy page or panel may take to load cold. */
const LAZY_TIMEOUT = 10_000;

type RouteLike = {
  id?: string;
  path?: string;
  index?: boolean;
  element?: ReactElement;
  children?: RouteLike[];
};

const consoleRoutes = () => adminPages().children as RouteLike[];

const guardRoute = () =>
  consoleRoutes().find((route) => route.element?.type === GuardOutlet);

/** The Cortex section: its layout and bar over the graph and the tables. */
const cortexRoute = () =>
  guardRoute()?.children?.find((route) => route.id === 'cortex');

const tableRoute = () =>
  cortexRoute()?.children?.find(
    (route) => route.path === AdminRoutes.table.definition,
  );

/** Draw the section at `path`, its bar and the page under it. */
const draw = (path: string, role: string) => {
  auth.role = role;
  const router = createMemoryRouter([cortexRoute() as RouteObject], {
    initialEntries: [path],
  });
  render(
    // The row panel holds an item's editing session, which queries the API.
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>,
  );
  return router;
};

const mount = async (path: string, role = 'admin') => {
  const router = draw(path, role);
  // The layout and the page are lazy, and show a skeleton with the table's
  // title while they load: wait for the grid itself, loaded cold the first
  // time (slow while the whole suite runs in parallel).
  await screen.findByRole('grid', {}, { timeout: LAZY_TIMEOUT });
  return router;
};

/** Draw the section on one of the graph's pages, and wait for the graph. */
const mountGraph = async (path: string, role = 'admin') => {
  const router = draw(path, role);
  await screen.findByTestId('graph', {}, { timeout: LAZY_TIMEOUT });
  return router;
};

/** Draw the section on Tesseract's map, and wait for the map. */
const mountTesseract = async (path: string, role = 'admin') => {
  const router = draw(path, role);
  await screen.findByTestId('tesseract', {}, { timeout: LAZY_TIMEOUT });
  return router;
};

const pills = () =>
  within(screen.getByRole('navigation', { name: 'Cortex sections' }))
    .getAllByRole('link')
    .map((a) => ({
      label: a.textContent,
      href: a.getAttribute('href'),
      current: a.getAttribute('aria-current') === 'page',
    }));

const currentPill = () => pills().filter((p) => p.current);

const where = (router: Awaited<ReturnType<typeof mount>>) =>
  `${router.state.location.pathname}${router.state.location.search}`;

describe('the Table routes', () => {
  it('share the one unsaved-changes guard with the content area', () => {
    // One pathless guard route above both; the content area has none of its
    // own (react-router runs one blocker at a time).
    const guarded = guardRoute()?.children ?? [];
    expect(guarded.map((route) => route.element?.type)).toContain(
      ContentAreaLayout,
    );
    expect(cortexRoute()).toBeDefined();
    expect(tableRoute()).toBeDefined();
    expect(
      consoleRoutes().filter((route) => route.element?.type === GuardOutlet),
    ).toHaveLength(1);
  });

  it('open the section’s default view, the graph, from the bare Table', async () => {
    const router = await mountGraph('/console/table?q=toto');
    // The query is kept, as every console redirect keeps it.
    expect(where(router)).toBe('/console/cortex?q=toto');
    expect(currentPill()).toEqual([
      { label: 'Cortex', href: '/console/cortex', current: true },
    ]);
  });

  it('keep a table’s own URL, the Artist pill lit', async () => {
    const router = await mount('/console/table/artists?q=toto');
    expect(where(router)).toBe('/console/table/artists?q=toto');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Artist',
    );
    expect(currentPill()).toEqual([
      { label: 'Artist', href: '/console/table/artists', current: true },
    ]);
  });

  it('send the Recording name to its first view, row and search kept', async () => {
    expect(where(await mount('/console/table/recording?q=toto'))).toBe(
      '/console/table/records?q=toto',
    );
    cleanup();
    expect(
      where(await mount('/console/table/recording/abbey-road?q=toto')),
    ).toBe('/console/table/records/abbey-road?q=toto');
  });

  it('send an unknown table to artists, not to a stand-in', async () => {
    // Without its search: that was chosen for a table that isn't there.
    const router = await mount('/console/table/nonsense?q=toto');
    expect(where(router)).toBe('/console/table/artists');
  });

  it('shows Cortex, then Tesseract, then the ten pills, each opening its first table', async () => {
    await mount('/console/table/songs');
    expect(pills().map((p) => [p.label, p.href])).toEqual([
      ['Cortex', '/console/cortex'],
      ['Tesseract', '/console/cortex/tesseract'],
      ['Artist', '/console/table/artists'],
      ['Songs', '/console/table/songs'],
      ['Genre', '/console/table/genres'],
      ['Location', '/console/table/locations'],
      ['Instruments', '/console/table/instruments'],
      ['Events', '/console/table/events'],
      ['Recording', '/console/table/records'],
      ['Key', '/console/table/keys'],
      ['Chord Progression', '/console/table/progressions'],
      ['Year', '/console/table/years'],
    ]);
  });

  it('lights Recording on studios, and switches its views', async () => {
    await mount('/console/table/studios');
    // The lit pill stays on the table showing.
    expect(currentPill()).toEqual([
      { label: 'Recording', href: '/console/table/studios', current: true },
    ]);
    const views = within(
      screen.getByRole('navigation', { name: 'Recording views' }),
    );
    expect(views.getByText('Studios').getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      views.getByRole('link', { name: 'Records' }).getAttribute('href'),
    ).toBe('/console/table/records');
    expect(
      views.getByRole('link', { name: 'Labels' }).getAttribute('href'),
    ).toBe('/console/table/labels');
  });

  it('lights Year on decades, with a row open beside the grid', async () => {
    await mount('/console/table/decades/1980s');
    expect(currentPill()).toEqual([
      { label: 'Year', href: '/console/table/decades', current: true },
    ]);
    const views = within(
      screen.getByRole('navigation', { name: 'Year views' }),
    );
    expect(views.getByText('Decades').getAttribute('aria-current')).toBe(
      'page',
    );
    // The panel is lazy too; it opens on the row the path names.
    const panel = await screen.findByRole(
      'complementary',
      {},
      { timeout: LAZY_TIMEOUT },
    );
    expect(within(panel).getByRole('heading', { level: 2 }).textContent).toBe(
      '1980s',
    );
  });

  it('has no view switch for a one-table category', async () => {
    await mount('/console/table/genres');
    expect(screen.queryByRole('navigation', { name: /views$/ })).toBeNull();
  });

  // The owner's five lists as he wrote them (29 Sep 2026), with his "Lable"
  // spelt Label, as the grid's column heads after the row's own name (which
  // he named only for artists). The categories he left as "Etc." are
  // proposals, not pinned.
  it.each([
    {
      table: 'artists',
      title: null,
      columns: [
        'Artist Name',
        'Born',
        'City',
        'Genres',
        'Years Active',
        'Songs',
        'Events',
        'Instruments',
      ],
    },
    {
      table: 'songs',
      title: 'Title',
      columns: [
        'Composers',
        'Year',
        'Album',
        'Label',
        'Studio',
        'Credits',
        'Producer',
        'Genre',
        'Key',
        'Chord Progression',
        'Events',
      ],
    },
    {
      table: 'genres',
      title: 'Genre',
      columns: ['Artists', 'Songs', 'Year', 'Location', 'Instruments'],
    },
    {
      table: 'locations',
      title: 'Location',
      columns: ['Artists', 'Songs', 'Genre', 'Instruments'],
    },
    { table: 'events', title: 'Event', columns: ['Artists', 'Songs', 'Genre'] },
  ])(
    'shows the columns the owner listed for $table, in his words',
    async ({ table, title, columns }) => {
      await mount(`/console/table/${table}`);
      expect(
        screen.getAllByRole('columnheader').map((th) => th.textContent),
      ).toEqual(title ? [title, ...columns] : columns);
    },
  );

  it('gives Changes and Publishing to admins, Cortex to all', async () => {
    await mount('/console/table/songs', 'admin');
    expect(screen.getByRole('button', { name: 'Changes' })).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'Publishing' }).getAttribute('href'),
    ).toBe(AdminRoutes.contentPublishing());
    expect(pills()[0]).toEqual({
      label: 'Cortex',
      href: AdminRoutes.cortex(),
      current: false,
    });
    cleanup();

    await mount('/console/table/songs', 'editor');
    expect(screen.queryByRole('button', { name: 'Changes' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Publishing' })).toBeNull();
    expect(pills()[0].label).toBe('Cortex');
    // The bar's old "Mind map" link is the Cortex pill now.
    expect(screen.queryByRole('link', { name: /mind map/i })).toBeNull();
  });

  it('lights Cortex, and no category, on the graph’s pages', async () => {
    for (const path of [
      '/console/cortex',
      '/console/cortex?focus=artist:toto&depth=2',
      // A row beside the graph names a table, but it is still the graph.
      '/console/cortex/artists/toto?focus=artist:toto',
    ]) {
      await mountGraph(path);
      expect(currentPill(), path).toEqual([
        { label: 'Cortex', href: '/console/cortex', current: true },
      ]);
      // Tesseract is its own pill, unlit on the graph.
      expect(pills()[1]).toEqual({
        label: 'Tesseract',
        href: '/console/cortex/tesseract',
        current: false,
      });
      // Every category is still a way to its table.
      expect(pills()[2]).toEqual({
        label: 'Artist',
        href: '/console/table/artists',
        current: false,
      });
      cleanup();
    }
  });

  it('lights Tesseract, and neither Cortex nor a category, on its map', async () => {
    for (const path of [
      '/console/cortex/tesseract',
      // A progression's row beside the map names a table, but it is still
      // Tesseract.
      '/console/cortex/tesseract/progressions/toto',
    ]) {
      await mountTesseract(path);
      expect(currentPill(), path).toEqual([
        {
          label: 'Tesseract',
          href: '/console/cortex/tesseract',
          current: true,
        },
      ]);
      expect(pills()[0]).toEqual({
        label: 'Cortex',
        href: '/console/cortex',
        current: false,
      });
      expect(pills()[2]).toEqual({
        label: 'Artist',
        href: '/console/table/artists',
        current: false,
      });
      cleanup();
    }
  });

  it('lights the table’s category, not Tesseract, on a table page', async () => {
    await mount('/console/table/progressions');
    expect(currentPill()).toEqual([
      {
        label: 'Chord Progression',
        href: '/console/table/progressions',
        current: true,
      },
    ]);
    expect(pills()[1]).toEqual({
      label: 'Tesseract',
      href: '/console/cortex/tesseract',
      current: false,
    });
  });

  it('opens the whole Atlas from the pill, and a row’s graph from its panel', async () => {
    await mount('/console/table/artists/toto');
    expect(pills()[0].href).toBe('/console/cortex');
    // The row's own way to its local graph is in its panel (lazy).
    const panel = await screen.findByRole(
      'complementary',
      {},
      { timeout: LAZY_TIMEOUT },
    );
    expect(
      within(panel)
        .getByRole('link', { name: 'Open in Cortex' })
        .getAttribute('href'),
    ).toBe(AdminRoutes.cortex(undefined, { focus: 'artist:toto' }));
  });
});

/** An editor holding unsaved changes, with one way out. */
const UnsavedEditor = ({ to }: { to: string }) => {
  useUnsavedChanges(true);
  return (
    <>
      <h1>Unsaved edit</h1>
      <Link to={to}>Leave the page</Link>
    </>
  );
};

/**
 * The guarded routes as AdminPages declares them, with an unsaved editor
 * added inside one area's layout, where the real editors sit — so a guard of
 * that area's own, which would take the blocker from the shared one, fails
 * these tests.
 */
const mountUnsaved = async (
  area: (route: RouteLike) => boolean,
  path: string,
  to: string,
) => {
  auth.role = 'admin';
  const guard = guardRoute()!;
  const children = guard.children!.map((route) =>
    area(route)
      ? {
          ...route,
          children: [
            { path, element: <UnsavedEditor to={to} /> },
            ...(route.children ?? []),
          ],
        }
      : route,
  );
  const router = createMemoryRouter([{ ...guard, children } as RouteObject], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Unsaved edit' });
  fireEvent.click(screen.getByRole('link', { name: 'Leave the page' }));
  await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
  // Asked, and still where it was.
  expect(router.state.location.pathname).toBe(path);
  return router;
};

describe('the unsaved-changes guard over the content area and Cortex', () => {
  it('asks before an unsaved content edit leaves for the Table', async () => {
    const router = await mountUnsaved(
      (route) => route.element?.type === ContentAreaLayout,
      '/console/content/unsaved',
      AdminRoutes.tableList({ table: 'artists' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    await screen.findByRole('heading', { level: 1, name: 'Artist' });
    expect(router.state.location.pathname).toBe('/console/table/artists');
  });

  it('asks before an unsaved content edit leaves for the graph', async () => {
    const router = await mountUnsaved(
      (route) => route.element?.type === ContentAreaLayout,
      '/console/content/unsaved',
      AdminRoutes.cortex(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    await screen.findByTestId('graph', {}, { timeout: LAZY_TIMEOUT });
    expect(router.state.location.pathname).toBe('/console/cortex');
  });

  it('asks before an unsaved Table edit leaves for the content area', async () => {
    const router = await mountUnsaved(
      (route) => route.id === 'cortex',
      '/console/table/unsaved',
      `${AdminRoutes.content()}/home`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(router.state.location.pathname).toBe('/console/table/unsaved');
  });

  it('asks before an unsaved Table edit leaves for the graph beside it', async () => {
    // The graph and the tables are one section, but the row would be lost
    // all the same.
    const router = await mountUnsaved(
      (route) => route.id === 'cortex',
      '/console/table/unsaved',
      AdminRoutes.cortex(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(router.state.location.pathname).toBe('/console/table/unsaved');
  });
});
