import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ProjectsDialog } from './ProjectsDialog';
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
// item: the menu's trigger takes focus first (menuOpener).

/**
 * When focus sits in a Radix menu, that menu's trigger (named by the
 * content's aria-labelledby); otherwise null.
 */
function menuOpener(
  active: Element | null = document.activeElement,
): HTMLElement | null {
  const menu = active?.closest('[role=menu]');
  const triggerId = menu?.getAttribute('aria-labelledby');
  if (!triggerId) return null;
  const trigger = document.getElementById(triggerId);
  return trigger instanceof HTMLElement && trigger.isConnected ? trigger : null;
}

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

  return (
    <ProjectsDialog
      open={open && shown}
      onOpenChange={onOpenChange}
      sortBy={sortBy}
      focusDraftId={focusDraftId}
    />
  );
}
