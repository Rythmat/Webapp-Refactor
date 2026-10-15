import { memo, useEffect } from 'react';
import {
  dismissSaveConflict,
  useSaveConflictStore,
} from '@/daw/commands/saveConflict';
import { saveProject } from '@/daw/commands/saveProject';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { ConfirmDialog } from '@/daw/ui/ConfirmDialog';

// ── "Changed on another device" (milestone 1.5) ────────────────────────────
//
// A save met a cloud copy that moved on since this session opened or last
// saved it (saveConflict.ts). Nothing was written; the student chooses:
// - Save as a copy (the action): this version becomes a new project,
//   '<name> (copy)', and the session follows it. The other copy stays as
//   it was.
// - Overwrite: this version replaces the saved one.
// - Cancel: nothing happens. The chip keeps "Couldn't save", and its Retry
//   asks again. The work is on this device either way.
// Mounted once in the editor (DawApp), beside the Projects dialog. Another
// session opening closes it: its question was about the one before.

export const SaveConflictDialog = memo(function SaveConflictDialog() {
  const conflict = useSaveConflictStore((s) => s.conflict);

  useEffect(
    () =>
      onSessionGeneration(() => {
        if (useSaveConflictStore.getState().conflict) dismissSaveConflict();
      }),
    [],
  );

  if (!conflict || conflict.generation !== getSessionGeneration()) return null;
  const { source, revision } = conflict;
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) dismissSaveConflict();
      }}
      title="Changed on another device"
      description="This project was saved somewhere else since you opened it here. Save your version as a new project, or replace the saved one with it."
      confirmLabel="Save as a copy"
      onConfirm={() => {
        dismissSaveConflict();
        const name = useStore.getState().projectName || 'Untitled Project';
        void saveProject({ source, saveAs: { name: `${name} (copy)` } });
      }}
      alternative={{
        label: 'Overwrite',
        onSelect: () => {
          dismissSaveConflict();
          void saveProject({ source, overwrite: { revision } });
        },
      }}
    />
  );
});
