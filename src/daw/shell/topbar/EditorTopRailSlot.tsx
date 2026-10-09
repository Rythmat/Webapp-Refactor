import { createPortal } from 'react-dom';
import { useTopRailSlot } from '@/components/ClassroomLayout/topRailSlot';
import { useStore } from '@/daw/store';
import { TooltipGroup } from '@/daw/ui/Tooltip';
import { SaveChipAnnouncer, SaveStatusChip } from './SaveStatusChip';
import { UndoRedoButtons } from './UndoRedoButtons';

// ── The editor's part of the TopRail (milestone 1.4, Stage A) ──────────────
//
// Save chip · Undo · Redo, portaled into the app TopRail's leading slot
// while the editor is mounted, so the TransportBar keeps every control
// where it is (lesson anchors included). The practice screen has its own
// header with the chip (PracticeHeader), so nothing shows here then; Undo
// and Redo are off in the practice view, as Cmd+Z is. Milestone 2.5 moves
// the same components into the editor's own top bar.
//
// The TopRail is hidden below 768 px (md), so the chip's live region is
// rendered on its own into document.body: Saved, Couldn't save and Audio
// not saved yet are still announced in a narrow window. (The visible chip
// below md is milestone 2.5's top bar.)
//
// DawApp mounts it once; it reads only the view, so it re-renders when the
// view changes and never on project edits.

export function EditorTopRailSlot() {
  const slot = useTopRailSlot();
  const practiceView = useStore((s) => s.currentView === 'practice');
  const practiceScreen = useStore(
    (s) => s.currentView === 'practice' && s.practiceSession != null,
  );
  if (slot === null || practiceScreen) return null;
  return (
    <>
      {createPortal(
        <TooltipGroup>
          <div
            className="flex min-w-0 items-center gap-2"
            data-testid="editor-toprail"
          >
            <SaveStatusChip announce={false} />
            {practiceView ? null : <UndoRedoButtons />}
          </div>
        </TooltipGroup>,
        slot,
      )}
      {createPortal(<SaveChipAnnouncer />, document.body)}
    </>
  );
}
