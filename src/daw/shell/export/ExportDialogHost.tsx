import { ExportDialogPart } from '@/daw/shell/lazyParts';
import { useExportDialogStore } from './exportDialogStore';

// DawApp mounts this once. The Export pill, Project ▾, a track's menu and
// the command palette open the dialog (openExport); it is mounted only while
// open, since it reads the whole track list (shell-17), and its code loads
// when first opened (1.12a).

export function ExportDialogHost() {
  const isOpen = useExportDialogStore((s) => s.isOpen);
  const close = useExportDialogStore((s) => s.close);
  if (!isOpen) return null;
  return (
    <ExportDialogPart
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
}
