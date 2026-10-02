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
import { Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRoutes } from '@/constants/routes';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { chordsOfOpening } from '@/curriculum/engine/openingTree';
import { parseChords } from '../../../../table/panel/newItems';
import { GuardOutlet } from '../../../mirror/UnsavedChangesGuard';
import { NODE_FLAG_RING } from '../../map/render/GraphRenderer';
import type { WebglGraphRenderer } from '../../map/render/webglRenderer';
import { TesseractPage } from '../TesseractPage';
import { layoutForest, openPathTo, openToDepth } from '../tesseractLayout';
import {
  readStoredView,
  storeView,
  tesseractHrefForProgression,
} from '../tesseractLinks';
import { buildTesseractModel, readProgressionRows } from '../tesseractModel';

/**
 * Tesseract's page on the real library, in its routes: the map, a
 * progression's row as a child path beside it, and Cortex and the Table
 * beside them as stand-ins, all under the console's one unsaved-changes
 * guard.
 *
 * jsdom has no WebGL, so the map draws through a renderer that keeps what
 * it was last told; the tests read the map through its dev hook
 * (`window.__tesseractDebug`) and the URL. The row panel is a stand-in that
 * says which row it is, closes, and can hold unsaved edits, so the page's
 * wiring is what is read here; the panel itself is GraphRowDrawer's test's.
 */

const ROWS = CHORD_PROGRESSION_LIBRARY as unknown as readonly unknown[];
const MODEL = buildTesseractModel(readProgressionRows(ROWS));
const DEPTH2 = openToDepth(MODEL, 2);
/** How many openings show two chords deep. */
const SHOWN2 = layoutForest(MODEL, DEPTH2).ids.length;

const working = vi.hoisted(() => ({
  value: null as unknown,
}));
vi.mock('../../useWorkingGraph', () => ({
  useWorkingGraph: () => working.value,
  useRetryWorkingGraph: () => () => {},
}));
vi.mock('../../workingGraphStatus', () => ({
  useWorkingGraphStatus: () => 'working',
}));

const drawn = vi.hoisted(() => ({ flags: new Uint8Array(0), made: 0 }));
vi.mock('../../map/render/webglRenderer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../map/render/webglRenderer')>();
  return {
    ...actual,
    createWebglRenderer: (): WebglGraphRenderer => {
      drawn.made += 1;
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
        gpu: 'fake',
        setGraph(g) {
          drawn.flags = g.nodeFlags.slice();
          mark();
        },
        setPositions: mark,
        setColors: mark,
        setNodeFlags(f) {
          drawn.flags = f.slice();
          mark();
        },
        setHighlight: mark,
        setCamera: mark,
        setStyle: mark,
        resize: mark,
        render() {
          dirty = false;
        },
        destroy() {},
      };
    },
  };
});
vi.mock('../../map/render/labelLayer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../map/render/labelLayer')>();
  return { ...actual, createLabelLayer: () => null };
});

// The row panel: which row, a close, and unsaved edits on demand.
vi.mock('../../map/GraphRowDrawer', async () => {
  const { useState } = await import('react');
  const { useUnsavedChanges } = await import(
    '../../../mirror/UnsavedChangesGuard'
  );
  const StandIn = (props: {
    context?: string;
    table: string;
    row: string;
    onClose(): void;
  }) => {
    const [dirty, setDirty] = useState(false);
    useUnsavedChanges(dirty);
    return (
      <aside aria-label="Row">
        <p data-testid="row">{`${props.context} ${props.table} ${props.row}`}</p>
        <button type="button" onClick={() => setDirty(true)}>
          Edit
        </button>
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </aside>
    );
  };
  return { default: StandIn };
});

// The stage needs a size for the camera and the hit test: 1440 by 900.
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
  working.value = {
    snapshot: { progressions: ROWS, songs: [] },
    items: new Map(),
    mode: 'repo',
    fingerprint: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
  };
  HTMLElement.prototype.getBoundingClientRect = function rect() {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1440,
      height: 900,
      right: 1440,
      bottom: 900,
      toJSON: () => ({}),
    } as DOMRect;
  };
});
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect;
  cleanup();
  window.localStorage.clear();
  drawn.flags = new Uint8Array(0);
  drawn.made = 0;
});

const mount = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <GuardOutlet />,
        children: [
          {
            path: AdminRoutes.cortexTesseract.definition,
            element: <TesseractPage />,
            children: [{ path: ':table/:row', element: null }],
          },
          {
            path: AdminRoutes.cortex.definition,
            element: <p data-testid="cortex">Cortex</p>,
          },
          {
            path: AdminRoutes.tableList.definition,
            element: <p data-testid="table">The Table</p>,
          },
        ],
      },
    ],
    { initialEntries: ['/console/start', path], initialIndex: 1 },
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
type Router = ReturnType<typeof mount>;

const where = (router: Router) =>
  `${router.state.location.pathname}${router.state.location.search}`;
const pressed = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed');
const count = () => window.__tesseractDebug?.count;
const go = async (router: Router, to: string | number) => {
  await act(async () => {
    // The branches pick different navigate() overloads
    // eslint-disable-next-line sonarjs/no-all-duplicated-branches
    await (typeof to === 'number' ? router.navigate(to) : router.navigate(to));
  });
};

/** A progression `n` chords long that nothing follows, and its opening. */
const endOfLength = (n: number) => {
  for (const [id, end] of MODEL.forest.endNodeOf) {
    const node = MODEL.forest.nodes.get(end)!;
    if (
      node.depth === n &&
      node.childIds.length === 0 &&
      node.endIds.length === 1
    )
      return { id, end };
  }
  throw new Error(`no progression ${n} chords long`);
};

describe('Tesseract’s view in the URL', () => {
  it('restores the last view on a bare URL, and writes it into the URL in place', async () => {
    storeView({
      key: 'Eb',
      notation: 'roman',
      list: false,
      open: { depth: 1, open: [], fold: [] },
    });
    const router = mount('/console/cortex/tesseract');
    await waitFor(() =>
      expect(where(router)).toBe(
        '/console/cortex/tesseract?key=Eb&notation=roman&depth=1',
      ),
    );
    expect(router.state.historyAction).toBe('REPLACE');
    expect(pressed('Key of E♭')).toBe('true');
    expect(pressed('Roman')).toBe('true');
    // One deep: the starting chords alone.
    await waitFor(() => expect(count()).toBe(MODEL.rootIds.length));
  });

  it('keeps the key, the notation, the list and what is open in the URL and the browser, in place', async () => {
    const router = mount('/console/cortex/tesseract?depth=2');
    await waitFor(() => expect(count()).toBe(SHOWN2));
    fireEvent.click(screen.getByRole('button', { name: 'Key of E♭' }));
    expect(where(router)).toBe('/console/cortex/tesseract?key=Eb&depth=2');
    expect(router.state.historyAction).toBe('REPLACE');
    fireEvent.click(screen.getByRole('button', { name: 'Roman' }));
    expect(where(router)).toBe(
      '/console/cortex/tesseract?key=Eb&notation=roman&depth=2',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    await waitFor(() => expect(where(router)).toContain('depth=all'));
    await waitFor(() => expect(count()).toBe(MODEL.forest.nodes.size));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    await waitFor(() => expect(where(router)).toContain('depth=1'));
    fireEvent.click(screen.getByRole('button', { name: 'Open to depth 3' }));
    await waitFor(() => expect(where(router)).toContain('depth=3'));
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(where(router)).toBe(
      '/console/cortex/tesseract?key=Eb&notation=roman&list=1&depth=3',
    );
    expect(router.state.historyAction).toBe('REPLACE');
    expect(readStoredView()).toEqual({
      key: 'Eb',
      notation: 'roman',
      list: true,
      open: { depth: 3, open: [], fold: [] },
    });
  });

  it('writes a branch opened beyond the depth as that branch', async () => {
    const router = mount('/console/cortex/tesseract?depth=2&list=1');
    const list = await screen.findByRole('list', {
      name: 'Tesseract as a list',
    });
    // The busiest opening two chords long, folded at depth 2: open it.
    const opening = MODEL.forest.nodes.get('1 major7')!.childIds[0];
    const item = list.querySelector(`[data-opening="${CSS.escape(opening)}"]`)!;
    fireEvent.click(
      within(item as HTMLElement).getByRole('button', { name: /^Open / }),
    );
    await waitFor(() =>
      expect(
        new URLSearchParams(router.state.location.search).get('open'),
      ).toBe(opening),
    );
  });

  it('follows Back to another key and another depth', async () => {
    const router = mount('/console/cortex/tesseract?depth=2');
    await waitFor(() => expect(count()).toBe(SHOWN2));
    await go(router, '/console/cortex/tesseract?key=G&depth=1');
    await waitFor(() => expect(pressed('Key of G')).toBe('true'));
    await waitFor(() => expect(count()).toBe(MODEL.rootIds.length));
    await go(router, -1);
    await waitFor(() => expect(pressed('Key of C')).toBe('true'));
    await waitFor(() => expect(count()).toBe(SHOWN2));
    expect(where(router)).toBe('/console/cortex/tesseract?depth=2');
  });
});

describe('a progression’s row beside the map', () => {
  it('opens from the map in the path, and closes back to the map without a new entry', async () => {
    const router = mount('/console/cortex/tesseract?depth=all&list=1');
    const { id, end } = endOfLength(4);
    const list = await screen.findByRole('list', {
      name: 'Tesseract as a list',
    });
    const item = list.querySelector(`[data-opening="${CSS.escape(end)}"]`)!;
    fireEvent.click(
      within(item as HTMLElement).getByRole('button', { name: /^Open row/ }),
    );
    await waitFor(() =>
      expect(where(router)).toBe(
        `/console/cortex/tesseract/progressions/${id}?list=1&depth=all`,
      ),
    );
    expect(router.state.historyAction).toBe('PUSH');
    expect(screen.getByTestId('row').textContent).toBe(
      `tesseract progressions ${id}`,
    );
    // The map stays: the same renderer, the row beside it.
    expect(screen.getByRole('list', { name: 'Tesseract as a list' })).toBe(
      list,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(where(router)).toBe('/console/cortex/tesseract?list=1&depth=all'),
    );
    // Back over the row's entry: Forward would reopen it, Back leaves.
    expect(router.state.historyAction).toBe('POP');
    expect(screen.queryByTestId('row')).toBeNull();
    expect(drawn.made).toBe(1);
  });

  it('asks before leaving a row with unsaved edits for another one', async () => {
    const router = mount('/console/cortex/tesseract?depth=all&list=1');
    const first = endOfLength(4);
    const second = endOfLength(3);
    const list = await screen.findByRole('list', {
      name: 'Tesseract as a list',
    });
    const open = (end: string) =>
      fireEvent.click(
        within(
          list.querySelector(
            `[data-opening="${CSS.escape(end)}"]`,
          ) as HTMLElement,
        ).getByRole('button', { name: /^Open row/ }),
      );
    open(first.end);
    await screen.findByTestId('row');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    open(second.end);
    const question = await screen.findByRole('alertdialog');
    expect(within(question).getByText('Leave without saving?')).toBeDefined();
    fireEvent.click(within(question).getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(where(router)).toContain(`/progressions/${first.id}?`);
    open(second.end);
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Leave',
      }),
    );
    await waitFor(() =>
      expect(where(router)).toContain(`/progressions/${second.id}?`),
    );
  });

  it('opens a row on a click on the map', async () => {
    const router = mount('/console/cortex/tesseract?depth=all');
    const { id, end } = endOfLength(4);
    await waitFor(() => expect(window.__tesseractDebug?.drawn).toBe(true));
    const at = window.__tesseractDebug!.screenPositionOf(end)!;
    const region = document.querySelector('[data-tesseract-canvas]')!;
    for (const type of ['pointerdown', 'pointerup'] as const) {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: at.x,
        clientY: at.y,
        button: 0,
        buttons: type === 'pointerdown' ? 1 : 0,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      act(() => {
        region.dispatchEvent(event);
      });
    }
    await waitFor(() =>
      expect(where(router)).toBe(
        `/console/cortex/tesseract/progressions/${id}?depth=all`,
      ),
    );
  });

  it('sends a row of another table back to the map, its view kept', async () => {
    const router = mount(
      '/console/cortex/tesseract/songs/africa?key=D&depth=2',
    );
    await waitFor(() =>
      expect(where(router)).toBe('/console/cortex/tesseract?key=D&depth=2'),
    );
  });

  it('offers both of a duplicate pair, which end on the same chords', async () => {
    const pair = [...MODEL.forest.nodes.values()].find(
      (n) => n.endIds.length === 2,
    )!;
    const [a, b] = pair.endIds;
    const router = mount(`/console/cortex/tesseract/progressions/${a}?depth=2`);
    const strip = await screen.findByRole('group', {
      name: 'Progressions ending here',
    });
    expect(
      within(strip)
        .getByRole('button', { name: String(a) })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(within(strip).getByRole('button', { name: String(b) }));
    await waitFor(() => expect(where(router)).toContain(`/progressions/${b}?`));
    expect(screen.getByTestId('row').textContent).toBe(
      `tesseract progressions ${b}`,
    );
  });
});

describe('from Cortex and back', () => {
  /** Arrive as a click on the progression's dot in Cortex does. */
  const arrive = async (id: number) => {
    storeView({
      key: 'Eb',
      notation: 'jazz',
      list: false,
      open: { depth: 2, open: [], fold: [] },
    });
    const router = mount(tesseractHrefForProgression(id));
    await screen.findByTestId('row');
    return router;
  };

  it('arrives in the last key with the way open, the row beside the map and the progression ringed', async () => {
    const { id, end } = endOfLength(5);
    const router = await arrive(id);
    expect(screen.getByTestId('row').textContent).toBe(
      `tesseract progressions ${id}`,
    );
    expect(pressed('Key of E♭')).toBe('true');
    const open = openPathTo(MODEL, DEPTH2, end);
    const layout = layoutForest(MODEL, open);
    await waitFor(() => expect(count()).toBe(layout.ids.length));
    // The URL says which way was opened: the openings two, three and four
    // chords long on the way (two deep opens only the starting chords).
    await waitFor(() =>
      expect(
        new URLSearchParams(router.state.location.search).get('open'),
      ).toBe(
        [2, 3, 4]
          .map((n) => chordsOfOpening(end).slice(0, n).join('|'))
          .join(','),
      ),
    );
    const i = layout.indexOf.get(end)!;
    await waitFor(() =>
      expect(drawn.flags[i] & NODE_FLAG_RING).toBe(NODE_FLAG_RING),
    );
  });

  it('shows the progression in Cortex from the menu', async () => {
    const { id } = endOfLength(5);
    const router = await arrive(id);
    // From the keyboard: the progression arrived at is the current chord.
    fireEvent.contextMenu(document.querySelector('[data-tesseract-canvas]')!, {
      button: -1,
      buttons: 0,
    });
    const items = screen
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(items).toEqual([
      'Open row',
      'Show in Cortex',
      'New progression from here',
    ]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Show in Cortex' }));
    await screen.findByTestId('cortex');
    expect(where(router)).toBe(`/console/cortex?focus=progression%3A${id}`);
  });

  it('starts a new progression in the Table from an opening', async () => {
    const { id, end } = endOfLength(5);
    const router = await arrive(id);
    fireEvent.contextMenu(document.querySelector('[data-tesseract-canvas]')!, {
      button: -1,
      buttons: 0,
    });
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'New progression from here' }),
    );
    await screen.findByTestId('table');
    expect(router.state.location.pathname).toBe('/console/table/progressions');
    const typed = new URLSearchParams(router.state.location.search).get('new');
    expect(parseChords(typed!)).toEqual(chordsOfOpening(end));
  });
});
