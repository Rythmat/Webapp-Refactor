import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { MidiRecorder } from '@/daw/audio/MidiRecorder';

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
      const events = recorderRef.current.stopRecording();
      if (events.length > 0) {
        // Find the first record-armed MIDI track
        const armedTrack = tracks.find(
          (t) => t.recordArmed && t.type === 'midi',
        );
        if (armedTrack) {
          addMidiClip(armedTrack.id, {
            id: crypto.randomUUID(),
            startTick: events[0].startTick,
            events,
          });
        }
      }
    }
  }, [isRecording, tracks, addMidiClip]);

  return recorderRef.current;
}
