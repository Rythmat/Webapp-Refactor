// ── MasterChain ──────────────────────────────────────────────────────────────
// The last stage before the speakers:
//
//     [mixer buses] → masterGain → (insert point) → destination
//
// The insert point is the reason this is its own module. Mastering EQ,
// compression, a limiter, a recording tap or a visualiser analyser all get
// spliced in here — between `masterGain` and `destination` — without any
// feature code changing, because features only ever reach the mixer.

import { audioContextOwner } from './AudioContextOwner';

class MasterChain {
  private masterGain: GainNode | null = null;
  private volume = 1;

  /** Where the mixer connects. Built on first use. */
  getInput(): GainNode {
    if (!this.masterGain) {
      const ctx = audioContextOwner.get();
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.volume;
      // Future effects/analysers insert between here and the destination.
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  /** App-wide output level (0–1), ramped to avoid zipper noise on drags. */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    const gain = this.masterGain;
    if (gain) {
      gain.gain.setTargetAtTime(this.volume, gain.context.currentTime, 0.01);
    }
  }

  getVolume(): number {
    return this.volume;
  }
}

export const masterChain = new MasterChain();
