import { studioRealtime } from '@/daw/collab/studioRealtime';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { useStore } from '@/daw/store';

// ── Live notes: what the student plays right now ───────────────────────────
//
// One path for every live note, whatever it comes from: a MIDI keyboard
// (useMidiInputRouting) or the computer keyboard (useMusicalTyping, 1.6).
// A note sounds on the monitored MIDI tracks (else the selected track),
// lights the on-screen keys and Insight's Now Playing (hwActiveNotes),
// reaches collaborators, and goes into the take while recording onto an
// armed MIDI track.

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

/** Track ids this user's live MIDI is driving (monitored, else selected). */
export function liveMidiTargets(): string[] {
  const { tracks, selectedTrackId } = useStore.getState();
  const monitored = tracks
    .filter((t) => t.monitoring && t.type === 'midi')
    .map((t) => t.id);
  if (monitored.length > 0) return monitored;
  return selectedTrackId ? [selectedTrackId] : [];
}

function relay(action: 'on' | 'off', note: number, velocity: number): void {
  if (!studioRealtime.shouldBroadcast()) return;
  for (const trackId of liveMidiTargets()) {
    studioRealtime.send({
      type: 'studio:note',
      action,
      note,
      velocity,
      trackId,
    });
  }
}

function recordingArmedMidi(): boolean {
  const { isRecording, tracks } = useStore.getState();
  return isRecording && tracks.some((t) => t.recordArmed && t.type === 'midi');
}

/** Sounds a note (velocity 0–127) and shows it. */
export function playLiveNote(note: number, velocity: number): void {
  for (const id of liveMidiTargets()) {
    trackEngineRegistry.get(id)?.trackEngine.noteOn(note, velocity);
  }
  useStore.getState().hwNoteOn(note);
  relay('on', note, velocity);
}

/** Stops a note and takes it off the keys. */
export function releaseLiveNote(note: number): void {
  for (const id of liveMidiTargets()) {
    trackEngineRegistry.get(id)?.trackEngine.noteOff(note);
  }
  useStore.getState().hwNoteOff(note);
  relay('off', note, 0);
}

/** Puts a note's start into the take, when one is being recorded. */
export function captureLiveNoteOn(
  note: number,
  velocity: number,
  timestamp?: number,
): void {
  if (recordingArmedMidi()) recorder?.captureNoteOn(note, velocity, timestamp);
}

/** Puts a note's end into the take, when one is being recorded. */
export function captureLiveNoteOff(note: number, timestamp?: number): void {
  if (recordingArmedMidi()) recorder?.captureNoteOff(note, timestamp);
}
