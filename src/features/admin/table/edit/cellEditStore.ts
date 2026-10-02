import { getPath } from '@/content/bodyPaths';
import { sameValue } from '../../content/itemEditor/rebase';
import type { OpConflict } from './cellOps';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  What each edited cell shows while its write is on its way
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A cell commit is written in the background (`writeQueue.ts`), and the
 * grid's rows only change once the working graph is rebuilt from the
 * server's new exports, which takes a moment. Meanwhile the cell shows what
 * was written (its overlay) and how the write stands, from this store:
 *
 *  - `queued` — waiting for an earlier write to the same item;
 *  - `saving` — being written;
 *  - `saved` — written; `proposed` — written as an editor's proposal;
 *  - `error` — not written, with the reason and a Retry;
 *  - `conflict` — someone else changed the value first: Use mine, or
 *    Keep theirs;
 *  - `in-panel` — taken into the row panel's unsaved changes instead, for
 *    its Save to send.
 *
 * A cell is named `table|rowKey|columnId`. The store is external to React
 * so a commit re-renders one row, not the grid: each row reads its own
 * snapshot (`row`), which keeps its identity until a cell of that row
 * changes, and subscribes to that row alone (`subscribeRow`), for
 * `useSyncExternalStore`.
 *
 * A saved cell lets go of its overlay once the model has caught up — the
 * body the rows are built from holds what was written (`settle`, run when a
 * new model arrives) — or ten seconds after it was saved, whichever comes
 * first, so a value the server normalised never sticks.
 *
 * Pure: no React (the purity test holds this); the timers can be handed in.
 */

export type CellStatus =
  | 'queued'
  | 'saving'
  | 'saved'
  | 'proposed'
  | 'error'
  | 'conflict'
  | 'in-panel';

/** One cell of one table. */
export interface CellRef {
  table: string;
  rowKey: string;
  column: string;
}

export const cellKeyOf = ({ table, rowKey, column }: CellRef): string =>
  `${table}|${rowKey}|${column}`;

const rowKeyOf = (table: string, rowKey: string) => `${table}|${rowKey}`;

/**
 * What the cell shows meanwhile: the item's value at each body path the
 * cell reads, as the write leaves it — `{ year: 1983 }`, or
 * `{ activeFrom: 1961, activeTo: 1984 }`. A path the write takes away is
 * there with `undefined`.
 */
export type CellOverlay = Readonly<Record<string, unknown>>;

/** A value a write put on an item, to tell when the model has it. */
export interface WrittenValue {
  /** The item, as `itemKeyOf` names it: `song:africa`. */
  item: string;
  path: string;
  value: unknown;
}

export interface CellEditState {
  status: CellStatus;
  overlay?: CellOverlay;
  /** What went wrong, or where the edit went; shown and announced. */
  message?: string;
  /** What the author saw in the cell when they committed. */
  seen?: unknown;
  /** What the write put where: once the model holds it, the cell settles. */
  written?: readonly WrittenValue[];
  /** The write it belongs to, for Retry, Discard, Use mine and Keep theirs. */
  write?: number;
  /** Someone's proposal on the item stops it: the cell offers Open row. */
  blocked?: boolean;
  /** For a conflict: each value that changed under the edit. */
  conflicts?: readonly OpConflict[];
  /** When it last changed, by the store's clock. */
  since: number;
}

/** Timers, injectable for tests. */
export interface Timers {
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export const REAL_TIMERS: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface CellEditStoreOptions {
  now?: () => number;
  timers?: Timers;
  /** How long a saved cell keeps its overlay at most. */
  settleAfterMs?: number;
}

/** A body path as `getPath` reads it: a list's `[]` names the list. */
export const fieldPath = (path: string): string => path.replace(/\[\]$/, '');

const EMPTY: ReadonlyMap<string, CellEditState> = new Map();

/** Saved, one way or the other: the overlay waits for the model. */
const isSettling = (status: CellStatus) =>
  status === 'saved' || status === 'proposed';

type Body = Readonly<Record<string, unknown>>;

/** Whether `body` holds every value `written` put on `item`'s body. */
export const holdsWritten = (
  written: readonly WrittenValue[],
  bodyOf: (item: string) => Body | null | undefined,
): boolean =>
  written.every((value) => {
    const body = bodyOf(value.item);
    return (
      !!body && sameValue(getPath(body, fieldPath(value.path)), value.value)
    );
  });

export class CellEditStore {
  private readonly now: () => number;
  private readonly timers: Timers;
  private readonly settleAfterMs: number;
  private readonly cells = new Map<
    string,
    { ref: CellRef; state: CellEditState }
  >();
  /** Each row's snapshot, rebuilt when one of its cells changes. */
  private readonly rows = new Map<string, ReadonlyMap<string, CellEditState>>();
  private readonly rowListeners = new Map<string, Set<() => void>>();
  private readonly listeners = new Set<() => void>();
  private readonly expiries = new Map<string, unknown>();

  constructor({
    now = Date.now,
    timers = REAL_TIMERS,
    settleAfterMs = 10_000,
  }: CellEditStoreOptions = {}) {
    this.now = now;
    this.timers = timers;
    this.settleAfterMs = settleAfterMs;
  }

  /** The cell's state, if it has one. */
  get = (ref: CellRef): CellEditState | undefined =>
    this.cells.get(cellKeyOf(ref))?.state;

  /**
   * A row's cells that have a state, by column id: the same map until one
   * of them changes (what `useSyncExternalStore` needs of a snapshot).
   */
  row = (table: string, rowKey: string): ReadonlyMap<string, CellEditState> =>
    this.rows.get(rowKeyOf(table, rowKey)) ?? EMPTY;

  /** Told when one of this row's cells changes, and only then. */
  subscribeRow = (
    table: string,
    rowKey: string,
    listener: () => void,
  ): (() => void) => {
    const key = rowKeyOf(table, rowKey);
    let set = this.rowListeners.get(key);
    if (!set) {
      set = new Set();
      this.rowListeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.rowListeners.delete(key);
    };
  };

  /** Told when any cell changes (the live region, the tests). */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Every cell with a state, and where it is. */
  all = (): { ref: CellRef; state: CellEditState }[] => [
    ...this.cells.values(),
  ];

  /**
   * Sets the cell's state. A saved one lets go of its overlay after
   * `settleAfterMs` unless something changes it first.
   */
  set = (ref: CellRef, state: Omit<CellEditState, 'since'>): void => {
    const key = cellKeyOf(ref);
    const next: CellEditState = { ...state, since: this.now() };
    this.cells.set(key, {
      ref: { table: ref.table, rowKey: ref.rowKey, column: ref.column },
      state: next,
    });
    this.stopExpiry(key);
    if (isSettling(next.status))
      this.expiries.set(
        key,
        this.timers.set(() => {
          this.expiries.delete(key);
          if (this.cells.get(key)?.state === next) this.clear(ref);
        }, this.settleAfterMs),
      );
    this.changed(ref);
  };

  /** Takes the cell's state away: it shows the model again. */
  clear = (ref: CellRef): void => {
    const key = cellKeyOf(ref);
    this.stopExpiry(key);
    if (!this.cells.delete(key)) return;
    this.changed(ref);
  };

  /** Clears every cell `test` picks; says how many. */
  clearWhere = (
    test: (state: CellEditState, ref: CellRef) => boolean,
  ): number => {
    const picked = [...this.cells.values()].filter(({ ref, state }) =>
      test(state, ref),
    );
    for (const { ref } of picked) this.clear(ref);
    return picked.length;
  };

  /**
   * A new model has arrived: every saved cell whose written values the
   * model's bodies now hold lets go of its overlay. `bodyOf` answers an
   * item's body as the model has it (`itemKeyOf`), or nothing when the
   * model does not hold that item. Says how many cells settled.
   */
  settle = (bodyOf: (item: string) => Body | null | undefined): number =>
    this.clearWhere(
      (state) =>
        isSettling(state.status) &&
        !!state.written &&
        holdsWritten(state.written, bodyOf),
    );

  /** Stops every timer: for a store that is being dropped. */
  dispose = (): void => {
    for (const handle of this.expiries.values()) this.timers.clear(handle);
    this.expiries.clear();
  };

  private stopExpiry(key: string) {
    const handle = this.expiries.get(key);
    if (handle === undefined) return;
    this.timers.clear(handle);
    this.expiries.delete(key);
  }

  private changed(ref: CellRef) {
    const key = rowKeyOf(ref.table, ref.rowKey);
    const prefix = `${key}|`;
    const cells = new Map<string, CellEditState>();
    for (const [cellKey, { ref: at, state }] of this.cells)
      if (cellKey.startsWith(prefix)) cells.set(at.column, state);
    if (cells.size) this.rows.set(key, cells);
    else this.rows.delete(key);
    for (const listener of [...(this.rowListeners.get(key) ?? [])]) listener();
    for (const listener of [...this.listeners]) listener();
  }
}
