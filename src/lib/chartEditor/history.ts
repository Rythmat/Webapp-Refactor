/**
 * Undo and redo for an editor that works on one immutable value.
 *
 * Deliberately not a store, a hook or a context: a history is a value, and
 * every operation on it is a pure function. That is what lets the same history
 * sit behind the back-office chart editor and the Studio's without either of
 * them owning it.
 *
 * Two things make an undo stack feel right rather than merely correct:
 *
 * - **Coalescing.** Typing "Bmin7" is one edit to a musician and five
 *   keystrokes to a computer. Edits that share a `coalesceKey` and land within
 *   `coalesceMs` of each other collapse into one step, so undo goes back to
 *   before the chord, not back one letter.
 * - **A bound.** A chart editor left open all day should not hold every state
 *   the song has ever been in. Past steps beyond `limit` are dropped oldest
 *   first; redo is capped by the same number.
 */

export interface HistoryEntry<T> {
  value: T;
  /** What this step was, for a tooltip: "Undo delete bar". */
  label: string;
  /** Edits with the same key, close in time, become one step. */
  coalesceKey?: string;
  at: number;
}

export interface History<T> {
  present: HistoryEntry<T>;
  past: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
  limit: number;
  coalesceMs: number;
}

export interface HistoryOptions {
  /** How many undo steps to keep. */
  limit?: number;
  /** How close in time two same-key edits must be to become one step. */
  coalesceMs?: number;
}

export const createHistory = <T>(
  value: T,
  { limit = 100, coalesceMs = 600 }: HistoryOptions = {},
): History<T> => ({
  present: { value, label: 'Open', at: 0 },
  past: [],
  future: [],
  limit: Math.max(1, limit),
  coalesceMs: Math.max(0, coalesceMs),
});

const trim = <T>(past: HistoryEntry<T>[], limit: number): HistoryEntry<T>[] =>
  past.length <= limit ? past : past.slice(past.length - limit);

/**
 * Record an edit.
 *
 * An edit that leaves the value untouched is not a step — a click that
 * selected a bar without changing it should not cost an undo. Any real edit
 * clears the redo stack, because the future it led to is no longer reachable.
 */
export function record<T>(
  history: History<T>,
  value: T,
  label: string,
  options: { coalesceKey?: string; at?: number } = {},
): History<T> {
  if (Object.is(value, history.present.value)) return history;
  const at = options.at ?? 0;
  const entry: HistoryEntry<T> = {
    value,
    label,
    at,
    ...(options.coalesceKey ? { coalesceKey: options.coalesceKey } : {}),
  };

  // Same key, close enough in time: replace the present rather than stack.
  const merges =
    !!options.coalesceKey &&
    history.present.coalesceKey === options.coalesceKey &&
    at - history.present.at <= history.coalesceMs;

  return {
    ...history,
    present: entry,
    past: merges
      ? history.past
      : trim([...history.past, history.present], history.limit),
    future: [],
  };
}

/**
 * Stop the next edit merging into the last one.
 *
 * Called when focus leaves a field or the selection moves: two chords typed in
 * a row are two edits even if the second follows quickly.
 */
export const seal = <T>(history: History<T>): History<T> =>
  history.present.coalesceKey === undefined
    ? history
    : { ...history, present: { ...history.present, coalesceKey: undefined } };

export const canUndo = <T>(history: History<T>): boolean =>
  history.past.length > 0;

export const canRedo = <T>(history: History<T>): boolean =>
  history.future.length > 0;

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    ...history,
    present: previous,
    past: history.past.slice(0, -1),
    future: trim([history.present, ...history.future], history.limit),
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return {
    ...history,
    present: next,
    past: trim([...history.past, history.present], history.limit),
    future: rest,
  };
}

/** What Undo would undo, for the menu item — null when there is nothing. */
export const undoLabel = <T>(history: History<T>): string | null =>
  canUndo(history) ? history.present.label : null;

/** What Redo would redo. */
export const redoLabel = <T>(history: History<T>): string | null =>
  history.future[0]?.label ?? null;

/** The value being edited. */
export const current = <T>(history: History<T>): T => history.present.value;
