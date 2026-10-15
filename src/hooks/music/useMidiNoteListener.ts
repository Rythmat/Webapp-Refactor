import { useEffect, useRef } from 'react';

/**
 * Calls `onNote` with the MIDI number of every note-on from any connected
 * Web MIDI input while `active` is true. Raw Web MIDI, so it sees the notes
 * exactly as the hardware sends them (octave buttons included).
 */
export function useMidiNoteListener(
  active: boolean,
  onNote: (midi: number) => void,
) {
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;

  useEffect(() => {
    if (!active || !navigator.requestMIDIAccess) return;

    let midiAccess: MIDIAccess | null = null;
    let cancelled = false;

    const handleMessage = (event: MIDIMessageEvent) => {
      if (!event.data) return;
      const command = event.data[0] & 0xf0;
      const noteNumber = event.data[1];
      const velocity = event.data[2];
      // Note ON with velocity > 0
      if (command === 0x90 && velocity > 0) {
        onNoteRef.current(noteNumber);
      }
    };

    const attachListeners = (ma: MIDIAccess) => {
      for (const input of ma.inputs.values()) {
        input.addEventListener('midimessage', handleMessage);
      }
    };

    const detachListeners = (ma: MIDIAccess) => {
      for (const input of ma.inputs.values()) {
        input.removeEventListener('midimessage', handleMessage);
      }
    };

    navigator
      .requestMIDIAccess()
      .then((ma) => {
        if (cancelled) return;
        midiAccess = ma;
        attachListeners(ma);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (midiAccess) detachListeners(midiAccess);
    };
  }, [active]);
}
