import { Download } from 'lucide-react';
import { memo } from 'react';
import { openExport } from '@/daw/shell/export/exportDialogStore';
import { IconButton } from '@/daw/ui/IconButton';

// ── Export (milestone 2.15; decision 16, ST11) ─────────────────────────────
//
// At the top bar's right, beside Settings: it opens the Export dialog
// (Audio | Notation). Its icon only, bare, as Settings is (owner,
// 2026-10-21: it was the bar's one white pill, with its label).

export const ExportPill = memo(function ExportPill() {
  return (
    <IconButton
      label="Export"
      icon={<Download />}
      variant="bare"
      size="lg"
      tooltipSide="bottom"
      data-testid="export-pill"
      data-tutorial-id="export-pill"
      onClick={() => openExport()}
    />
  );
});
