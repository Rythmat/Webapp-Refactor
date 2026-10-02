// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import {
  EDGES,
  fixtureGraph,
  fixtureInput,
} from '../../__tests__/tableFixtures';
import { CellEditStore } from '../../edit/cellEditStore';
import type { WriteEvent } from '../../edit/writeQueue';
import { getTableModel } from '../../model/buildTableModel';
import { TABLES } from '../../model/categories';
import type { TableModel } from '../../model/types';
import type { TableId } from '../../tableIds';
import { TableGrid, type TableGridProps } from '../TableGrid';
import { countLine } from '../TableToolbar';
import type { GridEditing } from '../gridEditing';
import { SEARCH_URL_DELAY } from '../useTableUrlState';
import { COLUMNS_STORAGE_KEY } from '../useVisibleColumns';

/**
 * One table end to end over the fixture: the query lives in the URL (search
 * after a pause, the rest at once), rows open at their own path keeping the
 * query, Esc closes them, and the toolbar's counts, views and coverage strip
 * follow what is listed.
 */

// The toolbar's badge asks the server which store it is on (repo or API):
// the grid here is on neither, and has no query client to ask with.
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({ store: 'api' }),
}));

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

const model = (table: TableId): TableModel =>
  getTableModel(fixtureInput(), table);

const mount = (
  path: string,
  props: Partial<TableGridProps> = {},
  /** Entries before `path` in the history, oldest first. */
  before: string[] = [],
) => {
  const table = path.split('/')[3].split('?')[0] as TableId;
  const router = createMemoryRouter(
    [
      {
        path: '/console/table/:table/:row?',
        element: (
          <TableGrid
            model={model(table)}
            height={400}
            width={1400}
            {...props}
          />
        ),
      },
    ],
    { initialEntries: [...before, path], initialIndex: before.length },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const where = (router: ReturnType<typeof mount>) =>
  `${router.state.location.pathname}${router.state.location.search}`;

const listed = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.getAttribute('data-row'));

describe('the count line', () => {
  it('counts a missing row apart: named by something, no item of the kind', () => {
    const counts = { drafts: 0, pending: 0, suggestions: 0 };
    // The songs API holds 640; a globe event names a 641st that is gone.
    expect(
      countLine(TABLES.songs, {
        ...counts,
        shown: 641,
        of: 641,
        missing: { shown: 1, of: 1 },
      }),
    ).toBe('640 songs · 1 missing');
    expect(
      countLine(TABLES.songs, {
        ...counts,
        shown: 3,
        of: 641,
        missing: { shown: 0, of: 1 },
      }),
    ).toBe('3 of 640 songs');
  });
});

describe('the query in the URL', () => {
  it('opens on the table’s first view, with counts', () => {
    mount('/console/table/artists');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Artist',
    );
    // Acts: Toto, Sinéad O’Connor, Hall & Oates. The credited people and the
    // archived act are not listed.
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
    expect(screen.getByText('3 artists · 1 pending')).toBeInTheDocument();
  });

  it('follows a link’s query', () => {
    mount('/console/table/artists?view=credited&status=draft');
    expect(listed()).toEqual(['david-paich']);
    expect(
      screen.getByRole('button', { name: 'Credited people' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('writes the search once typing pauses, filtering at once', async () => {
    const router = mount('/console/table/artists?view=credited');
    const box = screen.getByRole('searchbox', { name: 'Search artists' });
    fireEvent.change(box, { target: { value: 'jeff' } });
    await waitFor(() => expect(listed()).toEqual(['jeff-porcaro']));
    // Not in the URL yet…
    expect(where(router)).toBe('/console/table/artists?view=credited');
    // …until the pause has passed.
    await waitFor(
      () =>
        expect(where(router)).toBe(
          '/console/table/artists?view=credited&q=jeff',
        ),
      { timeout: SEARCH_URL_DELAY * 8 },
    );
  });

  it('sorts from the header, and the other way on a second click', () => {
    const router = mount('/console/table/artists');
    const born = screen.getByRole('columnheader', { name: /Born/ });
    fireEvent.click(within(born).getByRole('button'));
    expect(where(router)).toBe('/console/table/artists?sort=born');
    fireEvent.click(
      within(screen.getByRole('columnheader', { name: /Born/ })).getByRole(
        'button',
      ),
    );
    expect(where(router)).toBe('/console/table/artists?sort=-born');
  });

  it('switches views and the subgenre rows in the URL', () => {
    const router = mount('/console/table/artists');
    fireEvent.click(screen.getByRole('button', { name: 'Credited people' }));
    expect(where(router)).toBe('/console/table/artists?view=credited');
    fireEvent.click(screen.getByRole('button', { name: 'Acts' }));
    expect(where(router)).toBe('/console/table/artists');
    cleanup();

    const genres = mount('/console/table/genres');
    expect(listed()).not.toContain('acid-rock');
    fireEvent.click(screen.getByRole('button', { name: 'Show subgenres' }));
    expect(where(genres)).toBe('/console/table/genres?more=1');
    expect(listed()).toContain('acid-rock');
  });
});

describe('the coverage strip', () => {
  it('counts the listed rows, and lists the ones missing a field', () => {
    const router = mount('/console/table/artists');
    const strip = screen.getByRole('list', {
      name: 'Coverage of stored fields',
    });
    const city = within(strip).getByRole('button', { name: /City 1\/3/ });
    expect(city).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(city);
    expect(where(router)).toBe('/console/table/artists?f=missing-city');
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor']);
    // The filter shows as a chip that takes it off again.
    fireEvent.click(
      screen.getByRole('button', { name: /Missing City.*remove/ }),
    );
    expect(where(router)).toBe('/console/table/artists');
  });
});

describe('opening rows', () => {
  it('opens a row at its path keeping the query, and Esc closes it', () => {
    const router = mount('/console/table/artists?sort=-born');
    fireEvent.click(
      within(
        screen.getAllByRole('row').find((r) => r.dataset.row === 'toto')!,
      ).getAllByRole('gridcell')[0],
    );
    expect(where(router)).toBe('/console/table/artists/toto?sort=-born');
    expect(
      screen.getAllByRole('row').find((r) => r.dataset.row === 'toto'),
    ).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(where(router)).toBe('/console/table/artists?sort=-born');
  });

  it('opens a stored field on a double-click, and Back still closes the row', () => {
    const router = mount('/console/table/artists');
    const toto = () =>
      within(
        screen.getAllByRole('row').find((r) => r.dataset.row === 'toto')!,
      ).getAllByRole('gridcell');
    // A click selects the cell and opens nothing; the double-click opens
    // Born, which edits in the row's panel.
    fireEvent.click(toto()[1]);
    expect(where(router)).toBe('/console/table/artists');
    fireEvent.click(toto()[1]);
    fireEvent.doubleClick(toto()[1]);
    expect(where(router)).toBe('/console/table/artists/toto?field=born');
    act(() => {
      void router.navigate(-1);
    });
    // One entry for the row, whatever the clicks: Back is the list.
    expect(where(router)).toBe('/console/table/artists');
  });

  it('opens a row with a column’s Link…, and a new item with New', () => {
    const router = mount('/console/table/artists?q=to');
    const toto = screen
      .getAllByRole('row')
      .find((r) => r.dataset.row === 'toto')!;
    fireEvent.click(
      within(toto).getByRole('button', { name: 'Link… Songs: Toto' }),
    );
    expect(where(router)).toBe('/console/table/artists/toto?q=to&link=songs');
    act(() => {
      void router.navigate(-1);
    });
    expect(where(router)).toBe('/console/table/artists?q=to');

    // New starts from the search; closing it goes back to the list.
    fireEvent.click(screen.getByRole('button', { name: 'New artist' }));
    expect(where(router)).toBe('/console/table/artists?q=to&new=to');
  });

  it('offers neither on the repo’s rows', () => {
    mount('/console/table/artists', { mode: 'repo' });
    expect(screen.queryAllByRole('button', { name: /^Link…/ })).toEqual([]);
    expect(screen.queryByRole('button', { name: /^New / })).toBeNull();
  });

  it('carries a search not yet written into the row’s link', () => {
    const router = mount('/console/table/artists');
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'toto' },
    });
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('grid'), {
      key: 'Enter',
      metaKey: true,
    });
    expect(where(router)).toBe('/console/table/artists/toto?q=toto');
  });

  it('closes a row opened from the list back onto it, so Back does not reopen it', () => {
    const router = mount('/console/table/artists?sort=-born', {}, [
      '/console/table/artists/hall-and-oates',
    ]);
    fireEvent.click(
      within(
        screen.getAllByRole('row').find((r) => r.dataset.row === 'toto')!,
      ).getAllByRole('gridcell')[0],
    );
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(where(router)).toBe('/console/table/artists?sort=-born');
    act(() => {
      void router.navigate(-1);
    });
    // Back is what came before the list, not the row just closed.
    expect(where(router)).toBe('/console/table/artists/hall-and-oates');
  });

  it('closes a row it did not open in place, adding no entry', () => {
    const router = mount('/console/table/artists/toto?q=to', {}, [
      '/console/table/songs',
    ]);
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(where(router)).toBe('/console/table/artists?q=to');
    act(() => {
      void router.navigate(-1);
    });
    expect(where(router)).toBe('/console/table/songs');
  });

  it('lists the open row where the query hides it, saying so', () => {
    // Paich is a credited person, and the table opens on the acts.
    mount('/console/table/artists/david-paich');
    expect(listed()).toContain('david-paich');
    expect(
      screen.getAllByRole('row').find((r) => r.dataset.row === 'david-paich')
        ?.textContent,
    ).toContain('Outside this view');
  });

  it('keeps a row edited this session, saying it no longer matches', () => {
    mount('/console/table/artists?f=missing-city', {
      keep: new Set(['toto']),
    });
    expect(listed()).toContain('toto');
    expect(
      screen.getAllByRole('row').find((r) => r.dataset.row === 'toto')
        ?.textContent,
    ).toContain('No longer matches');
  });
});

describe('the search shortcut and the columns', () => {
  it('jumps to the search box on “/”', () => {
    mount('/console/table/artists');
    fireEvent.keyDown(document.body, { key: '/' });
    expect(document.activeElement).toBe(screen.getByRole('searchbox'));
  });

  it('leaves “/” to an open menu, list or dialog', () => {
    mount('/console/table/artists');
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('button');
    menu.append(item);
    document.body.append(menu);
    item.focus();
    fireEvent.keyDown(item, { key: '/' });
    expect(document.activeElement).toBe(item);
    menu.remove();
  });

  it('announces the count once the search settles, not on every key', async () => {
    mount('/console/table/artists');
    const live = document.querySelector('[aria-live="polite"]')!;
    // Not on arrival: the heading says where this is.
    expect(live.textContent).toBe('');
    expect(
      screen.getByText('3 artists · 1 pending').getAttribute('aria-live'),
    ).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'toto' },
    });
    await waitFor(() =>
      expect(live.textContent).toBe('1 of 3 artists · 1 pending'),
    );
  });

  it('says why nothing is listed outside the grid', () => {
    mount('/console/table/artists?q=nobody');
    const clear = screen.getByRole('button', {
      name: 'Clear the search and filters',
    });
    // A grid holds rows and cells; a button there is lost to its keys.
    expect(screen.getByRole('grid').contains(clear)).toBe(false);
  });

  it('draws the columns this browser chose for the table', () => {
    window.localStorage.setItem(
      COLUMNS_STORAGE_KEY,
      JSON.stringify({ artists: ['bio', 'city'] }),
    );
    mount('/console/table/artists');
    expect(
      screen.getAllByRole('columnheader').map((h) => h.firstChild?.textContent),
    ).toEqual(['Artist Name', 'City', 'Bio']);
    // The strip follows: City is stored and showing, Bio is stored too.
    expect(
      within(
        screen.getByRole('list', { name: 'Coverage of stored fields' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
  });
});

describe('rows edited here', () => {
  /** The rows rebuilt after Toto was renamed "Aardvark": a sort by name puts it first. */
  const renamed = () => {
    const nodes = [...fixtureGraph().nodes.values()].map((node) =>
      node.id === 'artist:toto' ? { ...node, label: 'Aardvark' } : node,
    );
    return getTableModel(
      fixtureInput({ graph: assembleGraph(nodes, EDGES) }),
      'artists',
    );
  };

  /** A grid whose props change the way the page's would. */
  let update: (next: Partial<TableGridProps>) => void = () => {};
  const Harness = (initial: TableGridProps) => {
    const [props, setProps] = useState(initial);
    update = (next) => act(() => setProps((prev) => ({ ...prev, ...next })));
    return <TableGrid {...props} />;
  };
  const mountHarness = (path: string, initial: TableGridProps) => {
    const router = createMemoryRouter(
      [
        {
          path: '/console/table/:table/:row?',
          element: <Harness height={400} width={1400} {...initial} />,
        },
      ],
      { initialEntries: [path] },
    );
    render(<RouterProvider router={router} />);
    return router;
  };
  const rowText = (key: string) =>
    screen.getAllByRole('row').find((row) => row.dataset.row === key)
      ?.textContent;

  it('holds an edited row where it was when the sort would move it, until Re-sort', () => {
    mountHarness('/console/table/artists', {
      model: model('artists'),
      keep: new Set(),
    });
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
    // Saved in its panel, then the rebuilt rows sort it first.
    update({ keep: new Set(['toto']) });
    update({ model: renamed() });
    expect(listed()).toEqual(['hall-and-oates', 'sinead-oconnor', 'toto']);
    expect(rowText('toto')).toContain('Aardvark');
    expect(rowText('toto')).toContain('Sorted elsewhere');
    const chip = screen.getByRole('button', {
      name: '1 edited row held · Re-sort',
    });
    chip.focus();
    fireEvent.click(chip);
    expect(listed()).toEqual(['toto', 'hall-and-oates', 'sinead-oconnor']);
    expect(rowText('toto')).not.toContain('Sorted elsewhere');
    expect(screen.queryByRole('button', { name: /edited row/ })).toBeNull();
    // The chip went with the holds: the keyboard is the grid's, not lost.
    expect(screen.getByRole('grid')).toHaveFocus();
    const [, polite] = document.querySelectorAll('[aria-live="polite"]');
    expect(polite).toHaveTextContent('Rows re-sorted.');
  });

  it('lets go of its holds when the query changes', () => {
    const router = mountHarness('/console/table/artists', {
      model: model('artists'),
      keep: new Set(),
    });
    update({ keep: new Set(['toto']) });
    update({ model: renamed() });
    expect(listed()[2]).toBe('toto');
    act(() => {
      void router.navigate('/console/table/artists?sort=-title');
    });
    act(() => {
      void router.navigate('/console/table/artists');
    });
    expect(listed()).toEqual(['toto', 'hall-and-oates', 'sinead-oconnor']);
  });

  it('says what the cell writes came to in its own live region, a failure at once', () => {
    let tell: (event: WriteEvent) => void = () => {};
    const edits: GridEditing = {
      table: 'artists',
      store: new CellEditStore(),
      lockOf: () => null,
      commit: () => true,
      undo: () => true,
      redo: () => true,
      canUndo: () => false,
      resolve: () => {},
      onEvent: (listener) => {
        tell = listener;
        return () => {};
      },
    };
    mount('/console/table/artists', { edits });
    const write = {
      summary: 'Years Active of Toto: 1977– → 1976–',
      purpose: 'edit',
    } as Extract<WriteEvent, { type: 'saved' }>['write'];
    act(() =>
      tell({
        type: 'saved',
        write,
        proposed: false,
        entry: null,
        warnings: [],
      }),
    );
    const [, polite] = document.querySelectorAll('[aria-live="polite"]');
    expect(polite).toHaveTextContent(
      'Saved: Years Active of Toto: 1977– → 1976–',
    );
    act(() =>
      tell({
        type: 'saved',
        write: { ...write, purpose: 'undo' },
        proposed: false,
        entry: null,
        warnings: [],
      }),
    );
    expect(polite).toHaveTextContent('Undone: Years Active of Toto');
    act(() =>
      tell({
        type: 'failed',
        failed: {
          write: { ...write, id: 1 } as never,
          kind: 'error',
          message: 'Offline.',
        },
      }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Not saved: Years Active of Toto: 1977– → 1976–. Offline.',
    );
  });

  it('lists every key the grid answers under Keyboard', async () => {
    const edits: GridEditing = {
      table: 'artists',
      store: new CellEditStore(),
      lockOf: () => null,
      commit: () => true,
      undo: () => true,
      redo: () => true,
      canUndo: () => false,
      resolve: () => {},
      onEvent: () => () => {},
    };
    mount('/console/table/artists', { edits });
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard' }));
    const help = await screen.findByRole('dialog', { name: 'Keyboard' });
    expect(help).toHaveTextContent('Edit the cell (on a header: sort)');
    expect(help).toHaveTextContent('Any character but / and Space');
    expect(help).toHaveTextContent('Open the row');
    expect(help).not.toHaveTextContent('Nothing here is saved');
  });

  it('lists only what the cell keys do where nothing is written', async () => {
    mount('/console/table/artists');
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard' }));
    const help = await screen.findByRole('dialog', { name: 'Keyboard' });
    // Without the page's writes, Enter opens the row at the field.
    expect(help).toHaveTextContent(
      'Open the row at the cell’s field (on a header: sort)',
    );
    expect(help).not.toHaveTextContent('Edit the cell');
    expect(help).not.toHaveTextContent('Clear the cell');
    expect(help).not.toHaveTextContent('Undo');
    expect(help).toHaveTextContent('Nothing here is saved');
  });
});
