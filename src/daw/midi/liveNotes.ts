import { studioRealtime } from '@/daw/collab/studioRealtime';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { useStore } from '@/daw/store';
import { liveMidiTargetIds, recordTargetTrackId } from './liveTarget';

// ── Live notes: what the student plays right now ───────────────────────────
//
// One path for every live note, whatever it comes from: a MIDI keyboard
// (useMidiInputRouting), the computer keyboard (useMusicalTyping, 1.6) or
// the practice screen's keys (usePointerNotes, 1.15). A note sounds on the
// monitored MIDI tracks (else the selected track), lights the on-screen keys
// and Insight's Now Playing (hwActiveNotes), reaches collaborators, and goes
// into the take while recording onto an armed MIDI track. While the
// practice screen shows, its student's track takes every note and take
// instead (liveTarget.ts).

/** What the take in progress is fed with; useMidiInputRouting's recorder. */
export interface LiveRecorder {
  captureNoteOn(note: number, velocity: number, timestamp?: number): void;
  captureNoteOff(note: number, timestamp?: number): void;
}

let recorder: LiveRecorder | null = null;

/** Hands live notes to the take recorder; returns the release. */
export function registerLiveRecorder(next: LiveRecorder): () => void {
  recorder = next;
  return () => {
    if (recorder === next) recorder = null;
  };
}

/**
 * Track ids this user's live MIDI is driving: the practice screen's track,
 * else the MIDI tracks monitoring their input (armed and monitoring).
 */
export function liveMidiTargets(source?: string | null): string[] {
  return liveMidiTargetIds(useStore.getState(), source);
}

function relay(
  action: 'on' | 'off',
  note: number,
  velocity: number,
  trackIds: readonly string[],
): void {
  if (!studioRealtime.shouldBroadcast()) return;
  for (const trackId of trackIds) {
    studioRealtime.send({
      type: 'studio:note',
      action,
      note,
      velocity,
      trackId,
    });
  }
}

function recordingArmedMidi(source?: string | null): boolean {
  const state = useStore.getState();
  return state.isRecording && recordTargetTrackId(state, source) !== null;
}

// ── Held notes ─────────────────────────────────────────────────────────────
// Each sounding note remembers the tracks its note-on went to, so its
// note-off reaches exactly those, even when the selection, monitoring or the
// practice screen has changed in between (engine-hooks-10). When the targets
// change while notes are held, the tracks that stopped being targets let go
// of them at once.

const held = new Map<number, string[]>();
let unsubscribeTargets: (() => void) | null = null;

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function watchTargets(): void {
  if (unsubscribeTargets) return;
  let last = liveMidiTargets();
  unsubscribeTargets = useStore.subscribe(() => {
    const next = liveMidiTargets();
    if (sameIds(last, next)) return;
    last = next;
    releaseDroppedTargets(next);
  });
}

function stopWatchingIfIdle(): void {
  if (held.size > 0 || !unsubscribeTargets) return;
  unsubscribeTargets();
  unsubscribeTargets = null;
}

function noteOffOn(note: number, trackIds: readonly string[]): void {
  for (const id of trackIds) {
    trackEngineRegistry.get(id)?.trackEngine.noteOff(note);
  }
  relay('off', note, 0, trackIds);
}

/** Lets go of held notes on tracks that are no longer live targets. */
function releaseDroppedTargets(targets: readonly string[]): void {
  for (const [note, trackIds] of [...held]) {
    const dropped = trackIds.filter((id) => !targets.includes(id));
    if (dropped.length === 0) continue;
    noteOffOn(note, dropped);
    const kept = trackIds.filter((id) => targets.includes(id));
    if (kept.length > 0) {
      held.set(note, kept);
    } else {
      held.delete(note);
      useStore.getState().hwNoteOff(note);
    }
  }
  stopWatchingIfIdle();
}

/**
 * Sounds a note (velocity 0–127) and shows it. `source` is the MIDI device
 * it came from: only tracks listening to it play it.
 */
export function playLiveNote(
  note: number,
  velocity: number,
  source?: string | null,
): void {
  const targets = liveMidiTargets(source);
  for (const id of targets) {
    trackEngineRegistry.get(id)?.trackEngine.noteOn(note, velocity);
  }
  // A note struck again while still held (two sources, or a re-strike under
  // the pedal) keeps every track it is sounding on.
  const before = held.get(note) ?? [];
  held.set(note, [...before, ...targets.filter((id) => !before.includes(id))]);
  watchTargets();
  useStore.getState().hwNoteOn(note);
  relay('on', note, velocity, targets);
}

/** Stops a note on the tracks it was started on and takes it off the keys. */
export function releaseLiveNote(note: number): void {
  const trackIds = held.get(note);
  held.delete(note);
  // A note this module never started (or already let go) has nothing to
  // stop; the keys are still cleared.
  if (trackIds) noteOffOn(note, trackIds);
  useStore.getState().hwNoteOff(note);
  stopWatchingIfIdle();
}

/** Notes sounding now and the tracks each one is sounding on. */
export function heldLiveNotes(): ReadonlyMap<number, readonly string[]> {
  return held;
}

/** Puts a note's start into the take, when one is being recorded. */
export function captureLiveNoteOn(
  note: number,
  velocity: number,
  timestamp?: number,
  source?: string | null,
): void {
  if (recordingArmedMidi(source)) {
    recorder?.captureNoteOn(note, velocity, timestamp);
  }
}

/** Puts a note's end into the take, when one is being recorded. */
export function captureLiveNoteOff(
  note: number,
  timestamp?: number,
  source?: string | null,
): void {
  if (recordingArmedMidi(source)) recorder?.captureNoteOff(note, timestamp);
}
