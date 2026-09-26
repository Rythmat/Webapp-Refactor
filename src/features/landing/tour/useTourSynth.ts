import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { startTone } from '@/audio/core/toneBridge';

/**
 * Tiny gesture-gated synth for the product tour. Nothing is created (and no
 * audio context is resumed) until the visitor turns sound on or plays a key —
 * the tour's autoplay is always silent. Deliberately NOT the app's piano
 * sampler (16 MB of samples): one small triangle PolySynth.
 */
export const useTourSynth = () => {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);

  const enable = useCallback(async () => {
    await startTone();
    if (!synthRef.current) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.35, release: 0.8 },
      }).toDestination();
      synth.volume.value = -14;
      synthRef.current = synth;
    }
    enabledRef.current = true;
    setEnabled(true);
  }, []);

  const disable = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    synthRef.current?.releaseAll();
  }, []);

  /** Play notes if sound is on. */
  const play = useCallback((midis: number[], seconds = 0.6) => {
    const synth = synthRef.current;
    if (!enabledRef.current || !synth || midis.length === 0) return;
    synth.triggerAttackRelease(
      midis.map((m) => Tone.Frequency(m, 'midi').toFrequency()),
      seconds,
    );
  }, []);

  /** Called from a user gesture: turns sound on first if needed, then plays. */
  const playFromGesture = useCallback(
    (midis: number[], seconds?: number) => {
      if (enabledRef.current) {
        play(midis, seconds);
        return;
      }
      void enable().then(() => play(midis, seconds));
    },
    [enable, play],
  );

  useEffect(
    () => () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    },
    [],
  );

  return { enabled, enable, disable, play, playFromGesture };
};
