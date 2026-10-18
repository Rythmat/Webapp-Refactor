import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { snapTicks, timelineSnapGrid } from '@/daw/time/timeModel';
import { promptDialog } from '@/daw/ui/DialogHost';

// ── Adding and naming markers (milestones 2.7 and 2.13) ────────────────────
//
// Markers are cues on the ruler. Create's toolbar had + Marker until it
// folded away (decision 16); now a marker is added from the ruler (its menu's
// Add marker here, or a double-click on it) or with Alt+M at the playhead,
// which the command palette (2.15) lists too. Each way asks for the name
// first, in the app's dialog, and adds the marker as one undo step; a cancel
// adds nothing.

/** Asks for a marker's name; null when cancelled. */
async function askName(
  title: string,
  defaultValue: string,
  confirmLabel: string,
): Promise<string | null> {
  const name = await promptDialog({
    title,
    label: 'Marker name',
    defaultValue,
    confirmLabel,
    maxLength: 40,
    validate: (value) => (value.trim() ? null : 'Type a name for it.'),
  });
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Adds a marker at song tick `tick` (snapped to the grid), once the student
 * has named it ('Marker N' unless they type another). Its id, or null.
 */
export async function addMarkerAt(tick: number): Promise<string | null> {
  const state = useStore.getState();
  const at = snapTicks(tick, timelineSnapGrid(state));
  const name = await askName(
    'Add a marker',
    `Marker ${state.markers.length + 1}`,
    'Add',
  );
  if (name === null) return null;
  return withTransaction('Add marker', () => {
    useStore.getState().addMarker(at, name);
    return useStore.getState().markers.at(-1)?.id ?? null;
  });
}

/** Adds a marker where the student hears the playhead. */
export function addMarkerAtPlayhead(): Promise<string | null> {
  return addMarkerAt(getPlayheadTick());
}

/** Renames marker `markerId` in the app's dialog. */
export async function renameMarker(markerId: string): Promise<void> {
  const marker = useStore.getState().markers.find((m) => m.id === markerId);
  if (!marker) return;
  const name = await askName('Rename marker', marker.name, 'Rename');
  // The marker may have gone while the dialog was open.
  if (name === null || name === marker.name) return;
  if (!useStore.getState().markers.some((m) => m.id === markerId)) return;
  withTransaction('Rename marker', () =>
    useStore.getState().updateMarker(markerId, { name }),
  );
}

/** Deletes marker `markerId`, as one undo step. */
export function deleteMarker(markerId: string): void {
  if (!useStore.getState().markers.some((m) => m.id === markerId)) return;
  withTransaction('Delete marker', () =>
    useStore.getState().removeMarker(markerId),
  );
}
