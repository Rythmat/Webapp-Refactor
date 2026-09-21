import * as Y from 'yjs';
import { UndoManager } from 'yjs';
import { useStore } from './index';
import type { ChordRegion } from './prismSlice';
import type { Track } from './tracksSlice';
import type { LeadSheetRepeat, LeadSheetSection } from './uiSlice';
import type { ScoreTextMark } from '@/daw/components/Score/scoreText';
import { ORIGIN_LOCAL } from '@/daw/collab/types';

// ── Undo/Redo Middleware ────────────────────────────────────────────────────
// Dual-mode undo system:
// - Solo mode: Snapshot-based (captures full tracks + chord regions)
// - Collab mode: Yjs UndoManager (per-user, conflict-free)
// High-frequency updates (position, volume drags) are excluded.

/**
 * Score markings and layout. Writing a slur, a repeat or a system break is an
 * edit like any other, so undo has to carry them alongside the notes — without
 * this, undo after a tie or a rehearsal mark appeared to do nothing.
 */
export interface ScoreMarkSnapshot {
  scoreArticulations: string[];
  scoreSlurs: string[];
  scoreSpellings: string[];
  scoreSystemBreaks: number[];
  scorePageBreaks: number[];
  scoreSystemRuns: Array<[number, number]>;
  scoreTextMarks: ScoreTextMark[];
  scoreChordHidden: string[];
  leadSheetSections: LeadSheetSection[];
  leadSheetRepeats: LeadSheetRepeat[];
  measureRowSizes: number[] | null;
  measureFermatas: number[] | null;
}

export interface UndoSnapshot {
  tracks: Track[];
  chordRegions: ChordRegion[];
  marks: ScoreMarkSnapshot;
  timestamp: number;
}

const MARK_KEYS = [
  'scoreArticulations',
  'scoreSlurs',
  'scoreSpellings',
  'scoreSystemBreaks',
  'scorePageBreaks',
  'scoreSystemRuns',
  'scoreTextMarks',
  'scoreChordHidden',
  'leadSheetSections',
  'leadSheetRepeats',
  'measureRowSizes',
  'measureFermatas',
] as const;

function readMarks(): ScoreMarkSnapshot {
  const state = useStore.getState();
  return structuredClone({
    scoreArticulations: state.scoreArticulations,
    scoreSlurs: state.scoreSlurs,
    scoreSpellings: state.scoreSpellings,
    scoreSystemBreaks: state.scoreSystemBreaks,
    scorePageBreaks: state.scorePageBreaks,
    scoreSystemRuns: state.scoreSystemRuns,
    scoreTextMarks: state.scoreTextMarks,
    scoreChordHidden: state.scoreChordHidden,
    leadSheetSections: state.leadSheetSections,
    leadSheetRepeats: state.leadSheetRepeats,
    measureRowSizes: state.measureRowSizes,
    measureFermatas: state.measureFermatas,
  });
}

// ── Letting the buttons know ────────────────────────────────────────────
// The stacks are plain arrays, so anything drawing an undo button has to be
// told when they change.

const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Subscribe to undo/redo availability; returns the unsubscribe. */
export function subscribeUndo(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever the stacks do, for `useSyncExternalStore`. */
export function undoVersion(): number {
  return version;
}

const MAX_UNDO_STACK = 50;
const undoStack: UndoSnapshot[] = [];
const redoStack: UndoSnapshot[] = [];

/** Everything undo restores, as it stands now. */
function capture(): UndoSnapshot {
  const state = useStore.getState();
  return {
    tracks: structuredClone(state.tracks),
    chordRegions: structuredClone(state.chordRegions),
    marks: readMarks(),
    timestamp: Date.now(),
  };
}

function restore(snapshot: UndoSnapshot): void {
  useStore.setState({
    tracks: snapshot.tracks,
    chordRegions: snapshot.chordRegions,
    ...snapshot.marks,
  });
}

/** Take a snapshot of the current state for undo. */
export function pushUndo(): void {
  undoStack.push(capture());
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  // Clear redo stack whenever a new action is performed
  redoStack.length = 0;
  changed();
}

/** Undo: restore the previous state, push current to redo. */
export function undo(): boolean {
  if (undoStack.length === 0) return false;
  redoStack.push(capture());
  const snapshot = undoStack.pop()!;
  restore(snapshot);
  // The restore is a store change like any other; keep auto-capture from
  // reading it back as a fresh edit and burying the redo.
  rebaseline();
  changed();
  return true;
}

/** Redo: restore the next state, push current to undo. */
export function redo(): boolean {
  if (redoStack.length === 0) return false;
  undoStack.push(capture());
  const snapshot = redoStack.pop()!;
  restore(snapshot);
  rebaseline();
  changed();
  return true;
}

/** Check if undo/redo are available. */
export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

/**
 * Forget undo/redo history — when a different project loads, so undo can't
 * bring back the previous project. Auto-capture re-baselines on the store as
 * it is now.
 */
export function resetUndoHistory(): void {
  undoStack.length = 0;
  redoStack.length = 0;
  rebaseline();
  changed();
}

// ── Auto-capture on significant store changes ───────────────────────────
// Subscribe to store and push undo snapshots when the score changes. We
// debounce to avoid capturing every micro-change during drags.

let lastJson = '';
let lastRefs: unknown[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** What the watched state looks like right now, for change detection. */
function watched(): { refs: unknown[]; json: string } {
  const state = useStore.getState() as unknown as Record<string, unknown>;
  const refs: unknown[] = [state.tracks, state.chordRegions];
  for (const key of MARK_KEYS) refs.push(state[key]);
  return {
    refs,
    json: JSON.stringify({
      tracks: state.tracks,
      chordRegions: state.chordRegions,
      marks: readMarks(),
    }),
  };
}

/** Treat the store as it stands as the baseline, capturing nothing. */
function rebaseline(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  const now = watched();
  lastJson = now.json;
  lastRefs = now.refs;
}

export function initUndoTracking(): void {
  rebaseline();

  const handleChange = () => {
    const now = watched();
    // Cheap identity check: skip if nothing was replaced.
    if (
      now.refs.length === lastRefs.length &&
      now.refs.every((ref, i) => ref === lastRefs[i])
    ) {
      return;
    }
    lastRefs = now.refs;

    // Debounce: only capture after 300ms of no changes.
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const settled = watched();
      if (settled.json === lastJson) return;
      const previous = lastJson;
      lastJson = settled.json;
      lastRefs = settled.refs;
      try {
        const before = JSON.parse(previous) as {
          tracks: Track[];
          chordRegions: ChordRegion[];
          marks: ScoreMarkSnapshot;
        };
        undoStack.push({ ...before, timestamp: Date.now() });
        if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
        redoStack.length = 0;
        changed();
      } catch {
        // Ignore parse errors
      }
    }, 300);
  };

  useStore.subscribe((state) => state.tracks, handleChange);
  useStore.subscribe((state) => state.chordRegions, handleChange);
  for (const key of MARK_KEYS) {
    useStore.subscribe(
      (state) => (state as unknown as Record<string, unknown>)[key],
      handleChange,
    );
  }
}

// ── Collab-mode Undo (Yjs UndoManager) ──────────────────────────────────
// When collaboration is active, undo/redo is handled by Yjs's built-in
// UndoManager which only tracks the local user's changes, allowing
// User A to undo without affecting User B's concurrent edits.

let _yjsUndoManager: UndoManager | null = null;

/**
 * Initialize Yjs-based undo for collaborative mode.
 * Call after the Y.Doc is synced and shared types are populated.
 */
export function initCollabUndo(doc: Y.Doc): void {
  destroyCollabUndo();
  const yTracks = doc.getArray('tracks');
  const yChordRegions = doc.getArray('chordRegions');
  const yMarkers = doc.getArray('markers');

  _yjsUndoManager = new UndoManager([yTracks, yChordRegions, yMarkers], {
    trackedOrigins: new Set([ORIGIN_LOCAL]),
    captureTimeout: 300,
  });
  // Keep the buttons in step with Yjs's own stacks.
  _yjsUndoManager.on('stack-item-added', changed);
  _yjsUndoManager.on('stack-item-popped', changed);
  changed();
}

/** Tear down the collab undo manager. */
export function destroyCollabUndo(): void {
  _yjsUndoManager?.destroy();
  _yjsUndoManager = null;
  changed();
}

/** Check if collab undo is active. */
export function isCollabUndoActive(): boolean {
  return _yjsUndoManager !== null;
}

/**
 * Smart undo: uses Yjs UndoManager in collab mode, snapshot undo in solo mode.
 */
export function smartUndo(): boolean {
  if (_yjsUndoManager) {
    if (_yjsUndoManager.canUndo()) {
      _yjsUndoManager.undo();
      changed();
      return true;
    }
    return false;
  }
  return undo();
}

/**
 * Smart redo: uses Yjs UndoManager in collab mode, snapshot redo in solo mode.
 */
export function smartRedo(): boolean {
  if (_yjsUndoManager) {
    if (_yjsUndoManager.canRedo()) {
      _yjsUndoManager.redo();
      changed();
      return true;
    }
    return false;
  }
  return redo();
}

export function smartCanUndo(): boolean {
  if (_yjsUndoManager) return _yjsUndoManager.canUndo();
  return canUndo();
}

export function smartCanRedo(): boolean {
  if (_yjsUndoManager) return _yjsUndoManager.canRedo();
  return canRedo();
}
