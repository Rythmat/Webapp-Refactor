// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { type ReactElement, Suspense, useEffect } from 'react';
import {
  createMemoryRouter,
  matchRoutes,
  type RouteObject,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRoutes } from '@/constants/routes';
import { adminPages } from '@/features/admin/AdminPages';
import { ContentAreaLayout } from '@/features/admin/content/ContentAreaLayout';
import { GuardOutlet } from '@/features/admin/content/mirror/UnsavedChangesGuard';

/**
 * Cortex's routes as AdminPages declares them (owner, 1 Oct 2026: the mind
 * map renamed Cortex, and the sidebar's Table section with it). The graph is
 * the section's home at `/console/cortex`, a dot's row is a child path of it
 * — so the page, and the canvas and layout in it, stay mounted while rows
 * open, change and close — and the static Integrity and Links pages are
 * still their own. The tables keep their `/console/table/…` URLs in the same
 * section. Every old URL still works: the graph's old home under the
 * content area and the bare /console/table land on the new ones, query and
 * all, in place of the old entry.
 */

// The pages themselves are stand-ins: what is checked is which one the
// route tree draws, and whether the map's is ever mounted again.
const mounted = vi.hoisted(() => ({ map: 0 }));
vi.mock('@/features/admin/content/graph/MindMapPage', () => ({
  MindMapPage: () => {
    const { pathname } = useLocation();
    useEffect(() => {
      mounted.map += 1;
    }, []);
    return <p data-testid="map">{pathname}</p>;
  },
}));
vi.mock('@/features/admin/content/graph/IntegrityPage', () => ({
  IntegrityPage: () => <p data-testid="integrity">Integrity</p>,
}));
vi.mock('@/features/admin/content/graph/LegacyLinkPage', () => ({
  LegacyLinkPage: () => <p data-testid="links">Links</p>,
}));

beforeEach(() => {
  mounted.map = 0;
});
afterEach(cleanup);

type RouteLike = {
  id?: string;
  path?: string;
  index?: boolean;
  element?: ReactElement;
  children?: RouteLike[];
};

const tree = () => [adminPages() as RouteObject];

/** The routes a URL matches, outermost first. */
const matched = (path: string) =>
  (matchRoutes(tree(), path) ?? []).map((m) => ({
    id: m.route.id,
    path: m.route.path,
    params: m.params,
  }));

const leaf = (path: string) => matched(path).at(-1);

const consoleRoutes = () => adminPages().children as RouteLike[];

/** The console's one unsaved-changes guard, over the content area and Cortex. */
const guard = () =>
  consoleRoutes().find((route) => route.element?.type === GuardOutlet)!;

/** The Cortex section: its layout, and the graph's and the tables' routes. */
const cortexSection = () =>
  guard().children!.find((route) => route.id === 'cortex')!;

/** The graph's pages in the Cortex section: the map, Integrity and Links. */
const graphRoutes = () =>
  cortexSection().children!.filter((route) =>
    [
      AdminRoutes.cortex.definition,
      AdminRoutes.cortexIntegrity.definition,
      AdminRoutes.cortexLinks.definition,
    ].includes(route.path ?? ''),
  );

/** Where the graph's old URLs are sent on. */
const legacyGraphRoute = () =>
  consoleRoutes().find(
    (route) => route.path === `${AdminRoutes.legacyGraph.definition}/*`,
  )!;

/** Every path declared in a list of routes, nested ones too. */
const pathsOf = (routes: RouteLike[]): string[] =>
  routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...pathsOf(route.children ?? []),
  ]);

/** React's mark on a component that loads only when it is first drawn. */
const LAZY = Symbol.for('react.lazy');
const isLazy = (element: ReactElement | undefined) =>
  (element?.type as { $$typeof?: symbol } | undefined)?.$$typeof === LAZY;

describe('the route tree', () => {
  it('names the graph’s routes under Cortex', () => {
    expect(AdminRoutes.cortex()).toBe('/console/cortex');
    expect(AdminRoutes.cortex(undefined, { focus: 'artist:toto' })).toBe(
      '/console/cortex?focus=artist%3Atoto',
    );
    expect(AdminRoutes.cortexRow.definition).toBe(
      '/console/cortex/:table/:row',
    );
    expect(AdminRoutes.cortexIntegrity()).toBe('/console/cortex/integrity');
    expect(AdminRoutes.cortexLinks()).toBe('/console/cortex/links');
    // The tables keep their own URLs: only the section was renamed.
    expect(AdminRoutes.tableList({ table: 'songs' })).toBe(
      '/console/table/songs',
    );
  });

  it('draws the map at Cortex’s own URL', () => {
    expect(leaf('/console/cortex')?.path).toBe(AdminRoutes.cortex.definition);
  });

  it('opens a row as a child of the map, which it keeps', () => {
    const row = matched('/console/cortex/artists/toto');
    expect(row.at(-2)?.path).toBe(AdminRoutes.cortex.definition);
    expect(row.at(-1)).toMatchObject({
      path: ':table/:row',
      params: { table: 'artists', row: 'toto' },
    });
    // One route object for the map with and without a row: React keeps it.
    const routes = tree();
    const bare = matchRoutes(routes, '/console/cortex')!.at(-1)!.route;
    const withRow = matchRoutes(routes, '/console/cortex/songs/africa')!;
    expect(withRow.at(-2)!.route).toBe(bare);
    // The child draws nothing itself: the page draws the drawer. Its element
    // is an explicit null, not missing, so the router does not warn in
    // development that a matched leaf route has no element.
    expect(withRow.at(-1)!.route.element).toBeNull();
  });

  it('still opens Integrity and Links, which a row never shadows', () => {
    expect(leaf('/console/cortex/integrity')?.path).toBe(
      AdminRoutes.cortexIntegrity.definition,
    );
    expect(leaf('/console/cortex/links')?.path).toBe(
      AdminRoutes.cortexLinks.definition,
    );
  });

  it('holds the graph, Tesseract and the tables in one section, under the one guard', () => {
    expect(cortexSection().children!.map((route) => route.path)).toEqual([
      AdminRoutes.cortex.definition,
      AdminRoutes.cortexIntegrity.definition,
      AdminRoutes.cortexLinks.definition,
      AdminRoutes.cortexTesseract.definition,
      AdminRoutes.table.definition,
    ]);
    // Tesseract is its own lazy page at its own URL, never read as a row of
    // the graph, and its own rows open as a child of it, which it keeps.
    const tesseract = cortexSection().children!.find(
      (route) => route.path === AdminRoutes.cortexTesseract.definition,
    )!;
    expect(isLazy(tesseract.element)).toBe(true);
    expect(leaf('/console/cortex/tesseract')?.path).toBe(
      AdminRoutes.cortexTesseract.definition,
    );
    const row = matched('/console/cortex/tesseract/progressions/toto');
    expect(row.at(-2)?.path).toBe(AdminRoutes.cortexTesseract.definition);
    expect(row.at(-1)).toMatchObject({
      path: ':table/:row',
      params: { table: 'progressions', row: 'toto' },
    });
    // A table and the graph sit in the same section, under its one layout.
    for (const path of [
      '/console/cortex',
      '/console/cortex/artists/toto',
      '/console/cortex/integrity',
      '/console/cortex/tesseract',
      '/console/cortex/tesseract/progressions/toto',
      '/console/table/songs',
      '/console/table/songs/africa',
    ]) {
      expect(
        matched(path).some((m) => m.id === 'cortex'),
        path,
      ).toBe(true);
    }
    // The content area no longer holds the graph.
    const area = guard().children!.find(
      (route) => route.element?.type === ContentAreaLayout,
    )!;
    const paths = pathsOf(area.children ?? []);
    expect(paths.length).toBeGreaterThan(5);
    expect(paths.filter((path) => /graph|cortex/.test(path))).toEqual([]);
  });

  it('keeps the section and its graph pages lazy', () => {
    // The layout and every graph page load only when Cortex is opened, so
    // none of them is in the bundle every student downloads.
    expect(isLazy(cortexSection().element)).toBe(true);
    for (const route of graphRoutes()) {
      expect(isLazy(route.element), route.path).toBe(true);
    }
  });

  it('sends the graph’s old URLs to Cortex, not to the mirror', () => {
    for (const path of [
      '/console/content/graph',
      '/console/content/graph/integrity',
      '/console/content/graph/links',
      '/console/content/graph/artists/toto',
    ]) {
      expect(leaf(path)?.path, path).toBe(
        `${AdminRoutes.legacyGraph.definition}/*`,
      );
    }
  });
});

describe('the map stays mounted', () => {
  const mount = async (path: string) => {
    const router = createMemoryRouter(
      [{ element: <GuardOutlet />, children: graphRoutes() as RouteObject[] }],
      { initialEntries: [path] },
    );
    render(
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>,
    );
    await screen.findByTestId('map');
    return router;
  };

  type Router = Awaited<ReturnType<typeof mount>>;
  const go = async (router: Router, to: string) => {
    await act(async () => {
      await router.navigate(to);
    });
  };
  const back = async (router: Router) => {
    await act(async () => {
      await router.navigate(-1);
    });
  };

  it('as rows open, change and close', async () => {
    // The router's development warnings, kept to read: a row's route must
    // not be reported as a leaf with no element.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const router = await mount('/console/cortex?focus=artist:toto');
    await go(router, '/console/cortex/artists/toto?focus=artist:toto');
    expect(screen.getByTestId('map').textContent).toBe(
      '/console/cortex/artists/toto',
    );
    await go(router, '/console/cortex/songs/africa?focus=artist:toto');
    await back(router);
    await back(router);
    expect(screen.getByTestId('map').textContent).toBe('/console/cortex');
    expect(mounted.map).toBe(1);
    expect(warn.mock.calls.flat().join('\n')).not.toMatch(/Matched leaf route/);
    warn.mockRestore();
  });

  it('and gives way to Integrity and Links', async () => {
    const router = await mount('/console/cortex/artists/toto');
    await go(router, '/console/cortex/integrity');
    expect(await screen.findByTestId('integrity')).toBeDefined();
    expect(screen.queryByTestId('map')).toBeNull();
    await go(router, '/console/cortex/links');
    expect(await screen.findByTestId('links')).toBeDefined();
  });
});

describe('the old URLs', () => {
  /**
   * The redirect as AdminPages declares it, beside Cortex's own routes
   * without the section's layout (its bar is the Table's test's business),
   * and the tables' route with no table page loaded.
   */
  const mount = async (path: string) => {
    const tables = cortexSection().children!.find(
      (route) => route.path === AdminRoutes.table.definition,
    )!;
    const router = createMemoryRouter(
      [
        { path: '/console/start', element: <p>Start</p> },
        legacyGraphRoute() as RouteObject,
        {
          element: <GuardOutlet />,
          children: [...graphRoutes(), tables] as RouteObject[],
        },
      ],
      { initialEntries: ['/console/start', path], initialIndex: 1 },
    );
    render(
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>,
    );
    await screen.findByTestId(/map|integrity|links/);
    return router;
  };

  type Router = Awaited<ReturnType<typeof mount>>;
  const where = (router: Router) => {
    const { pathname, search, hash } = router.state.location;
    return `${pathname}${search}${hash}`;
  };

  it.each([
    ['/console/content/graph', '/console/cortex'],
    [
      '/console/content/graph?focus=artist:toto&depth=2',
      '/console/cortex?focus=artist:toto&depth=2',
    ],
    // An old ring-map link keeps its parameters for the graph to read past.
    [
      '/console/content/graph?focus=song:africa&hops=2&off=time',
      '/console/cortex?focus=song:africa&hops=2&off=time',
    ],
    [
      '/console/content/graph/integrity?check=draft-reference&severity=error',
      '/console/cortex/integrity?check=draft-reference&severity=error',
    ],
    ['/console/content/graph/links', '/console/cortex/links'],
    [
      '/console/content/graph/artists/toto?focus=artist:toto',
      '/console/cortex/artists/toto?focus=artist:toto',
    ],
    // The row as it was written, still encoded, and the hash too.
    [
      '/console/content/graph/keys/e%20flat?list=1#connections',
      '/console/cortex/keys/e%20flat?list=1#connections',
    ],
    // The bare Table opens the section's default view, the graph.
    ['/console/table', '/console/cortex'],
    ['/console/table?q=toto', '/console/cortex?q=toto'],
  ])('%s lands on %s, in its place', async (from, to) => {
    const router = await mount(from);
    expect(where(router)).toBe(to);
    // In place of the old entry: Back goes to the page before it.
    expect(router.state.historyAction).toBe('REPLACE');
    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/console/start');
  });

  it('opens the row beside the map from an old row link', async () => {
    await mount('/console/content/graph/artists/toto?focus=artist:toto');
    expect(screen.getByTestId('map').textContent).toBe(
      '/console/cortex/artists/toto',
    );
  });
});
