// ── Gate: a JS-polled noise gate ────────────────────────────────────────────
// A 256-sample analyser taps the gate's input; a 16 ms interval reads its
// peak and opens or closes the gate gain (the module's output node). The
// loop runs only while the gate is enabled. Not automatable and not in a
// bounce's timeline (its clock is the page's, not the render's).

import type { AutomationTarget } from '../../automation';
import type { GateParams } from '../../EffectChain';
import type { EffectModule, EffectUpdateOptions } from './types';

export class GateModule implements EffectModule<GateParams> {
  readonly input = null;
  readonly output: GainNode;
  readonly latencySeconds = 0;
  private readonly analyser: AnalyserNode;
  private readonly gateGain: GainNode;
  private state: GateParams;
  private gateOpen = true;
  private gateHoldRemaining = 0;
  private gateIntervalId: number | null = null;

  constructor(
    private readonly ctx: AudioContext,
    initial: GateParams,
  ) {
    this.state = structuredClone(initial);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0;
    this.gateGain = ctx.createGain();
    this.gateGain.gain.value = 1;
    this.output = this.gateGain;
  }

  // source → analyser (parallel tap for level detection) + gate gain (this
  // module's output, so also the destination)
  wire(source: AudioNode): void {
    source.connect(this.analyser);
    source.connect(this.gateGain);
  }

  unwire(): void {
    this.analyser.disconnect();
    this.gateGain.disconnect();
  }

  startLoop(): void {
    if (this.gateIntervalId !== null) return;
    const buffer = new Float32Array(this.analyser.fftSize);
    const POLL_MS = 16; // ~60Hz

    this.gateIntervalId = window.setInterval(() => {
      if (!this.state.enabled) {
        if (this.gateGain.gain.value !== 1) {
          this.gateGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.005);
        }
        return;
      }

      this.analyser.getFloatTimeDomainData(buffer);

      // Peak detection
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > peak) peak = abs;
      }
      const peakDb = 20 * Math.log10(peak + 1e-10);

      const { threshold, range, hold, attack, release } = this.state;
      const closedGain = Math.pow(10, -range / 20);
      const now = this.ctx.currentTime;

      if (peakDb >= threshold) {
        // Signal above threshold — open gate
        if (!this.gateOpen) {
          this.gateGain.gain.cancelScheduledValues(now);
          this.gateGain.gain.setTargetAtTime(
            1,
            now,
            Math.max(0.001, attack / 3),
          );
          this.gateOpen = true;
        }
        this.gateHoldRemaining = hold;
      } else if (this.gateHoldRemaining > 0) {
        // In hold period
        this.gateHoldRemaining -= POLL_MS / 1000;
      } else {
        // Below threshold, hold expired — close gate
        if (this.gateOpen) {
          this.gateGain.gain.cancelScheduledValues(now);
          this.gateGain.gain.setTargetAtTime(
            closedGain,
            now,
            Math.max(0.005, release / 3),
          );
          this.gateOpen = false;
        }
      }
    }, POLL_MS);
  }

  stopLoop(): void {
    if (this.gateIntervalId !== null) {
      clearInterval(this.gateIntervalId);
      this.gateIntervalId = null;
    }
  }

  // The loop reads its parameters from `state`; update() only resets the gain
  // when the gate goes off. The composer runs the loop's lifecycle after the
  // whole chain has updated (see runLoop).
  update(gate: GateParams, _opts: EffectUpdateOptions): void {
    if (!gate.enabled && this.state.enabled) {
      this.gateGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gateGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.005);
      this.gateOpen = true;
    }
    this.state = structuredClone(gate);
  }

  /**
   * Runs the 60 Hz polling interval ONLY while the gate is enabled. It's cheap
   * per tick but there is one per track + master + every return bus, so
   * leaving them all running is needless main-thread pressure.
   */
  runLoop(): void {
    if (this.state.enabled) {
      this.startLoop();
    } else if (this.gateIntervalId !== null) {
      this.stopLoop();
    }
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.stopLoop();
    this.analyser.disconnect();
    this.gateGain.disconnect();
  }
}
