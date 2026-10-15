import * as Y from 'yjs';
import { Item, UndoManager, isParentOf, iterateDeletedStructs } from 'yjs';
import { ORIGIN_LOCAL } from '@/daw/collab/types';
import {
  UNDOABLE_META,
  collabLabelFor,
  collabUndoScope,
} from '@/daw/collab/undoScope';
import {
  IDLE_MS,
  MAX_HISTORY,
  canRedo,
  canUndo,
  notifyHistory,
  redo,
  redoLabel,
  setHistoryPaused,
  undo,
  undoLabel,
} from './history';

// ── Undo and redo ───────────────────────────────────────────────────────────
// Two histories, one at a time:
// - Working alone, a student's edits go to the project history (history.ts):
//   labelled entries of what each edit changed, over the registry's undo
//   fields.
// - In a shared session, the Yjs undo manager below stands in for it. It
//   undoes only this student's changes to the shared document, leaving
//   everyone else's, over the same registry fields (collab/undoScope.ts).
// smartUndo and smartRedo are the entry points: they pick the one in use.

export {
  startHistory as initUndoTracking,
  resetHistory as resetUndoHistory,
  subscribeHistory as subscribeUndo,
  historyVersion as undoVersion,
  canRedo,
  canUndo,
  flushHistory,
  redo,
  rewriteHistory,
  undo,
  withTransaction,
  withoutHistory,
} from './history';

// ── Collab-mode undo (Yjs UndoManager) ──────────────────────────────────

let _yjsUndoManager: UndoManager | null = null;
/** The label the next stack item takes (a labelled edit, or an undo's). */
let nextLabel: string | null = null;

/** The scope type a change belongs to, by its name in the document. */
function scopeNames(
  um: UndoManager,
  changed: ReadonlyMap<unknown, unknown>,
): string[] {
  const names = new Map<unknown, string>();
  for (const [name, type] of um.doc.share) names.set(type, name);
  const found = new Set<string>();
  for (const type of changed.keys()) {
    let root: Y.AbstractType<unknown> = type as Y.AbstractType<unknown>;
    while (root._item) root = root._item.parent as Y.AbstractType<unknown>;
    const name = names.get(root);
    if (name) found.add(name);
  }
  return [...found];
}

/**
 * Drops the oldest steps past the cap, and lets the document forget what
 * they kept alive for undo (the Yjs undo manager has no cap of its own, and
 * keeps every deleted note it could bring back).
 */
function trim(um: UndoManager): void {
  if (um.undoStack.length <= MAX_HISTORY) return;
  const dropped = um.undoStack.splice(0, um.undoStack.length - MAX_HISTORY);
  um.doc.transact((tr) => {
    for (const item of dropped) {
      iterateDeletedStructs(tr, item.deletions, (struct) => {
        if (
          !(struct instanceof Item) ||
          !um.scope.some((type) =>
            isParentOf(type as Y.AbstractType<unknown>, struct),
          )
        ) {
          return;
        }
        let kept: Item | null = struct;
        while (kept && kept.keep) {
          kept.keep = false;
          kept = (kept.parent as Y.AbstractType<unknown>)._item;
        }
      });
    }
  });
}

/**
 * Initialize Yjs-based undo for collab mode: the project history pauses (it
 * held the solo session's steps) until destroyCollabUndo.
 */
export function initCollabUndo(doc: Y.Doc): void {
  destroyCollabUndo();
  setHistoryPaused(true);
  const um = new UndoManager(collabUndoScope(doc), {
    trackedOrigins: new Set([ORIGIN_LOCAL]),
    // Writes outside a labelled edit gather as solo undo's do; a labelled
    // edit is its own step (beginCollabEdit).
    captureTimeout: IDLE_MS,
    captureTransaction: (tr) => tr.meta.get(UNDOABLE_META) !== false,
  });
  um.on('stack-item-added', ({ stackItem, type, changedParentTypes }) => {
    if (!stackItem.meta.has('label')) {
      stackItem.meta.set(
        'label',
        nextLabel ?? collabLabelFor(scopeNames(um, changedParentTypes)),
      );
    }
    // The cap waits for the transaction that grew the stack to finish.
    if (type === 'undo') queueMicrotask(() => trim(um));
    notifyHistory();
  });
  um.on('stack-item-popped', notifyHistory);
  _yjsUndoManager = um;
  notifyHistory();
}

/** Tear down the collab undo manager; the project history resumes. */
export function destroyCollabUndo(): void {
  if (!_yjsUndoManager) return;
  _yjsUndoManager.destroy();
  _yjsUndoManager = null;
  setHistoryPaused(false);
  notifyHistory();
}

/** Check if collab undo is active. */
export function isCollabUndoActive(): boolean {
  return _yjsUndoManager !== null;
}

/**
 * Around a labelled edit's one update to the shared document (the bridge
 * calls these): the edit becomes its own undo step with its label, rather
 * than joining a change made just before or after it.
 */
export function beginCollabEdit(label: string): void {
  if (!_yjsUndoManager) return;
  _yjsUndoManager.stopCapturing();
  nextLabel = label;
}

export function endCollabEdit(): void {
  if (!_yjsUndoManager) return;
  _yjsUndoManager.stopCapturing();
  nextLabel = null;
}

/** Runs an undo or redo, handing the step's label to the one it makes. */
function step(um: UndoManager, stack: 'undoStack' | 'redoStack'): boolean {
  const items = um[stack];
  if (items.length === 0) return false;
  nextLabel = (items[items.length - 1].meta.get('label') as string) ?? null;
  try {
    if (stack === 'undoStack') um.undo();
    else um.redo();
  } finally {
    nextLabel = null;
  }
  notifyHistory();
  return true;
}

/**
 * Smart undo: uses Yjs UndoManager in collab mode, the project history in
 * solo mode.
 */
export function smartUndo(): boolean {
  if (_yjsUndoManager) return step(_yjsUndoManager, 'undoStack');
  return undo();
}

/**
 * Smart redo: uses Yjs UndoManager in collab mode, the project history in
 * solo mode.
 */
export function smartRedo(): boolean {
  if (_yjsUndoManager) return step(_yjsUndoManager, 'redoStack');
  return redo();
}

export function smartCanUndo(): boolean {
  if (_yjsUndoManager) return _yjsUndoManager.canUndo();
  return canUndo();
}

export function smartCanRedo(): boolean {
  if (_yjsUndoManager) return _yjsUndoManager.canRedo();
  return canRedo();
}

/** What Undo would undo, in words ('Change volume'); null when nothing. */
export function smartUndoLabel(): string | null {
  if (_yjsUndoManager) {
    const item = _yjsUndoManager.undoStack.at(-1);
    return (item?.meta.get('label') as string | undefined) ?? null;
  }
  return undoLabel();
}

/** What Redo would redo, in words; null when nothing. */
export function smartRedoLabel(): string | null {
  if (_yjsUndoManager) {
    const item = _yjsUndoManager.redoStack.at(-1);
    return (item?.meta.get('label') as string | undefined) ?? null;
  }
  return redoLabel();
}
