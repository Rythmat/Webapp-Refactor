// ── The bass lessons' voice ───────────────────────────────────────────────
// What a bass lesson's Demo, guide notes and "hear it" sound like: the
// electric bass the bass lines already use (curriculum/engine/bassLines,
// public/samples/bass/electric — CC0, one sample per semitone B0-D4, so the
// whole four-string range plays unshifted). One Tone.Sampler, built on the
// first load and kept.

import * as Tone from 'tone';
import { createBassSampler } from '@/curriculum/engine/bassLines/bassSampler';
import type { LessonVoice } from '@/curriculum/hooks/useDemoPlayback';

/** A chord sounds as a quick rake, low to high, as a bassist would show it. */
const RAKE_SECONDS = 0.09;

let sampler: Promise<Tone.Sampler> | null = null;
let ready: Tone.Sampler | null = null;

export function loadBassVoice(): Promise<void> {
  if (!sampler) {
    sampler = createBassSampler('electric', Tone.getDestination()).then(
      (s) => (ready = s),
      (err) => {
        sampler = null; // let a later Demo try again
        throw err;
      },
    );
  }
  return sampler.then(() => undefined);
}

function play(
  midi: number,
  durationSeconds: number,
  velocity: number,
  time?: number,
): void {
  if (!ready) return;
  ready.triggerAttackRelease(
    Tone.Frequency(midi, 'midi').toNote(),
    durationSeconds,
    time ?? Tone.now(),
    // Lessons speak MIDI velocity (80); a Sampler takes 0-1.
    velocity > 1 ? velocity / 127 : velocity,
  );
}

/** Stop everything the bass is playing. */
export function stopBassVoice(): void {
  ready?.releaseAll();
}

/** The bass as a lesson's voice: one note at a time, chords raked. */
export const bassLessonVoice: LessonVoice = {
  load: loadBassVoice,
  attackRelease: (midis, durationSeconds, velocity, time) => {
    if (typeof midis === 'number') {
      play(midis, durationSeconds, velocity, time);
      return;
    }
    const start = time ?? Tone.now();
    [...midis]
      .sort((a, b) => a - b)
      .forEach((midi, i) =>
        play(midi, durationSeconds, velocity, start + i * RAKE_SECONDS),
      );
  },
  stop: stopBassVoice,
};
