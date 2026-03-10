import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { useMidiDevices } from './useMidiDevices';
import { useMidiRecording } from './useMidiRecording';
import { midiDeviceManager } from '@/daw/midi/MidiDeviceManager';
import { trackEngineRegistry } from './usePlaybackEngine';

// ── useMidiInputRouting ──────────────────────────────────────────────────
// Subscribes to ALL available MIDI input devices and routes note events
// to monitored (or selected) tracks. Also feeds the MidiRecorder when
// recording is active.

export function useMidiInputRouting() {
  useMidiDevices();
  const midiRecorder = useMidiRecording();

  // Keep recorder in a ref so the effect doesn't re-fire when it changes
  const midiRecorderRef = useRef(midiRecorder);
  midiRecorderRef.current = midiRecorder;

  const inputs = useStore((s) => s.inputs);
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Clean up previous subscriptions
    for (const unsub of unsubsRef.current) unsub();
    unsubsRef.current = [];

    // Need at least one MIDI input
    if (inputs.length === 0) {
      console.log('[MIDI Routing] No inputs available');
      return;
    }

    console.log(
      `[MIDI Routing] Subscribing to ${inputs.length} input(s):`,
      inputs.map((i) => `"${i.name}"`).join(', '),
    );

    let noteCount = 0;

    // Sustain pedal (CC64) state — hold notes until pedal is released
    let sustainActive = false;
    const sustainHeldNotes = new Set<number>();

    /** Route a noteOff to audio engines and visual feedback. */
    const releaseNote = (note: number) => {
      const { tracks, selectedTrackId } = useStore.getState();
      const monitored = tracks.filter((t) => t.monitoring && t.type === 'midi');
      if (monitored.length > 0) {
        for (const t of monitored) {
          trackEngineRegistry.get(t.id)?.trackEngine.noteOff(note);
        }
      } else if (selectedTrackId) {
        trackEngineRegistry.get(selectedTrackId)?.trackEngine.noteOff(note);
      }
      useStore.getState().hwNoteOff(note);
    };

    const onNoteOn = (note: number, velocity: number, timestamp: number) => {
      const { tracks, selectedTrackId, isRecording } = useStore.getState();

      // If re-striking a note held by sustain pedal, remove from pending release
      sustainHeldNotes.delete(note);

      // Audio: play through monitored tracks (or fall back to selected)
      const monitored = tracks.filter((t) => t.monitoring && t.type === 'midi');
      if (monitored.length > 0) {
        for (const t of monitored) {
          trackEngineRegistry.get(t.id)?.trackEngine.noteOn(note, velocity);
        }
        if (noteCount++ < 3) {
          const instrumentStatus = monitored.map((t) => {
            const entry = trackEngineRegistry.get(t.id);
            if (!entry) return 'no-engine';
            return entry.trackEngine.getInstrument() ? 'ready' : 'loading';
          });
          console.log(
            `[MIDI Routing] noteOn ${note} vel=${velocity} → ${monitored.length} monitored track(s) [${instrumentStatus.join(', ')}]`,
          );
        }
      } else if (selectedTrackId) {
        const entry = trackEngineRegistry.get(selectedTrackId);
        entry?.trackEngine.noteOn(note, velocity);
        if (noteCount++ < 3) {
          if (entry) {
            const hasInstrument = entry.trackEngine.getInstrument() !== null;
            console.log(
              `[MIDI Routing] noteOn ${note} vel=${velocity} → selected track (instrument=${hasInstrument ? 'ready' : 'loading...'})`,
            );
          } else {
            console.warn(
              `[MIDI Routing] noteOn ${note} — no engine for selected track (audio engine not initialized yet?)`,
            );
          }
        }
      } else {
        if (noteCount++ < 3)
          console.warn(
            '[MIDI Routing] noteOn — no target (no monitored tracks, no selection)',
          );
      }

      // Visual: light up keyboard in control section
      useStore.getState().hwNoteOn(note);

      // Capture: feed recorder if recording + any MIDI track is armed
      if (isRecording) {
        const hasArmed = tracks.some((t) => t.recordArmed && t.type === 'midi');
        if (hasArmed)
          midiRecorderRef.current.captureNoteOn(note, velocity, timestamp);
      }
    };

    const onNoteOff = (note: number, timestamp: number) => {
      // Record the physical noteOff regardless of sustain state
      const { isRecording, tracks } = useStore.getState();
      if (isRecording) {
        const hasArmed = tracks.some((t) => t.recordArmed && t.type === 'midi');
        if (hasArmed) midiRecorderRef.current.captureNoteOff(note, timestamp);
      }

      // If sustain pedal is active, defer the release
      if (sustainActive) {
        sustainHeldNotes.add(note);
        return;
      }

      releaseNote(note);
    };

    const onCC = (cc: number, value: number) => {
      // Record CC event if recording
      const { isRecording, tracks } = useStore.getState();
      if (isRecording) {
        const hasArmed = tracks.some((t) => t.recordArmed && t.type === 'midi');
        if (hasArmed) midiRecorderRef.current.captureCC(cc, value);
      }

      if (cc !== 64) return; // Only handle sustain pedal for live routing

      if (value >= 64) {
        sustainActive = true;
      } else {
        sustainActive = false;
        // Release all notes that were deferred while pedal was held
        for (const note of sustainHeldNotes) {
          releaseNote(note);
        }
        sustainHeldNotes.clear();
      }
    };

    // Subscribe to ALL inputs (not just the first — virtual ports may occupy index 0)
    for (const input of inputs) {
      const unsub = midiDeviceManager.subscribeToInput(
        input.id,
        onNoteOn,
        onNoteOff,
        onCC,
      );
      unsubsRef.current.push(unsub);
    }

    return () => {
      for (const unsub of unsubsRef.current) unsub();
      unsubsRef.current = [];
      sustainActive = false;
      sustainHeldNotes.clear();
    };
  }, [inputs]);
}
