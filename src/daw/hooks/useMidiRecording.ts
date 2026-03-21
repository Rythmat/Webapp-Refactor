import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { MidiRecorder } from '@/daw/audio/MidiRecorder';
import { deriveChordRegionsFromSession } from '@/daw/store/prismSlice';

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

  useEffect(() => {
    if (isRecording) {
      recorderRef.current.startRecording();
    } else if (recorderRef.current.isRecording()) {
      const { notes, ccEvents } = recorderRef.current.stopRecording();
      if (notes.length > 0) {
        // Find the first record-armed MIDI track
        const armedTrack = tracks.find(
          (t) => t.recordArmed && t.type === 'midi',
        );
        if (armedTrack) {
          addMidiClip(armedTrack.id, {
            id: crypto.randomUUID(),
            startTick: notes[0].startTick,
            events: notes,
            ccEvents: ccEvents.length > 0 ? ccEvents : undefined,
          });

          // Derive chord regions from all tracks (role-aware)
          const {
            rootNote,
            mode,
            setChordRegions,
            tracks: allTracks,
          } = useStore.getState();
          const rootMidi = (rootNote ?? 0) + 48;
          const regions = deriveChordRegionsFromSession(
            allTracks,
            rootMidi,
            mode,
          );
          setChordRegions(regions);
        }
      }
    }
  }, [isRecording, tracks, addMidiClip]);

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
          useStore
            .getState()
            .setLiveRecording(armedTrack.id, snapshot, snapshot[0].startTick);
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
