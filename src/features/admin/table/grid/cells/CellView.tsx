import { cn } from '@/components/utilities';
import type { Graph } from '@/content/graph/deriveGraph';
import type { CellEditState } from '../../edit/cellEditStore';
import { isScalarEditor, overlaidCell } from '../../edit/cellValues';
import type { CellEditor } from '../../edit/editorFor';
import type {
  CellValue,
  ColumnDef,
  TableDef,
  TableRow,
} from '../../model/types';
import { stateWords } from '../gridEditing';
import { ConnectionCell } from './ConnectionCell';
import { CreditsCell } from './CreditsCell';
import { EmptyNote } from './EmptyNote';
import { FieldCell } from './FieldCell';
import { TitleCell } from './TitleCell';
import { YearsCell } from './YearsCell';

/** A cell's padding either side, in px (`px-3`). */
export const CELL_PADDING = 12;

/**
 * The mark in a cell's corner while its edit is on its way, and the words
 * a screen reader hears after its value (`stateWords`): pulsing while it
 * saves, sky for an editor's proposal, red when it was not saved (with
 * why, on hover), amber while it waits in the row panel's unsaved changes.
 * A saved cell needs no mark: it shows what was written.
 */
const STATE_MARK: Partial<Record<CellEditState['status'], string>> = {
  queued: 'animate-pulse bg-white/45',
  saving: 'animate-pulse bg-white/45',
  proposed: 'bg-sky-300',
  error: 'bg-red-400',
  conflict: 'bg-red-400',
  'in-panel': 'bg-amber-300/80',
};

const CellState = ({ state }: { state: CellEditState }) => {
  const words = stateWords(state);
  const mark = STATE_MARK[state.status];
  return (
    <>
      {mark && (
        <span
          aria-hidden
          title={state.message}
          className={cn('absolute right-1 top-1 size-1.5 rounded-full', mark)}
        />
      )}
      {words && <span className="sr-only">{words}</span>}
    </>
  );
};

/** What one cell draws besides the model's value. */
export interface CellEdit {
  /** The column's editor: a scalar one lays its overlay over the value. */
  editor?: CellEditor;
  /** The cell's write, while it is on its way (`cellEditStore`). */
  state?: CellEditState;
  /** Formats an overlaid Born's place; nothing else needs it. */
  graph?: Graph;
}

function drawn(
  def: TableDef,
  row: TableRow,
  column: ColumnDef,
  cell: CellValue | undefined,
  mode: 'working' | 'repo',
  stale: string | undefined,
  label: string | undefined,
) {
  const room = column.width - CELL_PADDING * 2;
  switch (cell?.type) {
    case 'title':
      return (
        <TitleCell
          row={row}
          def={def}
          mode={mode}
          stale={stale}
          label={label}
        />
      );
    case 'field':
      return <FieldCell cell={cell} />;
    case 'connections':
      return <ConnectionCell cell={cell} column={column} width={room} />;
    case 'years':
      return <YearsCell cell={cell} width={room} />;
    case 'credits':
      return <CreditsCell cell={cell} width={room} />;
    case undefined:
      return <EmptyNote note={column.empty} />;
  }
}

/**
 * One cell of the grid, drawn by what its column holds. While an edit of
 * it is on its way, the value it wrote shows over the model's (the
 * store's overlay, formatted as the next model will format it), until the
 * rebuilt rows hold it too.
 */
export const CellView = ({
  def,
  row,
  column,
  cell,
  mode,
  stale,
  edit,
}: {
  def: TableDef;
  row: TableRow;
  column: ColumnDef;
  cell: CellValue | undefined;
  mode: 'working' | 'repo';
  /** Why a row the query does not match is listed (the title cell says it). */
  stale?: string;
  edit?: CellEdit;
}) => {
  const state = edit?.state;
  let shown = cell;
  let label: string | undefined;
  if (state?.overlay && edit?.editor && isScalarEditor(edit.editor)) {
    const over = overlaidCell(
      cell,
      column,
      edit.editor,
      state.overlay,
      row.body,
      edit.graph,
    );
    if ('label' in over) label = over.label;
    else shown = over.cell;
  }
  return (
    <>
      {drawn(def, row, column, shown, mode, stale, label)}
      {state && <CellState state={state} />}
    </>
  );
};
