// ── The shape of one effect slot in a chain ─────────────────────────────────
// EffectChain (audio/EffectChain.ts) is a thin composer over one module per
// slot. A module owns its nodes and its bypass wiring; the composer only says
// where each module's sound comes from and where it goes.

import type { AutomationTarget } from '../../automation';

/** What every module's update() is told about the update under way. */
export interface EffectUpdateOptions {
  /** Glide parameter changes (setTargetAtTime) instead of setting them at once. */
  glide: boolean;
  /** Whether the chain has had an update before, so its sound may be heard. */
  heard: boolean;
  /** Keep the reverb's impulse response until an update without this. */
  deferIr: boolean;
}

/**
 * One effect slot. Neighbouring modules meet at a boundary node, which
 * exactly one of them owns: a module's `output` is the node it owns at its
 * tail, its `input` the node it owns at its head, and either is null when the
 * module has no node of its own there (a wet/dry pair summing straight into
 * the next slot's input, or a filter fed straight from the previous slot).
 * So the chain adds no pass-through nodes of its own.
 */
export interface EffectModule<S> {
  readonly input: AudioNode | null;
  readonly output: AudioNode | null;
  /** How late the module passes sound, in seconds (0 until it's measured). */
  readonly latencySeconds: number;
  /**
   * Connects `source` → this module → `destination`, as the module's bypass
   * state says. The module keeps both, so it can rewire itself when its
   * bypass changes. A module with an `output` ends at it, so its destination
   * is that node. Called on every (re)build of the chain.
   */
  wire(source: AudioNode, destination: AudioNode): void;
  /** Severs the edges a (re)build makes again (the build's disconnect pass). */
  unwire(): void;
  update(state: S, opts: EffectUpdateOptions): void;
  /** The ramp targets of one `effect.<slot>.<param>` lane, [] if not rideable. */
  automationTargets(param: string): AutomationTarget[];
  dispose(): void;
}
