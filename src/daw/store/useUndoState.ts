import { useSyncExternalStore } from 'react';
import {
  smartCanRedo,
  smartCanUndo,
  subscribeUndo,
  undoVersion,
} from './undoMiddleware';

// ── Watching the undo stacks ───────────────────────────────────────────────
// The stacks are plain module arrays rather than store state, so a button
// drawn from them needs telling when they change. The version number is the
// snapshot `useSyncExternalStore` compares; the flags are read fresh from it.

export interface UndoState {
  canUndo: boolean;
  canRedo: boolean;
}

/** Whether undo and redo have anything to do, kept live. */
export function useUndoState(): UndoState {
  useSyncExternalStore(subscribeUndo, undoVersion, () => 0);
  return { canUndo: smartCanUndo(), canRedo: smartCanRedo() };
}
