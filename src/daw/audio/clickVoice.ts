import * as Tone from 'tone';
import type { ClickSound } from './clickSounds';

// ── The metronome's voice (milestone 2.8) ──────────────────────────────────
//
// The click the metronome and the count-in play: one of three sounds, at the
// student's volume (both per-user prefs, metronomeSound and metronomeVolume;
// clickSounds.ts). It goes straight to the output, around the master fader
// and the mastering chain, so neither colours it, the master meter never
// shows it, and an export never has it. Until 2.8 it was a fixed -10 dB
// MembraneSynth into the master gain; 'click' at the default volume is that
// sound and that level.

export interface ClickVoice {
  /** One click at audio time `time`; `accent` on the bar line. */
  trigger(accent: boolean, time: number): void;
  setVolume(db: number): void;
  dispose(): void;
}

/** A voice for `sound`, connected to `destination`, at `db`. */
export function createClickVoice(
  sound: ClickSound,
  destination: AudioNode,
  db: number,
): ClickVoice {
  switch (sound) {
    case 'tick': {
      // A short, bright blip: easy to hear over a busy mix.
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      });
      synth.connect(destination);
      synth.volume.value = db;
      return {
        trigger: (accent, time) =>
          synth.triggerAttackRelease(accent ? 'E7' : 'B6', '64n', time),
        setVolume: (next) => (synth.volume.value = next),
        dispose: () => synth.dispose(),
      };
    }
    case 'hihat': {
      // A closed hi-hat: a burst of noise, louder on the bar line.
      const synth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      });
      const filter = new Tone.Filter(7000, 'highpass');
      synth.connect(filter);
      filter.connect(destination);
      synth.volume.value = db;
      return {
        trigger: (accent, time) =>
          synth.triggerAttackRelease('32n', time, accent ? 1 : 0.6),
        setVolume: (next) => (synth.volume.value = next),
        dispose: () => {
          synth.dispose();
          filter.dispose();
        },
      };
    }
    default: {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
      });
      synth.connect(destination);
      synth.volume.value = db;
      return {
        trigger: (accent, time) =>
          synth.triggerAttackRelease(accent ? 'C5' : 'C4', '32n', time),
        setVolume: (next) => (synth.volume.value = next),
        dispose: () => synth.dispose(),
      };
    }
  }
}
