import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { startTone } from '@/audio/core/toneBridge';
import type { TourAudio, TourDrum } from './scenes/sceneTypes';

interface DrumKit {
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  hat: Tone.NoiseSynth;
  /** Everything to dispose (voices + their filters). */
  nodes: Tone.ToneAudioNode[];
}

/** Note length per drum voice, seconds. */
const DRUM_SECONDS: Record<TourDrum, number> = {
  kick: 0.12,
  snare: 0.1,
  hat: 0.03,
};

/** Tone's monophonic voices reject a start time ≤ the previous one. */
const MIN_VOICE_GAP = 0.002;

const buildDrumKit = (): DrumKit => {
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.05 },
  }).toDestination();
  kick.volume.value = -8;

  const snareFilter = new Tone.Filter(1200, 'highpass').toDestination();
  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.14, sustain: 0 },
  }).connect(snareFilter);
  snare.volume.value = -16;

  const hatFilter = new Tone.Filter(8000, 'highpass').toDestination();
  const hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0 },
  }).connect(hatFilter);
  hat.volume.value = -26;

  return {
    kick,
    snare,
    hat,
    nodes: [kick, snare, snareFilter, hat, hatFilter],
  };
};

/**
 * Tiny gesture-gated synth for the product tour. Nothing is created (and no
 * audio context is resumed) until the visitor interacts with the demo — the
 * tour's autoplay is silent until then. Deliberately NOT the app's piano
 * sampler (16 MB of samples): one small triangle PolySynth, plus a lazy
 * three-voice drum kit for the Studio demo's playback.
 */
export const useTourSynth = () => {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const kitRef = useRef<DrumKit | null>(null);
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  // Bumped by every `disable`: an `enable` still awaiting the audio context
  // drops out, so a Stop in the same click that turned Sound on wins.
  const genRef = useRef(0);
  // False once unmounted (StrictMode re-runs set it back): `audio` may still
  // be called from a scene's cleanup after the synth is disposed.
  const aliveRef = useRef(false);
  const lastDrumRef = useRef<Record<TourDrum, number>>({
    kick: 0,
    snare: 0,
    hat: 0,
  });

  const enable = useCallback(async () => {
    const gen = genRef.current;
    await startTone();
    // Unmounted meanwhile: build nothing the cleanup can no longer dispose.
    // Turned off meanwhile: stay off.
    if (!aliveRef.current || genRef.current !== gen) return;
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
    genRef.current += 1;
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

  /**
   * Scheduled playback for scenes (see `TourAudio`). Times are relative to
   * `Tone.immediate()` — the raw context clock — not `now()`, whose 100 ms
   * lookAhead would stack on top of the caller's own lookahead.
   */
  const audio = useMemo<TourAudio>(() => {
    const live = () => aliveRef.current && enabledRef.current;
    const at = (delay = 0) => Tone.immediate() + Math.max(0.005, delay);
    return {
      isEnabled: () => live(),
      enableFromGesture: enable,
      notes: (midis, seconds, delay, velocity = 0.8) => {
        const synth = synthRef.current;
        if (!live() || !synth || midis.length === 0) return;
        try {
          synth.triggerAttackRelease(
            midis.map((m) => Tone.Frequency(m, 'midi').toFrequency()),
            seconds,
            at(delay),
            velocity,
          );
        } catch {
          // A voice rejected its start time; drop this chord.
        }
      },
      drum: (drum, delay, velocity = 0.8) => {
        if (!live()) return;
        const last = lastDrumRef.current;
        const t = Math.max(at(delay), last[drum] + MIN_VOICE_GAP);
        last[drum] = t;
        try {
          kitRef.current ??= buildDrumKit();
          const kit = kitRef.current;
          if (drum === 'kick') {
            kit.kick.triggerAttackRelease('C1', DRUM_SECONDS.kick, t, velocity);
          } else {
            kit[drum].triggerAttackRelease(DRUM_SECONDS[drum], t, velocity);
          }
        } catch {
          // A voice rejected its start time; drop this hit.
        }
      },
      stopAll: () => {
        if (!aliveRef.current) return;
        synthRef.current?.releaseAll();
      },
      disable: () => {
        if (!aliveRef.current) return;
        disable();
      },
    };
  }, [enable, disable]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      synthRef.current?.dispose();
      synthRef.current = null;
      kitRef.current?.nodes.forEach((n) => n.dispose());
      kitRef.current = null;
      lastDrumRef.current = { kick: 0, snare: 0, hat: 0 };
    };
  }, []);

  return { enabled, enable, disable, play, playFromGesture, audio };
};
