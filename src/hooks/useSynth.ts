import { useCallback, useRef } from 'react';
import * as Tone from 'tone';

export const useSynth = () => {
  const synth = useRef<Tone.PolySynth | null>(null);

  // Initialize Tone.js synth
  return useCallback(() => {
    if (synth.current) {
      return synth.current;
    }

    const ctx = new Tone.Context({
      latencyHint: "interactive",
      lookAhead: 0.01,
      updateInterval: 0.01,
    });
    Tone.setContext(ctx);

    // Create a polyphonic synth for playing multiple notes simultaneously
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();

    return synth.current;
  }, []);
};
