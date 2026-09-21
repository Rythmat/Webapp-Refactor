/**
 * practiceGuide.ts — The target notes you hear in Practice mode.
 *
 * In Practice the lesson plays the correct notes while you play along, so a
 * right note reinforces and a wrong one clashes audibly. In Play Now the guide
 * is silent and the keyboard hints are gone — you prove it yourself.
 *
 * The guide uses the same piano as your own playing, pulled back a little so
 * it sits behind you rather than masking a mistake. It is a reference, not a
 * duet partner: when you play the right note the two should fuse, and when you
 * play the wrong one yours should still be the note on top.
 */

import * as Tone from 'tone';
import { triggerPianoAttackRelease } from '@/audio/pianoSampler';

/**
 * How much of the normal note velocity the guide gets. Loud enough to hear
 * clearly against your own playing, quiet enough that it never covers a wrong
 * note you need to notice.
 */
export const GUIDE_VELOCITY_SCALE = 0.55;

/** Velocity used when a target note carries none of its own. */
const DEFAULT_GUIDE_VELOCITY = 0.8;

/**
 * Sound one target note, now.
 *
 * `durationSeconds` should be the note's own drawn length so the guide sustains
 * for exactly as long as the piano roll shows it.
 */
export function playGuideNote(
  midi: number,
  durationSeconds: number,
  velocity: number = DEFAULT_GUIDE_VELOCITY,
  /** Transport time, for guides scheduled sample-accurately via Tone.Part. */
  time?: number,
): void {
  if (durationSeconds <= 0) return;
  // Velocities arrive either 0..1 or as MIDI 0..127; scale in the same space
  // the sampler normalizes into, so both surfaces land on the same level.
  const normalized = velocity > 1 ? velocity / 127 : velocity;
  void triggerPianoAttackRelease(
    Tone.Frequency(midi, 'midi').toNote(),
    durationSeconds,
    normalized * GUIDE_VELOCITY_SCALE,
    time,
  );
}
