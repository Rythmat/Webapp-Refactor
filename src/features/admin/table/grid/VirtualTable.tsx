import {
  ArrowDown,
  ArrowUp,
  Code2,
  ExternalLink,
  Link2,
  Pencil,
} from 'lucide-react';
import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  lazy,
  memo,
  type MouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  areEqual,
  FixedSizeList,
  type ListChildComponentProps,
  type ListOnItemsRenderedProps,
  type ListOnScrollProps,
} from 'react-window';
import { cn } from '@/components/utilities';
import type { Graph } from '@/content/graph/deriveGraph';
import { useElementSize } from '@/hooks/useElementSize';
import { CONSOLE_LABEL } from '../../ui/styles';
import type { CellEditState } from '../edit/cellEditStore';
import {
  type CellValues,
  clearedValues,
  clearRefusal,
  isBlank,
  isScalarEditor,
  valuesOf,
} from '../edit/cellValues';
import { type CellEditor, editorFor } from '../edit/editorFor';
import type {
  CellEditorProps,
  EditMove,
  EditorHandle,
  EditorRead,
} from '../edit/editors/types';
import { linkFor } from '../link/links';
import type {
  ColumnDef,
  SchemaStep,
  SortState,
  TableDef,
  TableRow,
} from '../model/types';
import { CellMenu, type CellMenuItem } from './CellMenu';
import { CellView } from './cells/CellView';
import type { GridEditing } from './gridEditing';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  The Table's grid: a virtual list of rows under a sticky header
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A table can hold 4,800 rows of a dozen cells full of chips, so only the
 * rows in view (and ten either side) are in the DOM: react-window's
 * FixedSizeList, 44 px a row. The list's own scroll box scrolls both ways;
 * its inner element is as wide as the columns and draws the header row
 * first, `position: sticky` at the top, so the header stays while the rows
 * scroll under it and moves sideways with them. The title cell of every row
 * (and of the header) sticks to the left edge the same way.
 *
 * Cells are edited in place (Amendment 6), like a spreadsheet's. The first
 * release edits the scalars — a name or title, a number, a year, a span of
 * years, coordinates, one of a list — in a box in the cell (the editors
 * are the Table's third chunk, loaded on the first edit). Every other cell
 * opens its row's panel at the field, which edits it and says who does:
 * lists and connections, a birth date and place, the long fields, what code
 * or another row states. A connection another item states offers Link… on
 * hover and on the keyboard's cell (Shift+Enter), which opens the row with
 * the dialog that writes it there (`onLink`). Without `edits` — repo mode,
 * where nothing is written, or a grid on its own — every cell is read-only.
 *
 * The mouse: a click on the title opens the row. A click on any other cell
 * selects it; a second click on the selected cell, or a double-click,
 * edits it — or, on a cell that cannot be edited here, opens the row at
 * its field. A right-click opens the cell's menu (inside an open editor,
 * the browser's own, for paste and spelling).
 *
 * The keyboard follows ARIA's grid pattern. Focus stays on the scroll box,
 * which names the active cell through `aria-activedescendant`: the arrows
 * move it (↑ from the first row reaches the header, where Enter sorts),
 * Page Up/Down move a screen, Home/End go along the row (with Ctrl or ⌘,
 * to the first or last row). Enter or F2 edits the cell (or opens the row
 * at a field it cannot edit); ⌘Enter opens the row; Shift+Enter is Link…;
 * any other character starts an edit with that key ("/" stays the search,
 * Space stays with Shift+Space);
 * Delete clears a scalar, with undo; ⌘Z and ⇧⌘Z (Ctrl+Y) undo and redo
 * the table's cell edits; Shift+Space selects the row; Shift+F10 or the
 * Menu key opens the cell's menu; Esc clears the selection, else closes
 * the open row. While a cell is edited, focus is in its editor and the
 * grid names no active cell: Enter, Shift+Enter, Tab and Shift+Tab write
 * it and move, Esc leaves it as it was, and focus moving elsewhere on the
 * page writes it (not another window's). A row edited and then scrolled out
 * of the drawn rows writes what can be written and lets go of the rest.
 * Whichever way it ends, the edit rests on what the cell held when it
 * opened (`EditSession.opened`), and writes nothing if that is unchanged.
 *
 * Every row and cell carries its index, so a reader counts the whole table,
 * not the few rows the DOM holds. A cell that cannot be edited for its row
 * says so (`aria-readonly`); a cell whose edit is on its way says how it
 * stands after its value (", saving", ", not saved: …"). Rows selected with
 * Shift+Space are `aria-selected`; the open row is `aria-current`.
 *
 * Only entering or leaving an edit changes what every row is drawn from
 * (`editingPos`, `editingCol`): the draft lives in the editor, and each row
 * reads its own cells' write state from the store (`useRowEdits`), so
 * typing re-renders the editor alone, and a commit re-renders its row.
 */

export const ROW_HEIGHT = 44;
export const HEADER_HEIGHT = 36;
/** Rows drawn beyond the edge of the view, either side. */
export const OVERSCAN = 10;

/** The active cell is the header's when the row is -1. */
const HEADER = -1;

/** Opaque, so the sticky title cell hides what scrolls under it. */
const ROW_BG = {
  base: 'bg-[#101012]',
  hover: 'group-hover/row:bg-[#151518]',
  open: 'bg-[#1c1c20]',
  picked: 'bg-[#16181d]',
} as const;

// The editors are the Table's third chunk: loaded on the first edit, and
// ahead of it once the grid has focus and the browser is idle.
const loadEditors = () => import('../edit/editors/CellEditorHost');
const CellEditorHost = lazy(() =>
  loadEditors().then(({ CellEditorHost }) => ({ default: CellEditorHost })),
);

export interface VirtualTableProps {
  def: TableDef;
  /** The columns showing, the title first. */
  columns: readonly ColumnDef[];
  rows: readonly TableRow[];
  /** Indices into `rows`, in the order shown (the query's result). */
  order: Int32Array;
  /** The open row's key, from the URL. */
  selectedKey: string | null;
  sort: SortState;
  onSort(column: string): void;
  /** Open a row; with `field`, at that field (a column's id). */
  onOpen(rowKey: string, field?: string): void;
  /**
   * Open a row with a column's Link… (`link/links.ts`). Without it the
   * cells offer none: repo mode, where nothing is written.
   */
  onLink?(rowKey: string, column: string): void;
  /** Close the open row. */
  onClose?(): void;
  /**
   * Editing in place, over the page's write queue. Without it every cell is
   * read-only, and Enter opens the row at the cell's field.
   */
  edits?: GridEditing;
  /** A row was edited in one of its cells: the list holds it where it is. */
  onEdited?(rowKey: string): void;
  /** Says a line in the page's live region; `urgent` says it at once. */
  announce?(text: string, urgent?: boolean): void;
  /** Formats a written Born's place; nothing else needs the graph. */
  graph?: Graph;
  /**
   * Rows listed though the query does not match them, or held where they
   * were, with what their title cell says of it ("No longer matches",
   * "Sorted elsewhere", "Outside this view").
   */
  stale?: ReadonlyMap<string, string>;
  mode?: 'working' | 'repo';
  /** The grid's accessible name. */
  label: string;
  /** What to say when no row is listed. */
  empty?: ReactNode;
  /** A fixed size; measured from the space the grid is given otherwise. */
  height?: number;
  width?: number;
}

/* ── What the list's own elements need ───────────────────────────────── */

interface GridFrame {
  /** Spread onto the scroll box: the grid's role, name, counts and keys. */
  outer: HTMLAttributes<HTMLDivElement>;
  header: ReactNode;
  totalWidth: number;
}

const GridFrameContext = createContext<GridFrame | null>(null);

/**
 * The scroll box. react-window renders it and passes it only its own props,
 * so the grid's attributes come through context; the component itself must
 * stay one stable type, or the list would remount on every render.
 */
const GridOuter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const frame = useContext(GridFrameContext);
    return <div ref={ref} {...props} {...frame?.outer} />;
  },
);
GridOuter.displayName = 'GridOuter';

/**
 * The scrolled content: as tall as the rows plus the header, as wide as the
 * columns (or the view, when they are narrower), with the header first.
 */
const GridInner = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ style, children, ...rest }, ref) => {
    const frame = useContext(GridFrameContext);
    return (
      <div
        ref={ref}
        {...rest}
        style={{
          ...style,
          height: Number(style?.height ?? 0) + HEADER_HEIGHT,
          width: frame?.totalWidth,
          minWidth: '100%',
        }}
      >
        {frame?.header}
        {children}
      </div>
    );
  },
);
GridInner.displayName = 'GridInner';

/* ── Header ──────────────────────────────────────────────────────────── */

const SINCE: Record<SchemaStep, string> = {
  'song-v2': 'song schema v2',
  'event-v2': 'the event body v2',
  'artist-born': 'the artist’s Born field',
};

/**
 * Who edits a column, as a word and a glyph in its header (types.ts,
 * `ColumnEdit`): the row's own field, edited in its cell or its panel; a
 * connection another item states, written there by Link…; code; the page;
 * or a count of other rows.
 */
function editOf(
  column: ColumnDef,
  editor: CellEditor,
  linked: boolean,
): { icon: typeof Pencil; text: string } | null {
  const { edit, source } = column;
  if (source.type === 'title') return null;
  switch (edit.by) {
    case 'row': {
      const where = isScalarEditor(editor)
        ? 'edited in the cell or the row'
        : 'edited in the row';
      return {
        icon: Pencil,
        text: edit.since
          ? `Stored: ${where}, saved once ${SINCE[edit.since]} lands`
          : `Stored: ${where}`,
      };
    }
    case 'owner': {
      const owner = edit.kind.replace(/_/g, ' ');
      return {
        icon: Link2,
        text: linked
          ? `Edited here: writes the ${owner}’s ${edit.path}`
          : `Derived: stated by the ${owner}’s ${edit.path}`,
      };
    }
    case 'code':
      return { icon: Code2, text: `In code: ${edit.file}` };
    case 'page':
      return { icon: ExternalLink, text: 'Edited on its page' };
    case 'none':
      return { icon: Link2, text: 'Derived: counted from other rows' };
  }
}

const cellId = (base: string, row: number, col: number) =>
  row === HEADER ? `${base}-h-${col}` : `${base}-${row}-${col}`;

/** The active cell's ring, shown while the grid has keyboard focus. */
const ACTIVE_RING =
  'group-focus-visible/grid:outline group-focus-visible/grid:outline-1 group-focus-visible/grid:-outline-offset-1 group-focus-visible/grid:outline-white/50';

const HeaderRow = ({
  columns,
  editors,
  linked,
  sort,
  idBase,
  activeCol,
  onHeader,
}: {
  columns: readonly ColumnDef[];
  editors: readonly CellEditor[];
  /** Per column: a Link… spec writes it. */
  linked: readonly boolean[];
  sort: SortState;
  idBase: string;
  /** The active column when the header row is active; else -1. */
  activeCol: number;
  onHeader(col: number): void;
}) => (
  <div
    role="row"
    aria-rowindex={1}
    className="sticky top-0 z-20 flex border-b border-white/[0.08] bg-[#101012]"
    style={{ height: HEADER_HEIGHT }}
  >
    {columns.map((column, c) => {
      const sorted = sort.column === column.id;
      const edit = editOf(column, editors[c], linked[c]);
      const Icon = edit?.icon;
      return (
        <div
          key={column.id}
          id={cellId(idBase, HEADER, c)}
          role="columnheader"
          aria-colindex={c + 1}
          aria-sort={
            sorted
              ? sort.dir === 'asc'
                ? 'ascending'
                : 'descending'
              : undefined
          }
          style={{ width: column.width }}
          className={cn(
            'flex shrink-0 items-center gap-1.5 px-3',
            c === 0 &&
              'sticky left-0 z-30 border-r border-white/[0.06] bg-[#101012]',
            c === activeCol && ACTIVE_RING,
          )}
        >
          <button
            type="button"
            tabIndex={-1}
            // Focus stays on the grid, which keeps the keyboard where it was.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onHeader(c)}
            title={[column.help, `Sort by ${column.label}`]
              .filter(Boolean)
              .join('. ')}
            className={cn(
              CONSOLE_LABEL,
              'flex min-w-0 items-center gap-1 transition-colors hover:text-white/80',
              sorted && 'text-white/80',
            )}
          >
            <span className="truncate">{column.label}</span>
            {sorted &&
              (sort.dir === 'asc' ? (
                <ArrowUp aria-hidden className="size-3 shrink-0" />
              ) : (
                <ArrowDown aria-hidden className="size-3 shrink-0" />
              ))}
          </button>
          {/* A tooltip, not part of the header's name: a reader announces
              the header with every cell it moves to. */}
          {Icon && (
            <span
              title={edit.text}
              data-edit={column.edit.by}
              className="ml-auto shrink-0 text-white/25"
            >
              <Icon aria-hidden className="size-3" />
            </span>
          )}
        </div>
      );
    })}
  </div>
);

/* ── Rows ────────────────────────────────────────────────────────────── */

/**
 * The open edit's way in and out, the same object for the grid's whole
 * life: the key that opened it (`seed`), what the cell held when it opened
 * (`opened`), where its editor leaves its draft (`handle`), and what its
 * keys do, through `actions` (the grid's latest), so no row draws again
 * when they change.
 *
 * `opened` is what the editor shows and what the write rests on: the rows
 * can be rebuilt under an open editor (another admin's save, a refresh),
 * and their new value is not what the author saw — writing over it as if
 * it were would put the old value back without a word.
 */
interface EditSession {
  seed: { current: string | undefined };
  opened: { current: CellValues | undefined };
  handle: { current: EditorHandle | null };
  commit(values: CellValues, move: EditMove): void;
  cancel(): void;
  leave(): void;
  /** The editor has mounted (or gone): it has the keys now. */
  ready(mounted: boolean): void;
}

interface RowData {
  def: TableDef;
  rows: readonly TableRow[];
  order: Int32Array;
  columns: readonly ColumnDef[];
  /** Per column: the editor its cells open. */
  editors: readonly CellEditor[];
  selectedKey: string | null;
  /** Rows picked with Shift+Space. */
  picked: ReadonlySet<string>;
  activeRow: number;
  activeCol: number;
  /** The cell being edited: its row's place and its column; else -1. */
  editingPos: number;
  editingCol: number;
  idBase: string;
  stale?: ReadonlyMap<string, string>;
  mode: 'working' | 'repo';
  edits?: GridEditing;
  graph?: Graph;
  session: EditSession;
  /** Per column: it offers Link…. */
  linkable: readonly boolean[];
  /** The cell edits in place for its row now. */
  canEdit(row: TableRow, col: number): boolean;
  onCellClick(row: number, col: number, event: MouseEvent): void;
  onCellDoubleClick(row: number, col: number, event: MouseEvent): void;
  onCellMenu(row: number, col: number, event: MouseEvent): void;
  onCellLink(row: number, col: number): void;
}

const NO_CELLS: ReadonlyMap<string, CellEditState> = new Map();
const NOTHING = () => () => {};

/**
 * A row's cells' write state, from the store, for this row alone: a commit
 * re-renders the row it is in, not the grid.
 */
function useRowEdits(
  edits: GridEditing | undefined,
  key: string,
): ReadonlyMap<string, CellEditState> {
  const subscribe = useCallback(
    (listener: () => void) =>
      edits ? edits.store.subscribeRow(edits.table, key, listener) : NOTHING(),
    [edits, key],
  );
  const snapshot = useCallback(
    () => (edits ? edits.store.row(edits.table, key) : NO_CELLS),
    [edits, key],
  );
  return useSyncExternalStore(subscribe, snapshot);
}

/** Tells the grid its editor is in: rendered beside it, so only once it is. */
const EditorMounted = ({ session }: { session: EditSession }) => {
  useLayoutEffect(() => {
    session.ready(true);
    return () => session.ready(false);
  }, [session]);
  return null;
};

/**
 * The editor, with the keys typed so far. Inside the Suspense boundary, so
 * that when the editors' chunk arrives this renders again and reads the
 * seed as it is then: keys typed while it loaded were added to it.
 */
const SeededEditor = ({
  session,
  ...props
}: Pick<CellEditorProps, 'editor' | 'name' | 'label' | 'values'> & {
  session: EditSession;
}) => (
  <>
    <CellEditorHost
      {...props}
      seed={session.seed.current}
      handle={session.handle}
      onCommit={session.commit}
      onCancel={session.cancel}
      onLeave={session.leave}
    />
    <EditorMounted session={session} />
  </>
);

/** The cell's editor, open: while its code loads, the cell as it was. */
const EditorSlot = ({
  data,
  row,
  column,
  editor,
  state,
}: {
  data: RowData;
  row: TableRow;
  column: ColumnDef;
  editor: CellEditor;
  state: CellEditState | undefined;
}) => {
  const shown = (
    <CellView
      def={data.def}
      row={row}
      column={column}
      cell={row.cells[column.id]}
      mode={data.mode}
      edit={{ editor, state, graph: data.graph }}
    />
  );
  if (!isScalarEditor(editor)) return shown;
  return (
    <Suspense fallback={shown}>
      <SeededEditor
        editor={editor}
        name={column.label}
        label={`${column.label}, ${row.label}`}
        values={
          data.session.opened.current ??
          valuesOf(editor, row.body, state?.overlay)
        }
        session={data.session}
      />
    </Suspense>
  );
};

const GridRow = memo(
  ({ index, style, data }: ListChildComponentProps<RowData>) => {
    const row = data.rows[data.order[index]];
    const open = row.key === data.selectedKey;
    const picked = data.picked.has(row.key);
    const states = useRowEdits(data.edits, row.key);
    return (
      <div
        role="row"
        aria-rowindex={index + 2}
        aria-selected={picked}
        aria-current={open ? 'true' : undefined}
        data-row={row.key}
        style={{ ...style, top: Number(style.top) + HEADER_HEIGHT }}
        className={cn(
          'group/row flex cursor-pointer border-b border-white/[0.05]',
          open ? ROW_BG.open : picked ? ROW_BG.picked : 'hover:bg-[#151518]',
        )}
      >
        {data.columns.map((column, c) => {
          const editing = index === data.editingPos && c === data.editingCol;
          const state = states.get(column.id);
          const failed =
            state?.status === 'error' || state?.status === 'conflict';
          return (
            <div
              key={column.id}
              id={cellId(data.idBase, index, c)}
              role="gridcell"
              aria-colindex={c + 1}
              aria-readonly={data.canEdit(row, c) ? undefined : true}
              style={{ width: column.width }}
              onClick={(event) => data.onCellClick(index, c, event)}
              onDoubleClick={(event) => data.onCellDoubleClick(index, c, event)}
              onContextMenu={(event) => data.onCellMenu(index, c, event)}
              className={cn(
                'group/cell relative flex h-full shrink-0 items-center overflow-hidden px-3',
                c === 0 && [
                  'sticky left-0 z-10 border-r border-white/[0.06]',
                  open
                    ? ROW_BG.open
                    : picked
                      ? ROW_BG.picked
                      : [ROW_BG.base, ROW_BG.hover],
                ],
                editing && 'px-1.5',
                failed && 'ring-1 ring-inset ring-red-400/40',
                index === data.activeRow && c === data.activeCol && ACTIVE_RING,
              )}
            >
              {editing ? (
                <EditorSlot
                  data={data}
                  row={row}
                  column={column}
                  editor={data.editors[c]}
                  state={state}
                />
              ) : (
                <CellView
                  def={data.def}
                  row={row}
                  column={column}
                  cell={row.cells[column.id]}
                  mode={data.mode}
                  stale={c === 0 ? data.stale?.get(row.key) : undefined}
                  edit={{ editor: data.editors[c], state, graph: data.graph }}
                />
              )}
              {!editing && data.linkable[c] && (
                <button
                  type="button"
                  // Focus stays on the grid: Shift+Enter on the cell is this.
                  tabIndex={-1}
                  aria-label={`Link… ${column.label}: ${row.label}`}
                  aria-keyshortcuts="Shift+Enter"
                  title="Link… (Shift+Enter on the cell)"
                  onMouseDown={(event) => event.preventDefault()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onCellLink(index, c);
                  }}
                  className={cn(
                    'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-[#1c1c20] px-2 py-0.5 text-[11px] text-white/80 opacity-0 transition-opacity hover:border-white/40 hover:text-white group-hover/cell:opacity-100',
                    index === data.activeRow &&
                      c === data.activeCol &&
                      'group-focus-visible/grid:opacity-100',
                  )}
                >
                  Link…
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  },
  areEqual,
);
GridRow.displayName = 'GridRow';

const itemKey = (index: number, data: RowData) =>
  data.rows[data.order[index]].key;

/* ── Keys ────────────────────────────────────────────────────────────── */

/**
 * A key that types a character, as a cell's edit starts from: no ⌘, Ctrl
 * or Alt with it, and never "/" (the search) or Space (Shift+Space
 * selects; a space alone is not worth a surprise edit).
 */
const typesACharacter = (event: KeyboardEvent) =>
  event.key.length === 1 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  event.key !== '/' &&
  event.key !== ' ';

/** "⌘" on a Mac, "Ctrl+" elsewhere: for the cell menu's shortcuts. */
const MOD =
  typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl+';

/** Why Delete does nothing on a cell that does not edit in place. */
function notClearable(column: ColumnDef, editor: CellEditor): string {
  switch (editor.type) {
    case 'none':
      return editor.why;
    case 'many':
    case 'tags':
    case 'textChips':
    case 'refs':
    case 'credits':
    case 'relation':
      return `${column.label} is a list: Enter opens the row to edit it.`;
    default:
      return `${column.label}: Enter opens the row to edit it.`;
  }
}

/**
 * A mouse event that reached a cell from outside its box — through a
 * portal: its editor's list, the note under it — is not one on the cell.
 */
const fromCell = (event: MouseEvent) =>
  event.currentTarget.contains(event.target as Node);

/** The open edit: its row by key and its column by id, not by place. */
interface EditingCell {
  key: string;
  column: string;
}

/* ── The grid ────────────────────────────────────────────────────────── */

export const VirtualTable = ({
  def,
  columns,
  rows,
  order,
  selectedKey,
  sort,
  onSort,
  onOpen,
  onLink,
  onClose,
  edits,
  onEdited,
  announce,
  graph,
  stale,
  mode = 'working',
  label,
  empty,
  height,
  width,
}: VirtualTableProps) => {
  const idBase = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const measured = useElementSize(boxRef);
  const viewHeight = height ?? measured.height;
  const viewWidth = width ?? measured.width;

  const listRef = useRef<FixedSizeList<RowData>>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);
  const [rendered, setRendered] = useState({ start: 0, stop: -1 });
  // The same range, current before the effects that read it run: an edit
  // opened on a row just scrolled to must not read the old range.
  const renderedNow = useRef(rendered);

  const offsets = useMemo(() => {
    const left: number[] = [];
    let x = 0;
    for (const column of columns) {
      left.push(x);
      x += column.width;
    }
    return { left, total: x };
  }, [columns]);

  // Where each row key sits in the order, so the active cell follows its
  // row when a search or sort moves it.
  const positions = useMemo(() => {
    const map = new Map<string, number>();
    order.forEach((index, pos) => map.set(rows[index].key, pos));
    return map;
  }, [rows, order]);

  const keyAt = useCallback(
    (pos: number) => rows[order[pos]]?.key,
    [rows, order],
  );
  const rowAt = useCallback(
    (pos: number): TableRow | undefined => rows[order[pos]],
    [rows, order],
  );

  // Each column's editor (edit/editorFor.ts), and whether a Link… spec
  // writes it (the header's wording) and it offers Link… here.
  const editors = useMemo(
    () => columns.map((column) => editorFor(def, column)),
    [def, columns],
  );
  const linked = useMemo(
    () => columns.map((column) => !!linkFor(def.id, column.id)),
    [columns, def.id],
  );
  const linkable = useMemo(
    () => linked.map((has) => has && !!onLink),
    [linked, onLink],
  );

  const canEdit = useCallback(
    (row: TableRow, col: number) =>
      !!edits &&
      isScalarEditor(editors[col]) &&
      edits.lockOf(row, columns[col]) === null,
    [edits, editors, columns],
  );

  /* ── The active cell ───────────────────────────────────────────── */

  // By row key, not position: it stays on its row when the rows move.
  const [active, setActive] = useState<{ key: string | null; col: number }>(
    () => ({ key: selectedKey, col: 0 }),
  );
  const activeRow =
    active.key === null
      ? HEADER
      : (positions.get(active.key) ?? (order.length ? 0 : HEADER));
  const activeCol = Math.min(active.col, Math.max(0, columns.length - 1));
  // What was active before a click, for "a second click edits".
  const activeNow = useRef({ key: active.key, col: activeCol });
  activeNow.current = { key: active.key, col: activeCol };

  const rowsInView = Math.max(
    1,
    Math.floor((viewHeight - HEADER_HEIGHT) / ROW_HEIGHT),
  );

  /** Scroll so a row is in view below the header; `center` for a deep link. */
  const revealRow = useCallback(
    (pos: number, center = false) => {
      const list = listRef.current;
      if (!list || pos < 0) return;
      const room = viewHeight - HEADER_HEIGHT;
      const top = pos * ROW_HEIGHT;
      const bottom = top + ROW_HEIGHT;
      const from = scrollTop.current;
      if (top >= from && bottom <= from + room) return;
      if (center) list.scrollTo(Math.max(0, top - (room - ROW_HEIGHT) / 2));
      else list.scrollTo(top < from ? top : bottom - room);
    },
    [viewHeight],
  );

  /** Scroll sideways so a column is in view right of the sticky title. */
  const revealColumn = useCallback(
    (col: number) => {
      const outer = outerRef.current;
      if (!outer || col <= 0 || !columns[col]) return;
      const sticky = columns[0]?.width ?? 0;
      const left = offsets.left[col];
      const right = left + columns[col].width;
      if (left < outer.scrollLeft + sticky) outer.scrollLeft = left - sticky;
      else if (right > outer.scrollLeft + outer.clientWidth) {
        outer.scrollLeft = right - outer.clientWidth;
      }
    },
    [columns, offsets],
  );

  const moveTo = useCallback(
    (pos: number, col: number) => {
      const key = pos === HEADER ? null : (keyAt(pos) ?? null);
      setActive({ key, col });
      revealRow(pos);
      revealColumn(col);
    },
    [keyAt, revealRow, revealColumn],
  );

  // A row opened from elsewhere (a link, Back) becomes the active one and
  // is brought into view, centred if it was out of it.
  useEffect(() => {
    if (!selectedKey) return;
    const pos = positions.get(selectedKey);
    if (pos === undefined) return;
    setActive((current) =>
      current.key === selectedKey ? current : { ...current, key: selectedKey },
    );
    revealRow(pos, true);
    // Only when the open row changes, or the list first has room to scroll.
  }, [selectedKey, viewHeight > 0]);

  const focusGrid = () => outerRef.current?.focus({ preventScroll: true });

  /* ── Rows picked (Shift+Space) ─────────────────────────────────── */

  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());

  const togglePicked = (row: TableRow) => {
    const next = new Set(picked);
    if (next.has(row.key)) next.delete(row.key);
    else next.add(row.key);
    setPicked(next);
    announce?.(
      `${row.label} ${next.has(row.key) ? 'selected' : 'not selected'}. ${
        next.size
      } row${next.size === 1 ? '' : 's'} selected.`,
    );
  };

  /* ── Editing ───────────────────────────────────────────────────── */

  const [editing, setEditing] = useState<EditingCell | null>(null);
  // The same, current at once: an edit ends exactly once, however many of
  // its ways (keys, focus leaving, scrolling away) arrive.
  const editingNow = useRef<EditingCell | null>(null);
  const editingPos = editing ? (positions.get(editing.key) ?? -1) : -1;
  const editingCol = editing
    ? columns.findIndex((column) => column.id === editing.column)
    : -1;

  // The open editor is in the cell and has the keys: until its code has
  // loaded, the grid keeps them, and keeps naming the active cell.
  const [editorIn, setEditorIn] = useState(false);

  // What the open editor's keys do, as of this render (assigned below,
  // once the functions it calls exist).
  const actions = useRef({
    commit: (_values: CellValues, _move: EditMove) => {},
    cancel: () => {},
    leave: () => {},
  });
  useLayoutEffect(() => {
    actions.current = {
      commit: (values, move) => finishEdit(values, { move, refocus: true }),
      cancel: () => finishEdit(undefined, { refocus: true }),
      leave: () => endFromDraft(false),
    };
  });
  const [session] = useState<EditSession>(() => ({
    seed: { current: undefined },
    opened: { current: undefined },
    handle: { current: null },
    commit: (values, move) => actions.current.commit(values, move),
    cancel: () => actions.current.cancel(),
    leave: () => actions.current.leave(),
    ready: (mounted) => setEditorIn(mounted),
  }));

  const startEdit = (
    pos: number,
    col: number,
    seed?: string,
    how?: 'enter' | 'type' | 'click',
  ) => {
    const key = keyAt(pos);
    const row = rowAt(pos);
    const column = columns[col];
    const editor = editors[col];
    if (!key || !row || !column) return;
    session.seed.current = seed;
    session.handle.current = null;
    // What the author sees in the cell now, which the editor opens on and
    // the write rests on, however the rows change under it meanwhile.
    session.opened.current = isScalarEditor(editor)
      ? valuesOf(
          editor,
          row.body,
          edits?.store.get({
            table: edits.table,
            rowKey: key,
            column: column.id,
          })?.overlay,
        )
      : undefined;
    editingNow.current = { key, column: column.id };
    setEditing(editingNow.current);
    setActive({ key, col });
    revealRow(pos);
    revealColumn(col);
    if (how === 'enter') edits?.hintEnter?.();
  };

  /** A row by key, wherever the order has it now (or has lost it). */
  const rowOf = (key: string): TableRow | undefined => {
    const pos = positions.get(key);
    return pos === undefined
      ? rows.find((row) => row.key === key)
      : rows[order[pos]];
  };

  /**
   * Writes a cell's values, if they change what the author saw (`seen`,
   * from its editor; else what it holds now); the row is held.
   */
  const write = (
    row: TableRow,
    col: number,
    values: CellValues,
    seen?: CellValues,
  ) => {
    const editor = editors[col];
    if (!edits || !isScalarEditor(editor)) return;
    if (edits.commit(row, columns[col], editor, values, seen))
      onEdited?.(row.key);
  };

  /**
   * Ends the open edit: writes `values` when given, moves the active cell
   * when asked, and gives the grid the keyboard back unless focus went
   * somewhere else on the page.
   */
  const finishEdit = (
    values: CellValues | undefined,
    { move, refocus }: { move?: EditMove; refocus: boolean },
  ) => {
    const current = editingNow.current;
    if (!current) return;
    const opened = session.opened.current;
    editingNow.current = null;
    session.handle.current = null;
    session.opened.current = undefined;
    setEditing(null);
    setEditorIn(false);
    const col = columns.findIndex((column) => column.id === current.column);
    const row = rowOf(current.key);
    if (values && row && col >= 0) write(row, col, values, opened);
    if (move && move !== 'none' && col >= 0) {
      const pos = positions.get(current.key);
      if (pos !== undefined) {
        const last = order.length - 1;
        const lastCol = columns.length - 1;
        if (move === 'down') moveTo(Math.min(last, pos + 1), col);
        else if (move === 'up') moveTo(Math.max(0, pos - 1), col);
        else if (move === 'right') moveTo(pos, Math.min(lastCol, col + 1));
        else moveTo(pos, Math.max(0, col - 1));
      }
    }
    if (refocus) focusGrid();
  };

  /**
   * The edit ends some way other than its own keys: what the editor holds
   * is written if it can be, and let go of if not (said at once).
   */
  const endFromDraft = (refocus: boolean) => {
    const current = editingNow.current;
    if (!current) return;
    const read: EditorRead = session.handle.current?.read() ?? {
      type: 'cancel',
    };
    if (read.type === 'invalid') {
      const name =
        columns.find((column) => column.id === current.column)?.label ??
        'The cell';
      announce?.(`${name} not changed: ${read.message}`, true);
    }
    finishEdit(read.type === 'commit' ? read.values : undefined, { refocus });
  };

  // The edited row scrolled out of the drawn rows (or left the list): its
  // draft is written if it can be, and the grid keeps the keyboard.
  useEffect(() => {
    if (!editing) return;
    const { start, stop } = renderedNow.current;
    if (editingCol >= 0 && editingPos >= start && editingPos <= stop) return;
    endFromDraft(true);
  }, [rendered, editingPos, editingCol]);

  /**
   * Enter or F2 on a row's cell: edit it here, or open the row at the
   * field, where the panel edits it and says who does (and, for a cell
   * locked for this row, why — said here too).
   */
  const activate = (pos: number, col: number, how: 'enter' | 'click') => {
    const row = rowAt(pos);
    const column = columns[col];
    if (!row || !column) return;
    if (canEdit(row, col)) {
      startEdit(pos, col, undefined, how);
      return;
    }
    const lock =
      edits && isScalarEditor(editors[col]) ? edits.lockOf(row, column) : null;
    if (lock?.reason) announce?.(lock.reason);
    setActive({ key: row.key, col });
    onOpen(row.key, column.source.type === 'title' ? undefined : column.id);
  };

  /** Delete or Backspace: a scalar cell emptied, with undo; else why not. */
  const clearCell = (pos: number, col: number) => {
    const row = rowAt(pos);
    const column = columns[col];
    const editor = editors[col];
    if (!row || !column || !edits) return;
    if (!isScalarEditor(editor)) {
      announce?.(notClearable(column, editor));
      return;
    }
    const lock = edits.lockOf(row, column);
    if (lock) {
      announce?.(lock.reason || `${column.label} cannot be saved yet.`);
      return;
    }
    const refused = clearRefusal(editor, column.label);
    if (refused) {
      announce?.(refused, true);
      return;
    }
    const now = edits.store.get({
      table: edits.table,
      rowKey: row.key,
      column: column.id,
    });
    if (isBlank(valuesOf(editor, row.body, now?.overlay))) return;
    write(row, col, clearedValues(editor));
  };

  const undoOrRedo = (redo: boolean) => {
    if (!edits) return;
    const done = redo ? edits.redo() : edits.undo();
    if (!done)
      announce?.(
        redo
          ? 'Nothing to redo in this table.'
          : 'Nothing to undo in this table.',
      );
  };

  /* ── The cell's menu ───────────────────────────────────────────── */

  const [menu, setMenu] = useState<{
    key: string;
    col: number;
    at: { left: number; top: number };
  } | null>(null);

  const openMenu = (pos: number, col: number) => {
    const key = keyAt(pos);
    const outer = outerRef.current;
    if (!key || !columns[col]) return;
    setActive({ key, col });
    revealRow(pos);
    revealColumn(col);
    const scrolledLeft = outer?.scrollLeft ?? 0;
    setMenu({
      key,
      col,
      at: {
        left: col === 0 ? 8 : offsets.left[col] - scrolledLeft + 8,
        top:
          HEADER_HEIGHT +
          (pos + 1) * ROW_HEIGHT -
          (outer?.scrollTop ?? scrollTop.current),
      },
    });
  };

  // The grid has the keyboard back when the menu closes — unless the menu
  // opened an edit, whose editor has it (the menu says it closed twice:
  // once as it closes, once after it hands focus back).
  const closeMenu = () => {
    setMenu(null);
    if (!editingNow.current) focusGrid();
  };

  /** What the menu offers on its cell: the keys' actions, in words. */
  const menuItems = (key: string, col: number): CellMenuItem[] => {
    const pos = positions.get(key);
    const row = rowOf(key);
    const column = columns[col];
    const editor = editors[col];
    if (pos === undefined || !row || !column) return [];
    const items: CellMenuItem[] = [];
    const writable = canEdit(row, col) && isScalarEditor(editor);
    const state = edits?.store.get({
      table: edits.table,
      rowKey: key,
      column: column.id,
    });
    // Once the menu has gone: an editor opened while it is open would have
    // its focus taken back by the menu's own.
    if (writable)
      items.push({
        label: 'Edit',
        keys: '↵',
        run: () => window.setTimeout(() => mouse.current.editKey(key, col), 0),
      });
    if (
      writable &&
      isScalarEditor(editor) &&
      !clearRefusal(editor, column.label) &&
      !isBlank(valuesOf(editor, row.body, state?.overlay))
    )
      items.push({
        label: 'Clear',
        keys: 'Del',
        run: () => clearCell(pos, col),
      });
    if (edits && state && state.write !== undefined) {
      if (state.status === 'conflict') {
        items.push(
          { label: 'Use mine', run: () => edits.resolve(state, 'mine') },
          { label: 'Keep theirs', run: () => edits.resolve(state, 'theirs') },
        );
      } else if (state.status === 'error') {
        if (!state.blocked)
          items.push({
            label: 'Retry',
            run: () => edits.resolve(state, 'retry'),
          });
        items.push({
          label: 'Discard',
          run: () => edits.resolve(state, 'discard'),
        });
      }
    }
    items.push({ label: 'Open row', keys: `${MOD}↵`, run: () => onOpen(key) });
    if (linkable[col])
      items.push({
        label: 'Link…',
        keys: '⇧↵',
        run: () => onCellLink(pos, col),
      });
    if (edits?.canUndo())
      items.push({
        label: 'Undo',
        keys: `${MOD}Z`,
        run: () => undoOrRedo(false),
      });
    items.push({
      label: picked.has(key) ? 'Deselect row' : 'Select row',
      keys: '⇧Space',
      run: () => togglePicked(row),
    });
    return items;
  };

  /* ── Keys ──────────────────────────────────────────────────────── */

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    // An edit is open but its editor is still loading: what is typed waits
    // for it (every character, "/" and Space too), Esc lets go of it, and
    // nothing else moves, searches or leaves the grid meanwhile. The
    // browser's own shortcuts (⌘, Ctrl, Alt) are left alone.
    if (editingNow.current) {
      if (event.key === 'Escape') {
        event.preventDefault();
        finishEdit(undefined, { refocus: true });
      } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (event.key.length === 1)
          session.seed.current = `${session.seed.current ?? ''}${event.key}`;
      }
      return;
    }
    const last = order.length - 1;
    const lastCol = columns.length - 1;
    const jump = event.ctrlKey || event.metaKey;
    let pos = activeRow;
    let col = activeCol;
    switch (event.key) {
      case 'ArrowDown':
        pos = Math.min(last, pos + 1);
        break;
      case 'ArrowUp':
        pos = Math.max(HEADER, pos - 1);
        break;
      case 'PageDown':
        pos = Math.min(last, pos + rowsInView);
        break;
      case 'PageUp':
        pos = pos === HEADER ? HEADER : Math.max(0, pos - rowsInView);
        break;
      case 'Home':
        if (jump) pos = last >= 0 ? 0 : HEADER;
        else col = 0;
        break;
      case 'End':
        if (jump) pos = last;
        else col = lastCol;
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        col = Math.min(lastCol, col + 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const key = keyAt(pos);
        if (pos === HEADER) onSort(columns[col].id);
        else if (jump) {
          if (key) onOpen(key);
        } else if (event.shiftKey) {
          if (linkable[col]) onCellLink(pos, col);
          else if (key) onOpen(key);
        } else activate(pos, col, 'enter');
        return;
      }
      case 'F2':
        event.preventDefault();
        if (pos !== HEADER) activate(pos, col, 'enter');
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        if (pos !== HEADER) clearCell(pos, col);
        return;
      case 'ContextMenu':
        event.preventDefault();
        if (pos !== HEADER) openMenu(pos, col);
        return;
      case 'F10':
        if (!event.shiftKey) return;
        event.preventDefault();
        if (pos !== HEADER) openMenu(pos, col);
        return;
      case ' ': {
        if (!event.shiftKey) return;
        event.preventDefault();
        const row = rowAt(pos);
        if (pos !== HEADER && row) togglePicked(row);
        return;
      }
      case 'Escape':
        if (picked.size) {
          event.preventDefault();
          setPicked(new Set());
          announce?.('Selection cleared.');
        } else if (selectedKey && onClose) {
          event.preventDefault();
          onClose();
        }
        return;
      default: {
        const letter = event.key.toLowerCase();
        if (jump && !event.altKey && letter === 'z') {
          event.preventDefault();
          undoOrRedo(event.shiftKey);
          return;
        }
        if (event.ctrlKey && !event.metaKey && letter === 'y') {
          event.preventDefault();
          undoOrRedo(true);
          return;
        }
        if (pos === HEADER || !typesACharacter(event)) return;
        // A character typed on a cell that edits here starts its edit
        // with that key; anywhere else it does nothing.
        const row = rowAt(pos);
        if (row && canEdit(row, col)) {
          event.preventDefault();
          startEdit(pos, col, event.key, 'type');
        }
        return;
      }
    }
    event.preventDefault();
    moveTo(pos, col);
  };

  const onHeader = useCallback(
    (col: number) => {
      setActive({ key: null, col });
      outerRef.current?.focus({ preventScroll: true });
      onSort(columns[col].id);
    },
    [columns, onSort],
  );

  /* ── The mouse (through the rows, so kept stable) ──────────────── */

  const mouse = useRef({
    click: (_pos: number, _col: number) => {},
    doubleClick: (_pos: number, _col: number) => {},
    menu: (_pos: number, _col: number, _event: MouseEvent) => {},
    editKey: (_key: string, _col: number) => {},
  });
  /** The cell at `pos`, `col` is the one being edited. */
  const isEditing = (pos: number, col: number) => {
    const now = editingNow.current;
    return !!now && now.key === keyAt(pos) && now.column === columns[col]?.id;
  };
  useLayoutEffect(() => {
    mouse.current = {
      click: (pos, col) => {
        const row = rowAt(pos);
        const column = columns[col];
        if (!row || !column) return;
        // A click inside the cell's own editor is the editor's.
        if (isEditing(pos, col)) return;
        // The title opens the row, as it always has.
        if (column.source.type === 'title') {
          setActive({ key: row.key, col });
          onOpen(row.key);
          return;
        }
        const again =
          activeNow.current.key === row.key && activeNow.current.col === col;
        setActive({ key: row.key, col });
        if (again && canEdit(row, col)) startEdit(pos, col, undefined, 'click');
      },
      doubleClick: (pos, col) => {
        const row = rowAt(pos);
        const column = columns[col];
        if (!row || !column || column.source.type === 'title') return;
        if (isEditing(pos, col)) return;
        activate(pos, col, 'click');
      },
      menu: (pos, col, event) => {
        // Inside the cell's own editor, the browser's menu: paste, and
        // the spelling of a name.
        if (isEditing(pos, col)) return;
        event.preventDefault();
        openMenu(pos, col);
      },
      editKey: (key, col) => {
        const pos = positions.get(key);
        const row = pos === undefined ? undefined : rowAt(pos);
        if (pos === undefined || !row || editingNow.current) return;
        if (canEdit(row, col)) startEdit(pos, col);
      },
    };
  });

  const onCellClick = useCallback(
    (pos: number, col: number, event: MouseEvent) => {
      if (fromCell(event)) mouse.current.click(pos, col);
    },
    [],
  );
  const onCellDoubleClick = useCallback(
    (pos: number, col: number, event: MouseEvent) => {
      if (fromCell(event)) mouse.current.doubleClick(pos, col);
    },
    [],
  );
  const onCellMenu = useCallback(
    (pos: number, col: number, event: MouseEvent) => {
      if (fromCell(event)) mouse.current.menu(pos, col, event);
    },
    [],
  );

  const onCellLink = useCallback(
    (pos: number, col: number) => {
      const key = keyAt(pos);
      const column = columns[col];
      if (!key || !column || !onLink) return;
      setActive({ key, col });
      onLink(key, column.id);
    },
    [keyAt, columns, onLink],
  );

  const onScroll = useCallback(({ scrollOffset }: ListOnScrollProps) => {
    scrollTop.current = scrollOffset;
  }, []);

  const onItemsRendered = useCallback(
    ({ overscanStartIndex, overscanStopIndex }: ListOnItemsRenderedProps) => {
      renderedNow.current = {
        start: overscanStartIndex,
        stop: overscanStopIndex,
      };
      setRendered((current) =>
        current.start === overscanStartIndex &&
        current.stop === overscanStopIndex
          ? current
          : { start: overscanStartIndex, stop: overscanStopIndex },
      );
    },
    [],
  );

  // The editors load ahead of the first edit, once the grid has had focus
  // and the browser has a moment.
  const prefetched = useRef(false);
  const onFocus = () => {
    if (prefetched.current || !edits) return;
    prefetched.current = true;
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback
        : (run: () => void) => window.setTimeout(run, 200);
    idle(() => void loadEditors().catch(() => undefined));
  };

  // The active cell is named only while its row is in the DOM, and while
  // no editor is in its cell (focus is then in the editor; until its code
  // has loaded, the grid still has it).
  const activeInDom =
    activeRow === HEADER ||
    (activeRow >= rendered.start && activeRow <= rendered.stop);

  const itemData = useMemo<RowData>(
    () => ({
      def,
      rows,
      order,
      columns,
      editors,
      selectedKey,
      picked,
      activeRow,
      activeCol,
      editingPos,
      editingCol,
      idBase,
      stale,
      mode,
      edits,
      graph,
      session,
      linkable,
      canEdit,
      onCellClick,
      onCellDoubleClick,
      onCellMenu,
      onCellLink,
    }),
    [
      def,
      rows,
      order,
      columns,
      editors,
      selectedKey,
      picked,
      activeRow,
      activeCol,
      editingPos,
      editingCol,
      idBase,
      stale,
      mode,
      edits,
      graph,
      session,
      linkable,
      canEdit,
      onCellClick,
      onCellDoubleClick,
      onCellMenu,
      onCellLink,
    ],
  );

  const frame: GridFrame = {
    outer: {
      role: 'grid',
      'aria-label': label,
      'aria-rowcount': order.length + 1,
      'aria-colcount': columns.length,
      'aria-multiselectable': true,
      'aria-activedescendant':
        !(editing && editorIn) && activeInDom && columns.length
          ? cellId(idBase, activeRow, activeCol)
          : undefined,
      tabIndex: 0,
      onKeyDown,
      onFocus,
    },
    header: (
      <HeaderRow
        columns={columns}
        editors={editors}
        linked={linked}
        sort={sort}
        idBase={idBase}
        activeCol={activeRow === HEADER ? activeCol : -1}
        onHeader={onHeader}
      />
    ),
    totalWidth: offsets.total,
  };

  const menuRow = menu ? rowOf(menu.key) : undefined;

  return (
    <div ref={boxRef} className="relative min-h-0 min-w-0 flex-1">
      {viewHeight > 0 && viewWidth > 0 && (
        <GridFrameContext.Provider value={frame}>
          <FixedSizeList<RowData>
            ref={listRef}
            outerRef={outerRef}
            height={viewHeight}
            width={viewWidth}
            itemCount={order.length}
            itemSize={ROW_HEIGHT}
            overscanCount={OVERSCAN}
            itemData={itemData}
            itemKey={itemKey}
            outerElementType={GridOuter}
            innerElementType={GridInner}
            onScroll={onScroll}
            onItemsRendered={onItemsRendered}
            className="group/grid outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20"
          >
            {GridRow}
          </FixedSizeList>
        </GridFrameContext.Provider>
      )}
      {/* Beside the grid, not in it: a grid holds rows and cells only. */}
      {menu && menuRow && columns[menu.col] && (
        <CellMenu
          label={`${columns[menu.col].label}, ${menuRow.label}`}
          at={menu.at}
          items={menuItems(menu.key, menu.col)}
          onClose={closeMenu}
        />
      )}
      {/* Under the header, over the empty grid — but outside it: a grid
          holds rows and cells only, and this can hold a button. */}
      {order.length === 0 && empty && (
        <div
          className="absolute inset-x-0 px-6 py-10 text-sm text-white/55"
          style={{ top: HEADER_HEIGHT }}
        >
          {empty}
        </div>
      )}
    </div>
  );
};
