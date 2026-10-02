// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createElement, useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureInput } from '../../__tests__/tableFixtures';
import { CellEditStore } from '../../edit/cellEditStore';
import { getTableModel } from '../../model/buildTableModel';
import { defaultColumns } from '../../model/categories';
import { queryRows } from '../../model/query';
import { TableGrid } from '../TableGrid';
import { VirtualTable } from '../VirtualTable';
import type { GridEditing } from '../gridEditing';

/**
 * The grid's cost while editing (design §7): typing in a cell re-renders
 * its editor and nothing else, and a cell's write state changing — a
 * commit queued, saved, failed — re-renders the one row it is in, not the
 * grid; so does the first edit of a row, which the page keeps and the
 * list holds where it is. Every cell drawn is counted by its row
 * (CellView, wrapped).
 */

const drawn = vi.hoisted(() => new Map<string, number>());
vi.mock('../cells/CellView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../cells/CellView')>();
  return {
    ...actual,
    CellView: (props: Parameters<typeof actual.CellView>[0]) => {
      drawn.set(props.row.key, (drawn.get(props.row.key) ?? 0) + 1);
      return createElement(actual.CellView, props);
    },
  };
});

// The toolbar's badge asks which store the server is on; there is none.
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({ store: 'api' }),
}));

afterEach(cleanup);

const model = getTableModel(fixtureInput(), 'artists');

const mount = () => {
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
  render(
    <VirtualTable
      def={model.def}
      columns={defaultColumns(model.def)}
      rows={model.rows}
      order={queryRows(model, {
        q: '',
        sort: model.def.defaultSort,
        filters: [],
        status: 'all',
      })}
      selectedKey={null}
      sort={model.def.defaultSort}
      label="Artists"
      height={440}
      width={2400}
      onSort={() => {}}
      onOpen={() => {}}
      edits={edits}
    />,
  );
  return edits;
};

describe('re-rendering while editing', () => {
  it('re-renders one row when one of its cells’ write state changes', () => {
    const edits = mount();
    drawn.clear();
    act(() =>
      edits.store.set(
        { table: 'artists', rowKey: 'sinead-oconnor', column: 'years' },
        { status: 'saving', overlay: { activeFrom: 1985 } },
      ),
    );
    expect([...drawn.keys()]).toEqual(['sinead-oconnor']);
    drawn.clear();
    act(() =>
      edits.store.clear({
        table: 'artists',
        rowKey: 'sinead-oconnor',
        column: 'years',
      }),
    );
    expect([...drawn.keys()]).toEqual(['sinead-oconnor']);
  });

  it('re-renders no row while a cell is typed in', async () => {
    mount();
    const grid = screen.getByRole('grid');
    grid.focus();
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'F2' });
    const box = await screen.findByRole('textbox');
    drawn.clear();
    for (const text of ['H', 'Ha', 'Hal', 'Hall', 'Hall &'])
      fireEvent.change(box, { target: { value: text } });
    expect(box).toHaveValue('Hall &');
    expect(drawn.size).toBe(0);
  });

  it('re-renders one row for the first edit of a row, which the page keeps and the list holds', () => {
    const store = new CellEditStore();
    const page = { keep: (_key: string) => {} };
    // The page's writes: the cell shows its value at once, and the row is
    // kept (TableView's `markEdited`); the grid holds it where it is.
    const edits: GridEditing = {
      table: 'artists',
      store,
      lockOf: () => null,
      commit: (row, column, _editor, values) => {
        store.set(
          { table: 'artists', rowKey: row.key, column: column.id },
          { status: 'saving', overlay: values },
        );
        page.keep(row.key);
        return true;
      },
      undo: () => true,
      redo: () => true,
      canUndo: () => false,
      resolve: () => {},
      onEvent: () => () => {},
    };
    const Page = () => {
      const [keep, setKeep] = useState<ReadonlySet<string>>(new Set());
      page.keep = (key) =>
        setKeep((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
      return (
        <TableGrid
          model={model}
          keep={keep}
          edits={edits}
          height={440}
          width={2400}
        />
      );
    };
    const router = createMemoryRouter(
      [{ path: '/console/table/:table/:row?', element: <Page /> }],
      { initialEntries: ['/console/table/artists'] },
    );
    render(<RouterProvider router={router} />);
    const grid = screen.getByRole('grid');
    grid.focus();
    // Toto's Years Active (1977–): the third row.
    for (let i = 0; i < 3; i += 1)
      fireEvent.keyDown(grid, { key: 'ArrowDown' });
    const years = defaultColumns(model.def).findIndex((c) => c.id === 'years');
    for (let i = 0; i < years; i += 1)
      fireEvent.keyDown(grid, { key: 'ArrowRight' });
    drawn.clear();
    fireEvent.keyDown(grid, { key: 'Delete' });
    expect([...drawn.keys()]).toEqual(['toto']);
    expect(
      store.get({ table: 'artists', rowKey: 'toto', column: 'years' }),
    ).toMatchObject({ status: 'saving' });
  });
});
