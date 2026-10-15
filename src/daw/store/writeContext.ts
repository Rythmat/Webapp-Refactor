// ── Who is writing, and inside what ────────────────────────────────────────
//
// The context of the store write being made now: its origin, and whether it
// is part of a transaction (one undoable edit made of several writes). The
// undo history (history.ts) records by it, and the collab middleware sends a
// transaction to the shared document as one update when it ends. It imports
// nothing, so the store's middleware can read it without a cycle.

/** Who made a store write; only 'user' writes are recorded for undo. */
export type WriteOrigin = 'user' | 'system' | 'remote' | 'seed' | 'undo';

let origin: WriteOrigin = 'user';

/** The origin of the write being made now. */
export function currentOrigin(): WriteOrigin {
  return origin;
}

/** Runs `fn` with its store writes tagged `as`. */
export function withOrigin<T>(as: WriteOrigin, fn: () => T): T {
  const outer = origin;
  origin = as;
  try {
    return fn();
  } finally {
    origin = outer;
  }
}

let depth = 0;
let label: string | null = null;
const endListeners = new Set<() => void>();

/** Whether a transaction is open. */
export function inTransaction(): boolean {
  return depth > 0;
}

/**
 * The outermost transaction's label, while it runs and while its end
 * listeners do; null outside one.
 */
export function transactionLabel(): string | null {
  return label;
}

/**
 * Runs `fn` as one transaction named `name`; a transaction inside another
 * joins it. When the outermost ends, each end listener runs once.
 */
export function runTransaction<T>(name: string, fn: () => T): T {
  if (depth === 0) label = name;
  depth += 1;
  try {
    return fn();
  } finally {
    depth -= 1;
    if (depth === 0) {
      try {
        for (const listener of endListeners) listener();
      } finally {
        label = null;
      }
    }
  }
}

/** Calls `listener` whenever an outermost transaction ends. */
export function onTransactionEnd(listener: () => void): () => void {
  endListeners.add(listener);
  return () => {
    endListeners.delete(listener);
  };
}
