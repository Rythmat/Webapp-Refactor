import { useStore } from './index';
import type { ChordRegion } from './prismSlice';
import type { Track } from './tracksSlice';

// ── Undo/Redo Middleware ────────────────────────────────────────────────────
// Snapshot-based undo system. Captures track + chord region state on significant actions.
// High-frequency updates (position, volume drags) are excluded.

export interface UndoSnapshot {
  tracks: Track[];
  chordRegions: ChordRegion[];
  timestamp: number;
}

const MAX_UNDO_STACK = 50;
const undoStack: UndoSnapshot[] = [];
const redoStack: UndoSnapshot[] = [];

/** Take a snapshot of the current track + chord state for undo. */
export function pushUndo(): void {
  const state = useStore.getState();
  undoStack.push({
    tracks: structuredClone(state.tracks),
    chordRegions: structuredClone(state.chordRegions),
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
    chordRegions: structuredClone(state.chordRegions),
    timestamp: Date.now(),
  });

  const snapshot = undoStack.pop()!;
  useStore.setState({
    tracks: snapshot.tracks,
    chordRegions: snapshot.chordRegions,
  });
  return true;
}

/** Redo: restore the next state, push current to undo. */
export function redo(): boolean {
  if (redoStack.length === 0) return false;

  const state = useStore.getState();
  // Push current state to undo
  undoStack.push({
    tracks: structuredClone(state.tracks),
    chordRegions: structuredClone(state.chordRegions),
    timestamp: Date.now(),
  });

  const snapshot = redoStack.pop()!;
  useStore.setState({
    tracks: snapshot.tracks,
    chordRegions: snapshot.chordRegions,
  });
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
let lastChordJson = '';
let lastTracksRef: unknown = null;
let lastChordsRef: unknown = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function initUndoTracking(): void {
  const initialState = useStore.getState();
  lastTrackJson = JSON.stringify(initialState.tracks);
  lastChordJson = JSON.stringify(initialState.chordRegions);
  lastTracksRef = initialState.tracks;
  lastChordsRef = initialState.chordRegions;

  const handleChange = () => {
    const state = useStore.getState();

    // Cheap identity check: skip if object references haven't changed
    if (state.tracks === lastTracksRef && state.chordRegions === lastChordsRef) return;
    lastTracksRef = state.tracks;
    lastChordsRef = state.chordRegions;

    // Debounce: only stringify and capture after 300ms of no changes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const trackJson = JSON.stringify(state.tracks);
      const chordJson = JSON.stringify(state.chordRegions);
      if (trackJson === lastTrackJson && chordJson === lastChordJson) return;
      const prevTrackJson = lastTrackJson;
      const prevChordJson = lastChordJson;
      lastTrackJson = trackJson;
      lastChordJson = chordJson;
      try {
        const prevTracks = JSON.parse(prevTrackJson) as Track[];
        const prevChords = JSON.parse(prevChordJson) as ChordRegion[];
        undoStack.push({
          tracks: prevTracks,
          chordRegions: prevChords,
          timestamp: Date.now(),
        });
        if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
        redoStack.length = 0;
      } catch {
        // Ignore parse errors
      }
    }, 300);
  };

  useStore.subscribe((state) => state.tracks, handleChange);
  useStore.subscribe((state) => state.chordRegions, handleChange);
}
