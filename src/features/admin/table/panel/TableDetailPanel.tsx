import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Network, X } from 'lucide-react';
import {
  lazy,
  type ReactNode,
  type RefObject,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import type { Graph } from '@/content/graph/deriveGraph';
import { toEntityId } from '@/content/graph/ids';
import { normalizeArtistName } from '@/content/graph/slugs';
import type { EntityId } from '@/content/graph/types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { refreshAfterDecisions } from '@/hooks/data/admin/useSuggestions';
import { ProgressionDraftNote } from '../../content/chords/ProgressionDraftNote';
import { appPageFor, kindLabel } from '../../content/graph/graphVocabulary';
import type { WorkingGraphMode } from '../../content/graph/useWorkingGraph';
import {
  type ItemSession,
  useItemSession,
} from '../../content/itemEditor/useItemSession';
import { toConsolePath } from '../../content/mirror/mirrorPaths';
import { kindLabel as contentKindLabel } from '../../content/publishing/kindLabels';
import { recordEditorFor } from '../../content/recordEditors';
import {
  EditReviewBanner,
  EditStateBadge,
} from '../../content/review/EditReview';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { consoleTabClass } from '../../ui/styles';
import { GUESSED_FIELDS, logWritten } from '../data/logWritten';
import { usePanelDraft, useItemLock } from '../edit/cellWriteContext';
import { readOnlyReason, SCHEMA_STEP } from '../edit/editability';
import { itemKeyOf } from '../edit/itemLock';
import { useWaitingFor } from '../edit/useWaitingFor';
import { FULL_EDITOR_KINDS, PANEL_EDIT_KINDS } from '../fullEditor';
import { useCloseRow } from '../grid/rowHistory';
import { LINK_PARAM, parseTableQuery, searchOf } from '../grid/tableQuery';
import {
  isOneWordName,
  type LinkSpec,
  linkFor,
  placeAndGenreNames,
  slugIn,
} from '../link/links';
import {
  labelOf,
  walkContext,
  type WalkContext,
  yearSpan,
} from '../model/aggregate';
import { creditsIn, valuesAt } from '../model/buildTableModel';
import { STATUS_FILTERS } from '../model/categories';
import { queryRows } from '../model/query';
import type {
  ChipStyle,
  ColumnDef,
  RowStatus,
  TableDef,
  TableModel,
  TableRow,
} from '../model/types';
import { tableHref } from '../tablePaths';
import { EventDetails, type EventGuesses, type Guess } from './EventPanel';
import { Capped, ColumnList, EdgeGroups, NodeChip } from './PanelConnections';
import { PanelFrame } from './PanelFrame';
import { PanelSaveBar } from './PanelSaveBar';
import { PanelSection } from './PanelSection';
import { PinMovesNote, usePinMoves } from './PinMoves';
import { SongDetails } from './SongPanel';
import { SuggestionsSection } from './SuggestionsSection';
import { type DraftEdges, draftEdgesOf } from './draftEdges';
import { findAnchor, findField, showField } from './findField';
import {
  columnInFull,
  edgeGroupsOf,
  type PanelColumn,
  type PanelEntry,
  startsFor,
} from './fullConnections';

// Link… and Confirm load when one is opened: most visits to a row never do.
const ConfirmConnectionDialog = lazy(() =>
  import('../link/ConfirmConnectionDialog').then(
    ({ ConfirmConnectionDialog }) => ({ default: ConfirmConnectionDialog }),
  ),
);

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  The row panel: one row of the Table, read in full
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Opens beside the grid when a row is (`/console/table/:table/:row`): 440 px
 * on a wide screen, a sheet over the grid below xl. It edits the row's item
 * (design §3.3), and shows everything the grid has to cut short:
 *
 *  - the header: the row's name and states, the row in Cortex's graph, its
 *    page in the mirrored app, and the full editor for a kind the panel
 *    edits only in part (a song's chart is its page's);
 *  - the review banner, when a proposal is pending or was sent back: the
 *    diff and, for an admin, Approve and Reject;
 *  - Details: the item's own fields, in its kind's editor — a record's
 *    record editor, a song's title, year, popularity and connections, an
 *    event's card and who and where it is about — or, for a row nothing
 *    here edits (a code vocabulary, a missing node), what the row states,
 *    read-only. Every column the row states itself has its field there;
 *    TableDetailPanel.test.tsx checks each table's anchors;
 *  - Suggestions: what MusicBrainz, Wikidata and the app offer for the item,
 *    to accept, replace or reject (SuggestionsSection.tsx);
 *  - Connections: the table's other columns in full, every node under the
 *    part that reached it (fullConnections.ts walks as the grid's cells do);
 *  - All connections: every edge of the row by label, with the field that
 *    states each one; what code states names its file. While Details has
 *    unsaved changes, the draft's own edges are laid over them, each one the
 *    save would add, remove or make surer marked so (`draftEdges.ts`);
 *  - the sticky footer: Save (an admin, with the status) or Submit for
 *    review (an editor, with a note), Discard, and what went wrong.
 *
 * The editing session is the item's (`useItemSession`, which never loads the
 * kind specs): an editor's save is a proposal, an admin's is the item. It is
 * read-only in repo mode (the rows are the repo's), for a kind the API does
 * not serve, and while someone else's proposal is on the item — waiting or
 * sent back — as the server's own rule has it: an admin's save would slide
 * under it, an editor's would replace another person's work. A save reads
 * the item again first and never writes back an old copy of it (the
 * session merges, or asks); it refreshes the working graph, so the grid and
 * Cortex's graph follow, and logs what it stated that a suggestion offered
 * (`logWritten.ts`). Leaving the row with unsaved changes asks first (the
 * console's one guard). Setting an artist's City says which song pins move.
 * Whether it can be saved is `edit/editability.ts`'s rule, which the grid's
 * cells share (`edit/editorFor.ts` `lockOf`). A save, a Link… or a Confirm
 * tells the grid (`onEdited`), which keeps the row listed under its query.
 *
 * The grid's cells write the same item (`edit/writeQueue.ts`). The two
 * never race: a save holds the item's lock from its re-read to its write,
 * as each cell write does, so one waits for the other and builds on what
 * it wrote. And they never split one change in two: while Details has
 * unsaved changes, a cell's edit to the item goes into them, and Save
 * sends both; while it has none, the cell writes at once and Details
 * re-seeds from it (`edit/cellWriteContext.ts` `usePanelDraft`).
 *
 * `?field=` names a column (or a body path): the panel scrolls to the field
 * that edits it, and puts the cursor there.
 *
 * The same panel opens beside Cortex's graph when a dot is clicked
 * (`context="graph"`, at `/console/cortex/:table/:row`;
 * content/graph/map/GraphRowDrawer.tsx). There it is not a row of a grid:
 * its header offers the item's local graph, its page, its row in the Table
 * and the full editor, and there is no next row with suggestions to step
 * to, since the graph has no order of rows. Closing goes back to the graph
 * as it was, and the panel's width can be dragged (PanelFrame).
 *
 * Beside Tesseract, the map of progression openings (`context="tesseract"`,
 * at `/console/cortex/tesseract/progressions/:row`), it is the same, but
 * the first link is Show in Cortex: the progression's local graph in
 * Cortex, with its songs, vibes and genres, which the map does not draw.
 *
 * Lazy (the Table's second chunk): it loads with the first row opened, never
 * with the console's eager routes (eagerBoundary.test.ts).
 */

/** Where the panel is open: beside the Table's grid, the graph, or Tesseract. */
export type DetailPanelContext = 'table' | 'graph' | 'tesseract';

export interface TableDetailPanelProps {
  /** The table showing, built from `graph`. */
  model: TableModel;
  /** The row open: the URL's `:row`. */
  rowKey: string;
  /** The graph the model was built from; the panel walks it in full. */
  graph: Graph;
  /** The working copy, or the repo's snapshot (useWorkingGraph). */
  mode: WorkingGraphMode;
  /** The Key table's narrowing, as the grid's cells were built with it. */
  narrow?: EntityId;
  /**
   * A song pin's key → its item's id (`useWorkingGraph().pins`), so a pin
   * named as a source opens its own item; without it, the pins' list.
   */
  pins?: ReadonlyMap<string, string>;
  /**
   * A column to scroll to and mark, by id. Read from the URL's `?field=`
   * when absent.
   */
  focusField?: string;
  /**
   * Close the panel; by default the table's own URL (or, beside the graph,
   * the graph's), its search kept.
   */
  onClose?(): void;
  /**
   * The row was saved in Details, or linked from (Link…, Confirm): the grid
   * keeps it listed under its query until the query changes (`keep`).
   */
  onEdited?(rowKey: string): void;
  /**
   * Where the panel is open: beside the Table's grid (the default), or
   * beside Cortex's graph, where the header offers Local graph · Open page
   * · Open in Table · Full editor and there is no next row to step to, or
   * beside Tesseract, where Show in Cortex takes Local graph's place.
   */
  context?: DetailPanelContext;
  /**
   * Beside the graph: show the row's local graph (`?focus=` its node),
   * keeping the panel open. Without it, Local graph is a link to it.
   */
  onLocalGraph?(node: EntityId): void;
  /** The panel's width beside the grid or graph (PanelFrame). */
  width?: number;
  /** Given, the panel's left edge resizes it (PanelFrame). */
  onWidthChange?(width: number): void;
}

export const TableDetailPanel = ({
  model,
  rowKey,
  graph,
  mode,
  narrow,
  pins,
  focusField,
  onClose,
  onEdited,
  context = 'table',
  onLocalGraph,
  width,
  onWidthChange,
}: TableDetailPanelProps) => {
  const { def } = model;
  const index = model.byKey.get(rowKey);
  const row = index === undefined ? null : model.rows[index];
  const closeRow = useCloseRow();
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  const params = new URLSearchParams(search);
  const field = focusField ?? params.get('field');
  const linkColumn = params.get(LINK_PARAM);
  const inTable = context === 'table';

  // Closing keeps the table as it was left — search, sort, filters — and
  // drops only what pointed into the row; it goes back to the list the row
  // was opened from, so Back does not reopen it (grid/rowHistory.ts). Beside
  // the graph it goes back to the graph the same way.
  const close = useCallback(() => {
    if (onClose) return onClose();
    const next = new URLSearchParams(search);
    next.delete('field');
    next.delete(LINK_PARAM);
    closeRow(
      `${inTable ? tableHref(def.id) : AdminRoutes.cortex()}${searchOf(next)}`,
    );
  }, [onClose, search, closeRow, def.id, inTable]);

  // The next row down the grid, as its search, filters and sort have it,
  // with suggestions to look at: the review's next step. The graph has no
  // order of rows, so beside it there is none.
  const nextRow = useMemo(() => {
    if (!inTable) return null;
    const order = queryRows(
      model,
      parseTableQuery(def, new URLSearchParams(search)),
      { open: rowKey },
    );
    const at = order.findIndex((i) => model.rows[i].key === rowKey);
    for (let k = at + 1; k < order.length; k += 1) {
      const candidate = model.rows[order[k]];
      if (candidate.suggestions > 0) return candidate;
    }
    return null;
  }, [inTable, model, def, search, rowKey]);
  const goNext = useCallback(() => {
    if (!nextRow) return;
    const next = new URLSearchParams(search);
    next.delete('field');
    next.delete(LINK_PARAM);
    // In place of this row: Back and close still lead to the list.
    navigate(`${tableHref(def.id, nextRow.key)}${searchOf(next)}`, {
      replace: true,
      state,
    });
  }, [nextRow, search, navigate, def.id, state]);

  // The grid's Link… opens the row with `?link=`; once the panel has it,
  // the URL lets go (the row's entry stays what it was), so a reload or Back
  // does not open the dialog again. A link that is the row's own field after
  // all (a song's Label on no record) becomes `?field=` instead.
  const takeLink = useCallback(
    (asField?: string) => {
      const next = new URLSearchParams(search);
      next.delete(LINK_PARAM);
      if (asField) next.set('field', asField);
      navigate(`${pathname}${searchOf(next)}`, { replace: true, state });
    },
    [navigate, pathname, search, state],
  );

  return (
    <PanelFrame onClose={close} width={width} onWidthChange={onWidthChange}>
      {(heading, closeButton) =>
        row ? (
          <RowPanel
            // A row of its own: its editing session starts afresh.
            key={`${def.id}:${row.key}`}
            def={def}
            row={row}
            graph={graph}
            mode={mode}
            narrow={narrow}
            pins={pins}
            field={field}
            link={linkColumn}
            onLinkTaken={takeLink}
            next={nextRow ? { label: nextRow.label, go: goNext } : null}
            onEdited={onEdited && (() => onEdited(row.key))}
            context={context}
            onLocalGraph={onLocalGraph}
            heading={heading}
            close={closeButton}
          />
        ) : (
          <NotFound
            def={def}
            rowKey={rowKey}
            heading={heading}
            close={closeButton}
          />
        )
      }
    </PanelFrame>
  );
};

/* ── Header ──────────────────────────────────────────────────────────── */

const STATUS_LABEL = new Map<string, string>(
  STATUS_FILTERS.map((s) => [s.value, s.label]),
);

const STATUS_TONE: Record<RowStatus, ConsoleBadgeTone> = {
  published: 'success',
  draft: 'warning',
  pending: 'info',
  code: 'muted',
  missing: 'danger',
  archived: 'muted',
};

const Header = ({
  def,
  row,
  mode,
  inGraph,
  context,
  onLocalGraph,
  heading,
  close,
}: {
  def: TableDef;
  row: TableRow;
  mode: WorkingGraphMode;
  /** The graph draws the row: it is neither archived nor the API's alone. */
  inGraph: boolean;
  /** Beside the grid, or beside the graph (`TableDetailPanelProps.context`). */
  context: DetailPanelContext;
  /** Beside the graph: show the row's local graph in place. */
  onLocalGraph?(node: EntityId): void;
  heading: (text: string) => ReactNode;
  close: (() => void) | null;
}) => {
  const page =
    inGraph && row.status !== 'missing'
      ? appPageFor({ id: row.node, kind: row.kind, label: row.label })
      : null;
  const fullEditor =
    def.contentKind && row.itemId && FULL_EDITOR_KINDS.has(def.contentKind)
      ? AdminRoutes.contentItem({ kind: def.contentKind, id: row.itemId })
      : null;
  // A new item waiting for review is pending twice over; say it once.
  const reviewState =
    row.status === 'pending' && row.editState === 'pending'
      ? null
      : row.editState;

  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-white/[0.08] px-5 pb-4 pt-5">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <ConsoleBadge>{kindLabel(row.kind)}</ConsoleBadge>
          <ConsoleBadge tone={STATUS_TONE[row.status]}>
            {STATUS_LABEL.get(row.status) ?? row.status}
          </ConsoleBadge>
          <EditStateBadge state={reviewState} />
          {row.unverified && (
            <ConsoleBadge
              tone="warning"
              title="The record is marked unconfirmed"
            >
              Unconfirmed
            </ConsoleBadge>
          )}
          {row.suggestions > 0 && (
            <ConsoleBadge tone="info">
              {row.suggestions}{' '}
              {row.suggestions === 1 ? 'suggestion' : 'suggestions'}
            </ConsoleBadge>
          )}
        </div>
        {close && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close"
            className="-mr-2 -mt-1 size-8 shrink-0 text-white/60 hover:text-white"
            onClick={close}
          >
            <X />
          </Button>
        )}
      </div>

      <div className={cn('min-w-0', !close && 'pr-8')}>
        {heading(row.label)}
        {row.sublabel && (
          <p className="mt-1 text-sm text-white/50">{row.sublabel}</p>
        )}
      </div>

      <nav aria-label="Open elsewhere" className="flex flex-wrap gap-1.5">
        {inGraph &&
          (context === 'table' || context === 'tesseract' ? (
            <Link
              to={AdminRoutes.cortex(undefined, { focus: row.node })}
              className={consoleTabClass(false, 'sm')}
            >
              <Network aria-hidden className="size-3.5" />
              {context === 'table' ? 'Open in Cortex' : 'Show in Cortex'}
            </Link>
          ) : onLocalGraph ? (
            // Beside the graph: the graph re-centres on the row, and the
            // panel stays open (only the search changes).
            <button
              type="button"
              onClick={() => onLocalGraph(row.node)}
              className={consoleTabClass(false, 'sm')}
            >
              <Network aria-hidden className="size-3.5" />
              Local graph
            </button>
          ) : (
            <Link
              to={AdminRoutes.cortex(undefined, { focus: row.node })}
              className={consoleTabClass(false, 'sm')}
            >
              <Network aria-hidden className="size-3.5" />
              Local graph
            </Link>
          ))}
        {page && (
          <Link to={page} className={consoleTabClass(false, 'sm')}>
            Open page
          </Link>
        )}
        {context !== 'table' && (
          <Link
            to={tableHref(def.id, row.key)}
            className={consoleTabClass(false, 'sm')}
          >
            Open in Table
          </Link>
        )}
        {fullEditor && (
          <Link
            to={fullEditor}
            className={consoleTabClass(false, 'sm')}
            title="Edit the whole item in the content area"
          >
            Full editor
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </nav>

      {mode === 'repo' && (
        <p className="text-xs text-white/45">
          Repo snapshot: the repo’s copy of this row, not the working copy.
        </p>
      )}
    </header>
  );
};

/* ── The row ─────────────────────────────────────────────────────────── */

/**
 * A column the row itself states — its own field, its entry in code, its
 * page's value — as against one other rows state for it or a rollup counts.
 */
const isOwn = (column: ColumnDef): boolean =>
  column.source.type === 'title' ||
  column.source.type === 'field' ||
  column.edit.by === 'row' ||
  column.edit.by === 'code' ||
  column.edit.by === 'page';

/**
 * With an editor in Details, the columns still worth listing below it: every
 * one that walks the graph (a City's song pins, the genres a songs rollup
 * offers), and a field with a hint beside it — what the editor cannot show.
 * A plain field of the row is the editor's.
 */
const listedBesideEditor = (column: ColumnDef): boolean =>
  column.source.type !== 'title' &&
  (column.source.type !== 'field' || column.source.hint !== undefined);

interface RowPanelProps {
  def: TableDef;
  row: TableRow;
  graph: Graph;
  mode: WorkingGraphMode;
  narrow?: EntityId;
  pins?: ReadonlyMap<string, string>;
  field: string | null;
  /** A column whose Link… the URL asks for (`?link=`, from the grid). */
  link: string | null;
  /**
   * The panel has taken `?link=`: drop it from the URL — for `field`
   * instead, where the link is the row's own field after all.
   */
  onLinkTaken(field?: string): void;
  /** The next row in the grid with suggestions to look at. */
  next?: { label: string; go(): void } | null;
  /** The row was saved, or linked from: `TableDetailPanelProps.onEdited`. */
  onEdited?(): void;
  /** Beside the grid, or beside the graph (`TableDetailPanelProps.context`). */
  context: DetailPanelContext;
  /** Beside the graph: show the row's local graph in place. */
  onLocalGraph?(node: EntityId): void;
  heading: (text: string) => ReactNode;
  close: (() => void) | null;
}

/** A Link… or Confirm in progress: what it writes, and on which owner. */
interface Linking {
  spec: LinkSpec;
  /** The owner, given: a guess confirmed. */
  owner?: string;
}

/** The records a song row is on (`releases[]`), by slug. */
const recordsOf = (row: TableRow): string[] =>
  valuesAt(row.body, 'releases[].releaseId').filter(
    (id): id is string => typeof id === 'string' && id !== '',
  );

/** The owners a column shows for a row, by how sure: guessed, and stated. */
function ownersIn(
  list: PanelColumn | undefined,
  spec: LinkSpec,
): { guessed: string[]; linked: Set<string> } {
  const guessed: string[] = [];
  const linked = new Set<string>();
  for (const part of list?.parts ?? []) {
    if (part.id !== spec.part) continue;
    for (const entry of part.entries) {
      const slug = slugIn(spec.owner.node, entry.node);
      if (!slug) continue;
      if (entry.style === 'dotted') guessed.push(slug);
      else if (entry.style === 'solid' || entry.style === 'dashed')
        linked.add(slug);
    }
  }
  return { guessed: guessed.filter((slug) => !linked.has(slug)), linked };
}

/** What an editing session puts in the row's panel. */
interface Editing {
  /** The review banner, when the item has a proposal in review. */
  banner: ReactNode;
  /** Details: the kind's editor. */
  details: ReactNode;
  /** Suggestions for the item: what to accept, replace or reject. */
  suggestions?: ReactNode;
  /** The sticky footer; null while nothing can be saved. */
  footer: ReactNode;
  /** The editor is showing, so its fields can be scrolled to. */
  ready: boolean;
  /** It can be saved, so a field asked for takes the cursor. */
  editable: boolean;
  /** Details has unsaved changes. */
  dirty: boolean;
  /** The row's edges with the unsaved draft laid over them, while it has one. */
  draftEdges: DraftEdges | null;
}

/** Every connections column in full, walked as the grid's cells were. */
function useColumnLists(
  graph: Graph,
  def: TableDef,
  node: EntityId,
  narrow: EntityId | undefined,
): ReadonlyMap<string, PanelColumn> {
  return useMemo(() => {
    // From the row and what it stands on, narrowed as the table is.
    const ctx: WalkContext = walkContext(
      graph,
      narrow && def.narrow ? { hop: def.narrow.hop, node: narrow } : undefined,
    );
    const out = new Map<string, PanelColumn>();
    for (const column of def.columns) {
      if (column.source.type !== 'connections') continue;
      out.set(
        column.id,
        columnInFull(
          ctx,
          startsFor(graph, def, node, column.source),
          column.source.parts,
        ),
      );
    }
    return out;
  }, [graph, def, node, narrow]);
}

/**
 * The row's edges with the session's unsaved draft laid over them, or null
 * while it has none. Typing does not wait for it: the list follows a moment
 * later (`useDeferredValue`).
 */
function useDraftEdges(
  graph: Graph,
  kind: ContentKind,
  row: TableRow,
  session: ItemSession,
): DraftEdges | null {
  const draft = useDeferredValue(session.dirty ? session.body : null);
  const { base } = session;
  return useMemo(
    () =>
      draft && base && graph.nodes.has(row.node)
        ? draftEdgesOf({
            graph,
            kind,
            node: row.node,
            slug: row.key,
            base,
            draft,
          })
        : null,
    [graph, kind, row.node, row.key, base, draft],
  );
}

/** The content kind the row panel edits for this row, or null. */
function editedKind(def: TableDef, row: TableRow): ContentKind | null {
  const kind = def.contentKind;
  if (!kind || !PANEL_EDIT_KINDS.has(kind) || def.panel === 'code') {
    return null;
  }
  // Something to edit: the API's item, or the repo's copy to start one from.
  if (row.status === 'missing') return null;
  return row.itemId !== undefined || row.body !== undefined ? kind : null;
}

const RowPanel = (props: RowPanelProps) => {
  const lists = useColumnLists(
    props.graph,
    props.def,
    props.row.node,
    props.narrow,
  );
  const kind = editedKind(props.def, props.row);
  return kind ? (
    <EditingRowPanel {...props} kind={kind} lists={lists} />
  ) : (
    <RowBody {...props} lists={lists} />
  );
};

/* ── Editing ─────────────────────────────────────────────────────────── */

/**
 * The graph's guesses in one part of a column: an event's matched artists.
 * With `doubtful`, a name in doubt (one word, or a place's or a genre's) is
 * marked so, as Link… marks it.
 */
const guessesIn = (
  lists: ReadonlyMap<string, PanelColumn>,
  column: string,
  part: string,
  doubtful?: ReadonlySet<string>,
): Guess[] =>
  (lists.get(column)?.parts.find((p) => p.id === part)?.entries ?? []).map(
    (entry) => ({
      slug: entry.node.slice(entry.node.indexOf(':') + 1),
      label: entry.label,
      ...(doubtful
        ? {
            sure:
              !isOneWordName(entry.label) &&
              !doubtful.has(normalizeArtistName(entry.label)),
          }
        : {}),
    }),
  );

const EditingRowPanel = ({
  kind,
  lists,
  ...props
}: RowPanelProps & {
  kind: ContentKind;
  lists: ReadonlyMap<string, PanelColumn>;
}) => {
  const { def, row, mode } = props;
  // The item's lock, which the grid's cell writes and Link… hold too: a
  // save waits for a cell's write to the item, and reads it after.
  const withItemLock = useItemLock();
  const item = itemKeyOf(kind, row.key);
  const session = useItemSession({
    kind,
    itemId: row.itemId ?? 'new',
    // A row only the repo has: a new item, from the repo's copy. The kind's
    // export was read to its end, so no item of the API has this slug.
    newBody: row.itemId ? undefined : { ...row.body },
    lock: (run) => withItemLock(item, run),
  });
  // While Details has unsaved changes, a cell's edit to the item joins
  // them, for Save to send; a clean panel re-seeds from the cell's write.
  usePanelDraft(item, session);
  const caps = useCapabilities();
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  const detail = session.existing.data;
  const reason = readOnlyReason({
    mode,
    kind,
    served: caps.isServed(kind),
    known: caps.capabilities !== null,
    proposal: session.proposal,
    sentBack: detail?.editState === 'rejected',
    isEditor: session.isEditor,
  });
  // What the last save logged as decided, said beside "Saved".
  const [savedNote, setSavedNote] = useState<string | null>(null);
  // A value Details refused where it was typed: Save waits until it is put
  // right, so it never writes what the box does not show.
  const [refused, setRefused] = useState<string | null>(null);
  // A progression's chords that break the library's rules (a chord Prism
  // does not know, a copy of another's): Save waits on them too.
  const [chordProblem, setChordProblem] = useState<string | null>(null);
  const readOnly = reason !== null;
  // An accept is the server's save of the item: not over unsaved changes
  // here, and not while the row cannot be saved at all.
  const acceptBlocked =
    reason ??
    (session.isNew
      ? 'Not in the content API yet: save the item first, then accept.'
      : session.dirty
        ? 'Save or discard your changes first: accepting saves the item.'
        : null);
  const guesses = useMemo<EventGuesses>(
    () =>
      def.panel === 'event'
        ? {
            artists: guessesIn(
              lists,
              'artists',
              'matched',
              placeAndGenreNames(props.graph),
            ),
            songs: guessesIn(lists, 'songs', 'matched'),
            place: guessesIn(lists, 'place', 'matched')[0],
          }
        : { artists: [], songs: [] },
    [lists, def.panel, props.graph],
  );
  const bodyRef = useRef<HTMLDivElement>(null);
  const draftEdges = useDraftEdges(props.graph, kind, row, session);

  const banner =
    !session.isNew && session.isEditor && session.proposal === 'other' ? (
      // Not theirs: an editor sees that another's is there, never its body.
      <ConsoleCallout
        tone="info"
        title={
          detail?.editState === 'rejected'
            ? 'Another editor’s proposal was sent back'
            : 'Another editor’s proposal is waiting for review'
        }
      >
        {detail?.editState === 'rejected'
          ? 'It stays on the item until they resubmit or withdraw it, or an admin discards it. Until then nothing else can be sent for this item.'
          : 'An admin approves or sends it back first. Until then nothing else can be sent for this item.'}
      </ConsoleCallout>
    ) : !session.isNew && detail?.editState ? (
      <div className="flex flex-col gap-2">
        <EditReviewBanner
          state={detail.editState}
          pendingNote={detail.pendingNote}
          reviewNote={detail.reviewNote}
          submittedAt={detail.pendingAt}
          isEditor={session.isEditor}
          liveBody={detail.body}
          pendingBody={detail.pendingBody}
          busy={session.review.busy}
          onRestartFromLive={
            session.isEditor ? session.review.restartFromLive : undefined
          }
          onApprove={
            session.isEditor ? undefined : () => void session.review.approve()
          }
          onReject={
            session.isEditor
              ? undefined
              : (note) => void session.review.reject(note)
          }
          onDiscard={() => void session.review.discard()}
        />
        {session.review.error && (
          <ConsoleCallout tone="danger">
            {session.review.error.message}
          </ConsoleCallout>
        )}
      </div>
    ) : null;

  return (
    <RowBody
      {...props}
      lists={lists}
      bodyRef={bodyRef}
      editing={{
        banner,
        details: (
          <>
            {reason && <p className="text-xs text-white/60">{reason}</p>}
            <DetailsEditor
              def={def}
              kind={kind}
              session={session}
              readOnly={readOnly}
              guesses={guesses}
              onRefused={setRefused}
            />
            {kind === 'artist' && (
              <DraftPinMoves
                artist={row.key}
                act={row.label}
                was={session.base?.basedInPlaceId}
                is={session.body?.basedInPlaceId}
              />
            )}
            {kind === 'chord_progression' && (
              <ProgressionDraftNote
                was={session.base}
                is={session.body}
                songName={(id) =>
                  props.graph.nodes.get(`song:${id}` as EntityId)?.label ?? id
                }
                onBlocked={setChordProblem}
              />
            )}
          </>
        ),
        suggestions: (
          <SuggestionsSection
            kind={kind}
            slug={row.key}
            label={row.label}
            def={def}
            graph={props.graph}
            base={session.dirty ? null : session.body}
            live={session.proposal === 'mine' ? detail?.body : undefined}
            isEditor={session.isEditor}
            blocked={acceptBlocked}
            item={{
              itemId: detail?.id ?? row.itemId,
              pending: session.proposal !== null,
            }}
            next={props.next}
          />
        ),
        footer: readOnly ? null : (
          <PanelSaveBar
            session={session}
            savedNote={savedNote}
            blocked={refused ?? chordProblem}
            onShowField={(path) => {
              const target = bodyRef.current
                ? findAnchor(bodyRef.current, [path])
                : undefined;
              if (target) showField(target, true);
            }}
            onSaved={(saved) => {
              setSavedNote(null);
              props.onEdited?.();
              if (!token || !caps.feature('suggestions')) return;
              // What the save stated that a suggestion offered is decided:
              // logged, so it reaches decisions.json (logWritten.ts).
              void logWritten(token, {
                kind,
                slug: String(saved.item.slug || row.key),
                before: saved.from,
                after: saved.sent,
                guessed: GUESSED_FIELDS[kind],
              })
                .then((count) => {
                  if (!count) return;
                  setSavedNote(
                    `${count} ${count === 1 ? 'suggestion' : 'suggestions'} it matches logged as accepted`,
                  );
                  return refreshAfterDecisions(queryClient, {
                    kind,
                    slugs: [row.key],
                  });
                })
                .catch((error: unknown) =>
                  setSavedNote(
                    `not logged as a decision: ${error instanceof Error ? error.message : String(error)}`,
                  ),
                );
            }}
          />
        ),
        ready: session.body !== null,
        editable: !readOnly,
        dirty: session.dirty,
        draftEdges,
      }}
    />
  );
};

/** The kind's editor over the session's body, once it has one. */
const DetailsEditor = ({
  def,
  kind,
  session,
  readOnly,
  guesses,
  onRefused,
}: {
  def: TableDef;
  kind: ContentKind;
  session: ItemSession;
  readOnly: boolean;
  guesses: EventGuesses;
  onRefused: (problem: string | null) => void;
}) => {
  const { body, existing } = session;
  if (existing.error) {
    return (
      <ConsoleCallout tone="danger" title="The item could not be loaded">
        {existing.error.message}
      </ConsoleCallout>
    );
  }
  if (!body) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }
  switch (def.panel) {
    case 'song':
      return (
        <SongDetails
          body={body}
          onChange={session.applyBody}
          readOnly={readOnly}
          onRefused={onRefused}
        />
      );
    case 'event':
      return (
        <EventDetails
          body={body}
          onChange={session.applyBody}
          readOnly={readOnly}
          guesses={guesses}
          lockId
        />
      );
    default: {
      const editor = recordEditorFor(kind);
      return editor ? (
        <editor.Editor
          body={body}
          onChange={session.applyBody}
          readOnly={readOnly}
        />
      ) : null;
    }
  }
};

/**
 * The pin-move report under an artist's Details, while the draft changes
 * its City: each song pin that moves, before it is saved.
 */
const DraftPinMoves = ({
  artist,
  act,
  was,
  is,
}: {
  artist: string;
  act: string;
  was: unknown;
  is: unknown;
}) => {
  const placeId = typeof is === 'string' && is !== was ? is : null;
  const result = usePinMoves(artist, placeId);
  return result ? <PinMovesNote result={result} act={act} /> : null;
};

/**
 * What saving the draft does to the row's connections, in a line: "Saving
 * adds 2 connections, removes 1 and changes how sure 1 is." Null when it
 * changes none.
 */
function changesLine({ added, removed, restyled }: DraftEdges): string | null {
  const connections = (n: number) =>
    `${n} ${n === 1 ? 'connection' : 'connections'}`;
  const parts = [
    added > 0 && `adds ${connections(added)}`,
    removed > 0 && `removes ${added > 0 ? removed : connections(removed)}`,
    restyled > 0 &&
      `changes how sure ${added + removed > 0 ? restyled : connections(restyled)} ${restyled === 1 ? 'is' : 'are'}`,
  ].filter((part): part is string => !!part);
  if (parts.length === 0) return null;
  const last = parts.pop()!;
  return `Saving ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`;
}

/* ── The panel's body ────────────────────────────────────────────────── */

const RowBody = ({
  def,
  row,
  graph,
  mode,
  pins,
  field,
  link,
  onLinkTaken,
  onEdited,
  context,
  onLocalGraph,
  heading,
  close,
  lists,
  editing,
  bodyRef: givenRef,
}: RowPanelProps & {
  lists: ReadonlyMap<string, PanelColumn>;
  editing?: Editing;
  bodyRef?: RefObject<HTMLDivElement>;
}) => {
  const ownRef = useRef<HTMLDivElement>(null);
  const bodyRef = givenRef ?? ownRef;
  const ready = editing?.ready ?? true;
  const editable = editing?.editable ?? false;
  const inGraph = graph.nodes.has(row.node);
  const [linking, setLinking] = useState<Linking | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  // Where the keyboard was when Link… opened, and for which column: it goes
  // back there, or to the column's own Link… when that control is gone.
  const linkFrom = useRef<{ el: HTMLElement | null; column: string } | null>(
    null,
  );
  const returnFocus = () => {
    const from = linkFrom.current;
    linkFrom.current = null;
    if (from?.el?.isConnected) {
      from.el.focus();
      return;
    }
    const entry = from
      ? [
          ...(bodyRef.current?.querySelectorAll<HTMLElement>('[data-field]') ??
            []),
        ].find((el) => el.dataset.field === from.column)
      : undefined;
    (
      entry?.querySelector<HTMLElement>('[data-link]') ??
      entry?.querySelector<HTMLElement>('button') ??
      bodyRef.current
    )?.focus();
  };

  // Link… writes another item, so it needs the working copy and a row that
  // is somewhere: never in repo mode, never for a node found nowhere.
  const canLink =
    mode === 'working' &&
    inGraph &&
    row.status !== 'missing' &&
    row.status !== 'archived';
  const records = recordsOf(row);

  /**
   * Open Link… for a column. A song's Label on no record is the song's own
   * session label: Details has it, so that is where it goes.
   */
  const startLink = (spec: LinkSpec, owner?: string) => {
    if (spec.picks && records.length === 0) {
      const target = bodyRef.current
        ? findField(bodyRef.current, def, spec.column)
        : undefined;
      if (target) showField(target, editable);
      return;
    }
    setLinked(null);
    linkFrom.current = {
      el:
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
          ? document.activeElement
          : null,
      column: spec.column,
    };
    setLinking({ spec, owner });
  };

  // The grid's Link…: taken from the URL once, then the panel's own.
  useEffect(() => {
    if (!link) return;
    const spec = linkFor(def.id, link);
    if (spec?.picks && records.length === 0) {
      onLinkTaken(spec.column);
      return;
    }
    onLinkTaken();
    if (spec && canLink) {
      setLinked(null);
      // From the grid: back to this column's Link… in the panel.
      linkFrom.current = { el: null, column: spec.column };
      setLinking({ spec });
    }
    // Once per link asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  // A new row opens at its top; a field asked for is scrolled to — once the
  // editor holding it is there — and, once it can be edited, focused (the
  // repo's graph shows first, read-only, until the working copy is built).
  useEffect(() => {
    const scroller = bodyRef.current;
    if (!scroller || !ready) return;
    const target = field ? findField(scroller, def, field) : undefined;
    if (target) showField(target, editable);
    else scroller.scrollTop = 0;
    // Once per row, field and editor state: not on every edit of the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.key, field, ready, editable]);

  const saved = useMemo(
    () => (row.status === 'archived' ? [] : edgeGroupsOf(graph, row.node)),
    [graph, row.node, row.status],
  );
  // With unsaved changes, the draft's edges over the saved ones.
  const draft = editing?.draftEdges ?? null;
  const groups = draft?.groups ?? saved;
  const listed = groups.reduce((n, g) => n + g.edges.length, 0);
  const edgeCount = listed - (draft?.removed ?? 0);
  const changes = draft ? changesLine(draft) : null;
  // A row the graph does not draw: archived, or held by the API alone (repo
  // mode lists what the API has and the repo does not; seedsOf).
  const apiOnly = !inGraph && row.status !== 'archived';

  // With an editor, Details is the editor, and Connections lists what it
  // cannot show; without one, Details is what the row states, read-only.
  const own = editing ? [] : def.columns.filter(isOwn);
  const others = editing
    ? def.columns.filter(listedBesideEditor)
    : def.columns.filter((column) => !isOwn(column));
  const entry = (column: ColumnDef) => {
    const spec = canLink ? linkFor(def.id, column.id) : undefined;
    return (
      <ColumnEntry
        key={column.id}
        column={column}
        row={row}
        graph={graph}
        list={lists.get(column.id)}
        focused={!editing && field === column.id}
        edited={editing !== undefined}
        note={
          spec?.picks && records.length > 0
            ? 'On a record, the song’s label is the record’s: set it there.'
            : undefined
        }
        link={
          spec
            ? {
                label: spec.picks
                  ? records.length > 0
                    ? 'Set the record’s label…'
                    : 'Set in Details'
                  : 'Link…',
                onClick: () => startLink(spec),
              }
            : undefined
        }
        onConfirm={
          spec?.part
            ? (confirmed) => {
                const owner = slugIn(spec.owner.node, confirmed.node);
                if (owner) startLink(spec, owner);
              }
            : undefined
        }
        confirmPart={spec?.part}
      />
    );
  };
  const owners =
    linking && !linking.spec.picks
      ? ownersIn(lists.get(linking.spec.column), linking.spec)
      : undefined;

  return (
    <>
      <Header
        def={def}
        row={row}
        mode={mode}
        inGraph={inGraph}
        context={context}
        onLocalGraph={onLocalGraph}
        heading={heading}
        close={close}
      />
      <div
        ref={bodyRef}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5"
      >
        {row.status === 'missing' && (
          <ConsoleCallout tone="warning" title="Found nowhere">
            Something names “{row.key}”, but no record or code defines it. All
            connections below say what names it.
          </ConsoleCallout>
        )}
        {apiOnly && (
          <ConsoleCallout tone="info" title="Not in the repo snapshot">
            The API holds this item, but the rows here are the repo’s copy of
            the Atlas, which does not have it, so only its name and state are
            known.
            {def.contentKind &&
            row.itemId &&
            FULL_EDITOR_KINDS.has(def.contentKind)
              ? ' The full editor has the rest.'
              : ''}
          </ConsoleCallout>
        )}
        {row.status === 'archived' && (
          <ConsoleCallout tone="neutral" title="Archived">
            Left out of the graph and the app, so none of its connections are
            drawn.
          </ConsoleCallout>
        )}
        {def.code && (
          <ConsoleCallout tone="neutral" title="Lives in code">
            <p>{def.code.note}</p>
            {def.code.files.length > 0 && (
              <ul className="mt-2 flex flex-col gap-0.5 font-mono text-xs text-white/55">
                {def.code.files.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            )}
          </ConsoleCallout>
        )}
        {editing?.banner}

        {editing ? (
          <>
            <PanelSection title="Details">{editing.details}</PanelSection>
            {editing.suggestions}
          </>
        ) : (
          <PanelSection
            title="Details"
            note={def.code ? undefined : 'Read-only here.'}
          >
            <dl className="flex flex-col gap-1">{own.map(entry)}</dl>
          </PanelSection>
        )}

        {others.length > 0 && (
          <PanelSection
            title="Connections"
            // The columns walk the graph as saved; the draft's own edges are
            // laid over All connections below.
            note={editing?.dirty ? 'As saved' : undefined}
          >
            {linked && (
              <p
                role="status"
                className="rounded-lg bg-emerald-400/[0.08] px-3 py-2 text-xs text-emerald-200/90"
              >
                {linked}
              </p>
            )}
            <dl className="flex flex-col gap-1">{others.map(entry)}</dl>
          </PanelSection>
        )}
        {linking && (
          <Suspense fallback={null}>
            <ConfirmConnectionDialog
              spec={linking.spec}
              graph={graph}
              row={{
                key: row.key,
                label: row.label,
                node: row.node,
                body: row.body,
              }}
              owner={linking.owner}
              owners={linking.spec.picks ? records : undefined}
              guessed={owners?.guessed}
              linked={owners?.linked}
              onDone={(message, warnings) => {
                setLinking(null);
                onEdited?.();
                setLinked(
                  warnings.length
                    ? `${message} ${warnings.map((w) => w.detail).join(' ')}`
                    : message,
                );
              }}
              onClose={() => setLinking(null)}
              returnFocus={returnFocus}
            />
          </Suspense>
        )}

        <PanelSection
          title="All connections"
          count={edgeCount}
          note={draft ? 'With your unsaved changes' : undefined}
        >
          {changes && (
            <p data-draft-summary className="text-xs text-white/60">
              {changes}
            </p>
          )}
          {listed > 0 ? (
            <EdgeGroups
              groups={groups}
              graph={graph}
              row={row.node}
              pins={pins}
              marks={draft?.marks}
              was={draft?.was}
            />
          ) : (
            <p className="text-sm text-white/45">
              {row.status === 'archived'
                ? 'None drawn while it is archived.'
                : apiOnly
                  ? 'None drawn: the graph does not have it.'
                  : 'Nothing connects to it yet.'}
            </p>
          )}
        </PanelSection>
      </div>
      {editing?.footer}
    </>
  );
};

/* ── One column ──────────────────────────────────────────────────────── */

const fileName = (path: string) => path.split('/').pop() ?? path;

/** Who edits what a column shows, and where. */
const EditNote = ({
  column,
  row,
  edited,
}: {
  column: ColumnDef;
  row: TableRow;
  /** The panel edits the row, in Details above. */
  edited: boolean;
}) => {
  const { edit } = column;
  const waiting = useWaitingFor(
    edit.by === 'row' || edit.by === 'owner' ? edit.since : undefined,
  );
  const note = 'mt-1 text-xs text-white/40';
  switch (edit.by) {
    case 'row':
      if (edited) return <p className={note}>Edited in Details.</p>;
      return waiting ? (
        <p className={note}>
          Not saveable yet: it comes with {SCHEMA_STEP[waiting]}.
        </p>
      ) : null;
    case 'owner':
      return (
        <p className={note}>
          Stated on the {contentKindLabel(edit.kind).toLowerCase()}: {edit.path}
          {waiting ? `, saveable with ${SCHEMA_STEP[waiting]}` : ''}.
        </p>
      );
    case 'code':
      return (
        <p className={note} title={edit.file}>
          In code: {fileName(edit.file)}
        </p>
      );
    case 'page':
      return row.kind === 'song' ? (
        <Link
          to={toConsolePath(`/songs/${encodeURIComponent(row.key)}?edit=1`)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-white/55 hover:text-white hover:underline"
        >
          Edit in the page editor
          <ArrowUpRight aria-hidden className="size-3" />
        </Link>
      ) : (
        <p className={note}>Edited on its page.</p>
      );
    default:
      return null;
  }
};

const ColumnEntry = ({
  column,
  row,
  graph,
  list,
  focused,
  edited,
  link,
  onConfirm,
  note,
  confirmPart,
}: {
  column: ColumnDef;
  row: TableRow;
  graph: Graph;
  list: PanelColumn | undefined;
  focused: boolean;
  edited: boolean;
  /** The column's Link…: written on the item that owns the fact. */
  link?: { label: string; onClick(): void };
  /** Confirm one of its guesses, on the item that guessed it. */
  onConfirm?(entry: PanelEntry): void;
  /** Said in place of who edits it, where that depends on the row. */
  note?: string;
  /** The part whose guesses Confirm stores (`LinkSpec.part`). */
  confirmPart?: string;
}) => (
  <div
    data-field={column.id}
    data-focused={focused || undefined}
    className={cn(
      'rounded-lg px-2 py-2',
      focused && 'bg-white/[0.05] ring-1 ring-white/20',
    )}
  >
    <dt className="flex items-baseline gap-2 text-xs text-white/55">
      <span title={column.help}>{column.label}</span>
      {list && list.total > 0 && (
        <span className="tabular-nums text-white/35">{list.total}</span>
      )}
      {link && (
        <button
          type="button"
          data-link
          onClick={link.onClick}
          aria-label={`${link.label.replace(/…$/, '')}: ${column.label}`}
          className="ml-auto rounded-full border border-white/[0.12] px-2 py-0.5 text-[11px] text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          {link.label}
        </button>
      )}
    </dt>
    <dd className="mt-1.5 text-sm text-white/85">
      <CellBody
        column={column}
        row={row}
        graph={graph}
        list={list}
        onConfirm={onConfirm}
        confirmPart={confirmPart}
      />
      {note ? (
        <p className="mt-1 text-xs text-white/40">{note}</p>
      ) : (
        <EditNote column={column} row={row} edited={edited} />
      )}
    </dd>
  </div>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-white/40">{children}</p>
);

/** What one column says about the row, in full. */
const CellBody = ({
  column,
  row,
  graph,
  list,
  onConfirm,
  confirmPart,
}: {
  column: ColumnDef;
  row: TableRow;
  graph: Graph;
  list: PanelColumn | undefined;
  onConfirm?(entry: PanelEntry): void;
  confirmPart?: string;
}) => {
  const cell = row.cells[column.id];
  const empty = cell?.note ?? column.empty;
  switch (column.source.type) {
    case 'title':
      return <p>{row.label}</p>;
    case 'field': {
      if (cell?.type !== 'field') return <Empty>{empty}</Empty>;
      return cell.text ? (
        <p>
          <span className={cn(cell.unverified && 'italic text-white/60')}>
            {cell.text}
          </span>
          {cell.unverified && (
            <span className="text-xs text-white/40"> · unconfirmed</span>
          )}
          {cell.hint && (
            <span className="text-xs text-white/40"> · {cell.hint}</span>
          )}
        </p>
      ) : (
        <>
          <Empty>{empty}</Empty>
          {cell.hint && (
            <p className="mt-1 text-xs text-white/40">{cell.hint}</p>
          )}
        </>
      );
    }
    case 'connections': {
      const unlinked = cell?.type === 'connections' ? cell.unlinked : undefined;
      return (
        <>
          {list && list.total > 0 ? (
            <ColumnList
              column={list}
              action={
                onConfirm
                  ? (entry, part) =>
                      entry.style === 'dotted' && part === confirmPart ? (
                        <button
                          type="button"
                          onClick={() => onConfirm(entry)}
                          aria-label={`Confirm ${entry.label}`}
                          title="Store it on the item that guessed it"
                          className="rounded-full px-1.5 text-[11px] text-white/55 underline-offset-2 hover:text-white hover:underline"
                        >
                          Confirm
                        </button>
                      ) : null
                  : undefined
              }
            />
          ) : (
            !unlinked?.length && <Empty>{empty}</Empty>
          )}
          {unlinked && unlinked.length > 0 && (
            <p className="mt-1.5 text-xs text-white/45">
              Not linked: {unlinked.join(', ')}
            </p>
          )}
        </>
      );
    }
    case 'years':
      return cell?.type === 'years' && cell.first !== undefined ? (
        <div className="flex flex-col gap-1">
          <p>
            {yearSpan(cell.first, cell.last)}
            {cell.parts.length > 0 && (
              <span className="text-xs text-white/45">
                {' · '}
                {cell.parts.map((p) => `${p.label} ${p.count}`).join(' · ')}
              </span>
            )}
          </p>
          <ul
            aria-label="By decade"
            className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60"
          >
            {cell.decades.map((d) => (
              <li key={d.decade}>
                {d.decade} <span className="tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty>{empty}</Empty>
      );
    case 'credits':
      return (
        <Credits
          source={column.source}
          row={row}
          graph={graph}
          summary={cell?.type === 'credits' ? cell.summary : undefined}
          empty={empty}
        />
      );
  }
};

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/**
 * A song's credits, every one (or, for a column of one role, that role's):
 * who (linked to their row when the credit names an artist record, dotted
 * when only by name), and what they did.
 */
const Credits = ({
  source,
  row,
  graph,
  summary,
  empty,
}: {
  source: Extract<ColumnDef['source'], { type: 'credits' }>;
  row: TableRow;
  graph: Graph;
  summary?: string;
  empty: string;
}) => {
  const credits = creditsIn(source, row.body);
  const named = credits.flatMap((credit, index) => {
    const name = text(credit.name);
    if (!name) return [];
    const linked = text(credit.artistGlobeId);
    const node: EntityId = linked
      ? `artist:${linked}`
      : toEntityId('artist', name);
    const style: ChipStyle =
      graph.nodes.get(node)?.status === 'missing'
        ? 'hollow'
        : !linked
          ? 'dotted'
          : credit.unverified === true
            ? 'dashed'
            : 'solid';
    const instrument = text(credit.instrument);
    return [
      {
        // A credit's place in the list: the same person can be credited twice.
        index,
        node,
        label: linked ? labelOf(graph, node) : name,
        style,
        what: instrument
          ? labelOf(graph, `instrument:${instrument}`)
          : (text(credit.role) ?? 'performer'),
      },
    ];
  });
  if (named.length === 0) return <Empty>{empty}</Empty>;
  return (
    <>
      {summary && <p className="mb-1.5 text-xs text-white/55">{summary}</p>}
      <Capped
        items={named}
        className="flex flex-col gap-1"
        render={(credit) => (
          <li
            key={credit.index}
            className="flex flex-wrap items-center gap-2 text-xs"
          >
            <NodeChip
              node={credit.node}
              label={credit.label}
              style={credit.style}
            />
            <span className="text-white/50">{credit.what}</span>
          </li>
        )}
      />
    </>
  );
};

/* ── A row the table does not have ───────────────────────────────────── */

const NotFound = ({
  def,
  rowKey,
  heading,
  close,
}: {
  def: TableDef;
  rowKey: string;
  heading: (text: string) => ReactNode;
  close: (() => void) | null;
}) => (
  <>
    <header className="flex shrink-0 items-start gap-3 border-b border-white/[0.08] px-5 pb-4 pt-5">
      <div className={cn('min-w-0 flex-1', !close && 'pr-8')}>
        {heading('Not in this table')}
      </div>
      {close && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Close"
          className="-mr-2 -mt-1 size-8 shrink-0 text-white/60 hover:text-white"
          onClick={close}
        >
          <X />
        </Button>
      )}
    </header>
    <div className="px-5 py-5">
      <p className="text-sm text-white/60">
        {def.title} has no {def.singular} “{rowKey}”. It may have been renamed
        or archived, or the link is wrong.
      </p>
    </div>
  </>
);
