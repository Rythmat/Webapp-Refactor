import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import type { SaveSource } from './cloudSaveStore';

// ── A save that met a newer cloud copy (milestone 1.5) ─────────────────────
//
// A save says which revision of the project it is based on; when the cloud
// copy has moved on since (another device or tab saved it), the API answers
// 409 revision_conflict and nothing is written. saveProject asks here, and
// SaveConflictDialog (src/daw/shell/topbar) asks the student: save this
// version as a copy, or overwrite the saved one. Closing it leaves the save
// failed; the chip's Retry asks again. The work stays on this device
// whatever they choose.
//
// No React and no save import: saveProject loads it, and the dialog does
// the saving.

export interface SaveConflict {
  /** The cloud copy's revision now, which an Overwrite is based on. */
  revision: number | undefined;
  /** Which control asked for the save that met the conflict. */
  source: SaveSource;
  /** The session it was asked in: the dialog closes when another opens. */
  generation: number;
}

export const useSaveConflictStore: UseBoundStore<
  StoreApi<{ conflict: SaveConflict | null }>
> = create<{ conflict: SaveConflict | null }>()(() => ({ conflict: null }));

/** Ask the student what to do about a conflict in the live session. */
export function askSaveConflict(
  conflict: Omit<SaveConflict, 'generation'>,
): void {
  useSaveConflictStore.setState({
    conflict: { ...conflict, generation: getSessionGeneration() },
  });
}

/** Close the question (a choice, Cancel, or another session opened). */
export function dismissSaveConflict(): void {
  useSaveConflictStore.setState({ conflict: null });
}
