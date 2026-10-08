import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { MidiRecorder } from '@/daw/audio/MidiRecorder';
import { buildRecordedClip } from '@/daw/audio/recordedClip';

// ── useMidiRecording ────────────────────────────────────────────────────
// Manages the MIDI recording lifecycle:
//   - When isRecording flips to true  -> start capturing note events
//   - When isRecording flips to false -> stop, convert to a MidiClip,
//     and add it to the first record-armed MIDI track.

export function useMidiRecording() {
  const isRecording = useStore((s) => s.isRecording);
  const tracks = useStore((s) => s.tracks);
  const addMidiClip = useStore((s) => s.addMidiClip);
  const recorderRef = useRef(new MidiRecorder());
  // Tick the take punched in at. It becomes the clip's front, so a player who
  // comes in late keeps that rest instead of having it trimmed away.
  const punchInTickRef = useRef(0);

  useEffect(() => {
    if (isRecording) {
      // This effect re-runs whenever `tracks` changes (a fader move, an audio
      // take landing). Guard against that: a second startRecording() would drop
      // the take in progress and re-anchor it to wherever the playhead is now.
      if (recorderRef.current.isRecording()) return;
      // Anchor to the playhead at punch-in — the same tick the audio recorder
      // uses (usePlaybackEngine), so a simultaneous audio + MIDI take lines up.
      punchInTickRef.current = useStore.getState().position;
      recorderRef.current.startRecording();
    } else if (recorderRef.current.isRecording()) {
      const { notes, ccEvents } = recorderRef.current.stopRecording();
      if (notes.length > 0) {
        // Find the first record-armed MIDI track
        const armedTrack = tracks.find(
          (t) => t.recordArmed && t.type === 'midi',
        );
        if (armedTrack) {
          // Anchored to punch-in, so a take that came in after the downbeat
          // keeps that rest at the front of the clip instead of sliding up to
          // it. See buildRecordedClip.
          addMidiClip(armedTrack.id, {
            id: crypto.randomUUID(),
            ...buildRecordedClip(notes, ccEvents, punchInTickRef.current),
          });
        }
      }
    }
  }, [isRecording, tracks, addMidiClip]);

  // A take still running when the editor closes is kept, as Stop would keep
  // it. useTransport's unmount pause clears isRecording, but the effect above
  // never sees that from an unmounting editor, so the take would be dropped.
  // (usePlaybackEngine does the same for an audio take.) The store outlives
  // the editor, so the clip is there when the student comes back. DawApp
  // declares this hook before useAutosave, so the autosave's unmount flush,
  // which runs after this cleanup, writes the take to the crash-recovery slot.
  //
  // Known limit in a collab room: CollabProvider, the editor's parent, has
  // already torn the room down when this runs (React runs a closing tree's
  // cleanups parent first). The take stays on this device and never reaches
  // the peers, and a guest who rejoins gets the room's copy in its place.
  // Revisit with the 1.3 persistence work.
  useEffect(() => {
    const recorder = recorderRef.current;
    return () => {
      if (!recorder.isRecording()) return;
      const { notes, ccEvents } = recorder.stopRecording();
      if (notes.length === 0) return;
      const state = useStore.getState();
      const armedTrack = state.tracks.find(
        (t) => t.recordArmed && t.type === 'midi',
      );
      if (!armedTrack) return;
      state.addMidiClip(armedTrack.id, {
        id: crypto.randomUUID(),
        ...buildRecordedClip(notes, ccEvents, punchInTickRef.current),
      });
    };
  }, []);

  // Live recording display: poll recorder at ~15fps and push snapshots to store
  useEffect(() => {
    if (!isRecording) return;
    const armedTrack = tracks.find((t) => t.recordArmed && t.type === 'midi');
    if (!armedTrack) return;

    let rafId: number;
    let lastUpdate = 0;

    const poll = (now: number) => {
      if (now - lastUpdate >= 66) {
        const snapshot = recorderRef.current.getSnapshot(
          Math.round(Tone.getTransport().ticks),
        );
        if (snapshot.length > 0) {
          // Same anchor the committed clip gets, so the overlay shows the take
          // where it will land — including the rest before the first note.
          useStore
            .getState()
            .setLiveRecording(
              armedTrack.id,
              snapshot,
              Math.min(punchInTickRef.current, snapshot[0].startTick),
            );
        }
        lastUpdate = now;
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      useStore.getState().clearLiveRecording();
    };
  }, [isRecording, tracks]);

  return recorderRef.current;
}
