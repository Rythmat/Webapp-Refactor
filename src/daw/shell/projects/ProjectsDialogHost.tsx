import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ProjectsDialogPart } from '@/daw/shell/lazyParts';
import { useOpenedOnce } from '@/daw/shell/lazyPart';
import { menuOpener } from '@/daw/ui/useReturnFocus';
import { useProjectsDialogStore } from './useProjectsDialogStore';

// ── Where the Projects dialog lives (milestone 1.4) ────────────────────────
//
// DawApp mounts this once. File ▸ Open…, the kept-work toast's View,
// '?projects=1' and openSession's deps open it through
// useProjectsDialogStore. The dialog shows a tick after the store opens,
// so a Radix menu that asked for it (File ▸ Open…) has closed and handed
// focus back to its trigger first: opened in the same tick, the menu's
// pointer-events lock and focus return fight the dialog's
// (components/ui/dialog.tsx). Focus goes back to that trigger on close.
// A Radix menu can stay mounted (state 'closed') past that tick with focus
// still on its item, so the dialog would hand focus back to a dead menu
// item: the menu's trigger takes focus first (menuOpener). The dialog's
// code loads when it is first opened (milestone 1.12a).

export function ProjectsDialogHost() {
  const { open, sortBy, focusDraftId, close } = useProjectsDialogStore(
    useShallow((s) => ({
      open: s.open,
      sortBy: s.sortBy,
      focusDraftId: s.focusDraftId,
      close: s.close,
    })),
  );
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => {
      menuOpener()?.focus({ preventScroll: true });
      setShown(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) close();
    },
    [close],
  );

  const opened = useOpenedOnce(open);
  if (!opened) return null;
  return (
    <ProjectsDialogPart
      open={open && shown}
      onOpenChange={onOpenChange}
      sortBy={sortBy}
      focusDraftId={focusDraftId}
    />
  );
}
