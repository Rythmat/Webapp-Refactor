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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import type { EntityId, GraphNode } from '@/content/graph/types';
import { fixtureInput } from '../../__tests__/tableFixtures';
import { CellEditStore } from '../../edit/cellEditStore';
import {
  adminProposalOf,
  type LockContext,
  lockOf,
} from '../../edit/editorFor';
import { getTableModel } from '../../model/buildTableModel';
import { defaultColumns, tableDef } from '../../model/categories';
import { queryRows } from '../../model/query';
import type {
  Chip,
  SortState,
  TableModel,
  TableQueryState,
} from '../../model/types';
import type { TableId } from '../../tableIds';
import { VirtualTable, type VirtualTableProps } from '../VirtualTable';
import { ConnectionCell } from '../cells/ConnectionCell';
import type { GridEditing } from '../gridEditing';

/**
 * The grid itself: only the rows in view are in the DOM, the ARIA grid
 * counts the whole table, the keyboard moves an active cell, edits cells
 * (below, "editing in place") and opens rows, and cells draw the model's
 * chips, provenance and empty notes. Without `edits` the grid is
 * read-only: Enter opens the row at the cell's field.
 */

afterEach(cleanup);

/** 500 artists with nothing linked: "Artist 0" … "Artist 499". */
const bigModel = (() => {
  let model: TableModel | null = null;
  return () => {
    if (model) return model;
    const nodes: GraphNode[] = Array.from({ length: 500 }, (_, i) => ({
      id: `artist:a-${i}` as EntityId,
      kind: 'artist',
      label: `Artist ${i}`,
      status: 'published',
      origin: 'api',
    }));
    model = getTableModel({ graph: assembleGraph(nodes, []) }, 'artists');
    return model;
  };
})();

const stateFor = (
  model: TableModel,
  over: Partial<TableQueryState> = {},
): TableQueryState => ({
  q: '',
  sort: model.def.defaultSort,
  filters: [],
  status: 'all',
  ...over,
});

const mount = (
  model: TableModel,
  props: Partial<VirtualTableProps> = {},
  query: Partial<TableQueryState> = {},
) => {
  const handlers = {
    onSort: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
  };
  const sort: SortState = query.sort ?? model.def.defaultSort;
  const view = render(
    <VirtualTable
      def={model.def}
      columns={defaultColumns(model.def)}
      rows={model.rows}
      order={queryRows(model, stateFor(model, query))}
      selectedKey={null}
      sort={sort}
      label={model.def.title}
      height={440}
      width={1200}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, ...view };
};

const grid = () => screen.getByRole('grid');
/** The data rows in the DOM (the header row is the first row). */
const dataRows = () => screen.getAllByRole('row').slice(1);
const rowNamed = (name: string) =>
  dataRows().find((r) => r.textContent?.startsWith(name));
const active = () => {
  const id = grid().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('virtualisation', () => {
  it('draws only the rows in view, and counts them all', () => {
    const model = bigModel();
    mount(model);
    // 440 px holds ten 44 px rows; ten more are drawn ahead.
    expect(dataRows()).toHaveLength(20);
    expect(rowNamed('Artist 19')).toBeDefined();
    expect(rowNamed('Artist 20')).toBeUndefined();
    expect(grid()).toHaveAttribute('aria-rowcount', '501');
    expect(grid()).toHaveAttribute(
      'aria-colcount',
      String(defaultColumns(model.def).length),
    );
    expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2');
  });

  it('brings a linked row into view and marks it open', () => {
    mount(bigModel(), { selectedKey: 'a-300' });
    const row = rowNamed('Artist 300');
    expect(row).toBeDefined();
    // Open is `aria-current`; `aria-selected` is the Shift+Space selection.
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row).toHaveAttribute('aria-selected', 'false');
    expect(row).toHaveAttribute('aria-rowindex', '302');
    expect(rowNamed('Artist 0')).toBeUndefined();
  });
});

describe('the header', () => {
  it('says how the table is sorted, and sorts on a click', () => {
    const { onSort } = mount(bigModel());
    const name = screen.getByRole('columnheader', { name: /Artist Name/ });
    expect(name).toHaveAttribute('aria-sort', 'ascending');
    const born = screen.getByRole('columnheader', { name: /Born/ });
    expect(born).not.toHaveAttribute('aria-sort');
    fireEvent.click(within(born).getByRole('button'));
    expect(onSort).toHaveBeenCalledWith('born');
  });

  it('marks who edits each column', () => {
    mount(bigModel());
    const glyph = (name: RegExp) =>
      screen
        .getByRole('columnheader', { name })
        .querySelector('[data-edit]')
        ?.getAttribute('title');
    expect(glyph(/Born/)).toMatch(/^Stored: edited in the row/);
    // A year span edits in its cell; Link… writes a song's lead act.
    expect(glyph(/Years Active/)).toBe('Stored: edited in the cell or the row');
    expect(glyph(/Songs/)).toBe(
      'Edited here: writes the song’s origin.artistGlobeId',
    );
    // The title column is the row itself.
    expect(glyph(/Artist Name/)).toBeUndefined();
  });
});

describe('the keyboard', () => {
  it('moves the active cell, opens its row on ⌘Enter, and sorts on Enter in the header', () => {
    const { onOpen, onSort } = mount(bigModel());
    const g = grid();
    g.focus();
    // Nothing open: the active cell starts on the header.
    expect(active()?.getAttribute('role')).toBe('columnheader');
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    expect(active()?.textContent).toContain('Artist 0');
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    expect(active()).toHaveAttribute('aria-colindex', '2');
    expect(active()?.closest('[role=row]')?.textContent).toContain('Artist 1');
    fireEvent.keyDown(g, { key: 'Enter', metaKey: true });
    expect(onOpen).toHaveBeenLastCalledWith('a-1');
    fireEvent.keyDown(g, { key: 'Enter', ctrlKey: true });
    expect(onOpen).toHaveBeenLastCalledWith('a-1');
    // Up past the first row reaches the header, where Enter sorts.
    fireEvent.keyDown(g, { key: 'ArrowUp' });
    fireEvent.keyDown(g, { key: 'ArrowUp' });
    fireEvent.keyDown(g, { key: 'Enter' });
    expect(onSort).toHaveBeenCalledWith('born');
  });

  it('opens the row at the cell’s field on Enter where nothing is written', () => {
    const { onOpen } = mount(bigModel());
    const g = grid();
    g.focus();
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    fireEvent.keyDown(g, { key: 'Enter' });
    expect(onOpen).toHaveBeenLastCalledWith('a-0', 'born');
    fireEvent.keyDown(g, { key: 'F2' });
    expect(onOpen).toHaveBeenCalledTimes(2);
    // The title is the row itself: Enter there opens it.
    fireEvent.keyDown(g, { key: 'Home' });
    fireEvent.keyDown(g, { key: 'Enter' });
    expect(onOpen).toHaveBeenLastCalledWith('a-0', undefined);
    // Nothing edits here: no editor opened, and typing does nothing.
    fireEvent.keyDown(g, { key: '7' });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('jumps to the last row, drawing it', () => {
    mount(bigModel());
    const g = grid();
    act(() => {
      fireEvent.keyDown(g, { key: 'End', ctrlKey: true });
    });
    expect(rowNamed('Artist 499')).toBeDefined();
    expect(active()?.closest('[role=row]')?.textContent).toContain(
      'Artist 499',
    );
    fireEvent.keyDown(g, { key: 'Home' });
    expect(active()).toHaveAttribute('aria-colindex', '1');
  });

  it('opens a linkable cell’s Link… on Shift+Enter, and the row elsewhere', () => {
    const onLink = vi.fn();
    const { onOpen } = mount(bigModel(), { onLink });
    const g = grid();
    g.focus();
    const songs = defaultColumns(bigModel().def).findIndex(
      (c) => c.id === 'songs',
    );
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    for (let i = 0; i < songs; i += 1)
      fireEvent.keyDown(g, { key: 'ArrowRight' });
    fireEvent.keyDown(g, { key: 'Enter', shiftKey: true });
    expect(onLink).toHaveBeenCalledWith('a-0', 'songs');
    expect(onOpen).not.toHaveBeenCalled();
    // The button it stands for says so.
    expect(
      within(active()!).getByRole('button', { name: /^Link…/ }),
    ).toHaveAttribute('aria-keyshortcuts', 'Shift+Enter');
    // Born is the row's own: Shift+Enter there just opens the row.
    fireEvent.keyDown(g, { key: 'Home' });
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    fireEvent.keyDown(g, { key: 'Enter', shiftKey: true });
    expect(onOpen).toHaveBeenCalledWith('a-0');
    expect(onLink).toHaveBeenCalledTimes(1);
  });

  it('closes the open row on Esc, and only then', () => {
    const closed = mount(bigModel(), { selectedKey: 'a-3' });
    fireEvent.keyDown(grid(), { key: 'Escape' });
    expect(closed.onClose).toHaveBeenCalledTimes(1);
    cleanup();
    const none = mount(bigModel());
    fireEvent.keyDown(grid(), { key: 'Escape' });
    expect(none.onClose).not.toHaveBeenCalled();
  });

  it('selects rows with Shift+Space, and Esc clears the selection before it closes the row', () => {
    const announce = vi.fn();
    const { onClose } = mount(bigModel(), { selectedKey: 'a-2', announce });
    const g = grid();
    expect(g).toHaveAttribute('aria-multiselectable', 'true');
    g.focus();
    fireEvent.keyDown(g, { key: ' ', shiftKey: true });
    expect(rowNamed('Artist 2')).toHaveAttribute('aria-selected', 'true');
    expect(announce).toHaveBeenLastCalledWith(
      'Artist 2 selected. 1 row selected.',
    );
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    fireEvent.keyDown(g, { key: ' ', shiftKey: true });
    expect(rowNamed('Artist 3')).toHaveAttribute('aria-selected', 'true');
    // Esc: the selection first, the open row after.
    fireEvent.keyDown(g, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(rowNamed('Artist 2')).toHaveAttribute('aria-selected', 'false');
    fireEvent.keyDown(g, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('the mouse', () => {
  it('opens a row from its title, selects other cells, and opens a field on a double-click', () => {
    const { onOpen } = mount(bigModel());
    const row = rowNamed('Artist 4')!;
    const cells = within(row).getAllByRole('gridcell');
    fireEvent.click(cells[0]);
    expect(onOpen).toHaveBeenLastCalledWith('a-4');
    onOpen.mockClear();
    // Any other cell: a click selects it, and opens nothing.
    fireEvent.click(cells[1]);
    expect(onOpen).not.toHaveBeenCalled();
    expect(active()).toBe(cells[1]);
    // A cell that cannot be edited here opens the row at its field on a
    // double-click: Born, stored on the artist, and Songs, stated by the
    // songs, alike.
    fireEvent.doubleClick(cells[1]);
    expect(onOpen).toHaveBeenLastCalledWith('a-4', 'born');
    const songs = defaultColumns(bigModel().def).findIndex(
      (c) => c.id === 'songs',
    );
    fireEvent.doubleClick(cells[songs]);
    expect(onOpen).toHaveBeenLastCalledWith('a-4', 'songs');
  });

  it('offers Link… on a cell another item states, which opens the row with it', () => {
    const onLink = vi.fn();
    const { onOpen } = mount(bigModel(), { onLink });
    const row = rowNamed('Artist 4')!;
    const columns = defaultColumns(bigModel().def);
    const cells = within(row).getAllByRole('gridcell');
    // Songs and Events are stated by the songs and the events; Born is the
    // artist's own, edited in the row.
    const at = (id: string) => columns.findIndex((c) => c.id === id);
    const link = within(cells[at('songs')]).getByRole('button', {
      name: 'Link… Songs: Artist 4',
    });
    expect(within(cells[at('events')]).getByRole('button')).toBeDefined();
    expect(within(cells[at('born')]).queryByRole('button')).toBeNull();
    fireEvent.click(link);
    expect(onLink).toHaveBeenCalledWith('a-4', 'songs');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('offers no Link… where nothing is written', () => {
    mount(bigModel());
    expect(
      within(rowNamed('Artist 4')!).queryAllByRole('button', {
        name: /^Link…/,
      }),
    ).toEqual([]);
  });
});

describe('cells', () => {
  const fixture = (table: TableId, query: Partial<TableQueryState> = {}) => {
    const model = getTableModel(fixtureInput(), table);
    mount(model, {}, query);
    return model;
  };
  const cell = (row: string, column: string, table: TableId = 'artists') => {
    const model = getTableModel(fixtureInput(), table);
    const index = defaultColumns(model.def).findIndex((c) => c.id === column);
    return within(rowNamed(row)!).getAllByRole('gridcell')[index];
  };
  const styles = (el: HTMLElement) =>
    [...el.querySelectorAll('[data-style]')].map((chip) => [
      chip.firstChild?.textContent,
      chip.getAttribute('data-style'),
    ]);

  it('draws linked chips solid and guesses dotted, as many as fit', () => {
    fixture('artists');
    const songs = cell('Toto', 'songs');
    // 220 px holds two of the three; the third is "+1".
    expect(styles(songs)).toEqual([
      ['Rosanna', 'solid'],
      ['Africa', 'dotted'],
    ]);
    expect(songs.textContent).toContain('+1');
  });

  it('says where a count comes from', () => {
    fixture('artists');
    expect(cell('Toto', 'genres').textContent).toContain(
      'stated 2 · from songs 3 · from events 2',
    );
    // One source, one step: the chips say it all.
    expect(cell('Toto', 'songs').textContent).not.toContain('songs 3');
  });

  it('splits a rolled-up count by where it comes from', () => {
    fixture('genres');
    expect(cell('Rock', 'artists', 'genres').textContent).toContain(
      'stated 1 · via songs 4 · via events 1',
    );
  });

  it('gives a rolled-up chip its weakest step’s style and its count', () => {
    const def = tableDef('genres');
    const column = def.columns.find((c) => c.id === 'artists')!;
    const chip = (label: string, style: Chip['style'], weight: number) => ({
      node: `artist:${label.toLowerCase()}` as EntityId,
      label,
      style,
      part: 'songs',
      weight,
    });
    render(
      <ConnectionCell
        column={column}
        width={400}
        cell={{
          type: 'connections',
          total: 2,
          parts: [{ part: 'songs', label: 'via songs', count: 2 }],
          styles: { solid: 1, dashed: 0, dotted: 1, hollow: 0, ghost: 0 },
          chips: [chip('Toto', 'solid', 12), chip('Castro', 'dotted', 1)],
          sort: 0.66,
          filled: true,
        }}
      />,
    );
    const [toto, castro] = document.querySelectorAll('[data-style]');
    // The count of songs it came through, after the name; none for one.
    expect(toto.textContent).toBe('Toto12');
    expect(castro.getAttribute('data-style')).toBe('dotted');
    expect(castro.textContent).toBe('Castro, guessed');
    expect(screen.getByText('via songs 2')).toBeInTheDocument();
  });

  it('says where an empty cell’s data will come from', () => {
    const model = fixture('artists');
    const note = model.def.columns.find((c) => c.id === 'city')!.empty;
    expect(cell('Sinéad O’Connor', 'city').textContent).toBe(note);
  });

  it('shows text no chip came from as a question', () => {
    fixture('events');
    expect(cell('Live Aid', 'genre', 'events').textContent).toContain(
      'Zzyzx Beat?',
    );
  });

  it('badges a row’s state and mutes an unconfirmed record', () => {
    fixture('artists', { view: 'credited' });
    expect(rowNamed('David Paich')?.textContent).toContain('Sent back');
    const porcaro = cell('Jeff Porcaro', 'title');
    expect(porcaro.querySelector('.italic')?.textContent).toContain(
      'Jeff Porcaro',
    );
    expect(cell('Jeff Porcaro', 'born').textContent).toContain('unconfirmed');
  });
});

/* ── Editing in place ────────────────────────────────────────────────── */

/**
 * The grid's editing, as the page would hand it in: the real lock rule
 * (`lockOf`) over a server that serves every kind at body level 2, a real
 * cell store, and a commit, undo and redo that only record.
 */
const editsFor = (
  model: TableModel,
  lock: Partial<LockContext> = {},
  over: Partial<GridEditing> = {},
) => {
  const ctx: LockContext = {
    def: model.def,
    mode: 'working',
    known: true,
    isServed: () => true,
    schemaVersionOf: () => 2,
    isEditor: false,
    proposalOf: () => null,
    ...lock,
  };
  const edits = {
    table: model.def.id,
    store: new CellEditStore(),
    lockOf: (row, column) => lockOf(row, column, ctx),
    commit: vi.fn<GridEditing['commit']>(() => true),
    undo: vi.fn<GridEditing['undo']>(() => true),
    redo: vi.fn<GridEditing['redo']>(() => true),
    canUndo: () => true,
    resolve: vi.fn<GridEditing['resolve']>(),
    onEvent: () => () => {},
    hintEnter: vi.fn(),
  } satisfies GridEditing;
  // What a test hands in stands in for the recording defaults.
  return Object.assign(edits, over);
};

describe('editing in place', () => {
  /** The Acts: Hall & Oates, Sinéad O’Connor, Toto (1977–), in that order. */
  const artists = () => getTableModel(fixtureInput(), 'artists');
  const colOf = (model: TableModel, id: string) =>
    defaultColumns(model.def).findIndex((c) => c.id === id);
  const ROW = { 'hall-and-oates': 0, 'sinead-oconnor': 1, toto: 2 };

  /** Puts the active cell on a row's column, from the header. */
  const goTo = (model: TableModel, key: keyof typeof ROW, column: string) => {
    const g = grid();
    g.focus();
    fireEvent.keyDown(g, { key: 'Home', ctrlKey: true });
    fireEvent.keyDown(g, { key: 'Home' });
    for (let i = 0; i < ROW[key]; i += 1)
      fireEvent.keyDown(g, { key: 'ArrowDown' });
    for (let i = 0; i < colOf(model, column); i += 1)
      fireEvent.keyDown(g, { key: 'ArrowRight' });
    return g;
  };
  const editor = (name: string) => screen.findByRole('textbox', { name });
  const committed = (edits: ReturnType<typeof editsFor>) =>
    edits.commit.mock.calls.map(([row, column, , values]) => [
      row.key,
      column.id,
      values,
    ]);

  it('edits a scalar cell on Enter or F2, with focus in its editor, and Esc leaves it as it was', async () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    const g = goTo(model, 'toto', 'years');
    const cell = active();
    fireEvent.keyDown(g, { key: 'Enter' });
    const box = await editor('Years Active, Toto');
    expect(box).toHaveFocus();
    expect(box).toHaveValue('1977–');
    // Focus is in the editor: the grid names no active cell meanwhile.
    expect(g).not.toHaveAttribute('aria-activedescendant');
    // The first edit opened with Enter says Enter edits now.
    expect(edits.hintEnter).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(g).toHaveFocus();
    expect(active()).toBe(cell);
    expect(edits.commit).not.toHaveBeenCalled();

    fireEvent.keyDown(g, { key: 'F2' });
    expect(await editor('Years Active, Toto')).toHaveFocus();
  });

  it('writes on Enter and Tab and moves: down, up, right, left', async () => {
    const model = artists();
    const edits = editsFor(model);
    const onEdited = vi.fn();
    mount(model, { edits, onEdited });
    const years = colOf(model, 'years');
    const g = goTo(model, 'hall-and-oates', 'years');
    fireEvent.keyDown(g, { key: 'Enter' });
    let box = await editor('Years Active, Hall & Oates');
    fireEvent.change(box, { target: { value: '1970 - 1985' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(committed(edits)).toEqual([
      ['hall-and-oates', 'years', { activeFrom: 1970, activeTo: 1985 }],
    ]);
    expect(onEdited).toHaveBeenCalledWith('hall-and-oates');
    // Down a row, the same column, the keyboard back on the grid.
    expect(g).toHaveFocus();
    expect(active()?.closest('[role=row]')?.textContent).toContain('Sinéad');
    expect(active()).toHaveAttribute('aria-colindex', String(years + 1));

    fireEvent.keyDown(g, { key: 'F2' });
    box = await editor('Years Active, Sinéad O’Connor');
    fireEvent.change(box, { target: { value: '1987' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(committed(edits)[1]).toEqual([
      'sinead-oconnor',
      'years',
      { activeFrom: 1987, activeTo: undefined },
    ]);
    expect(active()?.closest('[role=row]')?.textContent).toContain('Hall');

    fireEvent.keyDown(g, { key: 'F2' });
    box = await editor('Years Active, Hall & Oates');
    fireEvent.keyDown(box, { key: 'Tab' });
    expect(active()).toHaveAttribute('aria-colindex', String(years + 2));
    fireEvent.keyDown(g, { key: 'ArrowLeft' });
    fireEvent.keyDown(g, { key: 'F2' });
    box = await editor('Years Active, Hall & Oates');
    fireEvent.keyDown(box, { key: 'Tab', shiftKey: true });
    expect(active()).toHaveAttribute('aria-colindex', String(years));
  });

  it('keeps an invalid draft in its editor, saying why', async () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    const g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'Enter' });
    const box = await editor('Years Active, Toto');
    fireEvent.change(box, { target: { value: '1990–1980' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(box).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    const why = document.getElementById(
      box.getAttribute('aria-describedby') ?? '',
    );
    expect(why).toHaveTextContent(
      'Years Active ends before it starts: 1990–1980.',
    );
    expect(edits.commit).not.toHaveBeenCalled();
    // Put right, it writes.
    fireEvent.change(box, { target: { value: '1980–1990' } });
    expect(box).not.toHaveAttribute('aria-invalid');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(committed(edits)).toEqual([
      ['toto', 'years', { activeFrom: 1980, activeTo: 1990 }],
    ]);
  });

  it('starts an edit from a typed key, but never from “/”', async () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    const g = goTo(model, 'hall-and-oates', 'years');
    // "/" is the search box's (TableGrid): the grid leaves it alone.
    expect(fireEvent.keyDown(g, { key: '/' })).toBe(true);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.keyDown(g, { key: '1' });
    const box = await editor('Years Active, Hall & Oates');
    // The key replaces the value, and is not an Enter: no hint.
    expect(box).toHaveValue('1');
    expect(edits.hintEnter).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: '1965' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(committed(edits)).toEqual([
      ['hall-and-oates', 'years', { activeFrom: 1965, activeTo: undefined }],
    ]);
  });

  it('opens the row at the field on Enter where the cell does not edit here, saying why when it is locked', () => {
    const model = artists();
    const announce = vi.fn();
    // An admin: the pending proposal on Toto locks its cells.
    const edits = editsFor(model, { proposalOf: adminProposalOf });
    const { onOpen } = mount(model, { edits, announce });
    let g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'Enter' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(announce).toHaveBeenCalledWith(
      'Review the pending proposal first: approve or reject it above.',
    );
    expect(onOpen).toHaveBeenLastCalledWith('toto', 'years');
    // Born and Genres edit in the row's panel in this release.
    g = goTo(model, 'hall-and-oates', 'born');
    fireEvent.keyDown(g, { key: 'Enter' });
    expect(onOpen).toHaveBeenLastCalledWith('hall-and-oates', 'born');
    g = goTo(model, 'hall-and-oates', 'genres');
    fireEvent.keyDown(g, { key: 'F2' });
    expect(onOpen).toHaveBeenLastCalledWith('hall-and-oates', 'genres');
    expect(edits.commit).not.toHaveBeenCalled();
  });

  it('clears a scalar on Delete, refuses to empty a name, and points a list to its row', () => {
    const model = artists();
    const announce = vi.fn();
    const edits = editsFor(model);
    mount(model, { edits, announce });
    let g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'Delete' });
    expect(committed(edits)).toEqual([
      ['toto', 'years', { activeFrom: undefined, activeTo: undefined }],
    ]);
    // Nothing to clear: nothing written.
    g = goTo(model, 'hall-and-oates', 'years');
    fireEvent.keyDown(g, { key: 'Backspace' });
    expect(edits.commit).toHaveBeenCalledTimes(1);
    g = goTo(model, 'toto', 'title');
    fireEvent.keyDown(g, { key: 'Delete' });
    expect(announce).toHaveBeenLastCalledWith(
      'Artist Name cannot be empty.',
      true,
    );
    g = goTo(model, 'toto', 'genres');
    fireEvent.keyDown(g, { key: 'Delete' });
    expect(announce).toHaveBeenLastCalledWith(
      'Genres is a list: Enter opens the row to edit it.',
    );
    expect(edits.commit).toHaveBeenCalledTimes(1);
  });

  it('undoes and redoes the table’s cell edits from the keyboard', () => {
    const model = artists();
    const announce = vi.fn();
    const edits = editsFor(model, {}, { undo: vi.fn(() => false) });
    mount(model, { edits, announce });
    const g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'z', metaKey: true });
    expect(edits.undo).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('Nothing to undo in this table.');
    fireEvent.keyDown(g, { key: 'z', metaKey: true, shiftKey: true });
    fireEvent.keyDown(g, { key: 'y', ctrlKey: true });
    fireEvent.keyDown(g, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(edits.redo).toHaveBeenCalledTimes(3);
  });

  it('marks each cell that cannot be edited for its row read-only, and only those', () => {
    const model = artists();
    const cellAt = (key: keyof typeof ROW, column: string) =>
      within(
        dataRows().find((r) => r.getAttribute('data-row') === key)!,
      ).getAllByRole('gridcell')[colOf(model, column)];
    mount(model, { edits: editsFor(model, { proposalOf: adminProposalOf }) });
    expect(grid()).not.toHaveAttribute('aria-readonly');
    expect(cellAt('hall-and-oates', 'years')).not.toHaveAttribute(
      'aria-readonly',
    );
    expect(cellAt('hall-and-oates', 'title')).not.toHaveAttribute(
      'aria-readonly',
    );
    // Born edits in the panel; Toto waits on a proposal.
    expect(cellAt('hall-and-oates', 'born')).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    expect(cellAt('toto', 'years')).toHaveAttribute('aria-readonly', 'true');
    cleanup();
    // Nothing written at all: every cell.
    mount(model);
    expect(
      screen
        .getAllByRole('gridcell')
        .every((cell) => cell.getAttribute('aria-readonly') === 'true'),
    ).toBe(true);
  });

  it('selects a cell on a click, and edits it on a second click or a double-click', async () => {
    const model = artists();
    const edits = editsFor(model);
    const { onOpen } = mount(model, { edits });
    const cells = within(
      dataRows().find((r) => r.getAttribute('data-row') === 'toto')!,
    ).getAllByRole('gridcell');
    const years = cells[colOf(model, 'years')];
    fireEvent.click(years);
    expect(active()).toBe(years);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(years);
    const box = await editor('Years Active, Toto');
    // A click in the editor is the editor's.
    fireEvent.click(box);
    expect(box).toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'Escape' });
    fireEvent.doubleClick(cells[colOf(model, 'born')]);
    expect(onOpen).toHaveBeenLastCalledWith('toto', 'born');
    fireEvent.doubleClick(years);
    expect(await editor('Years Active, Toto')).toHaveFocus();
    // The title still opens the row.
    fireEvent.click(cells[0]);
    expect(onOpen).toHaveBeenLastCalledWith('toto');
  });

  it('writes the draft when focus leaves for the page, not for another window', async () => {
    const model = artists();
    const announce = vi.fn();
    const edits = editsFor(model);
    mount(model, { edits, announce });
    const g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'Enter' });
    const box = await editor('Years Active, Toto');
    fireEvent.change(box, { target: { value: '1976–' } });
    const focused = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    fireEvent.blur(box);
    expect(box).toBeInTheDocument();
    expect(edits.commit).not.toHaveBeenCalled();
    focused.mockReturnValue(true);
    fireEvent.blur(box);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(committed(edits)).toEqual([
      ['toto', 'years', { activeFrom: 1976, activeTo: undefined }],
    ]);
    // An invalid draft is let go of, and said.
    fireEvent.keyDown(g, { key: 'F2' });
    const again = await editor('Years Active, Toto');
    fireEvent.change(again, { target: { value: 'soon' } });
    fireEvent.blur(again);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(edits.commit).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Years Active not changed: /),
      true,
    );
    focused.mockRestore();
  });

  it('writes the draft of a row that leaves the drawn rows, and keeps the keyboard', async () => {
    const model = bigModel();
    const edits = editsFor(model, {}, { lockOf: () => null });
    const props = {
      def: model.def,
      columns: defaultColumns(model.def),
      rows: model.rows,
      sort: model.def.defaultSort,
      label: model.def.title,
      height: 440,
      width: 1200,
      onSort: vi.fn(),
      onOpen: vi.fn(),
      edits,
    };
    const order = queryRows(model, stateFor(model));
    const view = render(
      <VirtualTable {...props} order={order} selectedKey={null} />,
    );
    const g = grid();
    g.focus();
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    fireEvent.keyDown(g, { key: 'F2' });
    const box = await editor('Artist Name, Artist 0');
    fireEvent.change(box, { target: { value: 'Artist Zero' } });
    // The rows re-sort, and Artist 0 goes to the far end: out of the DOM.
    view.rerender(
      <VirtualTable
        {...props}
        order={Int32Array.from(order).reverse()}
        selectedKey={null}
      />,
    );
    expect(committed(edits)).toEqual([
      ['a-0', 'title', { name: 'Artist Zero' }],
    ]);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(g).toHaveFocus();
  });

  it('shows a value written in a cell over the model’s while it saves, and says how it stands', () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    const cell = () =>
      within(
        dataRows().find(
          (r) => r.getAttribute('data-row') === 'hall-and-oates',
        )!,
      ).getAllByRole('gridcell');
    const years = {
      table: 'artists',
      rowKey: 'hall-and-oates',
      column: 'years',
    };
    act(() =>
      edits.store.set(years, {
        status: 'saving',
        overlay: { activeFrom: 1970, activeTo: 1985 },
      }),
    );
    expect(cell()[colOf(model, 'years')]).toHaveTextContent('1970–1985');
    expect(cell()[colOf(model, 'years')]).toHaveTextContent(', saving');
    act(() =>
      edits.store.set(years, {
        status: 'error',
        overlay: { activeFrom: 1970, activeTo: 1985 },
        message: 'The server said no.',
      }),
    );
    expect(cell()[colOf(model, 'years')]).toHaveTextContent(
      ', not saved: The server said no.',
    );
    act(() =>
      edits.store.set(
        { table: 'artists', rowKey: 'hall-and-oates', column: 'title' },
        { status: 'proposed', overlay: { name: 'Daryl Hall & John Oates' } },
      ),
    );
    expect(cell()[0]).toHaveTextContent('Daryl Hall & John Oates');
    expect(cell()[0]).toHaveTextContent(', proposed');
  });

  it('opens the cell’s menu from Shift+F10, the Menu key and a right-click', async () => {
    const model = artists();
    const edits = editsFor(model);
    const { onOpen } = mount(model, { edits });
    let g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'F10', shiftKey: true });
    const menu = await screen.findByRole('menu', {
      name: 'Years Active, Toto',
    });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.firstChild?.textContent),
    ).toEqual(['Edit', 'Clear', 'Open row', 'Undo', 'Select row']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Clear/ }));
    expect(committed(edits)).toEqual([
      ['toto', 'years', { activeFrom: undefined, activeTo: undefined }],
    ]);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    g = goTo(model, 'hall-and-oates', 'years');
    fireEvent.keyDown(g, { key: 'ContextMenu' });
    const second = await screen.findByRole('menu');
    // Nothing to clear there.
    expect(
      within(second).queryByRole('menuitem', { name: /Clear/ }),
    ).toBeNull();
    fireEvent.click(within(second).getByRole('menuitem', { name: /Open row/ }));
    expect(onOpen).toHaveBeenLastCalledWith('hall-and-oates');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    fireEvent.contextMenu(
      within(
        dataRows().find((r) => r.getAttribute('data-row') === 'toto')!,
      ).getAllByRole('gridcell')[colOf(model, 'born')],
    );
    const third = await screen.findByRole('menu', { name: 'Born, Toto' });
    // Born does not edit in its cell: no Edit or Clear.
    expect(
      within(third)
        .getAllByRole('menuitem')
        .map((item) => item.firstChild?.textContent),
    ).toEqual(['Open row', 'Undo', 'Select row']);
  });

  it('rests an edit on what the cell held when it opened, however the rows change under it', async () => {
    const model = artists();
    const edits = editsFor(model);
    const props = {
      def: model.def,
      columns: defaultColumns(model.def),
      order: queryRows(model, stateFor(model)),
      selectedKey: null,
      sort: model.def.defaultSort,
      label: model.def.title,
      height: 440,
      width: 1200,
      onSort: vi.fn(),
      onOpen: vi.fn(),
      edits,
    };
    const view = render(<VirtualTable {...props} rows={model.rows} />);
    const g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'Enter' });
    const box = await editor('Years Active, Toto');
    // Someone else's save lands: the rows are rebuilt with Toto from 1976.
    const rebuilt = model.rows.map((row) =>
      row.key === 'toto'
        ? { ...row, body: { ...row.body, activeFrom: 1976 } }
        : row,
    );
    view.rerender(<VirtualTable {...props} rows={rebuilt} />);
    expect(box).toHaveValue('1977–');
    fireEvent.keyDown(box, { key: 'Enter' });
    // What the author saw is what it opened on, not what the rows say now:
    // the write finds nothing to send (or, with a change, a conflict).
    const [[row, , , values, seen]] = edits.commit.mock.calls;
    expect(row.body?.activeFrom).toBe(1976);
    expect(seen).toEqual({ activeFrom: 1977, activeTo: undefined });
    expect(values).toEqual(seen);
  });

  it('keeps an editor opened from the menu’s Edit open, with focus in it', async () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    // As a browser: focus leaving the editor for the page would write it.
    const focused = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'F10', shiftKey: true });
    const menu = await screen.findByRole('menu', {
      name: 'Years Active, Toto',
    });
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Edit/ }));
    const box = await editor('Years Active, Toto');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    // The menu has gone and said so twice: the editor keeps the keyboard.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(box).toBeInTheDocument();
    expect(box).toHaveFocus();
    expect(edits.commit).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: '1976–' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(committed(edits)).toEqual([
      ['toto', 'years', { activeFrom: 1976, activeTo: undefined }],
    ]);
    focused.mockRestore();
  });

  it('leaves a right-click inside an open editor to the browser’s own menu', async () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    const g = goTo(model, 'toto', 'years');
    fireEvent.keyDown(g, { key: 'F2' });
    const box = await editor('Years Active, Toto');
    fireEvent.change(box, { target: { value: '1976–' } });
    // Not prevented: paste and spelling are the browser's.
    expect(fireEvent.contextMenu(box)).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(box).toBeInTheDocument();
    expect(edits.commit).not.toHaveBeenCalled();
  });

  it('leaves the keys of an input method’s composition to it', async () => {
    const model = artists();
    const edits = editsFor(model);
    mount(model, { edits });
    const g = goTo(model, 'toto', 'title');
    fireEvent.keyDown(g, { key: 'F2' });
    const box = await editor('Artist Name, Toto');
    fireEvent.change(box, { target: { value: 'とと' } });
    // Confirming the characters, as Chrome and as Safari say it; dropping them.
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(box, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(box, { key: 'Process' });
    fireEvent.keyDown(box, { key: 'Escape', isComposing: true });
    expect(box).toBeInTheDocument();
    expect(edits.commit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(committed(edits)).toEqual([['toto', 'title', { name: 'とと' }]]);
  });

  describe('a choice', () => {
    /** Every column, Complexity among them: the first row has none. */
    const progressions = () => getTableModel(fixtureInput(), 'progressions');
    const mountAll = (model: TableModel, edits: GridEditing) =>
      render(
        <VirtualTable
          def={model.def}
          columns={model.def.columns}
          rows={model.rows}
          order={queryRows(model, stateFor(model))}
          selectedKey={null}
          sort={model.def.defaultSort}
          label={model.def.title}
          height={440}
          width={2400}
          onSort={vi.fn()}
          onOpen={vi.fn()}
          edits={edits}
        />,
      );
    const complexity = (model: TableModel) =>
      within(dataRows()[0]).getAllByRole('gridcell')[
        model.def.columns.findIndex((column) => column.id === 'complexity')
      ];
    // The list floats outside the grid; unlaid-out, Radix hides it.
    const options = () =>
      within(screen.getByRole('listbox', { hidden: true })).getAllByRole(
        'option',
        { hidden: true },
      );

    it('picks one with a click, once, and the list stays closed', async () => {
      const model = progressions();
      const edits = editsFor(model);
      mountAll(model, edits);
      const cell = complexity(model);
      fireEvent.click(cell);
      fireEvent.click(cell);
      await screen.findByRole('combobox');
      // Opened on nothing: the cell holds none of the list.
      expect(
        options().filter((o) => o.getAttribute('aria-selected') === 'true'),
      ).toHaveLength(0);
      fireEvent.click(options()[1]);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(edits.commit).toHaveBeenCalledTimes(1);
      // The click reached the cell through the list's portal: not a second
      // click on the cell, which would open it again.
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('moves on from a list that opened on nothing without picking for the author', async () => {
      const model = progressions();
      const edits = editsFor(model);
      mountAll(model, edits);
      const cell = complexity(model);
      fireEvent.click(cell);
      fireEvent.click(cell);
      const box = await screen.findByRole('combobox');
      fireEvent.keyDown(box, { key: 'Tab' });
      expect(screen.queryByRole('combobox')).toBeNull();
      // What it writes is what it saw: nothing to send.
      const [[, , , values, seen]] = edits.commit.mock.calls;
      expect(values).toEqual(seen);
    });
  });
});
