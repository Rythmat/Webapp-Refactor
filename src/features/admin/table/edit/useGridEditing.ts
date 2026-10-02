import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import type { Graph } from '@/content/graph/deriveGraph';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../../consoleRoles';
import type { WorkingGraphMode } from '../../content/graph/useWorkingGraph';
import type { ProposalOwner } from '../../content/itemEditor/useItemSession';
import type { GridEditing } from '../grid/gridEditing';
import type { TableDef } from '../model/types';
import { displayOf, opsFor, pathsOf, summaryOf, valuesOf } from './cellValues';
import { useCellWrites } from './cellWriteContext';
import { adminProposalOf, type LockContext, lockOf } from './editorFor';
import type { CellWrite, UndoEntry } from './writeQueue';

/**
 * The grid's side of the cell writes (`grid/gridEditing.ts`): the page's
 * write queue (`CellWriteProvider`), the viewer and the server's
 * capabilities, bound to one table.
 *
 *  - Whether a row's cell can be written now is `lockOf` (`editorFor.ts`),
 *    the rule the row panel shares: repo mode, a kind the server does not
 *    serve, a proposal on the item, a field waiting for a schema step.
 *  - A commit becomes one `CellWrite`: a `set` per field that changed,
 *    resting on what the cell showed when its editor opened (for a
 *    Delete, what it shows now: its overlay, else the row's body) — never
 *    on rows rebuilt under an open editor, which may hold someone else's
 *    value; the item by its slug and, where the API holds it, its id — or,
 *    for a row only the repo has, the repo's copy to make it from; the cell
 *    with its overlay; and "Year of Africa: 1982 → 1983" for the toast
 *    (the cell's own line too, should the write be split). The row is
 *    marked edited (`onEdited`), so it stays where it is while the rows
 *    rebuild around it.
 *  - Undo and redo reach this table's cell edits only.
 *
 * Editors edit in place too (`INLINE_EDIT_FOR_EDITORS`), and each edit is
 * a proposal. The rows cannot tell an editor's own proposal from someone
 * else's (the export swaps their own in), so for an editor the cells are
 * not locked by a proposal here: the queue reads the item before writing
 * and stops a write over someone else's, or over their own that was sent
 * back, saying why, with the row.
 *
 * Outside the page's provider (a bare grid in a test) there is nothing to
 * write with: undefined, and the grid is read-only.
 */

/** Once per browser: the first Enter that opens an edit says so. */
export const ENTER_HINT_KEY = 'console.table.enterEdits';

function hintEnterOnce() {
  try {
    if (window.localStorage.getItem(ENTER_HINT_KEY)) return;
    window.localStorage.setItem(ENTER_HINT_KEY, '1');
  } catch {
    // No storage (a private window): say nothing rather than every time.
    return;
  }
  toast('Enter edits the cell now', {
    description:
      '⌘Enter (Ctrl+Enter) opens the row, and Esc leaves the cell as it was. Keyboard, above the grid, lists every key.',
  });
}

/** An editor's cells are never locked by a proposal before the write reads the item. */
const unknownProposal = (): ProposalOwner => null;

export function useGridEditing({
  def,
  mode,
  graph,
  onEdited,
}: {
  /** The table, once its model is built. */
  def: TableDef | undefined;
  mode: WorkingGraphMode;
  /** Names a Born's place in the toast; nothing else needs it. */
  graph?: Graph;
  /** A row was edited in a cell: the page keeps it where it is. */
  onEdited?(rowKey: string): void;
}): GridEditing | undefined {
  const queue = useCellWrites();
  const caps = useCapabilities();
  const { role } = useAuthContext();
  const isEditor = isContentEditor(role);
  const known = caps.capabilities !== null;
  const { isServed, schemaVersionOf } = caps;
  // Read at commit time, so a rebuilt graph or a new callback does not
  // make every row draw again.
  const live = useRef({ graph, onEdited });
  useEffect(() => {
    live.current = { graph, onEdited };
  });

  return useMemo<GridEditing | undefined>(() => {
    if (!queue || !def) return undefined;
    const table = def.id;
    const ctx: LockContext = {
      def,
      mode,
      known,
      isServed,
      schemaVersionOf,
      isEditor,
      proposalOf: isEditor ? unknownProposal : adminProposalOf,
    };
    const inTable = (entry: UndoEntry) =>
      entry.cells.some((cell) => cell.table === table);

    return {
      table,
      store: queue.store,
      lockOf: (row, column) => lockOf(row, column, ctx),
      commit: (row, column, editor, values, opened) => {
        const kind = def.contentKind;
        if (!kind) return false;
        const cell = { table, rowKey: row.key, column: column.id };
        const seen =
          opened ?? valuesOf(editor, row.body, queue.store.get(cell)?.overlay);
        const ops = opsFor(seen, values);
        if (!ops.length) return false;
        const shown = (at: typeof values) =>
          displayOf(column, editor, at, row.body, live.current.graph);
        const summary = summaryOf(
          column,
          row.label,
          shown(seen),
          shown(values),
        );
        const write: CellWrite = {
          item: {
            kind,
            slug: row.key,
            name: row.label,
            ...(row.itemId
              ? { id: row.itemId }
              : row.body
                ? { createFrom: row.body }
                : {}),
          },
          ops,
          cells: [
            {
              ...cell,
              paths: pathsOf(editor),
              overlay: { ...seen, ...values },
              seen,
              field: column.label,
              summary,
            },
          ],
          fields: [column.label],
          summary,
        };
        queue.commit(write);
        live.current.onEdited?.(row.key);
        return true;
      },
      undo: () => queue.undo(inTable),
      redo: () => queue.redo(inTable),
      canUndo: () => queue.undoable().some(inTable),
      resolve: (state, how) => {
        const id = state.write;
        if (id === undefined) return;
        if (how === 'retry') queue.retry(id);
        else if (how === 'discard') queue.discard(id);
        else if (how === 'mine') queue.writeMine(id);
        else queue.keepTheirs(id);
      },
      onEvent: queue.onEvent,
      hintEnter: hintEnterOnce,
    };
  }, [queue, def, mode, known, isServed, schemaVersionOf, isEditor]);
}
