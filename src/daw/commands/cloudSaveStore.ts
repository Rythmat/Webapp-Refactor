import { create, type StoreApi, type UseBoundStore } from 'zustand';
// Import-free module (a counter and its listeners): still cheap for the
// dashboard.
import { getSessionGeneration } from '@/daw/session/sessionGeneration';

// ── Where the cloud save stands (milestone 1.4) ────────────────────────────
//
// saveProject's state, for the save chip and openSession: whether a save is
// running or failed, why, and the last save (or cloud open) of the live
// session, which the chip compares the document against. saveProject writes
// it; openSession resets it per session (resetCloudSaveForSession) and sets
// lastSaved for project and draft opens. inFlight counts saves still
// running, whichever session they started in, so an open can wait for them
// (whenSavesSettled) before it switches.
//
// No DAW-store import: the chip and the dashboard load this cheaply.

/** Which control asked for the save. */
export type SaveSource = 'menu' | 'shortcut' | 'chip' | 'leave' | 'projects';

export type SaveErrorKind =
  | 'signed-out'
  | 'offline'
  | 'not-found'
  | 'no-access'
  | 'upload'
  | 'server'
  | 'too-large'
  | 'conflict'
  | 'superseded'
  | 'unknown';

export interface SaveError {
  kind: SaveErrorKind;
  /** Plain words for the student: no ids, no HTTP codes. */
  message: string;
  /** The HTTP status, for logs only (0 = network). */
  status?: number;
  uploads?: { succeeded: number; failed: number };
}

export type SaveResult =
  | {
      status: 'saved';
      projectId: string;
      /** Whether the cloud copy holds the whole document (no cloudSaveGaps). */
      complete: boolean;
      /** Clips and samples whose audio couldn't be uploaded. */
      audioLeftOut: number;
      /** The project had gone (404) and was made again. */
      recreated: boolean;
      /** Saved as a new project (Save As, a leave copy). */
      asCopy: boolean;
    }
  | { status: 'failed'; error: SaveError };

/** The live session's last save, or the cloud copy it opened from. */
export interface LastSaved {
  projectId: string;
  /** hashFingerprint of the save's own snapshot. */
  fingerprint: string;
  /** documentVersion at that snapshot; -1 when it came from a draft. */
  version: number;
  complete: boolean;
  /** The server's ISO updatedAt. */
  updatedAt: string | null;
  /** Date.now() when it finished. */
  at: number;
  /** The session generation it belongs to. */
  generation: number;
}

export interface CloudSaveState {
  phase: 'idle' | 'saving' | 'error';
  source: SaveSource | null;
  error: SaveError | null;
  lastSaved: LastSaved | null;
  /** Saves still running, from any session. */
  inFlight: number;
  /** Saves that finished, ever, on this page. */
  savedCount: number;
}

export const INITIAL_CLOUD_SAVE_STATE: Readonly<CloudSaveState> = Object.freeze(
  {
    phase: 'idle',
    source: null,
    error: null,
    lastSaved: null,
    inFlight: 0,
    savedCount: 0,
  },
);

export const useCloudSaveStore: UseBoundStore<StoreApi<CloudSaveState>> =
  create<CloudSaveState>()(() => ({ ...INITIAL_CLOUD_SAVE_STATE }));

/**
 * A new session opened: forget the last one's phase, error and last save.
 * inFlight and savedCount stay: a save still running belongs to the session
 * it started in, and openSession may still be waiting for it.
 */
export function resetCloudSaveForSession(): void {
  useCloudSaveStore.setState({
    phase: 'idle',
    source: null,
    error: null,
    lastSaved: null,
  });
}

/**
 * Set (or clear) the live session's last save. The store keeps the fence
 * itself: a record from another session generation (a save or open that
 * finished after the session was replaced) is refused, logged, and false is
 * returned, so the chip can't read 'Saved' for a session that never was.
 * Clearing (null) always applies.
 */
export function setLastSaved(record: LastSaved | null): boolean {
  if (record !== null && record.generation !== getSessionGeneration()) {
    console.warn(
      '[cloud save] ignored a last save from an earlier session',
      record.generation,
      getSessionGeneration(),
    );
    return false;
  }
  useCloudSaveStore.setState({ lastSaved: record });
  return true;
}

/**
 * Resolve true once no save is in flight (at once when none is), or false
 * after `timeoutMs` (10 s).
 */
export function whenSavesSettled(timeoutMs = 10_000): Promise<boolean> {
  if (useCloudSaveStore.getState().inFlight <= 0) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const finish = (settled: boolean) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(settled);
    };
    const timer = setTimeout(() => finish(false), Math.max(0, timeoutMs));
    const unsubscribe = useCloudSaveStore.subscribe((state) => {
      if (state.inFlight <= 0) finish(true);
    });
  });
}
