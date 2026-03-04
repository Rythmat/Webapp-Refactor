import { useStore } from './index';
import type { Track } from './tracksSlice';

// ── Undo/Redo Middleware ────────────────────────────────────────────────────
// Snapshot-based undo system. Captures track state on significant actions.
// High-frequency updates (position, volume drags) are excluded.

export interface UndoSnapshot {
  tracks: Track[];
  timestamp: number;
}

const MAX_UNDO_STACK = 50;
const undoStack: UndoSnapshot[] = [];
const redoStack: UndoSnapshot[] = [];

/** Take a snapshot of the current track state for undo. */
export function pushUndo(): void {
  const state = useStore.getState();
  undoStack.push({
    tracks: structuredClone(state.tracks),
    timestamp: Date.now(),
  });
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  // Clear redo stack whenever a new action is performed
  redoStack.length = 0;
}

/** Undo: restore the previous state, push current to redo. */
export function undo(): boolean {
  if (undoStack.length === 0) return false;

  const state = useStore.getState();
  // Push current state to redo
  redoStack.push({
    tracks: structuredClone(state.tracks),
    timestamp: Date.now(),
  });

  const snapshot = undoStack.pop()!;
  useStore.setState({ tracks: snapshot.tracks });
  return true;
}

/** Redo: restore the next state, push current to undo. */
export function redo(): boolean {
  if (redoStack.length === 0) return false;

  const state = useStore.getState();
  // Push current state to undo
  undoStack.push({
    tracks: structuredClone(state.tracks),
    timestamp: Date.now(),
  });

  const snapshot = redoStack.pop()!;
  useStore.setState({ tracks: snapshot.tracks });
  return true;
}

/** Check if undo/redo are available. */
export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

// ── Auto-capture on significant store changes ───────────────────────────
// Subscribe to store and push undo snapshots when tracks change significantly.
// We debounce to avoid capturing every micro-change during drags.

let lastTrackJson = '';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function initUndoTracking(): void {
  lastTrackJson = JSON.stringify(useStore.getState().tracks);

  useStore.subscribe(
    (state) => state.tracks,
    (tracks) => {
      const json = JSON.stringify(tracks);
      if (json === lastTrackJson) return;

      // Debounce: only capture after 300ms of no changes
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Don't push if the change was from undo/redo itself
        const prevJson = lastTrackJson;
        lastTrackJson = json;
        if (prevJson !== json) {
          // Push the PREVIOUS state, not the current one
          try {
            const prevTracks = JSON.parse(prevJson) as Track[];
            undoStack.push({ tracks: prevTracks, timestamp: Date.now() });
            if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
            redoStack.length = 0;
          } catch {
            // Ignore parse errors
          }
        }
      }, 300);
    },
  );
}
