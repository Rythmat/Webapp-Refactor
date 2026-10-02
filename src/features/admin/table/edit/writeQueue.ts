import { getPath } from '@/content/bodyPaths';
import type {
  ContentItemDetail,
  ContentKind,
  SaveContentResult,
  ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import { baseOf } from '../link/ownerBase';
import {
  type CellEditState,
  type CellEditStore,
  cellKeyOf,
  type CellOverlay,
  type CellRef,
  fieldPath,
  holdsWritten,
  REAL_TIMERS,
  type Timers,
} from './cellEditStore';
import {
  applyOps,
  type CellOp,
  composeOps,
  type OpConflict,
  restoreOps,
  // Named like a hook, and not one: "Use mine" lays the ops over a body.
  useMine as mineOver,
} from './cellOps';
import { itemKeyOf, runUnlocked, type WithItemLock } from './itemLock';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Writing the Table's cell edits, one item at a time
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A cell commit is a few ops (`cellOps.ts`) for one item. The queue writes
 * them in the background, so the grid never waits, and never loses or
 * overwrites anything on the way:
 *
 *  1. One write in flight per item. Edits to an item that arrive while it
 *     is being written wait, and are folded into one batch (`composeOps`)
 *     that goes when the write in flight is done: typing down a column of
 *     one row sends two writes, not ten.
 *  2. Each write holds the item's lock (`itemLock.ts`), which the row
 *     panel's Save and Link… hold too, from its read to its write.
 *  3. It reads the item again, whole, just before writing
 *     (`itemEditor/readItem.ts`, wired in by the provider). Never the
 *     row's body: the exports are lean — a song's chart is left out — so a
 *     body built on one and written back would wipe the song's sections.
 *  4. It builds on what `baseOf` says: the live body, or an editor's own
 *     proposal. Someone else's proposal on the item stops the write, and
 *     the cell says why and offers the row; so does an editor's own
 *     proposal that was sent back, which a cell edit would otherwise send
 *     for review again, all of it, unseen.
 *  5. It lays the ops on (`applyOps`). A value someone else changed since
 *     the author looked is a conflict: the cell asks, Use mine or Keep
 *     theirs. Edits folded into one write are told apart by cell: the
 *     cells whose values lay on cleanly are written, and only those that
 *     conflict wait. Ops that change nothing are not sent at all.
 *  6. `PUT /items`, with a revision note and, when the item carries one,
 *     `expectedRevision`. Never a status: the item keeps its own. A 409
 *     `REVISION_CONFLICT` — the item moved between the read and the write —
 *     is read again and tried once more, by itself. A 422's problems land
 *     on the cells whose paths they name.
 *  7. Once written: the cell shows it as saved (or proposed, for an
 *     editor); the save is logged against the item's suggestions, best
 *     effort (`data/logWritten.ts`); the undo entry is kept; and the item's
 *     own query is invalidated at once, so an open row panel shows it.
 *  8. When every item's queue has been idle for 300 ms, everything else is
 *     refreshed once (`refreshAfterDecisions`) — the exports the grid is
 *     built from among it — rather than once per write.
 *
 * The row panel on the same item: while it has unsaved changes, a cell's
 * edit goes into its draft instead (`registerDraft`), and its Save sends
 * both; the cell says so. A clean panel re-seeds from the write, as it does
 * after any save.
 *
 * A write that failed keeps its cells until the author picks Retry,
 * Discard, Use mine or Keep theirs; a cell edited again meanwhile leaves
 * it, with the ops only that cell showed (`supersede`).
 *
 * Undo is an ordinary write. Each saved write keeps the ops that put back
 * exactly what it changed (`restoreOps`), each resting on what it wrote: if
 * the value has changed since, the undo is refused ("Changed since; not
 * undone") rather than written over someone else. Fifty are kept; an undo
 * can be redone, and a new edit forgets what could be.
 *
 * A plain class, over what it is handed (`WriteQueueDeps`): the provider
 * gives it the network, the query client and the viewer, and its tests
 * give it fakes. No React (the purity test holds this).
 */

type Body = Readonly<Record<string, unknown>>;

/** The item a write goes to. */
export interface WriteTarget {
  kind: ContentKind;
  slug: string;
  /** Its DB id, when the page has it (a row's `itemId`): read at once. */
  id?: string;
  /** Its name, for what the cell and the toasts say. */
  name: string;
  /**
   * A row only the repo has, with no item in the API yet: its repo copy,
   * which is the whole body, to make the item from with a create-only
   * save where the server offers one.
   */
  createFrom?: Body;
}

/** A cell that shows a write. */
export interface CellTarget extends CellRef {
  /** The body paths the cell shows: `year`, or `activeFrom` and `activeTo`. */
  paths: readonly string[];
  /** What it shows meanwhile; from the write's own `set`s when left out. */
  overlay?: CellOverlay;
  /** What the author saw in it. */
  seen?: unknown;
  /**
   * Its column, and its own line for the toast ("Year of Africa: 1982 →
   * 1983"): what a part of a write says when the write is split — a cell
   * that conflicts held back while the others are written, or a cell
   * edited again after its write failed.
   */
  field?: string;
  summary?: string;
}

/** One commit, as the grid (or an undo) hands it over. */
export interface CellWrite {
  item: WriteTarget;
  ops: readonly CellOp[];
  cells: readonly CellTarget[];
  /** The columns it edits, for the revision note: "Year". */
  fields: readonly string[];
  /** One line for the toast: "Year of Africa: 1982 → 1983". */
  summary: string;
  /** The revision note, over "Edited in the Table: …". */
  note?: string;
}

/** What a write is for: an edit, or an undo or a redo of one. */
export type WritePurpose = 'edit' | 'undo' | 'redo';

/** A write the queue holds: one commit, or several folded into one. */
export interface QueuedWrite extends CellWrite {
  id: number;
  /** The item, as `itemKeyOf` names it. */
  key: string;
  purpose: WritePurpose;
}

/** A write that did not go through, kept for Retry or the author's call. */
export interface FailedWrite {
  write: QueuedWrite;
  /**
   * `error` — the server refused it, or never answered; `blocked` —
   * someone's proposal on the item stops it; `conflict` — someone else
   * changed what it rests on.
   */
  kind: 'error' | 'blocked' | 'conflict';
  message: string;
  conflicts?: readonly OpConflict[];
  /** For a conflict: the body as it was then, which Use mine builds on. */
  body?: Body;
}

/** A saved write's way back (or, after an undo, forward again). */
export interface UndoEntry {
  id: number;
  item: WriteTarget;
  key: string;
  /** Puts back what the write changed, each op resting on what it wrote. */
  ops: readonly CellOp[];
  /** Its cells, each showing the value it puts back. */
  cells: readonly CellTarget[];
  fields: readonly string[];
  summary: string;
  /** It was written as a proposal (an editor's). */
  proposed: boolean;
}

/** What the queue tells its listeners: the toasts, the live region. */
export type WriteEvent =
  | {
      type: 'saved';
      write: QueuedWrite;
      proposed: boolean;
      /** Its undo (after an undo, its redo); null when nothing changed. */
      entry: UndoEntry | null;
      warnings: readonly ValidationProblem[];
    }
  | { type: 'unchanged'; write: QueuedWrite }
  | { type: 'failed'; failed: FailedWrite }
  | { type: 'not-undone'; write: QueuedWrite; message: string }
  | { type: 'in-panel'; write: QueuedWrite; message: string };

/** `PUT /items`, as the queue sends it. */
export interface PutInput {
  kind: ContentKind;
  slug: string;
  body: Record<string, unknown>;
  note: string;
  expectedRevision?: number;
  create?: true;
}

/**
 * The row panel's draft of an item, while it is open: whether it has
 * unsaved changes, its body, and a way to change it.
 */
export interface PanelDraft {
  dirty(): boolean;
  body(): Body | null;
  applyBody(body: Record<string, unknown>): void;
}

export interface WriteQueueDeps {
  store: CellEditStore;
  /** The item as stored now, whole; null when the API has no such item. */
  read(item: WriteTarget): Promise<ContentItemDetail | null>;
  put(input: PutInput): Promise<SaveContentResult>;
  /** Who is writing: an editor's write is a proposal. */
  viewer(): { editor: boolean; userId: string | null | undefined };
  /** The server takes create-only saves (`features.create`). */
  canCreate(): boolean;
  /** The item lock the row panel and Link… share. */
  lock?: WithItemLock;
  /** Logs what the save decided about the item's suggestions. */
  log?(write: {
    kind: ContentKind;
    slug: string;
    before: Body;
    after: Body;
  }): Promise<number>;
  /** The item's own query, invalidated as soon as it is written. */
  invalidateItem?(id: string): void;
  /** Everything else, once the queues have been idle for `idleMs`. */
  refresh?(): unknown;
  idleMs?: number;
  /** How many writes can be undone (the oldest go first). */
  undoLimit?: number;
  timers?: Timers;
}

/** The cell's words while its edit waits in the row panel's draft. */
export const IN_PANEL_MESSAGE =
  'In the row panel’s unsaved changes: its Save sends it.';

/** The cell's words when the panel's draft changed the same value. */
export const PANEL_CONFLICT_MESSAGE =
  'The row panel has unsaved changes to this value: save or discard them there first.';

/** An undo over a value someone changed after it was written. */
export const NOT_UNDONE = 'Changed since; not undone';

/**
 * The part of a folded write held back for the author, while the rest of
 * it was written (`splitOnConflict`).
 */
interface HeldPart {
  write: QueuedWrite;
  conflicts: readonly OpConflict[];
  body: Body;
}

type Outcome =
  | {
      type: 'saved';
      before: Body;
      after: Body;
      result: SaveContentResult;
      id?: string;
      /** What was written, when part of the write was held back. */
      part?: QueuedWrite;
      held?: HeldPart;
    }
  | { type: 'unchanged'; part?: QueuedWrite; held?: HeldPart }
  | { type: 'blocked'; message: string }
  | { type: 'conflict'; conflicts: readonly OpConflict[]; body: Body }
  | {
      type: 'error';
      message: string;
      problems?: readonly ValidationProblem[];
    };

interface Lane {
  item: WriteTarget;
  /** Waiting to go, in order; the last takes in new edits. */
  waiting: QueuedWrite[];
  running: QueuedWrite | null;
}

/* ── Small helpers ─────────────────────────────────────────────────── */

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A `ContentApiError`'s status and code, read without importing it. */
function apiError(error: unknown): {
  status?: number;
  code?: string;
  body: Record<string, unknown>;
} {
  if (!error || typeof error !== 'object') return { body: {} };
  const { status, code, body } = error as {
    status?: unknown;
    code?: unknown;
    body?: unknown;
  };
  return {
    status: typeof status === 'number' ? status : undefined,
    code: typeof code === 'string' ? code : undefined,
    body:
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {},
  };
}

const isApiCode = (error: unknown, status: number, code: string) => {
  const found = apiError(error);
  return found.status === status && found.code === code;
};

/** The problems a 422 names, errors only. */
const problemsOf = (error: unknown): ValidationProblem[] => {
  const { problems } = apiError(error).body;
  return Array.isArray(problems)
    ? (problems as ValidationProblem[]).filter(
        (problem) => (problem.severity ?? 'error') === 'error',
      )
    : [];
};

/**
 * The item's revision, where the server gives one (contract §5b, requested:
 * the dev repo server and the API will). Read without a type for it, since
 * today's detail has none.
 */
export const revisionOf = (detail: ContentItemDetail): number | undefined => {
  const { revision } = detail as { revision?: unknown };
  return typeof revision === 'number' ? revision : undefined;
};

/** Whether a problem's path (`credits[2].name`) lies in a cell's (`credits[]`). */
const covers = (cellPath: string, problemPath: string): boolean => {
  const cell = fieldPath(cellPath);
  const problem = problemPath.replace(/\[\d*\]/g, '');
  return problem === cell || problem.startsWith(`${cell}.`);
};

/** The item's values at the cell's paths, from `body`. */
const valuesAt = (paths: readonly string[], body: Body): CellOverlay =>
  Object.fromEntries(
    paths.map((path) => [fieldPath(path), getPath(body, fieldPath(path))]),
  );

/** What the write's own `set`s put at the cell's paths (those it touches). */
function overlayFromSets(
  ops: readonly CellOp[],
  paths: readonly string[],
): CellOverlay {
  const out: Record<string, unknown> = {};
  for (const path of paths.map(fieldPath))
    for (const op of ops) {
      if (op.op !== 'set') continue;
      if (op.path === path) out[path] = op.value;
      else if (path.startsWith(`${op.path}.`))
        out[path] = getPath(op.value, path.slice(op.path.length + 1));
    }
  return out;
}

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const defaultNote = (fields: readonly string[], purpose: WritePurpose) =>
  `${
    purpose === 'undo' ? 'Undone' : purpose === 'redo' ? 'Redone' : 'Edited'
  } in the Table: ${fields.join(', ')}`;

const noteOf = (write: QueuedWrite) =>
  write.note ?? defaultNote(write.fields, write.purpose);

/** Two writes' cells as one list: the later one's overlay, the first one's `seen`. */
function mergeCells(
  first: readonly CellTarget[],
  then: readonly CellTarget[],
): CellTarget[] {
  const out = new Map(first.map((cell) => [cellKeyOf(cell), cell]));
  for (const cell of then) {
    const key = cellKeyOf(cell);
    const before = out.get(key);
    out.set(
      key,
      before
        ? {
            ...cell,
            paths: unique([...before.paths, ...cell.paths]),
            overlay:
              before.overlay || cell.overlay
                ? { ...before.overlay, ...cell.overlay }
                : undefined,
            seen: before.seen,
            field: cell.field ?? before.field,
            summary:
              before.summary && cell.summary
                ? `${before.summary}; ${cell.summary}`
                : (cell.summary ?? before.summary),
          }
        : cell,
    );
  }
  return [...out.values()];
}

/**
 * The field an op rests on, to tell which cells show it: a dot path, or
 * '*' for a link, which may reach several.
 */
const opField = (op: CellOp): string =>
  op.op === 'link' || op.op === 'unlink' ? '*' : fieldPath(op.path);

const touches = (a: string, b: string) =>
  a === '*' ||
  b === '*' ||
  a === b ||
  a.startsWith(`${b}.`) ||
  b.startsWith(`${a}.`);

/** The op writes something the cell shows. */
const showsIn = (op: CellOp, cell: CellTarget): boolean =>
  cell.paths.some((path) => touches(opField(op), fieldPath(path)));

/**
 * The part of a write that `cells` show: those cells, and the ops that
 * show in them — and any op that shows in no cell of the write at all,
 * which no cell can answer for. Its summary and revision note are those
 * cells' own, where each says them (else the write's). Conflicts keep up
 * with the ops they name.
 */
function partOf(
  write: QueuedWrite,
  cells: readonly CellTarget[],
): { write: QueuedWrite; index: Map<number, number> } {
  const index = new Map<number, number>();
  const ops: CellOp[] = [];
  write.ops.forEach((op, at) => {
    const kept =
      cells.some((cell) => showsIn(op, cell)) ||
      !write.cells.some((cell) => showsIn(op, cell));
    if (!kept) return;
    index.set(at, ops.length);
    ops.push(op);
  });
  const summaries = cells.map((cell) => cell.summary);
  const fields = cells.map((cell) => cell.field);
  const said = (values: (string | undefined)[]): values is string[] =>
    values.length > 0 && values.every((value) => !!value);
  return {
    write: {
      ...write,
      ops,
      cells,
      summary: said(summaries) ? summaries.join('; ') : write.summary,
      fields: said(fields) ? unique(fields) : write.fields,
    },
    index,
  };
}

/** Conflicts renumbered to a part's ops; those on ops it left out, gone. */
const conflictsIn = (
  conflicts: readonly OpConflict[],
  index: ReadonlyMap<number, number>,
): OpConflict[] =>
  conflicts.flatMap((found) => {
    const at = index.get(found.index);
    return at === undefined ? [] : [{ ...found, index: at }];
  });

/**
 * A folded write whose ops conflict in some of its cells only: those
 * cells' part, held for the author (Use mine, Keep theirs), and the other
 * cells' part, which is written now — a conflict on the Year must not keep
 * a Title edited alongside it from being saved, nor be lost with it by
 * Keep theirs. Null when it cannot be told apart: every cell conflicts, or
 * an op shows in no cell, or in a cell of each part.
 */
function splitOnConflict(
  write: QueuedWrite,
  conflicts: readonly OpConflict[],
): {
  clean: QueuedWrite;
  held: QueuedWrite;
  conflicts: OpConflict[];
} | null {
  const bad = new Set(conflicts.map((found) => found.index));
  const heldCells = write.cells.filter((cell) =>
    write.ops.some((op, at) => bad.has(at) && showsIn(op, cell)),
  );
  if (!heldCells.length || heldCells.length === write.cells.length) return null;
  const cleanCells = write.cells.filter((cell) => !heldCells.includes(cell));
  // Each op in one part exactly: a conflicting op always is in the held
  // part, where it shows (or in neither, if it shows nowhere).
  const tangled = write.ops.some(
    (op) =>
      heldCells.some((cell) => showsIn(op, cell)) ===
      cleanCells.some((cell) => showsIn(op, cell)),
  );
  if (tangled) return null;
  const clean = partOf(write, cleanCells).write;
  const held = partOf(write, heldCells);
  return {
    clean,
    held: held.write,
    conflicts: conflictsIn(conflicts, held.index),
  };
}

/** What a conflicting cell says, naming the fields that changed since. */
const conflictMessage = (conflicts: readonly OpConflict[]): string =>
  `Changed since you looked (${unique(
    conflicts.map((found) => found.path),
  ).join(', ')}): use yours, or keep theirs.`;

/**
 * An editor's own proposal that was sent back: a cell edit would build on
 * it and send all of it for review again, unseen. The row panel says what
 * came back and resubmits it (or it is withdrawn there) first.
 */
export const sentBackMessage = (name: string): string =>
  `Your proposal on ${name} was sent back. Open the row to resubmit or withdraw it: a cell edit would send all of it for review again.`;

/** A waiting edit with another folded in: one write, as the two in order. */
function coalesce(first: QueuedWrite, then: CellWrite): QueuedWrite {
  const note =
    first.note !== undefined || then.note !== undefined
      ? `${first.note ?? defaultNote(first.fields, 'edit')}; ${
          then.note ?? defaultNote(then.fields, 'edit')
        }`
      : undefined;
  return {
    ...first,
    item: { ...first.item, ...then.item, id: then.item.id ?? first.item.id },
    ops: composeOps(first.ops, then.ops),
    cells: mergeCells(first.cells, then.cells),
    fields: unique([...first.fields, ...then.fields]),
    summary: `${first.summary}; ${then.summary}`,
    ...(note !== undefined ? { note } : {}),
  };
}

/* ── The queue ─────────────────────────────────────────────────────── */

export class WriteQueue {
  readonly store: CellEditStore;
  /** The item lock, for the row panel and Link… to hold too. */
  readonly lock: WithItemLock;
  private readonly deps: WriteQueueDeps;
  private readonly timers: Timers;
  private readonly idleMs: number;
  private readonly undoLimit: number;
  private readonly lanes = new Map<string, Lane>();
  private readonly failed = new Map<number, FailedWrite>();
  private readonly drafts = new Map<string, PanelDraft>();
  /** Per item, the cells whose edit went into its row panel's draft. */
  private readonly panelCells = new Map<
    string,
    Map<string, { ref: CellRef; write: number }>
  >();
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly eventListeners = new Set<(event: WriteEvent) => void>();
  private seq = 0;
  private idleTimer: unknown = null;
  /** Something was written since the last refresh: one is owed. */
  private owed = false;

  constructor(deps: WriteQueueDeps) {
    this.deps = deps;
    this.store = deps.store;
    this.lock = deps.lock ?? runUnlocked;
    this.timers = deps.timers ?? REAL_TIMERS;
    this.idleMs = deps.idleMs ?? 300;
    this.undoLimit = deps.undoLimit ?? 50;
  }

  /* ── Committing ── */

  /**
   * Hands a cell's edit over to be written. Answers the id of the write it
   * joined, or null when it went into the row panel's draft instead.
   */
  commit = (write: CellWrite): number | null => this.enqueue(write, 'edit');

  /** Writes a failed write's ops again, as they were. */
  retry = (id: number): boolean => {
    const failed = this.failed.get(id);
    if (!failed) return false;
    this.failed.delete(id);
    this.enqueue(failed.write, failed.write.purpose);
    this.changed();
    return true;
  };

  /** Drops a failed write: its cells show the item as it is. */
  discard = (id: number): boolean => {
    const failed = this.failed.get(id);
    if (!failed) return false;
    this.failed.delete(id);
    this.clearCells(failed.write);
    this.changed();
    return true;
  };

  /**
   * "Use mine" after a conflict: the same edit, now resting on the value
   * the author was shown (so it writes over it), sent again. Any change
   * after that one is still caught.
   */
  writeMine = (id: number): boolean => {
    const failed = this.failed.get(id);
    if (failed?.kind !== 'conflict' || !failed.body) return false;
    this.failed.delete(id);
    this.enqueue(
      { ...failed.write, ops: mineOver(failed.body, failed.write.ops) },
      failed.write.purpose,
    );
    this.changed();
    return true;
  };

  /** "Keep theirs" after a conflict: the edit is dropped, and the rows refresh. */
  keepTheirs = (id: number): boolean => {
    if (!this.discard(id)) return false;
    this.owed = true;
    this.armIdle();
    return true;
  };

  /** The write that failed, by id. */
  failure = (id: number): FailedWrite | undefined => this.failed.get(id);

  /* ── Undo ── */

  /**
   * Undoes the latest saved write `filter` picks (every one, without it):
   * an ordinary write with a precondition. False when there is none.
   */
  undo = (filter?: (entry: UndoEntry) => boolean): boolean =>
    this.replay(this.undoStack, 'undo', filter);

  /** Redoes the latest undo `filter` picks. */
  redo = (filter?: (entry: UndoEntry) => boolean): boolean =>
    this.replay(this.redoStack, 'redo', filter);

  /** The toast's Undo: that write, wherever it is in the stack. */
  undoEntry = (id: number): boolean => this.undo((entry) => entry.id === id);

  /** The toast's Redo, after an undo. */
  redoEntry = (id: number): boolean => this.redo((entry) => entry.id === id);

  /** What can be undone, oldest first. */
  undoable = (): readonly UndoEntry[] => this.undoStack;

  /** What can be redone, oldest first. */
  redoable = (): readonly UndoEntry[] => this.redoStack;

  /* ── The row panel ── */

  /**
   * The row panel's draft of `item` (`itemKeyOf`), while it is open. A
   * cell's edit to the item goes into it while it has unsaved changes.
   * Answers the way to let go of it.
   */
  registerDraft = (item: string, draft: PanelDraft): (() => void) => {
    this.drafts.set(item, draft);
    return () => {
      if (this.drafts.get(item) !== draft) return;
      this.drafts.delete(item);
      this.draftChanged(item);
    };
  };

  /**
   * The panel's draft of `item` may have been saved or dropped: the cells
   * whose edits went into it show saved when its body still holds them
   * (Save sent them), and the item as it is otherwise.
   */
  draftChanged = (item: string): void => {
    const draft = this.drafts.get(item);
    if (draft?.dirty()) return;
    const cells = this.panelCells.get(item);
    if (!cells) return;
    this.panelCells.delete(item);
    const body = draft?.body() ?? null;
    const proposed = this.deps.viewer().editor;
    for (const { ref, write } of cells.values()) {
      const state = this.store.get(ref);
      // Edited again since, through the queue: that write's, not the panel's.
      if (state?.write !== write) continue;
      if (
        state.status === 'in-panel' &&
        body &&
        state.written &&
        holdsWritten(state.written, (key) => (key === item ? body : null))
      )
        this.store.set(ref, {
          ...state,
          status: proposed ? 'proposed' : 'saved',
          message: undefined,
        });
      else this.store.clear(ref);
    }
  };

  /* ── State ── */

  /** Writes queued, in flight, or failed and not yet let go of. */
  hasUnsaved = (): boolean => this.busy() || this.failed.size > 0;

  /** Told when the unsaved state or the undo stacks change. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Told of each write as it lands, fails or is refused. */
  onEvent = (listener: (event: WriteEvent) => void): (() => void) => {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  };

  /** Resolves once nothing is queued or in flight. */
  whenIdle = (): Promise<void> =>
    this.busy()
      ? new Promise((resolve) => {
          const off = this.subscribe(() => {
            if (this.busy()) return;
            off();
            resolve();
          });
        })
      : Promise.resolve();

  /** Stops the idle timer: for a queue that is being dropped. */
  dispose = (): void => {
    this.stopIdle();
    this.store.dispose();
  };

  /* ── Inside ── */

  private busy(): boolean {
    for (const lane of this.lanes.values())
      if (lane.running || lane.waiting.length) return true;
    return false;
  }

  private changed() {
    for (const listener of [...this.listeners]) listener();
  }

  private emit(event: WriteEvent) {
    for (const listener of [...this.eventListeners]) listener(event);
  }

  private enqueue(write: CellWrite, purpose: WritePurpose): number | null {
    const key = itemKeyOf(write.item.kind, write.item.slug);
    if (purpose === 'edit' && this.intoPanel(key, write)) return null;
    this.supersede(key, write.cells);
    let lane = this.lanes.get(key);
    if (!lane) {
      lane = { item: write.item, waiting: [], running: null };
      this.lanes.set(key, lane);
    }
    lane.item = {
      ...lane.item,
      ...write.item,
      id: write.item.id ?? lane.item.id,
    };
    const last = lane.waiting[lane.waiting.length - 1];
    let queued: QueuedWrite;
    if (last && last.purpose === 'edit' && purpose === 'edit') {
      // Numbered afresh: a write's id is always later than every edit it
      // holds, so it never gives way to one made before it (`setCells`).
      queued = { ...coalesce(last, write), id: (this.seq += 1) };
      lane.waiting[lane.waiting.length - 1] = queued;
    } else {
      queued = { ...write, id: (this.seq += 1), key, purpose };
      lane.waiting.push(queued);
    }
    this.markCells(queued, 'queued');
    this.kick(lane);
    this.changed();
    return queued.id;
  }

  /**
   * A dirty row panel on the item takes the edit into its draft; its Save
   * sends it. Answers whether it did (or refused it: the draft changed the
   * same value).
   */
  private intoPanel(key: string, write: CellWrite): boolean {
    const draft = this.drafts.get(key);
    if (!draft?.dirty()) return false;
    const body = draft.body();
    if (!body) return false;
    const queued: QueuedWrite = {
      ...write,
      id: (this.seq += 1),
      key,
      purpose: 'edit',
    };
    const laid = applyOps(body, write.ops);
    let cells = this.panelCells.get(key);
    if (!cells) {
      cells = new Map();
      this.panelCells.set(key, cells);
    }
    for (const cell of write.cells)
      cells.set(cellKeyOf(cell), { ref: cell, write: queued.id });
    if (!laid.ok) {
      for (const cell of write.cells)
        this.store.set(cell, {
          status: 'error',
          message: PANEL_CONFLICT_MESSAGE,
          seen: cell.seen,
          write: queued.id,
        });
      this.emit({
        type: 'failed',
        failed: {
          write: queued,
          kind: 'conflict',
          message: PANEL_CONFLICT_MESSAGE,
          conflicts: laid.conflicts,
        },
      });
      return true;
    }
    if (laid.changed) draft.applyBody(laid.body);
    for (const cell of write.cells)
      this.store.set(cell, {
        status: 'in-panel',
        overlay: valuesAt(cell.paths, laid.body),
        message: IN_PANEL_MESSAGE,
        seen: cell.seen,
        written: cell.paths.map((path) => ({
          item: key,
          path,
          value: getPath(laid.body, fieldPath(path)),
        })),
        write: queued.id,
      });
    this.emit({ type: 'in-panel', write: queued, message: IN_PANEL_MESSAGE });
    return true;
  }

  /**
   * A new edit of a cell stands in for a failed one's: that one lets go of
   * the cell, and of the ops only it showed, so a Retry or Use mine from
   * the failed write's other cells never sends the value the author has
   * since replaced.
   */
  private supersede(key: string, cells: readonly CellRef[]) {
    const covered = new Set(cells.map(cellKeyOf));
    for (const [id, failed] of this.failed) {
      if (failed.write.key !== key) continue;
      const left = failed.write.cells.filter(
        (cell) => !covered.has(cellKeyOf(cell)),
      );
      if (left.length === failed.write.cells.length) continue;
      if (!left.length) {
        this.failed.delete(id);
        continue;
      }
      const part = partOf(failed.write, left);
      const conflicts = failed.conflicts
        ? conflictsIn(failed.conflicts, part.index)
        : undefined;
      const message =
        failed.kind === 'conflict' && conflicts?.length
          ? conflictMessage(conflicts)
          : failed.message;
      this.failed.set(id, {
        ...failed,
        write: part.write,
        message,
        ...(conflicts ? { conflicts } : {}),
      });
      // The cells it keeps say only what is still theirs.
      if (message !== failed.message || conflicts)
        for (const cell of left) {
          const state = this.store.get(cell);
          if (state?.write !== id) continue;
          this.store.set(cell, {
            ...state,
            ...(state.status === 'conflict' ? { message } : {}),
            ...(conflicts ? { conflicts } : {}),
          });
        }
    }
  }

  /**
   * Sets each of the write's cells, unless a later write has taken the
   * cell over (a second edit of it, queued while this one was saving).
   */
  private setCells(
    write: QueuedWrite,
    state: (cell: CellTarget) => Omit<CellEditState, 'since'> | null,
  ) {
    for (const cell of write.cells) {
      const now = this.store.get(cell);
      if (now?.write !== undefined && now.write > write.id) continue;
      const next = state(cell);
      if (next) this.store.set(cell, { ...next, write: write.id });
      else this.store.clear(cell);
    }
  }

  private markCells(write: QueuedWrite, status: 'queued' | 'saving') {
    this.setCells(write, (cell) => ({
      status,
      overlay: cell.overlay ?? overlayFromSets(write.ops, cell.paths),
      seen: cell.seen,
    }));
  }

  private clearCells(write: QueuedWrite) {
    this.setCells(write, () => null);
  }

  private kick(lane: Lane) {
    if (lane.running || !lane.waiting.length) return;
    const write = lane.waiting.shift()!;
    lane.running = write;
    this.stopIdle();
    this.markCells(write, 'saving');
    void this.lock(write.key, () => this.attempt(lane, write))
      .catch(
        (error: unknown): Outcome => ({
          type: 'error',
          message: messageOf(error),
          problems: problemsOf(error),
        }),
      )
      .then((outcome) => this.finish(lane, write, outcome))
      .finally(() => {
        lane.running = null;
        if (lane.waiting.length) this.kick(lane);
        else {
          if (this.lanes.get(write.key) === lane) this.lanes.delete(write.key);
          this.armIdle();
        }
        this.changed();
      });
  }

  /** Read, build, lay the ops on, write: under the item's lock. */
  private async attempt(lane: Lane, write: QueuedWrite): Promise<Outcome> {
    let item: WriteTarget = {
      ...write.item,
      id: write.item.id ?? lane.item.id,
    };
    for (let tries = 0; ; tries += 1) {
      const detail = await this.deps.read(item);
      const { editor, userId } = this.deps.viewer();
      let base: Body;
      let create = false;
      if (detail) {
        const found = baseOf(detail, editor, userId, item.name);
        if ('blocked' in found)
          return { type: 'blocked', message: found.blocked };
        // The editor's own proposal, sent back: not resubmitted unseen.
        if (found.sentBack)
          return { type: 'blocked', message: sentBackMessage(item.name) };
        base = found.body;
      } else if (item.createFrom && this.deps.canCreate()) {
        base = item.createFrom;
        create = true;
      } else
        return {
          type: 'error',
          message: item.createFrom
            ? `${item.name} is not in the content API yet, and this server cannot make it without the risk of overwriting one: save it from its row first.`
            : `${item.name} is no longer in the content API.`,
        };

      let part: QueuedWrite | undefined;
      let held: HeldPart | undefined;
      let laid = applyOps(base, write.ops);
      if (!laid.ok) {
        const refused = laid.conflicts.find((found) => found.refused);
        if (refused?.refused)
          return { type: 'error', message: refused.refused };
        // Folded edits to other cells are written; only the cells whose
        // values changed since wait for the author. An undo stays whole:
        // "not undone" is said of it all.
        const split =
          write.purpose === 'edit'
            ? splitOnConflict(write, laid.conflicts)
            : null;
        if (!split)
          return { type: 'conflict', conflicts: laid.conflicts, body: base };
        part = split.clean;
        held = { write: split.held, conflicts: split.conflicts, body: base };
        laid = applyOps(base, part.ops);
        if (!laid.ok)
          return { type: 'conflict', conflicts: laid.conflicts, body: base };
      }
      if (!laid.changed) return { type: 'unchanged', part, held };

      const revision = detail ? revisionOf(detail) : undefined;
      try {
        const result = await this.deps.put({
          kind: item.kind,
          slug: item.slug,
          body: laid.body,
          note: noteOf(part ?? write),
          ...(revision !== undefined ? { expectedRevision: revision } : {}),
          ...(create ? { create: true as const } : {}),
        });
        return {
          type: 'saved',
          before: base,
          after: laid.body,
          result,
          id: result.item?.id ?? detail?.id,
          part,
          held,
        };
      } catch (error) {
        const moved = isApiCode(error, 409, 'REVISION_CONFLICT');
        const taken = create && isApiCode(error, 409, 'SLUG_TAKEN');
        if (tries > 0 || (!moved && !taken)) throw error;
        // Made by someone else meanwhile: the 409 names it, to read.
        const id = apiError(error).body.id;
        if (taken && typeof id === 'string') item = { ...item, id };
        lane.item = { ...lane.item, id: item.id };
      }
    }
  }

  private async finish(lane: Lane, whole: QueuedWrite, outcome: Outcome) {
    // Part of a folded write held back for the author: the rest is what
    // was written (or found written already), and says so for itself
    // first — its own toast, its own undo.
    if (
      (outcome.type === 'saved' || outcome.type === 'unchanged') &&
      outcome.held
    ) {
      const { held } = outcome;
      await this.finish(lane, whole, { ...outcome, held: undefined });
      this.holdBack(held);
      return;
    }
    const write =
      outcome.type === 'saved' || outcome.type === 'unchanged'
        ? (outcome.part ?? whole)
        : whole;
    switch (outcome.type) {
      case 'saved': {
        const proposed = this.deps.viewer().editor;
        const { before, after } = outcome;
        this.setCells(write, (cell) => ({
          status: proposed ? 'proposed' : 'saved',
          overlay: valuesAt(cell.paths, after),
          seen: cell.seen,
          written: cell.paths.map((path) => ({
            item: write.key,
            path,
            value: getPath(after, fieldPath(path)),
          })),
        }));
        if (outcome.id) {
          lane.item = { ...lane.item, id: outcome.id };
          this.deps.invalidateItem?.(outcome.id);
        }
        this.owed = true;
        const entry = this.remember(
          {
            ...write,
            item: { ...write.item, id: outcome.id ?? write.item.id },
          },
          before,
          after,
          proposed,
        );
        // The save stands either way; a log that fails is not undone.
        await this.deps
          .log?.({
            kind: write.item.kind,
            slug: write.item.slug,
            before,
            after,
          })
          .catch(() => 0);
        this.emit({
          type: 'saved',
          write,
          proposed,
          entry,
          warnings: outcome.result.warnings ?? [],
        });
        return;
      }
      case 'unchanged':
        this.clearCells(write);
        this.emit({ type: 'unchanged', write });
        return;
      case 'blocked':
        this.fail(write, { kind: 'blocked', message: outcome.message });
        return;
      case 'conflict': {
        if (write.purpose !== 'edit') {
          // What the rows show is behind: a refresh brings theirs.
          this.owed = true;
          this.clearCells(write);
          this.emit({ type: 'not-undone', write, message: NOT_UNDONE });
          return;
        }
        this.holdBack({
          write,
          conflicts: outcome.conflicts,
          body: outcome.body,
        });
        return;
      }
      case 'error':
        this.fail(
          write,
          { kind: 'error', message: outcome.message },
          outcome.problems,
        );
        return;
    }
  }

  /** A conflict: the write waits for the author, Use mine or Keep theirs. */
  private holdBack({ write, conflicts, body }: HeldPart) {
    // What the rows show is behind: a refresh brings theirs.
    this.owed = true;
    this.fail(write, {
      kind: 'conflict',
      message: conflictMessage(conflicts),
      conflicts,
      body,
    });
  }

  private fail(
    write: QueuedWrite,
    failed: Omit<FailedWrite, 'write'>,
    problems: readonly ValidationProblem[] = [],
  ) {
    const full: FailedWrite = { ...failed, write };
    this.failed.set(write.id, full);
    this.setCells(write, (cell) => {
      const named = problems.filter(
        (problem) =>
          !!problem.path &&
          cell.paths.some((path) => covers(path, problem.path!)),
      );
      return {
        status: failed.kind === 'conflict' ? 'conflict' : 'error',
        overlay: cell.overlay ?? overlayFromSets(write.ops, cell.paths),
        message: named.length
          ? named.map((problem) => problem.detail).join(' ')
          : failed.message,
        seen: cell.seen,
        ...(failed.kind === 'blocked' ? { blocked: true } : {}),
        ...(failed.conflicts ? { conflicts: failed.conflicts } : {}),
      };
    });
    this.emit({ type: 'failed', failed: full });
  }

  /** Keeps the saved write's way back on the right stack. */
  private remember(
    write: QueuedWrite,
    before: Body,
    after: Body,
    proposed: boolean,
  ): UndoEntry | null {
    const ops = restoreOps(before, after);
    if (!ops.length) return null;
    const entry: UndoEntry = {
      id: (this.seq += 1),
      item: write.item,
      key: write.key,
      ops,
      cells: write.cells.map((cell) => ({
        ...cell,
        overlay: valuesAt(cell.paths, before),
        seen: valuesAt(cell.paths, after),
      })),
      fields: write.fields,
      summary: write.summary,
      proposed,
    };
    const cap = (stack: UndoEntry[]) =>
      stack.length > this.undoLimit
        ? stack.slice(stack.length - this.undoLimit)
        : stack;
    if (write.purpose === 'undo')
      this.redoStack = cap([...this.redoStack, entry]);
    else {
      this.undoStack = cap([...this.undoStack, entry]);
      if (write.purpose === 'edit') this.redoStack = [];
    }
    return entry;
  }

  private replay(
    stack: UndoEntry[],
    purpose: 'undo' | 'redo',
    filter?: (entry: UndoEntry) => boolean,
  ): boolean {
    let at = stack.length - 1;
    while (at >= 0 && filter && !filter(stack[at])) at -= 1;
    if (at < 0) return false;
    const [entry] = stack.splice(at, 1);
    this.enqueue(
      {
        item: entry.item,
        ops: entry.ops,
        cells: entry.cells,
        fields: entry.fields,
        summary: entry.summary,
      },
      purpose,
    );
    return true;
  }

  private stopIdle() {
    if (this.idleTimer === null) return;
    this.timers.clear(this.idleTimer);
    this.idleTimer = null;
  }

  /** Once every queue has been idle for `idleMs`, the one refresh owed. */
  private armIdle() {
    if (!this.owed || this.busy()) return;
    this.stopIdle();
    this.idleTimer = this.timers.set(() => {
      this.idleTimer = null;
      if (this.busy() || !this.owed) return;
      this.owed = false;
      void Promise.resolve(this.deps.refresh?.()).catch(() => undefined);
    }, this.idleMs);
  }
}
