// ── Ducker: a JS envelope follower keyed by another track ───────────────────
// Web Audio has no keyed compressor, so a 12 ms interval polls the KEY
// track's analyser (resolved by id through an injected callback) and ducks
// this module's gain, the last node before the chain's output. The gain sits
// at 1 (transparent) when the ducker is off; the loop runs only while it's
// on. Not automatable and not in a bounce's timeline.

import type { AutomationTarget } from '../../automation';
import type { DuckerParams } from '../../EffectChain';
import type { EffectModule, EffectUpdateOptions } from './types';

export class DuckerModule implements EffectModule<DuckerParams> {
  readonly input: GainNode;
  readonly output = null;
  readonly latencySeconds = 0;
  private readonly duckGain: GainNode;
  private state: DuckerParams;
  private duckIntervalId: number | null = null;
  private duckEnv = 0; // smoothed gain-reduction envelope, 0 (none) – amount
  private duckReductionDb = 0; // current reduction for the GR meter (≤ 0)
  private keySourceResolver: ((trackId: string) => AnalyserNode | null) | null =
    null;

  constructor(
    private readonly ctx: AudioContext,
    initial: DuckerParams,
  ) {
    this.state = structuredClone(initial);
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = 1;
    this.input = this.duckGain;
  }

  /**
   * duck gain → destination. The edge is permanent: unwire() leaves it, and
   * connecting it again is a no-op.
   */
  wire(_source: AudioNode, destination: AudioNode): void {
    this.duckGain.connect(destination);
  }

  unwire(): void {
    /* the duck gain's one edge stays (see wire) */
  }

  setKeySourceResolver(fn: (trackId: string) => AnalyserNode | null): void {
    this.keySourceResolver = fn;
  }

  /** Current sidechain gain reduction in dB (≤ 0) for the GR meter. */
  getReduction(): number {
    return this.duckReductionDb;
  }

  // Polls the KEY track's analyser and ducks the gain. A JS one-pole
  // attack/release envelope drives the gain via setTargetAtTime, so
  // control-rate polling still yields a smooth pump. Re-resolves the key each
  // tick so a deleted/changed key fails silent (gain returns to unity).
  private startLoop(): void {
    if (this.duckIntervalId !== null) return;
    const POLL_MS = 12; // ~83 Hz — fast enough to catch kick transients
    let keyBuffer: Float32Array<ArrayBuffer> | null = null;

    this.duckIntervalId = window.setInterval(() => {
      const d = this.state;
      if (!d.enabled || !d.keyTrackId || !this.keySourceResolver) {
        this.releaseDuck();
        return;
      }
      const keyAnalyser = this.keySourceResolver(d.keyTrackId);
      if (!keyAnalyser) {
        this.releaseDuck();
        return;
      }
      if (!keyBuffer || keyBuffer.length !== keyAnalyser.fftSize) {
        keyBuffer = new Float32Array(keyAnalyser.fftSize);
      }
      keyAnalyser.getFloatTimeDomainData(keyBuffer);
      let peak = 0;
      for (let i = 0; i < keyBuffer.length; i++) {
        const abs = Math.abs(keyBuffer[i]);
        if (abs > peak) peak = abs;
      }
      const keyDb = 20 * Math.log10(peak + 1e-10);

      // Target reduction: full `amount` when the key is over threshold, else 0.
      const target = keyDb >= d.threshold ? d.amount : 0;
      // One-pole toward target with separate attack (rising) / release (falling).
      const tc = target > this.duckEnv ? d.attack : d.release;
      const coeff = 1 - Math.exp(-(POLL_MS / 1000) / Math.max(0.001, tc));
      this.duckEnv += (target - this.duckEnv) * coeff;

      const gain = Math.max(0, 1 - this.duckEnv);
      this.duckReductionDb = 20 * Math.log10(Math.max(1e-4, gain));
      this.duckGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.004);
    }, POLL_MS);
  }

  /** Ease the duck back to unity (key gone / ducker off). */
  private releaseDuck(): void {
    if (this.duckEnv === 0 && this.duckReductionDb === 0) return;
    this.duckEnv = 0;
    this.duckReductionDb = 0;
    this.duckGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.02);
  }

  private stopLoop(): void {
    if (this.duckIntervalId !== null) {
      window.clearInterval(this.duckIntervalId);
      this.duckIntervalId = null;
    }
  }

  // The loop reads its parameters from `state`; the composer runs its
  // lifecycle (runLoop) after the whole chain has updated.
  update(d: DuckerParams, _opts: EffectUpdateOptions): void {
    this.state = structuredClone(d);
  }

  /** Runs the loop only while the ducker is enabled. */
  runLoop(): void {
    if (this.state.enabled) {
      this.startLoop();
    } else if (this.duckIntervalId !== null) {
      this.releaseDuck();
      this.stopLoop();
    }
  }

  automationTargets(): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.stopLoop();
    this.duckGain.disconnect();
  }
}
