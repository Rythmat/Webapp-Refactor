import { useEffect, useState } from 'react';
import { lazyPart } from '@/daw/shell/lazyPart';
import { menuOpener } from '@/daw/ui/useReturnFocus';
import { useReportProblemStore } from './useReportProblemStore';

// ── Where Report a problem lives (milestone 2.11) ──────────────────────────
//
// DawApp mounts this once, next to ShortcutSheetHost. The dialog is mounted
// only while open, so its details are read afresh each time, and its code
// loads when it is first opened. It shows a tick after the store opens, so
// the '⋯' menu that asked for it has closed and handed focus back to its
// trigger first (as ProjectsDialogHost); focus goes back there on close.

const ReportProblemPart = lazyPart(
  () => import('./ReportProblemDialog').then((m) => m.ReportProblemDialog),
  { name: 'report dialog' },
);

export function ReportProblemHost() {
  const isOpen = useReportProblemStore((s) => s.isOpen);
  const close = useReportProblemStore((s) => s.close);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => {
      menuOpener()?.focus({ preventScroll: true });
      setShown(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen || !shown) return null;
  return (
    <ReportProblemPart
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
}
