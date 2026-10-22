import type { AutomationTarget } from '../../automation';
import type { PedalProcessor } from '../../pedals/PedalProcessor';
import { tryDisconnect } from './params';
import {
  pedalKnobValues,
  type PedalEffectDef,
  type PedalEffectParams,
} from './pedalEffects';
import type { EffectModule, EffectUpdateOptions } from './types';

// ── A guitar pedal as an effect slot (2026-10-22) ──────────────────────────
// source → pedal → output while on; source → output while off (true
// bypass, by rewiring, as the chain's other slots do). It owns its output,
// so the next slot is fed from it, and is fed from the slot before (which
// owns that boundary: the chain's input, or a slot's output). The pedal is
// made when the slot is first switched on, so a chain that never uses it
// makes none of its nodes (its LFOs never run).

export class PedalEffectModule
  implements EffectModule<PedalEffectParams | undefined>
{
  readonly input = null;
  readonly latencySeconds = 0;
  // Made when the chain first puts the slot in its path, so a chain that
  // never used the pedal has none of its nodes.
  private out: GainNode | null = null;
  private pedal: PedalProcessor | null = null;
  private source: AudioNode | null = null;
  private on = false;

  constructor(
    private readonly ctx: AudioContext,
    private readonly def: PedalEffectDef,
  ) {}

  get output(): GainNode {
    this.out ??= this.ctx.createGain();
    return this.out;
  }

  wire(source: AudioNode): void {
    this.source = source;
    this.connect();
  }

  unwire(): void {
    this.out?.disconnect();
    this.pedal?.getOutputNode().disconnect();
  }

  update(
    state: PedalEffectParams | undefined,
    _opts: EffectUpdateOptions,
  ): void {
    const on = state?.enabled === true;
    if (on && !this.pedal) {
      this.pedal = this.def.create(this.ctx);
      this.pedal.setEnabled(true);
    }
    this.pedal?.updateParams(pedalKnobValues(this.def, state));
    if (on !== this.on) {
      this.disconnect();
      this.on = on;
      this.connect();
    }
  }

  /** Resolves once the pedal can play (the wah's worklet loads first). */
  whenReady(): Promise<void> {
    return this.pedal?.whenReady?.() ?? Promise.resolve();
  }

  /** A pedal's knobs aren't automation lanes. */
  automationTargets(_param: string): AutomationTarget[] {
    return [];
  }

  dispose(): void {
    this.disconnect();
    this.out?.disconnect();
    this.pedal?.dispose();
    this.pedal = null;
  }

  /** The pedal, once made (tests). @internal */
  get pedalProcessor(): PedalProcessor | null {
    return this.pedal;
  }

  private connect(): void {
    const source = this.source;
    if (!source) return;
    if (this.on && this.pedal) {
      source.connect(this.pedal.getInputNode());
      this.pedal.getOutputNode().connect(this.output);
    } else {
      source.connect(this.output);
    }
  }

  private disconnect(): void {
    const source = this.source;
    if (!source || !this.out) return;
    tryDisconnect(source, this.out);
    if (this.pedal) {
      tryDisconnect(source, this.pedal.getInputNode());
      tryDisconnect(this.pedal.getOutputNode(), this.output);
    }
  }
}
