import { Loader2, Sparkles } from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { isConsoleAdmin } from '../consoleRoles';
import {
  TryAgain,
  WorkingGraphNotice,
} from '../content/graph/WorkingGraphNotice';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { DecisionsBanner } from './DecisionsBanner';
import { TableSkeleton } from './TableSkeleton';
import { ValidationNotice } from './ValidationNotice';
import type { BulkItem } from './bulk/bulkAccept';
import { useTableModel } from './data/useTableModel';
import { useTableSuggestions } from './data/useTableSuggestions';
import { useCellWrites } from './edit/cellWriteContext';
import { useGridEditing } from './edit/useGridEditing';
import { TableGrid } from './grid/TableGrid';
import { rowState } from './grid/rowHistory';
import { NEW_PARAM } from './grid/tableQuery';
import { tableDef } from './model/categories';
import type { TableModel } from './model/types';
import type { TableId } from './tableIds';
import { tableHref } from './tablePaths';

/**
 * One table of the Table section: the grid on the left, and the open row's
 * panel beside it, which edits the row (Table design §6). A row is written
 * in its cells (the scalars, in this release: `useGridEditing`, over the
 * page's write queue), from its panel (Details, its suggestions, Link…
 * and Confirm), from "New …", and by the bulk accept. In repo mode nothing
 * is written at all.
 *
 *   TableView (flex row)
 *   ├ column: toolbar, notice, coverage strip, grid   (TableGrid)
 *   ├ TableDetailPanel, when the URL names a row      (lazy, chunk 2)
 *   └ NewItemPanel, for the toolbar's New (`?new=`)   (lazy, chunk 2)
 *
 * The rows come from the working graph (`useTableModel`): a skeleton until
 * the first graph is built, then the last build's rows while a newer one is
 * on its way ("Refreshing…" in the toolbar). Above them, the notice the mind
 * map and Integrity show too (`WorkingGraphNotice`): why the rows are the
 * repo's — no `/export`, so the Table is read-only; or the working copy
 * failed, with a way to try again — or that a later refresh of it failed,
 * so the rows are the last good ones. Under it, what would block a publish
 * of the table's kind.
 *
 * Suggestions come with the rows (`useTableSuggestions`): each row's count,
 * the ghosts in its empty fields, the bulk accepts waiting for review —
 * with a line while they load, and a notice (and Try again) if they fail,
 * rather than counts that quietly read nothing. An admin also gets the bulk
 * accept (lazy, like the panel; its names open their rows) and the banner
 * that says how many decisions are not in the committed decisions.json yet.
 *
 * A row saved in its panel, linked from, or edited in a cell is kept
 * listed under the query it was edited in, even once it no longer matches
 * it (a City filled under "Missing City"), so it does not vanish from
 * under the person editing it; the grid also holds it where it was in the
 * list. The grid says so on the row, and lets it go when the query changes
 * or another table opens.
 *
 * Cell writes go through the page's write queue (`edit/CellWriteProvider`,
 * mounted by TablePage above this): each new build of the rows lets the
 * cells whose writes it now holds show the rows again (`settle`).
 */

// The panel is the Table's second chunk: it loads with the first row opened,
// not with the grid (eagerBoundary.test.ts keeps it out of eager code).
const TableDetailPanel = lazy(() =>
  import('./panel/TableDetailPanel').then(({ TableDetailPanel }) => ({
    default: TableDetailPanel,
  })),
);

// "New …" opens the same place, on a new item: chunk 2 as well.
const NewItemPanel = lazy(() =>
  import('./panel/NewItemPanel').then(({ NewItemPanel }) => ({
    default: NewItemPanel,
  })),
);

// The bulk accept loads when it is opened: an admin's, and not every visit.
const BulkAcceptDialog = lazy(() =>
  import('./bulk/BulkAcceptDialog').then(({ BulkAcceptDialog }) => ({
    default: BulkAcceptDialog,
  })),
);

/** A row as the bulk accept needs it, by the target slug (the row's key). */
const bulkItemsOf =
  (model: TableModel) =>
  (slug: string): BulkItem | undefined => {
    const index = model.byKey.get(slug);
    if (index === undefined) return undefined;
    const row = model.rows[index];
    return {
      itemId: row.itemId,
      label: row.label,
      body: row.body,
      pending: row.editState !== null,
      sentBack: row.editState === 'rejected',
    };
  };

/**
 * An item's body as the rows have it, by `itemKeyOf`: the table's own
 * kind, found by its row. Nothing for any other item.
 */
const bodyInModel =
  (model: TableModel) =>
  (item: string): Readonly<Record<string, unknown>> | undefined => {
    const kind = model.def.contentKind;
    if (!kind || !item.startsWith(`${kind}:`)) return undefined;
    const index = model.byKey.get(item.slice(kind.length + 1));
    return index === undefined ? undefined : model.rows[index].body;
  };

/** No rows kept: one empty set, so letting go of none changes nothing. */
const NONE: ReadonlySet<string> = new Set();

/** Where the panel will be, while its code loads: beside the grid from xl up. */
const PanelLoading = () => (
  <div
    aria-hidden
    className="hidden h-full w-[440px] shrink-0 border-l border-white/[0.08] bg-[#101012] xl:block"
  />
);

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const TableView = ({ table }: { table: TableId }) => {
  const { row } = useParams();
  const [searchParams] = useSearchParams();
  // The toolbar's New: the panel on a new item, named from the search.
  const making = row ? null : searchParams.get(NEW_PARAM);
  const { role } = useAuthContext();
  const admin = isConsoleAdmin(role);
  const suggested = useTableSuggestions(tableDef(table));
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkButton = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  // The rows edited this session — saved in the panel, linked from it — are
  // the grid's `keep`: listed under the query they were edited in until it
  // changes (the grid's `onQueryChange`), or the table does.
  const [edited, setEdited] = useState<{
    table: TableId;
    keys: ReadonlySet<string>;
  }>({ table, keys: NONE });
  if (edited.table !== table) setEdited({ table, keys: NONE });
  const keep = edited.table === table ? edited.keys : NONE;
  const markEdited = useCallback(
    (key: string) =>
      setEdited((prev) =>
        prev.keys.has(key)
          ? prev
          : { table: prev.table, keys: new Set(prev.keys).add(key) },
      ),
    [],
  );
  const letGo = useCallback(
    () =>
      setEdited((prev) =>
        prev.keys.size === 0 ? prev : { table: prev.table, keys: NONE },
      ),
    [],
  );
  const {
    model,
    graph,
    narrow,
    narrowChoices,
    mode,
    status,
    pins,
    isLoading,
    isRefreshing,
    error,
  } = useTableModel(table, suggested.suggestions);
  // The cells' side of the write queue, for this table (none while the
  // model loads, and none outside the page's provider).
  const edits = useGridEditing({
    def: model?.def,
    mode,
    graph,
    onEdited: markEdited,
  });
  const itemOf = useCallback(
    (slug: string) => (model ? bulkItemsOf(model)(slug) : undefined),
    [model],
  );
  // Each new build of the rows: the cells whose writes it now holds show
  // the rows again, rather than what they wrote (`edit/cellEditStore.ts`).
  const writes = useCellWrites();
  useEffect(() => {
    if (writes && model) writes.store.settle(bodyInModel(model));
  }, [writes, model]);
  // A name in the bulk accept: its row, the table's search kept; opened
  // from the list, it closes back to it (grid/rowHistory.ts).
  const openRow = useCallback(
    (slug: string) => {
      setBulkOpen(false);
      navigate(`${tableHref(table, slug)}${search}`, {
        replace: !!row,
        state: row ? state : rowState(`${pathname}${search}`),
      });
    },
    [navigate, table, search, row, state, pathname],
  );

  if (!model || !graph) {
    // An export that failed while the repo graph is still on its way is for
    // the notice over the rows, once there are rows.
    if (isLoading || !error) return <TableSkeleton table={table} />;
    return (
      <div className="px-6 py-6">
        <ConsoleCallout tone="danger" title="The Atlas could not be loaded">
          {message(error)}. <TryAgain />
        </ConsoleCallout>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <TableGrid
        // A table of its own: its scroll, active cell and columns start afresh.
        key={table}
        model={model}
        narrowChoices={narrowChoices}
        narrow={narrow}
        mode={mode}
        graphStatus={status}
        refreshing={isRefreshing}
        keep={keep}
        onQueryChange={letGo}
        edits={edits}
        graph={graph}
        notice={
          <>
            <WorkingGraphNotice status={status} error={error} subject="table" />
            <ValidationNotice def={model.def} />
            {suggested.served && suggested.error ? (
              <ConsoleCallout
                tone="warning"
                title="Suggestions could not be loaded"
              >
                {message(suggested.error)}. Each row’s count, the suggested
                values in empty cells and the bulk accept are missing until they
                load.{' '}
                <button
                  type="button"
                  onClick={suggested.retry}
                  className="underline underline-offset-2 hover:text-white"
                >
                  Try again
                </button>
              </ConsoleCallout>
            ) : (
              suggested.served &&
              suggested.loading && (
                <p
                  role="status"
                  className="flex items-center gap-1.5 text-xs text-white/55"
                >
                  <Loader2 aria-hidden className="size-3 animate-spin" />
                  Loading suggestions…
                </p>
              )
            )}
            {admin && (
              <DecisionsBanner
                counts={suggested.decisions}
                replay={suggested.replay}
              />
            )}
          </>
        }
        actions={
          admin &&
          mode === 'working' &&
          suggested.served &&
          (suggested.rows?.length ?? 0) > 0 ? (
            <button
              ref={bulkButton}
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-white/[0.12] px-3 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              <Sparkles aria-hidden className="size-3.5 text-sky-300" />
              Accept in bulk…
            </button>
          ) : null
        }
      />
      {bulkOpen && (
        <Suspense fallback={null}>
          <BulkAcceptDialog
            def={model.def}
            itemOf={itemOf}
            onClose={() => setBulkOpen(false)}
            onOpenRow={openRow}
            returnFocus={() => bulkButton.current?.focus()}
          />
        </Suspense>
      )}
      {making !== null && mode === 'working' && (
        <Suspense fallback={<PanelLoading />}>
          <NewItemPanel
            // A new name asked for is a new item.
            key={`${table}:${making}`}
            model={model}
            name={making}
            mode={mode}
          />
        </Suspense>
      )}
      {row && (
        <Suspense fallback={<PanelLoading />}>
          <TableDetailPanel
            model={model}
            rowKey={row}
            graph={graph}
            mode={mode}
            narrow={narrow}
            pins={pins}
            onEdited={markEdited}
          />
        </Suspense>
      )}
    </div>
  );
};
