import { useSyncExternalStore } from 'react';
import { useStore, type AllSlices } from '@/daw/store';

// ── requestRecord ───────────────────────────────────────────────────────────
// The one way to start a recording: the Record button and the R key both call
// it, so neither can skip the overwrite check. A take on an audio track
// replaces whatever audio it rolls over (overwriteAudioRegion), so when the
// armed audio track already has a take at or after the playhead, the start
// waits for the student to confirm in RecordGuard. The editor mounts that
// once at its root, so the check also holds on the practice screen. 1.6's
// command registry takes this over as its record command.

/** A take waiting for the student's confirm in RecordGuard. */
export interface RecordRequest {
  /** The armed audio track whose take the guard asks about. */
  trackId: string;
  /** Runs just before recording starts: the Record button's engine init. */
  beforeStart?: () => void;
}

// The take RecordGuard is asking about. The guard is open while it is set.
let pending: RecordRequest | null = null;
const listeners = new Set<() => void>();

function setPending(next: RecordRequest | null) {
  if (pending === next) return;
  pending = next;
  listeners.forEach((listener) => listener());
}

/** The track a take records onto: the first armed audio track. */
function armedAudioTrack(state: AllSlices) {
  return state.tracks.find((t) => t.type === 'audio' && t.recordArmed);
}

function startTake(beforeStart?: () => void) {
  beforeStart?.();
  useStore.getState().record();
}

/**
 * Whether a take started now could record over existing audio: the armed
 * audio track (the first one, as the recorder picks it) has a clip that ends
 * after the playhead, where the take would begin. While recording or counting
 * in, nothing new starts, so there is nothing to ask.
 */
export function wouldRecordOverTake(
  state: AllSlices = useStore.getState(),
): boolean {
  if (state.isRecording || state.isCountingIn) return false;
  const armed = armedAudioTrack(state);
  if (!armed) return false;
  return armed.audioClips.some(
    (clip) => clip.startTick + clip.duration > state.position,
  );
}

/**
 * Start recording, or ask first when the take would record over existing
 * audio. `beforeStart` runs just before recording starts, whichever way it
 * starts: the Record button passes its audio-engine init.
 */
export function requestRecord(beforeStart?: () => void): 'started' | 'asked' {
  const state = useStore.getState();
  const armed = armedAudioTrack(state);
  if (armed && wouldRecordOverTake(state)) {
    setPending({ trackId: armed.id, beforeStart });
    return 'asked';
  }
  startTake(beforeStart);
  return 'started';
}

/**
 * RecordGuard's Continue: the take it asked about starts. The guard passes
 * the request it showed, because ConfirmModal reports the close, which drops
 * the request here, before the confirm.
 */
export function confirmRecordRequest(request: RecordRequest): void {
  setPending(null);
  const state = useStore.getState();
  // Recording started some other way meanwhile: one take is enough.
  if (state.isRecording || state.isCountingIn) return;
  // The student agreed to record over that track's take. If another track
  // has been armed since, nobody was asked about its takes, so ask again.
  if (armedAudioTrack(state)?.id !== request.trackId) {
    requestRecord(request.beforeStart);
    return;
  }
  startTake(request.beforeStart);
}

/**
 * Nothing records: the waiting take is dropped and the guard closes.
 * RecordGuard calls this for Cancel, Escape and a click outside, and as it
 * mounts and unmounts, so a question left open in one editor session never
 * shows up, or starts its take, in the next.
 */
export function dismissRecordRequest(): void {
  setPending(null);
}

/** The take RecordGuard is asking about, or null when it is closed. */
export function getRecordRequest(): RecordRequest | null {
  return pending;
}

export function isRecordGuardOpen(): boolean {
  return pending !== null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The take RecordGuard is asking about, or null when it is closed. */
export function useRecordRequest(): RecordRequest | null {
  return useSyncExternalStore(subscribe, getRecordRequest);
}
