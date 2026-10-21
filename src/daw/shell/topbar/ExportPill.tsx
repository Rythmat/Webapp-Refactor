import { Download } from 'lucide-react';
import { memo } from 'react';
import { openExport } from '@/daw/shell/export/exportDialogStore';
import { Button } from '@/daw/ui/Button';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The Export pill (milestone 2.15; decision 16, ST11) ────────────────────
//
// The top bar's one white pill, at its right: it opens the Export dialog
// (Audio | Notation). In a narrow window the bar folds it to its icon.

export const ExportPill = memo(function ExportPill({
  iconOnly = false,
}: {
  iconOnly?: boolean;
}) {
  const pill = (
    <Button
      variant="primary"
      size="pill"
      data-testid="export-pill"
      data-tutorial-id="export-pill"
      aria-label={iconOnly ? 'Export' : undefined}
      className={iconOnly ? 'w-9 px-0' : undefined}
      onClick={() => openExport()}
    >
      <Download strokeWidth={2.5} />
      {iconOnly ? null : 'Export'}
    </Button>
  );
  return iconOnly ? (
    <Tooltip content="Export" side="bottom">
      {pill}
    </Tooltip>
  ) : (
    pill
  );
});
