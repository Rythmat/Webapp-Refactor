import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import { midiDeviceManager } from '@/daw/midi/MidiDeviceManager';

// ── useMidiDevices ──────────────────────────────────────────────────────
// Initialises WebMidi.js and keeps the store's input/output device lists
// in sync with hot-plug events.

export function useMidiDevices() {
  const setInputs = useStore((s) => s.setInputs);
  const setOutputs = useStore((s) => s.setOutputs);
  const setMidiStatus = useStore((s) => s.setMidiStatus);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const syncDevices = () => {
      const inputs = midiDeviceManager.getInputs();
      setInputs(inputs);
      setOutputs(midiDeviceManager.getOutputs());
      setMidiStatus(inputs.length > 0 ? 'ready' : 'unavailable');
    };

    const doInit = async () => {
      const ok = await midiDeviceManager.init();
      if (cancelled) return;
      if (ok) {
        syncDevices();
        // If WebMidi enabled but no inputs yet, retry after 2s
        // (some devices enumerate slowly after permission is granted)
        const inputs = midiDeviceManager.getInputs();
        if (inputs.length === 0) {
          console.log('[MIDI] No inputs yet — retrying in 2s...');
          retryTimer = setTimeout(() => {
            if (!cancelled) syncDevices();
          }, 2000);
        }
      } else {
        setMidiStatus('unavailable');
        console.warn(
          '[MIDI] Not available. Check: (1) Chrome/Edge browser required, (2) MIDI device connected, (3) MIDI permission granted',
        );
      }
    };

    doInit();

    const unsub = midiDeviceManager.onDeviceChange(() => {
      if (!cancelled) syncDevices();
    });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      unsub();
    };
  }, [setInputs, setOutputs, setMidiStatus]);
}
