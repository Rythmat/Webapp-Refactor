import { useCallback, useRef } from "react";
import {
  getPianoSamplerVolume,
  releaseAllPianoNotes,
  setPianoSamplerVolume,
  triggerPianoAttack,
  triggerPianoAttackRelease,
  triggerPianoRelease,
} from "@/audio/pianoSampler";

type SynthProxy = {
  triggerAttack: (note: string, time?: number, velocity?: number) => void;
  triggerRelease: (note: string, time?: number) => void;
  triggerAttackRelease: (
    note: string,
    duration: number,
    time?: number,
    velocity?: number,
  ) => void;
  releaseAll: () => void;
  volume: { value: number };
};

const createSynthProxy = (): SynthProxy => ({
  triggerAttack: (note, time, velocity) => {
    void triggerPianoAttack(note, velocity, time);
  },
  triggerRelease: (note, time) => {
    void triggerPianoRelease(note, time);
  },
  triggerAttackRelease: (note, duration, time, velocity) => {
    void triggerPianoAttackRelease(note, duration, velocity, time);
  },
  releaseAll: () => {
    void releaseAllPianoNotes();
  },
  volume: {
    get value() {
      return getPianoSamplerVolume();
    },
    set value(db: number) {
      setPianoSamplerVolume(db);
    },
  },
});

export const useSynth = () => {
  const synth = useRef<SynthProxy | null>(null);

  return useCallback(() => {
    if (synth.current) {
      return synth.current;
    }
    synth.current = createSynthProxy();
    return synth.current;
  }, []);
};
