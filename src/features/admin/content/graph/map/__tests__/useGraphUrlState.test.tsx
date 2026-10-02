// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminRoutes } from '@/constants/routes';
import { listBehind } from '@/features/admin/table/grid/rowHistory';
import {
  FIELD_PARAM,
  LINK_PARAM,
  NEW_PARAM,
  QUERY_PARAMS,
} from '@/features/admin/table/grid/tableQuery';
import {
  clampDepth,
  GRAPH_PARAMS,
  graphSearch,
  type GraphUrlState,
  hasLegacyParams,
  LEGACY_GRAPH_PARAMS,
  localGraphHref,
  parseGraphQuery,
  useGraphUrlState,
} from '../useGraphUrlState';

/**
 * Cortex's URL (the graph of the Atlas): what it says (global or local, the depth, the List
 * view, what is open beside the map), how old ring-map links are read, and
 * how a dot's row opens and closes — a new history entry the first time,
 * in place after that, and back to the graph on close, as the Table does.
 */

afterEach(cleanup);

const GRAPH = '/console/cortex';

let url: GraphUrlState;
const Probe = () => {
  url = useGraphUrlState();
  return null;
};

/** The graph's route as AdminPages declares it: the row is a child path. */
const mount = (path: string) => {
  const router = createMemoryRouter(
    [{ path: GRAPH, element: <Probe />, children: [{ path: ':table/:row' }] }],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

type Router = ReturnType<typeof mount>;

const where = (router: Router) =>
  `${router.state.location.pathname}${router.state.location.search}`;

const q = (search: string) => parseGraphQuery(new URLSearchParams(search));

describe('reading the URL', () => {
  it('reads the focus, depth, view and node, with defaults', () => {
    expect(q('')).toEqual({ focus: null, depth: 1, list: false, node: null });
    expect(q('focus=artist:toto&depth=3&list=1&node=vibe:mellow')).toEqual({
      focus: 'artist:toto',
      depth: 3,
      list: true,
      node: 'vibe:mellow',
    });
    // An empty focus is no focus: the global graph.
    expect(q('focus=').focus).toBeNull();
  });

  it('keeps the depth to whole steps from 1 to 5', () => {
    expect(q('depth=9').depth).toBe(5);
    expect(q('depth=0').depth).toBe(1);
    expect(q('depth=-2').depth).toBe(1);
    expect(q('depth=2.7').depth).toBe(2);
    expect(q('depth=abc').depth).toBe(1);
    expect(clampDepth(4)).toBe(4);
    expect(clampDepth(Number.NaN)).toBe(1);
    expect(clampDepth(undefined)).toBe(1);
  });

  it('reads an old link’s hops as the depth, and reads past the ring map’s chips', () => {
    expect(q('focus=song:africa&hops=2').depth).toBe(2);
    // A depth said both ways: the new name wins.
    expect(q('depth=4&hops=2').depth).toBe(4);
    const old =
      'focus=song:africa&off=music&on=decades&guesses=1&unconfirmed=1&hubs=1';
    expect(q(old)).toEqual({
      focus: 'song:africa',
      depth: 1,
      list: false,
      node: null,
    });
    expect(hasLegacyParams(new URLSearchParams(old))).toBe(true);
    expect(hasLegacyParams(new URLSearchParams('focus=song:africa'))).toBe(
      false,
    );
  });

  it('uses no name the Table’s query does, so a row panel never misreads it', () => {
    const table = new Set<string>([
      ...Object.values(QUERY_PARAMS),
      FIELD_PARAM,
      LINK_PARAM,
      NEW_PARAM,
    ]);
    for (const name of [
      ...Object.values(GRAPH_PARAMS),
      ...LEGACY_GRAPH_PARAMS,
    ]) {
      expect(table.has(name), name).toBe(false);
    }
  });
});

describe('writing the URL', () => {
  it('writes one spelling: depth 1 left out, the old names gone, the rest kept', () => {
    const view = { focus: 'artist:toto', depth: 1, list: false, node: null };
    expect(graphSearch(view)).toBe('?focus=artist%3Atoto');
    expect(graphSearch({ ...view, depth: 3, list: true })).toBe(
      '?focus=artist%3Atoto&depth=3&list=1',
    );
    expect(graphSearch({ ...view, focus: null })).toBe('');
    expect(
      graphSearch(
        { ...view, depth: 2 },
        new URLSearchParams('hops=2&off=music&hubs=1&field=born'),
      ),
    ).toBe('?field=born&focus=artist%3Atoto&depth=2');
    expect(graphSearch({ ...view, depth: 12 })).toBe(
      '?focus=artist%3Atoto&depth=5',
    );
  });

  it('builds the graph’s and a row’s URLs', () => {
    expect(AdminRoutes.cortex()).toBe(GRAPH);
    expect(AdminRoutes.cortexRow.definition).toBe(`${GRAPH}/:table/:row`);
    expect(
      AdminRoutes.cortexRow(
        { table: 'artists', row: 'toto' },
        { focus: 'artist:toto', depth: '2' },
      ),
    ).toBe(`${GRAPH}/artists/toto?focus=artist%3Atoto&depth=2`);
    expect(localGraphHref('artist:toto')).toBe(`${GRAPH}?focus=artist%3Atoto`);
    expect(localGraphHref('artist:toto', 3)).toBe(
      `${GRAPH}?focus=artist%3Atoto&depth=3`,
    );
  });
});

describe('the hook', () => {
  it('is global without a focus and local with one', () => {
    mount(GRAPH);
    expect(url.mode).toBe('global');
    expect(url.row).toBeNull();
    cleanup();
    mount(`${GRAPH}?focus=artist:toto&depth=2&list=1`);
    expect(url.mode).toBe('local');
    expect(url.focus).toBe('artist:toto');
    expect(url.depth).toBe(2);
    expect(url.list).toBe(true);
  });

  it('leaves an old link as it is until the first change, which drops the old names', () => {
    const router = mount(
      `${GRAPH}?focus=artist:toto&hops=2&off=music&guesses=1&hubs=1`,
    );
    expect(url.depth).toBe(2);
    expect(url.legacy).toBe(true);
    expect(where(router)).toBe(
      `${GRAPH}?focus=artist:toto&hops=2&off=music&guesses=1&hubs=1`,
    );
    act(() => url.setDepth(3));
    expect(where(router)).toBe(`${GRAPH}?focus=artist%3Atoto&depth=3`);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(url.legacy).toBe(false);
  });

  it('pushes a new focus (Back walks the trail), and changes depth and view in place', () => {
    const router = mount(`${GRAPH}?focus=artist:toto&depth=2`);
    act(() => url.setFocus('song:africa'));
    // The depth goes on with the new focus.
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica&depth=2`);
    expect(router.state.historyAction).toBe('PUSH');

    act(() => url.setDepth(1));
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica`);
    expect(router.state.historyAction).toBe('REPLACE');

    act(() => url.toggleList());
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica&list=1`);
    act(() => url.toggleList());
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica`);
    act(() => url.toggleList(false));
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica`);

    act(() => url.setFocus('artist:toto', { depth: 4 }));
    expect(where(router)).toBe(`${GRAPH}?focus=artist%3Atoto&depth=4`);

    // Global: the depth goes with the focus.
    act(() => url.setFocus(null));
    expect(where(router)).toBe(GRAPH);
    expect(url.mode).toBe('global');

    act(() => {
      void router.navigate(-1);
    });
    expect(where(router)).toBe(`${GRAPH}?focus=artist%3Atoto&depth=4`);
  });

  it('adds no history entry when asked for the view already showing', () => {
    const router = mount(GRAPH);
    act(() => url.setFocus('artist:toto'));
    expect(router.state.historyAction).toBe('PUSH');
    const entry = router.state.location.key;

    // Local graph pressed on the focus itself, the depth it already has,
    // the view it already shows: the same entry, untouched.
    act(() => url.setFocus('artist:toto'));
    act(() => url.setFocus('artist:toto', { depth: 1 }));
    act(() => url.setDepth(1));
    act(() => url.toggleList(false));
    expect(router.state.location.key).toBe(entry);
    expect(where(router)).toBe(`${GRAPH}?focus=artist%3Atoto`);

    // So Back leaves the local graph at once, to the whole Atlas.
    act(() => {
      void router.navigate(-1);
    });
    expect(where(router)).toBe(GRAPH);

    // Global from the global graph: nothing either.
    const globalEntry = router.state.location.key;
    act(() => url.setFocus(null));
    expect(router.state.location.key).toBe(globalEntry);
  });

  it('adds no entry over an open row either, so Back and Close still work', () => {
    const router = mount(`${GRAPH}?focus=artist:toto`);
    act(() => url.openRow('artist:toto'));
    const entry = router.state.location.key;
    // The drawer's Local graph, for the focus already shown.
    act(() => url.setFocus('artist:toto'));
    expect(router.state.location.key).toBe(entry);
    act(() => url.closeRow());
    expect(where(router)).toBe(`${GRAPH}?focus=artist:toto`);
    expect(router.state.historyAction).toBe('POP');
  });

  it('rewrites an old link in place when asked for the view it already shows', () => {
    const router = mount(`${GRAPH}?focus=artist:toto&hops=2&off=music`);
    act(() => url.setFocus('artist:toto'));
    expect(where(router)).toBe(`${GRAPH}?focus=artist%3Atoto&depth=2`);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(url.legacy).toBe(false);
  });

  it('opens a dot’s row beside the graph: pushed the first time, replaced after', () => {
    const router = mount(`${GRAPH}?focus=artist:toto`);
    act(() => url.openRow('artist:toto'));
    expect(where(router)).toBe(`${GRAPH}/artists/toto?focus=artist%3Atoto`);
    expect(router.state.historyAction).toBe('PUSH');
    expect(url.row).toEqual({ table: 'artists', row: 'toto' });
    // The graph it was opened over, for closing back to.
    expect(listBehind(router.state.location.state)).toBe(
      `${GRAPH}?focus=artist%3Atoto`,
    );

    act(() => url.openRow('song:africa'));
    expect(where(router)).toBe(`${GRAPH}/songs/africa?focus=artist%3Atoto`);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(listBehind(router.state.location.state)).toBe(
      `${GRAPH}?focus=artist%3Atoto`,
    );

    // A change of view keeps the row open.
    act(() => url.setDepth(2));
    expect(where(router)).toBe(
      `${GRAPH}/songs/africa?focus=artist%3Atoto&depth=2`,
    );
    expect(url.row).toEqual({ table: 'songs', row: 'africa' });
    act(() => url.setDepth(1));

    // Closing steps back to the graph's own entry (spelled as it was):
    // Back does not reopen the row.
    act(() => url.closeRow());
    expect(where(router)).toBe(`${GRAPH}?focus=artist:toto`);
    expect(router.state.historyAction).toBe('POP');
    expect(url.row).toBeNull();
  });

  it('closes in place when the graph behind the row has changed', () => {
    const router = mount(`${GRAPH}?focus=artist:toto`);
    act(() => url.openRow('artist:toto'));
    act(() => url.setFocus('song:africa'));
    expect(where(router)).toBe(`${GRAPH}/artists/toto?focus=song%3Aafrica`);
    act(() => url.closeRow());
    expect(where(router)).toBe(`${GRAPH}?focus=song%3Aafrica`);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('opens an item no table holds read-only, with ?node=, the same way', () => {
    const router = mount(`${GRAPH}?focus=song:africa`);
    act(() => url.openRow('vibe:mellow'));
    expect(where(router)).toBe(
      `${GRAPH}?focus=song%3Aafrica&node=vibe%3Amellow`,
    );
    expect(router.state.historyAction).toBe('PUSH');
    expect(url.node).toBe('vibe:mellow');
    expect(url.row).toBeNull();

    // A row opened over it takes its place, and the node goes.
    act(() => url.openRow('artist:toto'));
    expect(where(router)).toBe(`${GRAPH}/artists/toto?focus=song%3Aafrica`);
    expect(router.state.historyAction).toBe('REPLACE');

    act(() => url.openNode('era:eighties'));
    expect(where(router)).toBe(
      `${GRAPH}?focus=song%3Aafrica&node=era%3Aeighties`,
    );
    expect(router.state.historyAction).toBe('REPLACE');

    act(() => url.closeRow());
    expect(where(router)).toBe(`${GRAPH}?focus=song:africa`);
    expect(router.state.historyAction).toBe('POP');
  });

  it('drops what pointed into the last row, and the old names, when a row opens', () => {
    const router = mount(
      `${GRAPH}/artists/toto?focus=artist:toto&field=born&link=events&hops=2`,
    );
    expect(url.row).toEqual({ table: 'artists', row: 'toto' });
    act(() => url.openRow('artist:jeff-porcaro'));
    expect(where(router)).toBe(
      `${GRAPH}/artists/jeff-porcaro?focus=artist%3Atoto&depth=2`,
    );
    // Opened from a link, not from the graph: closing replaces the entry.
    act(() => url.closeRow());
    expect(where(router)).toBe(`${GRAPH}?focus=artist%3Atoto&depth=2`);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('reads the row from the path, decoded', () => {
    mount(`${GRAPH}/progressions/I-V-vi-IV%20pop?focus=x`);
    expect(url.row).toEqual({ table: 'progressions', row: 'I-V-vi-IV pop' });
    expect(url.graphHref).toBe(`${GRAPH}?focus=x`);
  });
});
