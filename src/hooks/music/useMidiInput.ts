import { useCallback, useRef, useState } from 'react';

export interface MidiNoteEvent {
  number: number; // MIDI note number (e.g., 60 = C4)
  duration: number; // Duration in seconds
  velocity: number; // Original velocity from noteon
}

type Callback = (event: MidiNoteEvent) => void;

type MidiInputOptions = {
  onNoteOn?: Callback;
  onNoteOff?: Callback;
};

export function useMidiInput(
  callback?: Callback,
  options?: MidiInputOptions,
  _testTarget?: EventTarget,
) {
  const [isListening, setIsListening] = useState(false);
  const stopListeningRef = useRef<() => void>();
  const onNoteOn = options?.onNoteOn;
  const onNoteOff = options?.onNoteOff;

  const noteStartTimes = useRef<
    Map<number, { time: number; velocity: number }>
  >(new Map());

  const startListening = useCallback(() => {
    //prevent listener stacking
    if (stopListeningRef.current) {
      console.log("Listener creation stopped!");
      return stopListeningRef.current;
    }
    let midiAccess: MIDIAccess;

    const onMIDIMessage = (message: MIDIMessageEvent) => {
      if (!message.data) return;
      const status = message.data[0];
      const noteNumber = message.data[1];
      const velocity = message.data[2];
      const command = status & 0xf0;
      const now = performance.now() / 1000; // convert to seconds

      if (command === 0x90 && velocity > 0) {
        onNoteOn?.({
          number: noteNumber,
          duration: 0,
          velocity,
        });
        // Note ON
        noteStartTimes.current.set(noteNumber, { time: now, velocity });
      } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        // Note OFF
        const start = noteStartTimes.current.get(noteNumber);
        if (start) {
          const duration = now - start.time;
          const event = {
            number: noteNumber,
            duration,
            velocity: start.velocity,
          };
          callback?.(event);
          onNoteOff?.(event);
          noteStartTimes.current.delete(noteNumber);
        }
      }
    };

    const setup = async () => {
      if (_testTarget) {
        _testTarget.addEventListener(
          'midimessage',
          onMIDIMessage as EventListener,
        );
        setIsListening(true);
        return;
      }
      try {
        midiAccess = await navigator.requestMIDIAccess();
        for (const input of midiAccess.inputs.values()) {
          input.addEventListener('midimessage', onMIDIMessage);
        }
        setIsListening(true);
      } catch (err) {
        console.error('MIDI access failed', err);
      }
    };

    setup();
    console.log("Listener Set!")
    // Return cleanup function
    const stop = () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.removeEventListener('midimessage', onMIDIMessage);
        }
      }
      stopListeningRef.current = undefined;
      setIsListening(false);
    };

    stopListeningRef.current = stop;

    return stop;
  }, [callback, onNoteOn, onNoteOff, _testTarget]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    stopListeningRef.current?.();
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
  };
}
