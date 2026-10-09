import { Redo2, Undo2 } from 'lucide-react';
import { memo, useSyncExternalStore } from 'react';
import { isBusyPhase, useSessionStore } from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import {
  smartCanRedo,
  smartCanUndo,
  smartRedo,
  smartUndo,
  subscribeUndo,
} from '@/daw/store/undoMiddleware';
import { IconButton } from '@/daw/ui/IconButton';
import { modShortcut } from './platformKeys';

// ── Undo and Redo (milestone 1.4) ──────────────────────────────────────────
//
// The whole project's undo, as two 28 px buttons beside the save chip. They
// go through smartUndo/smartRedo (the Yjs undo manager in a shared session)
// and are enabled from the undo stacks, re-rendering only when canUndo or
// canRedo flips (not on every undoable edit). Off while a session opens and
// while recording (undoing the step that armed or made the record track
// mid-take would leave the take nowhere to land). Shortcut labels follow the keyboard:
// ⌘Z on a Mac, Ctrl+Z on a Chromebook. Milestone 1.9 replaces the undo
// internals; 2.5 moves these into the editor's own top bar.

const UNDO_KEYS = modShortcut('z');
const REDO_KEYS = modShortcut('z', { shift: true });

const CAN_UNDO = 1;
const CAN_REDO = 2;

/** canUndo and canRedo as one number, so a push that flips neither is free. */
function undoFlags(): number {
  return (smartCanUndo() ? CAN_UNDO : 0) | (smartCanRedo() ? CAN_REDO : 0);
}

/** 14 px icons in the 28 px button, like the Score bar's. */
const ICON_SIZE = '[&_svg]:size-3.5';

export const UndoRedoButtons = memo(function UndoRedoButtons() {
  const flags = useSyncExternalStore(subscribeUndo, undoFlags, () => 0);
  const canUndo = (flags & CAN_UNDO) !== 0;
  const canRedo = (flags & CAN_REDO) !== 0;
  const opening = useSessionStore((s) => isBusyPhase(s.phase));
  const recording = useStore((s) => s.isRecording);
  const blocked = opening || recording;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <IconButton
        label="Undo"
        icon={<Undo2 />}
        shortcut={UNDO_KEYS.label}
        aria-keyshortcuts={UNDO_KEYS.aria}
        data-testid="undo-button"
        size="md"
        tooltipSide="bottom"
        className={ICON_SIZE}
        disabled={!canUndo || blocked}
        onClick={() => {
          smartUndo();
        }}
      />
      <IconButton
        label="Redo"
        icon={<Redo2 />}
        shortcut={REDO_KEYS.label}
        aria-keyshortcuts={REDO_KEYS.aria}
        data-testid="redo-button"
        size="md"
        tooltipSide="bottom"
        className={ICON_SIZE}
        disabled={!canRedo || blocked}
        onClick={() => {
          smartRedo();
        }}
      />
    </div>
  );
});
