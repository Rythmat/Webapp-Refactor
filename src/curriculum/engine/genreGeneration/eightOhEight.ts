/**
 * eightOhEight.ts — the 808 sub-bass voice.
 *
 * There is no 808 sample in the repo, so this is a synth: a sine with a short
 * downward pitch "punch", driven a little so the sub still reads on laptop
 * speakers. Tuned by ear with Aaron on /__hiphop-grooves (ledger D-031): a 1 s
 * decay to silence, and the filter resonance rolled off 25% (Q 1 → 0.75).
 */

import * as Tone from 'tone';

export interface EightOhEight {
  synth: Tone.MembraneSynth;
  dispose: () => void;
}

export function createEightOhEight(output: Tone.InputNode): EightOhEight {
  const drive = new Tone.Distortion({ distortion: 0.35, wet: 0.45 });
  const tone = new Tone.Filter({ frequency: 1400, type: 'lowpass', Q: 0.75 });
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 1.6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.002, decay: 1, sustain: 0, release: 0.18 },
    volume: 4,
  });
  synth.chain(drive, tone, output);
  return {
    synth,
    dispose: () => {
      synth.dispose();
      drive.dispose();
      tone.dispose();
    },
  };
}

/** Play one 808 note; `glideFrom` slides into it from another note. */
export function play808(
  { synth }: EightOhEight,
  midi: number,
  durationSec: number,
  time: number,
  velocity: number,
  glideFrom?: number,
): void {
  const start = glideFrom ?? midi;
  synth.triggerAttackRelease(
    Tone.Frequency(start, 'midi').toNote(),
    durationSec,
    time,
    velocity,
  );
  if (glideFrom != null) {
    const from = Tone.Frequency(glideFrom, 'midi').toFrequency();
    const to = Tone.Frequency(midi, 'midi').toFrequency();
    synth.frequency.setValueAtTime(from, time + 0.035);
    synth.frequency.exponentialRampToValueAtTime(to, time + 0.13);
  }
}
