import type { CellEditState, CellEditStore } from '../edit/cellEditStore';
import type { CellValues, ScalarEditor } from '../edit/cellValues';
import type { CellLock } from '../edit/editorFor';
import type { WriteEvent } from '../edit/writeQueue';
import type { ColumnDef, TableRow } from '../model/types';

/**
 * What the grid needs to edit its cells in place, handed in by the page
 * (`edit/useGridEditing.ts`, over the write queue the page's provider
 * holds). Without it the grid is read-only: every cell is `aria-readonly`,
 * and Enter opens the row at the cell's field.
 *
 * The grid decides which editor a cell opens (`editorFor`, pure) and runs
 * the keys and the editors; this says whether a row's cell can be written
 * now, writes it, and keeps what each cell shows meanwhile (`store`), which
 * each row reads for itself so a commit re-renders one row.
 */

/** What the author does with a write that did not go through. */
export type Resolution = 'retry' | 'discard' | 'mine' | 'theirs';

export interface GridEditing {
  /** The table the cells belong to: the store names cells by it. */
  table: string;
  /** Each cell's state while its write is on its way. */
  store: CellEditStore;
  /** Why this row's cell cannot be written now, or null (`lockOf`). */
  lockOf(row: TableRow, column: ColumnDef): CellLock | null;
  /**
   * Writes the cell's values in the background, resting on `seen`: what
   * the cell held when its editor opened, for an edit made in one (the
   * rows may have been rebuilt under it since, with someone else's value,
   * which the write must not take for what the author saw). Without it,
   * what the cell holds now (a Delete). False when the values are what
   * the author saw, and nothing was sent.
   */
  commit(
    row: TableRow,
    column: ColumnDef,
    editor: ScalarEditor,
    values: CellValues,
    seen?: CellValues,
  ): boolean;
  /** Undoes (or redoes) the latest cell edit in this table; false if none. */
  undo(): boolean;
  redo(): boolean;
  /** A cell edit in this table can be undone. */
  canUndo(): boolean;
  /** Acts on the write a failed or conflicting cell belongs to. */
  resolve(state: CellEditState, how: Resolution): void;
  /** Told of each write as it lands, fails or is refused. */
  onEvent(listener: (event: WriteEvent) => void): () => void;
  /** An edit was opened with Enter or F2: the first time, say it is new. */
  hintEnter?(): void;
}

/**
 * What a cell's state adds to its name for a screen reader, after its
 * value: ", saving", ", proposed", ", not saved: …".
 */
export function stateWords(state: CellEditState | undefined): string {
  switch (state?.status) {
    case 'queued':
    case 'saving':
      return ', saving';
    case 'proposed':
      return ', proposed';
    case 'error':
    case 'conflict':
      return `, not saved: ${state.message ?? 'try again'}`;
    case 'in-panel':
      return ', in the row panel’s unsaved changes';
    default:
      return '';
  }
}
