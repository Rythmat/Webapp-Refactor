// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureInput } from '../../__tests__/tableFixtures';
import { CellEditStore } from '../../edit/cellEditStore';
import { lockOf } from '../../edit/editorFor';
import { getTableModel } from '../../model/buildTableModel';
import { defaultColumns } from '../../model/categories';
import { queryRows } from '../../model/query';
import { VirtualTable } from '../VirtualTable';
import type { GridEditing } from '../gridEditing';

/**
 * Between an edit opening and its editor's code arriving (the Table's
 * third chunk, loaded on the first edit), the grid holds the keys: what is
 * typed waits for the editor — "/" and Space too, so "AC/DC" typed fast is
 * not cut short by the search box — and nothing else moves the active
 * cell, scrolls or leaves the grid (Tab). Meanwhile the grid still names
 * the active cell, since it still has the focus. Here the chunk waits
 * until the test lets it come.
 */

const chunk = vi.hoisted(() => {
  let arrive = () => {};
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return { arrived, arrive: () => arrive() };
});

vi.mock('../../edit/editors/CellEditorHost', async (importOriginal) => {
  await chunk.arrived;
  return importOriginal();
});

afterEach(cleanup);

describe('an edit whose editor is still loading', () => {
  it('keeps what is typed for it, and nothing else leaves the grid', async () => {
    const model = getTableModel(fixtureInput(), 'artists');
    const ctx = {
      def: model.def,
      mode: 'working' as const,
      known: true,
      isServed: () => true,
      schemaVersionOf: () => 2,
      isEditor: false,
      proposalOf: () => null,
    };
    const edits: GridEditing = {
      table: 'artists',
      store: new CellEditStore(),
      lockOf: (row, column) => lockOf(row, column, ctx),
      commit: vi.fn(() => true),
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
        width={1400}
        onSort={() => {}}
        onOpen={() => {}}
        edits={edits}
      />,
    );
    const grid = screen.getByRole('grid');
    grid.focus();
    // Hall & Oates' name: the first row's title.
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    const cell = grid.getAttribute('aria-activedescendant');
    expect(cell).toBeTruthy();
    fireEvent.keyDown(grid, { key: 'F2' });
    expect(screen.queryByRole('textbox')).toBeNull();
    // The grid still has the focus, and still names the cell.
    expect(grid).toHaveAttribute('aria-activedescendant', cell!);

    // Typed fast, before the editor is in: every key held, none let through.
    for (const key of ['A', 'C', '/', 'D', 'C', ' ', '!'])
      expect(fireEvent.keyDown(grid, { key })).toBe(false);
    expect(fireEvent.keyDown(grid, { key: 'Tab' })).toBe(false);
    expect(fireEvent.keyDown(grid, { key: 'ArrowDown' })).toBe(false);
    expect(fireEvent.keyDown(grid, { key: 'Enter' })).toBe(false);
    // The browser's own shortcuts stay the browser's.
    expect(fireEvent.keyDown(grid, { key: 'r', metaKey: true })).toBe(true);
    expect(grid).toHaveAttribute('aria-activedescendant', cell!);

    chunk.arrive();
    const box = await screen.findByRole('textbox', {
      name: 'Artist Name, Hall & Oates',
    });
    expect(box).toHaveValue('AC/DC !');
    expect(box).toHaveFocus();
    // Focus is in the editor now: the grid names no cell.
    expect(grid).not.toHaveAttribute('aria-activedescendant');
    expect(edits.commit).not.toHaveBeenCalled();
  });
});
